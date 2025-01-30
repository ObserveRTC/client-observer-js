import { AudioDesyncDetector } from "../detectors/AudioDesyncDetector";
import { Detectors } from "../detectors/Detectors";
import { FreezedVideoTrackDetector } from "../detectors/FreezedVideoTrackDetector";
import { InboundRtpStats } from "../schema/ClientSample";
import { MediaKind } from "../schema/W3cStatsIdentifiers";
import { PeerConnectionMonitor } from "./PeerConnectionMonitor";
import { RemoteOutboundRtpMonitor } from "./RemoteOutboundRtpMonitor";

export class InboundRtpMonitor implements InboundRtpStats {
	// field indicate that this object was visited by accepting stats 
	private _visited = true;
	
	public addedAt = Date.now();

	// fields from InboundRtpStats
	timestamp: number;
	id: string;
	ssrc: number;
	kind: MediaKind;
	trackIdentifier: string;
	transportId?: string | undefined;
	codecId?: string | undefined;
	packetsReceived?: number | undefined;
	packetsLost?: number | undefined;
	jitter?: number | undefined;
	mid?: string | undefined;
	remoteId?: string | undefined;
	framesDecoded?: number | undefined;
	keyFramesDecoded?: number | undefined;
	framesRendered?: number | undefined;
	framesDropped?: number | undefined;
	frameWidth?: number | undefined;
	frameHeight?: number | undefined;
	framesPerSecond?: number | undefined;
	qpSum?: number | undefined;
	totalDecodeTime?: number | undefined;
	totalInterFrameDelay?: number | undefined;
	totalSquaredInterFrameDelay?: number | undefined;
	pauseCount?: number | undefined;
	totalPausesDuration?: number | undefined;
	freezeCount?: number | undefined;
	totalFreezesDuration?: number | undefined;
	lastPacketReceivedTimestamp?: number | undefined;
	headerBytesReceived?: number | undefined;
	packetsDiscarded?: number | undefined;
	fecBytesReceived?: number | undefined;
	fecPacketsReceived?: number | undefined;
	fecPacketsDiscarded?: number | undefined;
	bytesReceived?: number | undefined;
	nackCount?: number | undefined;
	firCount?: number | undefined;
	pliCount?: number | undefined;
	totalProcessingDelay?: number | undefined;
	estimatedPlayoutTimestamp?: number | undefined;
	jitterBufferDelay?: number | undefined;
	jitterBufferTargetDelay?: number | undefined;
	jitterBufferEmittedCount?: number | undefined;
	jitterBufferMinimumDelay?: number | undefined;
	totalSamplesReceived?: number | undefined;
	concealedSamples?: number | undefined;
	silentConcealedSamples?: number | undefined;
	concealmentEvents?: number | undefined;
	insertedSamplesForDeceleration?: number | undefined;
	removedSamplesForAcceleration?: number | undefined;
	audioLevel?: number | undefined;
	totalAudioEnergy?: number | undefined;
	totalSamplesDuration?: number | undefined;
	framesReceived?: number | undefined;
	decoderImplementation?: string | undefined;
	playoutId?: string | undefined;
	powerEfficientDecoder?: boolean | undefined;
	framesAssembledFromMultiplePackets?: number | undefined;
	totalAssemblyTime?: number | undefined;
	retransmittedPacketsReceived?: number | undefined;
	retransmittedBytesReceived?: number | undefined;
	rtxSsrc?: number | undefined;
	fecSsrc?: number | undefined;
	totalCorruptionProbability?: number | undefined;
	totalSquaredCorruptionProbability?: number | undefined;
	corruptionMeasurements?: number | undefined;

	// derived fields
	bitrate?: number;
	isFreezed?: boolean;
	desync?: boolean;
	avgFramesPerSec?: number;
	fpsVolatility?: number;
	lastNFramesPerSec: number[] = [];
	receivingAudioSamples?: number;
	fractionLost?: number;
	bitPerPixel?: number;

	ΔpacketsLost?: number;
	ΔpacketsReceived?: number;
	ΔbytesReceived?: number;
	ΔcorruptionProbability?: number;

	/**
	 * Additional data attached to this stats, will be shipped to the server
	 */
	attachments?: Record<string, unknown> | undefined;
	/**
	 * Additional data attached to this stats, will not be shipped to the server, 
	 * but can be used by the application
	 */
	public appData?: Record<string, unknown> | undefined;

	public constructor(
		private readonly _peerConnection: PeerConnectionMonitor,
		options: InboundRtpStats,
	) {
		this.id = options.id;
		this.timestamp = options.timestamp;
		this.ssrc = options.ssrc;
		this.kind = options.kind as MediaKind;
		this.trackIdentifier = options.trackIdentifier;

		Object.assign(this, options);
	}

	public get visited(): boolean {
		const result = this._visited;
		
		this._visited = false;

		return result;
	}

	public getPeerConnection() {
		return this._peerConnection;
	}

	public accept(stats: Omit<InboundRtpStats, 'appData'>): void {
		this._visited = true;

		const elapsedInMs = stats.timestamp - this.timestamp;
		if (elapsedInMs <= 0) { 
			Object.assign(this, stats);

			return; // logger?
		}
		const elapsedInSec = elapsedInMs / 1000;

		// before we assign let's update delta fields
		if (this.totalSamplesReceived && stats.totalSamplesReceived) {
			this.receivingAudioSamples = stats.totalSamplesReceived - this.totalSamplesReceived;
		}
		if (this.bytesReceived && stats.bytesReceived) {
			this.ΔbytesReceived = stats.bytesReceived - this.bytesReceived;
			this.bitrate = Math.max(0, this.ΔbytesReceived * 8 / (elapsedInSec));
		}
		if (this.packetsLost !== undefined && stats.packetsLost !== undefined) {
			this.ΔpacketsLost = stats.packetsLost - this.packetsLost;
		}
		if (this.totalCorruptionProbability !== undefined && 
			stats.totalCorruptionProbability !== undefined &&
			this.corruptionMeasurements !== undefined &&
			stats.corruptionMeasurements !== undefined
		) {
			const deltaCoruption = stats.totalCorruptionProbability - this.totalCorruptionProbability;
			const deltaMeasurements = Math.max(1, stats.corruptionMeasurements - this.corruptionMeasurements);
			this.ΔcorruptionProbability = Math.max(
				0, 
				deltaCoruption / deltaMeasurements
			);
		}

		Object.assign(this, stats);

		if (this.framesPerSecond) {
			this.lastNFramesPerSec.push(this.framesPerSecond);
			if (this.lastNFramesPerSec.length > 10) {
				this.lastNFramesPerSec.shift();

			}

			const avgFramesPerSec = this.lastNFramesPerSec.reduce((acc, fps) => acc + fps, 0) / this.lastNFramesPerSec.length;
			const avgDiff = this.lastNFramesPerSec.reduce((acc, fps) => acc + Math.abs(fps - avgFramesPerSec), 0) / this.lastNFramesPerSec.length
	
			this.avgFramesPerSec = avgFramesPerSec;
			this.fpsVolatility = avgDiff / avgFramesPerSec;

			if (this.bitrate && this.frameWidth && this.frameHeight) {
				this.bitPerPixel = this.bitrate / (this.frameWidth * this.frameHeight);
			}
		}

		if (this.packetsReceived !== undefined && this.packetsLost !== undefined) {
			this.fractionLost = 0 < this.packetsReceived && 0 < this.packetsLost
				? (this.packetsLost) / (this.packetsLost + this.packetsReceived) : 0.0;
		}
	}

	public getRemoteOutboundRtp(): RemoteOutboundRtpMonitor | undefined {
		return this._peerConnection.mappedRemoteOutboundRtpMonitors.get(this.ssrc);
	}

	public getIceTransport() {
		return this._peerConnection.mappedIceTransportMonitors.get(this.transportId ?? '');
	}

	public getCodec() {
		return this._peerConnection.mappedCodecMonitors.get(this.codecId ?? '');
	}

	public getMediaPlayout() {
		return this._peerConnection.mappedMediaPlayoutMonitors.get(this.playoutId ?? '');
	}

	public getTrack() {
		return this._peerConnection.mappedInboundTracks.get(this.trackIdentifier);
	}

	public createSample(): InboundRtpStats {
		return {
			timestamp: this.timestamp,
			id: this.id,
			ssrc: this.ssrc,
			kind: this.kind,
			trackIdentifier: this.trackIdentifier,
			transportId: this.transportId,
			codecId: this.codecId,
			packetsReceived: this.packetsReceived,
			packetsLost: this.packetsLost,
			jitter: this.jitter,
			mid: this.mid,
			remoteId: this.remoteId,
			framesDecoded: this.framesDecoded,
			keyFramesDecoded: this.keyFramesDecoded,
			framesRendered: this.framesRendered,
			framesDropped: this.framesDropped,
			frameWidth: this.frameWidth,
			frameHeight: this.frameHeight,
			framesPerSecond: this.framesPerSecond,
			qpSum: this.qpSum,
			totalDecodeTime: this.totalDecodeTime,
			totalInterFrameDelay: this.totalInterFrameDelay,
			totalSquaredInterFrameDelay: this.totalSquaredInterFrameDelay,
			pauseCount: this.pauseCount,
			totalPausesDuration: this.totalPausesDuration,
			freezeCount: this.freezeCount,
			totalFreezesDuration: this.totalFreezesDuration,
			lastPacketReceivedTimestamp: this.lastPacketReceivedTimestamp,
			headerBytesReceived: this.headerBytesReceived,
			packetsDiscarded: this.packetsDiscarded,
			fecBytesReceived: this.fecBytesReceived,
			fecPacketsReceived: this.fecPacketsReceived,
			fecPacketsDiscarded: this.fecPacketsDiscarded,
			bytesReceived: this.bytesReceived,
			nackCount: this.nackCount,
			firCount: this.firCount,
			pliCount: this.pliCount,
			totalProcessingDelay: this.totalProcessingDelay,
			estimatedPlayoutTimestamp: this.estimatedPlayoutTimestamp,
			jitterBufferDelay: this.jitterBufferDelay,
			jitterBufferTargetDelay: this.jitterBufferTargetDelay,
			jitterBufferEmittedCount: this.jitterBufferEmittedCount,
			jitterBufferMinimumDelay: this.jitterBufferMinimumDelay,
			totalSamplesReceived: this.totalSamplesReceived,
			concealedSamples: this.concealedSamples,
			silentConcealedSamples: this.silentConcealedSamples,
			concealmentEvents: this.concealmentEvents,
			insertedSamplesForDeceleration: this.insertedSamplesForDeceleration,
			removedSamplesForAcceleration: this.removedSamplesForAcceleration,
			audioLevel: this.audioLevel,
			totalAudioEnergy: this.totalAudioEnergy,
			totalSamplesDuration: this.totalSamplesDuration,
			framesReceived: this.framesReceived,
			decoderImplementation: this.decoderImplementation,
			playoutId: this.playoutId,
			powerEfficientDecoder: this.powerEfficientDecoder,
			framesAssembledFromMultiplePackets: this.framesAssembledFromMultiplePackets,
			totalAssemblyTime: this.totalAssemblyTime,
			retransmittedPacketsReceived: this.retransmittedPacketsReceived,
			retransmittedBytesReceived: this.retransmittedBytesReceived,
			rtxSsrc: this.rtxSsrc,
			fecSsrc: this.fecSsrc,
			totalCorruptionProbability: this.totalCorruptionProbability,
			totalSquaredCorruptionProbability: this.totalSquaredCorruptionProbability,
			corruptionMeasurements: this.corruptionMeasurements,
			attachments: this.attachments,
		}
	}
}