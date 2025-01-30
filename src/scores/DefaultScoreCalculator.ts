import { ClientMonitor } from "../ClientMonitor";
import { InboundTrackMonitor } from "../monitors/InboundTrackMonitor";
import { OutboundTrackMonitor } from "../monitors/OutboundTrackMonitor";
import { PeerConnectionMonitor } from "../monitors/PeerConnectionMonitor";
import { TrackMonitor } from "../monitors/TrackMonitor";
import { calculateAudioMOS } from "./mosScores";

export type DefaultScoreCalclulatorOutboundTrackScoreAppData = {
	lastNScores: number[];
	diffBitrateSquares: number[];
	lastBitrate?: number;
	ewmaBitrate?: number;
	lastScoreDetails: {
		targetDeviatioPenalty: number,
		cpuLimitationPenalty: number,
		bitrateVolatilityPenalty: number,
	}
}

export type DefaultScoreCalclulatorInboundVideoScoreAppData = {
	lastNScores: number[];
	ewmaFps?: number;
	lastScoreDetails: {
		fpsPenalty: number;
		fractionOfDroppedFramesPenalty: number;
		corruptionProbabilityPenalty: number;
	}
}

export type DefaultScoreCalculatorPeerConnectionScoreAppData = {
	lastNScores: number[];
	lastScoreDetails: {
		rttPenalty: number;
		fractionLostPenalty: number;
	}

}

/**
 * DefaultScoreCalculator is a default implementation of the ScoreCalculator interface.
 * It calculates the score of the client monitor, peer connections, and tracks.
 * The score ranges and thresholds are defined as follows:
 * - 4.0 <= good < 5.0
 * - 3.0 <= fair < 4.0
 * - 2.0 <= poor < 3.0
 * - 1.0 <= bad < 2.0
 * - 0.0 <= very bad < 1.0
 */
export class DefaultScoreCalculator {
	public static readonly MAX_SCORE = 5.0;
	public static readonly MIN_SCORE = 0.0;
	public static lastNScoresMaxLength = 10;
	public static lastNScoresMinLength = 5;

	public constructor(
		private readonly clientMonitor: ClientMonitor,
	) {
	}

	public update() {
		for (const peerConnection of this.clientMonitor.mappedPeerConnections.values()) {
			this._calculatePeerConnectionStabilityScore(peerConnection);
		}
		for (const track of this.clientMonitor.tracks) {
			this._calculateTrackScore(track);
		}
		this._calculateClientMonitorScore();
	}

	public _calculateClientMonitorScore() {
		const clientMonitor: ClientMonitor = this.clientMonitor;
		let clientTotalScore = 0;
		let clientTotalWeight = 0;
		
		for (const pcMonitor of clientMonitor.peerConnections) {
			if (pcMonitor.calculatedStabilityScore.value === undefined) continue;

			let trackTotalScore = 0;
			let trackTotalWeight = 0;

			for (const trackMonitor of pcMonitor.tracks) {
				const trackScore = trackMonitor.calculatedScore;
				
				if (trackScore.value === undefined) continue;
				
				trackTotalScore += trackScore.value * trackScore.weight;
				trackTotalWeight += trackScore.weight;
			}
			
			const weightedTrackScore = trackTotalScore / trackTotalWeight;
			const normalizedPcScore = Math.max(
				DefaultScoreCalculator.MIN_SCORE,
				pcMonitor.calculatedStabilityScore.value
			) / DefaultScoreCalculator.MAX_SCORE;
			const totalPcScore = weightedTrackScore * normalizedPcScore;

			clientTotalScore += totalPcScore * pcMonitor.calculatedStabilityScore.weight;
			clientTotalWeight += pcMonitor.calculatedStabilityScore.weight;
		}

		const clientScore = clientTotalScore / clientTotalWeight;
		clientMonitor.setScore(clientScore);
	}


	private _calculatePeerConnectionStabilityScore(pcMonitor: PeerConnectionMonitor) {
		// Packet Jitter measured in seconds
		// we use RTT and lost packets to calculate the base score for the connection
		const score = pcMonitor.calculatedStabilityScore;
		const rttInMs = (pcMonitor.avgRttInSec ?? 0) * 1000;
		const fractionLost = 
			pcMonitor.inboundRtps.reduce((acc, rtp) => acc + (rtp.fractionLost ?? 0), 0)
			+ pcMonitor.remoteInboundRtps.reduce((acc, rtp) => acc + (rtp.fractionLost ?? 0), 0);
		
		let scoreValue = 5.0;
		let appData = score.appData as DefaultScoreCalculatorPeerConnectionScoreAppData | undefined;

		if (!appData) {
			appData = {
				lastNScores: [],
				lastScoreDetails: {
					rttPenalty: 0,
					fractionLostPenalty: 0,
				}
			}
			score.appData = appData;
		}
		const lastScoreDetails = appData.lastScoreDetails;


		if (300 < rttInMs) {
			lastScoreDetails.rttPenalty = 2.0;
		} else if (150 < rttInMs) {
			lastScoreDetails.rttPenalty = 1.0;
		}

		if (0.0 < fractionLost) {
			if (fractionLost < 0.05) {
				lastScoreDetails.fractionLostPenalty = 1.0;
			}	else if (fractionLost < 0.2) {
				lastScoreDetails.fractionLostPenalty = 2.0;
			} else {
				lastScoreDetails.fractionLostPenalty = 5.0;
			}
		}

		scoreValue = Math.max(
			DefaultScoreCalculator.MIN_SCORE,
			DefaultScoreCalculator.MAX_SCORE - (
				lastScoreDetails.rttPenalty + 
				lastScoreDetails.fractionLostPenalty
			)
		);

		appData.lastNScores.push(scoreValue);
		score.value = this._calculateFinalScore(appData.lastNScores);
	}

	public _calculateTrackScore(trackMonitor: TrackMonitor) {
		switch (trackMonitor.direction) {
			case 'inbound':
				switch (trackMonitor.kind) {
					case 'audio':
						this._calculateInboundAudioTrackScore(trackMonitor);
						break;
					case 'video':
						this._calculateInboundVideoTrackScore(trackMonitor);
						break;
				}
				break;
			case 'outbound':
				switch (trackMonitor.kind) {
					case 'audio':
						this._calculateOutboundAudioTrackScore(trackMonitor);
						break;
					case 'video':
						this._calculateOutboundVideoTrackScore(trackMonitor);
						break;
				}
				break;
		}
	}

	private _calculateInboundVideoTrackScore(trackMonitor: InboundTrackMonitor) {
		if (!trackMonitor.track.enabled || trackMonitor.track.muted) {
			if (trackMonitor.calculatedScore.appData) {
				trackMonitor.calculatedScore.appData = undefined;
			}

			return trackMonitor.calculatedScore.value = undefined;
		}

		// fps volatility
		// fractionOfDroppedFrames
		// totalCorruptionProbability

		const inboundRtp = trackMonitor.getInboundRtp();

		if (!inboundRtp) {
			trackMonitor.calculatedScore.value = undefined;

			return;
		}
		let appData = trackMonitor.calculatedScore.appData as DefaultScoreCalclulatorInboundVideoScoreAppData | undefined;

		if (!appData) {
			appData = {
				lastNScores: [],
				lastScoreDetails: {
					fpsPenalty: 0,
					fractionOfDroppedFramesPenalty: 0,
					corruptionProbabilityPenalty: 0,
				}
			}
			trackMonitor.calculatedScore.appData = appData;
		}

		const lastScoreDetails = appData.lastScoreDetails;

		lastScoreDetails.fpsPenalty = 0;
		lastScoreDetails.fractionOfDroppedFramesPenalty = 0;
		lastScoreDetails.corruptionProbabilityPenalty = 0;

		if (inboundRtp.framesPerSecond) {
			inboundRtp.lastNFramesPerSec.push(inboundRtp.framesPerSecond);

			if (!appData.ewmaFps) {
				appData.ewmaFps = inboundRtp.framesPerSecond;
			} else {
				appData.ewmaFps = 0.9 * appData.ewmaFps + 0.1 * inboundRtp.framesPerSecond;
			}

			const avgFpsSqueres = inboundRtp.lastNFramesPerSec.reduce((acc, fps) => acc + (fps * fps), 0) / inboundRtp.lastNFramesPerSec.length;
			const stdDev = Math.sqrt(avgFpsSqueres);
			const volatility = stdDev / appData.ewmaFps;

			if (0.1 < volatility && volatility < 0.2) {
				lastScoreDetails.fpsPenalty = 1.0;
			} else if (0.2 < volatility) {
				lastScoreDetails.fpsPenalty = 2.0;
			}
		}

		if (inboundRtp.framesDropped && inboundRtp.framesRendered) {
			const fractionOfDroppedFrames = inboundRtp.framesDropped / (inboundRtp.framesDropped + inboundRtp.framesRendered);

			if (0.1 < fractionOfDroppedFrames && fractionOfDroppedFrames < 0.2) {
				lastScoreDetails.fractionOfDroppedFramesPenalty = 1.0;
			} else if (0.2 < fractionOfDroppedFrames) {
				lastScoreDetails.fractionOfDroppedFramesPenalty = 2.0;
			}
		}

		if (inboundRtp.ΔcorruptionProbability) {
			appData.lastScoreDetails.corruptionProbabilityPenalty = 2.0 * inboundRtp.ΔcorruptionProbability;
		}

		const scoreValue = Math.max(
			DefaultScoreCalculator.MIN_SCORE,
			DefaultScoreCalculator.MAX_SCORE - (
				lastScoreDetails.fpsPenalty + 
				lastScoreDetails.fractionOfDroppedFramesPenalty +
				lastScoreDetails.corruptionProbabilityPenalty
			)
		);

		appData.lastNScores.push(scoreValue);
	
		trackMonitor.calculatedScore.value = this._calculateFinalScore(appData.lastNScores);
	}

	private _calculateInboundAudioTrackScore(trackMonitor: InboundTrackMonitor) {
		if (!trackMonitor.track.enabled || trackMonitor.track.muted) {
			if (trackMonitor.calculatedScore.appData) {
				trackMonitor.calculatedScore.appData = undefined;
			}

			return trackMonitor.calculatedScore.value = undefined;
		}

		const pcMonitor = trackMonitor.getPeerConnection();
		const bitrate = trackMonitor.bitrate;
		const packetLoss = trackMonitor.getInboundRtp().ΔpacketsLost ?? 0;
		const bufferDelayInMs = trackMonitor.getInboundRtp().jitterBufferDelay ?? 10;
		const roundTripTimeInMs = (pcMonitor.avgRttInSec ?? 0.05) * 1000;
		const dtxMode = trackMonitor.dtxMode;
		const fec = (trackMonitor.getInboundRtp().fecBytesReceived ?? 0) > 0;

		if (!bitrate) {
			trackMonitor.calculatedScore.value = undefined;
			
			return;
		}

		trackMonitor.calculatedScore.value = calculateAudioMOS(
			bitrate,
			packetLoss,
			bufferDelayInMs,
			roundTripTimeInMs,
			dtxMode,
			fec,
		);
	}

	private _calculateOutboundVideoTrackScore(trackMonitor: OutboundTrackMonitor) {
		if (!trackMonitor.track.enabled || trackMonitor.track.muted) {
			if (trackMonitor.calculatedScore.appData) {
				trackMonitor.calculatedScore.appData = undefined;
			}

			return trackMonitor.calculatedScore.value = undefined;
		}

		const outboundRtp = trackMonitor.getHighestLayer();
	
		if (!outboundRtp) {
			trackMonitor.calculatedScore.value = undefined;

			return;
		}
		const score = trackMonitor.calculatedScore;
		let appData = score.appData as DefaultScoreCalclulatorOutboundTrackScoreAppData | undefined;

		if (!appData) {
			appData = {
				lastNScores: [],
				diffBitrateSquares: [],
				lastScoreDetails: {
					targetDeviatioPenalty: 0,
					cpuLimitationPenalty: 0,
					bitrateVolatilityPenalty: 0,
				}
			}
			score.appData = appData;
		}

		const lastScoreDetails = appData.lastScoreDetails;

		lastScoreDetails.targetDeviatioPenalty = 0;
		lastScoreDetails.cpuLimitationPenalty = 0;
		lastScoreDetails.bitrateVolatilityPenalty = 0;

		// max score: 5
		// target deviation penalty: 0-2
		// cpu limitation penalty: 0-1
		// bitrate volatility penalty: 0-2
		
		// consider to take: 
		// plicount
		// qpSum

		if (outboundRtp.targetBitrate) {
			// funny thing, encoder target from a layer is for the encoder, but the bitrate is for that particular layer
			const payloadBitrate = [...trackMonitor.mappedOutboundRtps.values()].reduce((acc, rtp) => acc + (rtp.payloadBitrate ?? 0), 0);
			
			if (payloadBitrate) {
				const deviation = outboundRtp.targetBitrate - payloadBitrate;
				const percentage = deviation / outboundRtp.targetBitrate;
				const lowThreshold = Math.max(20000, outboundRtp.targetBitrate * 0.05);

				if (0 < deviation && lowThreshold < deviation) {
					
					if (0.05 <= percentage && percentage < 0.15) {
						lastScoreDetails.targetDeviatioPenalty = 1.0;
					} else if (0.15 <= percentage) {
						lastScoreDetails.targetDeviatioPenalty = 2.0;
					}
				}	
			}
		}

		if (outboundRtp.qualityLimitationReason === 'cpu') {
			lastScoreDetails.cpuLimitationPenalty = 1.0;
		}

		if (outboundRtp.bitrate) {
			if (!appData.ewmaBitrate) {
				appData.ewmaBitrate = outboundRtp.bitrate;
			} else {
				appData.ewmaBitrate = 0.9 * appData.ewmaBitrate + 0.1 * outboundRtp.bitrate;
			}
			if (appData.lastBitrate) {
				const diffBitrate = Math.abs(appData.lastBitrate - outboundRtp.bitrate);

				appData.diffBitrateSquares.push(diffBitrate * diffBitrate);
				
				while (appData.diffBitrateSquares.length > 10) {
					appData.diffBitrateSquares.shift();
				}
			}
			if (appData.diffBitrateSquares.length > 3) {
				const avgBitrateSquare = appData.diffBitrateSquares.reduce((acc, square) => acc + square, 0) / appData.diffBitrateSquares.length;
				const stdDev = Math.sqrt(avgBitrateSquare);
				const volatility = stdDev / appData.ewmaBitrate;

				// console.warn('volatility', volatility, 'stdDev', stdDev, 'avgBitrateSquare', avgBitrateSquare);
				if (0.1 < volatility && volatility < 0.2) {
					appData.lastScoreDetails.bitrateVolatilityPenalty = 1.0;
				} else if (0.2 < volatility) {
					appData.lastScoreDetails.bitrateVolatilityPenalty = 2.0;
				}
			}
			appData.lastBitrate = outboundRtp.bitrate;
		}

		const scoreValue = Math.max(
			DefaultScoreCalculator.MIN_SCORE,
			DefaultScoreCalculator.MAX_SCORE - (
				lastScoreDetails.targetDeviatioPenalty + 
				lastScoreDetails.cpuLimitationPenalty +
				lastScoreDetails.bitrateVolatilityPenalty
			)
		);

		appData.lastNScores.push(scoreValue);

		score.value = this._calculateFinalScore(appData.lastNScores);
	}

	private _calculateOutboundAudioTrackScore(trackMonitor: OutboundTrackMonitor) {
		if (!trackMonitor.track.enabled || trackMonitor.track.muted) {
			if (trackMonitor.calculatedScore.appData) {
				trackMonitor.calculatedScore.appData = undefined;
			}

			return trackMonitor.calculatedScore.value = undefined;
		}

		trackMonitor.calculatedScore.value = 5.0;
	}

	private _calculateFinalScore(scores: number[]) {
		let counter = 0;
		let weight = 0;
		let totalScore = 0;

		if (DefaultScoreCalculator.lastNScoresMaxLength < scores.length) {
			scores.shift();
		} else if (scores.length < DefaultScoreCalculator.lastNScoresMinLength) {
			return;
		}

		for (const score of scores) {
			weight += 1;
			counter += weight;
			totalScore += weight * score;
		}
		
		return totalScore / counter;
	}
}