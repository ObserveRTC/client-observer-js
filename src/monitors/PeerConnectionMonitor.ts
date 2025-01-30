import { EventEmitter } from "events";
import { ClientMonitor } from "../ClientMonitor";
import { Detectors } from "../detectors/Detectors";
import { CertificateStats, CodecStats, DataChannelStats, IceCandidatePairStats, IceCandidateStats, IceTransportStats, InboundRtpStats, MediaPlayoutStats, MediaSourceStats, OutboundRtpStats, PeerConnectionSample, PeerConnectionTransportStats, RemoteInboundRtpStats, RemoteOutboundRtpStats } from "../schema/ClientSample";
import * as W3C from "../schema/W3cStatsIdentifiers";
import { createLogger } from "../utils/logger";
import { InboundRtpMonitor } from "./InboundRtpMonitor";
import { RemoteOutboundRtpMonitor } from "./RemoteOutboundRtpMonitor";
import { OutboundRtpMonitor } from "./OutboundRtpMonitor";
import { RemoteInboundRtpMonitor } from "./RemoteInboundRtpMonitor";
import { MediaSourceMonitor } from "./MediaSourceMonitor";
import { CodecMonitor } from "./CodecMonitor";
import { MediaPlayoutMonitor } from "./MediaPlayoutMonitor";
import { PeerConnectionTransportMonitor } from "./PeerConnectionTransportMonitor";
import { IceTransportMonitor } from "./IceTransportMonitor";
import { IceCandidateMonitor } from "./IceCandidateMonitor";
import { IceCandidatePairMonitor } from "./IceCandidatePairMonitor";
import { CertificateMonitor } from "./CertificateMonitor";
import { DataChannelMonitor } from "./DataChannelMonitor";
import { LongPcConnectionEstablishmentDetector } from "../detectors/LongPcConnectionEstablishment";
import { CongestionDetector } from "../detectors/CongestionDetector";
import { InboundTrackMonitor } from "./InboundTrackMonitor";
import { OutboundTrackMonitor } from "./OutboundTrackMonitor";
import { CalculatedScore } from "../scores/CalculatedScore";

const logger = createLogger('PeerConnectionMonitor');


export type PeerConnectionMonitorEvents = {
	'close': [],
	'update': [],
	'stats': [W3C.RtcStats[]],
}

export declare interface PeerConnectionMonitor {
	on<U extends keyof PeerConnectionMonitorEvents>(event: U, listener: (...args: PeerConnectionMonitorEvents[U]) => void): this;
	once<U extends keyof PeerConnectionMonitorEvents>(event: U, listener: (...args: PeerConnectionMonitorEvents[U]) => void): this;
	off<U extends keyof PeerConnectionMonitorEvents>(event: U, listener: (...args: PeerConnectionMonitorEvents[U]) => void): this;
	emit<U extends keyof PeerConnectionMonitorEvents>(event: U, ...args: PeerConnectionMonitorEvents[U]): boolean;
}

export class PeerConnectionMonitor extends EventEmitter {
	public readonly detectors: Detectors;
	public readonly mappedCodecMonitors = new Map<string, CodecMonitor>();
	public readonly mappedInboundRtpMonitors = new Map<number, InboundRtpMonitor>();
	public readonly mappedRemoteOutboundRtpMonitors = new Map<number, RemoteOutboundRtpMonitor>();
	public readonly mappedOutboundRtpMonitors = new Map<number, OutboundRtpMonitor>();
	public readonly mappedDataChannelMonitors = new Map<string, DataChannelMonitor>();
	public readonly mappedRemoteInboundRtpMonitors = new Map<number, RemoteInboundRtpMonitor>();
	public readonly mappedMediaSourceMonitors = new Map<string, MediaSourceMonitor>();
	public readonly mappedMediaPlayoutMonitors = new Map<string, MediaPlayoutMonitor>();
	public readonly mappedPeerConnectionTransportMonitors = new Map<string, PeerConnectionTransportMonitor>();
	public readonly mappedIceTransportMonitors = new Map<string, IceTransportMonitor>();
	public readonly mappedIceCandidateMonitors = new Map<string, IceCandidateMonitor>();
	public readonly mappedIceCandidatePairMonitors = new Map<string, IceCandidatePairMonitor>();
	public readonly mappedCertificateMonitors = new Map<string, CertificateMonitor>();

	// tracks that are detected at peer connection level, but not yet picked up by stats
	private readonly _pendingMediaStreamTracks = new Map<string, {
		track: MediaStreamTrack,
		attachments?: Record<string, unknown>,
	}>();
	public readonly mappedInboundTracks = new Map<string, InboundTrackMonitor>();
	public readonly mappedOutboundTracks = new Map<string, OutboundTrackMonitor>();

	// indexes
	// public readonly ωindexedCodecIdToInboundRtps = new Map<string, InboundRtpMonitor[]>();
	// public readonly ωindexedMediaSourceIdToOutboundRtps = new Map<string, OutboundRtpMonitor[]>();
	
	public closed = false;
	
	public sendingAudioBitrate = 0;
	public sendingVideoBitrate = 0;
	public receivingAudioBitrate = 0;
	public receivingVideoBitrate = 0;

	public outboundFractionLost = 0.0;
	public inboundFractionalLost = 0.0;

	public totalInboundPacketsLost = 0;
	public totalInboundPacketsReceived = 0;
	public totalOutboundPacketsSent = 0;
	public totalOutboundPacketsReceived = 0;
	public totalOutboundPacketsLost = 0;
	public totalDataChannelBytesSent = 0;
	public totalDataChannelBytesReceived = 0;
	public totalSentAudioBytes = 0;
	public totalSentVideoBytes = 0;
	public totalReceivedAudioBytes = 0;
	public totalReceivedVideoBytes = 0;
	public totalAvailableIncomingBitrate = 0;
	public totalAvailableOutgoingBitrate = 0;

	// deltas between two stats
	public ΔinboundPacketsLost = 0;
	public ΔinboundPacketsReceived = 0;
	public ΔoutboundPacketsSent = 0;
	public ΔoutboundPacketsReceived = 0;
	public ΔoutboundPacketsLost = 0;
	public ΔaudioBytesSent = 0;
	public ΔvideoBytesSent = 0;
	public ΔaudioBytesReceived = 0;
	public ΔvideoBytesReceived = 0;

	// adjust these to reflect what the name actually is
	public highestSeenSendingBitrate?: number;
	public highestSeenReceivingBitrate?: number;
	public highestSeenAvailableOutgoingBitrate?: number;
	public highestSeenAvailableIncomingBitrate?: number;

	public congested = false;
	public avgRttInSec?: number;
	public ewmaRttInSec?: number;
	public connectingStartedAt?: number;
	public connectedAt?: number;
	private _connectionState?: W3C.RtcPeerConnectionState;
	public iceState?: W3C.RtcIceTransportState;
	
	public usingTURN?: boolean;
	public usingTCP?: boolean;
	public calculatedStabilityScore: CalculatedScore = {
		weight: 1,
		value: undefined,
	}


	/**
	 * Additional data attached to this stats, will not be shipped to the server, 
	 * but can be used by the application
	 */
	public appData?: Record<string, unknown> | undefined;

	public constructor(
		public readonly peerConnectionId: string,
		private readonly _getStats: () => Promise<W3C.RtcStats[]>,
		public readonly parent: ClientMonitor,
		public attachments?: Record<string, unknown>,
	) {
		super();
		this.detectors = new Detectors(
			new LongPcConnectionEstablishmentDetector(this),
			new CongestionDetector(this),
		);
	}

	public get score() {
		return this.calculatedStabilityScore.value;
	}

	public get receivingBitrate() {
		return (this.receivingAudioBitrate ?? 0) + (this.receivingVideoBitrate ?? 0);
	}
	
	public get sendingBitrate() {
		return (this.sendingAudioBitrate ?? 0) + (this.sendingVideoBitrate ?? 0);
	}

	public get tracks() {
		return [ ...this.mappedInboundTracks.values(), ...this.mappedOutboundTracks.values() ];
	}
	
	public async getStats() {
		const stats = await this._getStats();

		this.emit('stats', stats);

		return stats;
	}

	public async accept(stats: W3C.RtcStats[]) {
		let sumOfRttInS =  0;
		let rttMeasurementsCounter = 0;
		let ΔbytesReceived = 0;
		let ΔbytesSent = 0;

		this.sendingAudioBitrate = 0;
		this.sendingVideoBitrate = 0;
		this.receivingAudioBitrate = 0;
		this.receivingVideoBitrate = 0;
		this.outboundFractionLost = 0;
		this.inboundFractionalLost = 0;
		this.totalAvailableIncomingBitrate = 0;
		this.totalAvailableOutgoingBitrate = 0;

		for (const statsItem of stats) {
			switch (statsItem.type) {
				case W3C.StatsType.codec: 
					this._updateCodec(statsItem);
					break;
				case W3C.StatsType.inboundRtp: {
					const monitor = this._updateInboundRtp(statsItem);

					switch (monitor?.kind) {
						case 'audio':
							this.receivingAudioBitrate += monitor?.bitrate ?? 0;
							break;
						case 'video':
							this.receivingVideoBitrate += monitor?.bitrate ?? 0;
							break;
					}

					this.inboundFractionalLost += monitor?.fractionLost ?? 0.0;
					ΔbytesReceived += monitor?.ΔbytesReceived ?? 0;
					break;
				}
				case W3C.StatsType.remoteOutboundRtp: {
					const monitor = this._updateRemoteOutboundRtp(statsItem);
					
					if (monitor?.roundTripTime) {
						sumOfRttInS += monitor.roundTripTime;
						++rttMeasurementsCounter;
					}
					break;
				}
				case W3C.StatsType.outboundRtp: {
					const monitor = this._updateOutboundRtp(statsItem);
					
					switch (monitor?.kind) {
						case 'audio':
							this.sendingAudioBitrate += monitor?.bitrate ?? 0;
							break;
						case 'video':
							this.sendingVideoBitrate += monitor?.bitrate ?? 0;
							break;
					}
					ΔbytesSent += monitor?.ΔbytesSent ?? 0;
					break;
				}
					
				case W3C.StatsType.remoteInboundRtp: {
					const monitor = this._updateRemoteInboundRtp(statsItem);

					this.outboundFractionLost += monitor?.fractionLost ?? 0.0;
					break;
				}
					
				case W3C.StatsType.dataChannel: {
					const monitor = this._updateDataChannel(statsItem);
					
					ΔbytesReceived += monitor?.ΔbytesReceived ?? 0;
					ΔbytesSent += monitor?.ΔbytesSent ?? 0;
					break;
				}
				case W3C.StatsType.mediaSource: 
					this._updateMediaSource(statsItem);
					break;
				case W3C.StatsType.mediaPlayout:
					this._updateMediaPlayout(statsItem);
					break;
				case W3C.StatsType.transport: {
					const monitor = this._updateIceTransport(statsItem);
					const selectedPair = monitor?.getSelectedCandidatePair();
					
					this.totalAvailableIncomingBitrate += selectedPair?.availableIncomingBitrate ?? 0;
					this.totalAvailableOutgoingBitrate += selectedPair?.availableOutgoingBitrate ?? 0;

					if (selectedPair?.currentRoundTripTime) {
						sumOfRttInS += selectedPair.currentRoundTripTime;
						++rttMeasurementsCounter;
					}
					break;
				}
					
				case W3C.StatsType.peerConnection:
					this._updatePeerConnectionTransport(statsItem);
					break;
				case W3C.StatsType.localCandidate:
				case W3C.StatsType.remoteCandidate:
					this._updateIceCandidate(statsItem);
					break;
				case W3C.StatsType.candidatePair:
					this._updateIceCandidatePair(statsItem);
					break;
				case W3C.StatsType.certificate:
					this._updateCertificate(statsItem);
					break;
				default:
					logger.debug('Unknown stats type', statsItem);
			}
		}
		
		this._checkVisited();

		if (0 < rttMeasurementsCounter) {
			this.avgRttInSec = sumOfRttInS / rttMeasurementsCounter;
			this.ewmaRttInSec = this.ewmaRttInSec !== undefined ? (this.avgRttInSec * 0.1) + (this.ewmaRttInSec * 0.9) : this.avgRttInSec;
		}

		this.ΔaudioBytesReceived = ΔbytesReceived;

		this.highestSeenAvailableIncomingBitrate = Math.max(this.highestSeenAvailableIncomingBitrate ?? 0, this.totalAvailableIncomingBitrate);
		this.highestSeenAvailableOutgoingBitrate = Math.max(this.highestSeenAvailableOutgoingBitrate ?? 0, this.totalAvailableOutgoingBitrate);
		this.highestSeenSendingBitrate = Math.max(this.highestSeenSendingBitrate ?? 0, this.sendingAudioBitrate + this.sendingVideoBitrate);
		this.highestSeenReceivingBitrate = Math.max(this.highestSeenReceivingBitrate ?? 0, this.receivingAudioBitrate + this.receivingVideoBitrate);

		const selectedIceCandidatePairs = this.selectedIceCandidatePairs;

		this.usingTCP = selectedIceCandidatePairs.some(pair => pair.getLocalCandidate()?.protocol === 'tcp');
		this.usingTURN = selectedIceCandidatePairs.some(pair => pair.getLocalCandidate()?.candidateType === 'relay') &&
			selectedIceCandidatePairs.some(pair => pair.getRemoteCandidate()?.url?.startsWith('turn:'));
		this.iceState = selectedIceCandidatePairs?.[0]?.getIceTransport()?.iceState as W3C.RtcIceTransportState;

		this.detectors.update();

		this.emit('update');
	}

	public createSample(): PeerConnectionSample {
		return {
			peerConnectionId: this.peerConnectionId,
			
			attachments: this.attachments,

			codecs: this.codecs.map(codec => codec.createSample()),
			inboundRtps: this.inboundRtps.map(inboundRtp => inboundRtp.createSample()),
			remoteOutboundRtps: this.remoteOutboundRtps.map(remoteOutboundRtp => remoteOutboundRtp.createSample()),
			outboundRtps: this.outboundRtps.map(outboundRtp => outboundRtp.createSample()),
			remoteInboundRtps: this.remoteInboundRtps.map(remoteInboundRtp => remoteInboundRtp.createSample()),
			mediaSources: this.mediaSources.map(mediaSource => mediaSource.createSample()),
			mediaPlayouts: this.mediaPlayouts.map(mediaPlayout => mediaPlayout.createSample()),
			peerConnectionTransports: this.peerConnectionTransports.map(peerConnectionTransport => peerConnectionTransport.createSample()),
			iceTransports: this.iceTransports.map(iceTransport => iceTransport.createSample()),
			iceCandidates: this.iceCandidates.map(iceCandidate => iceCandidate.createSample()),
			iceCandidatePairs: this.iceCandidatePairs.map(iceCandidatePair => iceCandidatePair.createSample()),
			certificates: this.certificates.map(certificate => certificate.createSample()),
			inboundTracks: [ ...this.mappedInboundTracks.values() ].map(inboundTrack => inboundTrack.createSample()),
			outboundTracks: [ ...this.mappedOutboundTracks.values() ].map(outboundTrack => outboundTrack.createSample()),
			score: this.score,
		}
	}

	public addMediaStreamTrack(track: MediaStreamTrack, attachments?: Record<string, unknown>) {
		if (track.readyState === 'ended') return;
		track.addEventListener('ended', () => {
			this._pendingMediaStreamTracks.delete(track.id);
			this.mappedInboundTracks.delete(track.id);
			this.mappedOutboundTracks.delete(track.id);
		});

		const mediaSource = this.mediaSources.find(mediaSource => mediaSource.trackIdentifier === track.id);
		
		if (mediaSource) {
			return this._createOutboundTrackMonitor(track, mediaSource, attachments);
		}

		const inboundRtp = this.inboundRtps.find(inboundRtp => inboundRtp.trackIdentifier === track.id);
		
		if (inboundRtp) {
			return this._createInboundTrackMonitor(track, inboundRtp, attachments);
		}

		this._pendingMediaStreamTracks.set(track.id, {
			track,
			attachments,
		});
	}

	public get codecs() {
		return [ ...this.mappedCodecMonitors.values() ];
	}

	public get inboundRtps() {
		return [ ...this.mappedInboundRtpMonitors.values() ];
	}

	public get remoteOutboundRtps() {
		return [ ...this.mappedRemoteOutboundRtpMonitors.values() ];
	}

	public get outboundRtps() {
		return [ ...this.mappedOutboundRtpMonitors.values() ];
	}

	public get remoteInboundRtps() {
		return [ ...this.mappedRemoteInboundRtpMonitors.values() ];
	}

	public get mediaSources() {
		return [ ...this.mappedMediaSourceMonitors.values() ];
	}

	public get mediaPlayouts() {
		return [ ...this.mappedMediaPlayoutMonitors.values() ];
	}

	public get dataChannels() {
		return [ ...this.mappedDataChannelMonitors.values() ];
	}

	public get peerConnectionTransports() {
		return [ ...this.mappedPeerConnectionTransportMonitors.values() ];
	}

	public get iceTransports() {
		return [ ...this.mappedIceTransportMonitors.values() ];
	}

	public get iceCandidates() {
		return [ ...this.mappedIceCandidateMonitors.values() ];
	}

	public get iceCandidatePairs() {
		return [ ...this.mappedIceCandidatePairMonitors.values() ];
	}

	public get certificates() {
		return [ ...this.mappedCertificateMonitors.values() ];
	}

	public get selectedIceCandidatePairs() {
		return this.iceTransports.map(iceTransport => iceTransport.getSelectedCandidatePair())
		.filter(pair => pair !== undefined) as IceCandidatePairMonitor[];
	}

	public set connectionState(state: W3C.RtcPeerConnectionState | undefined) {
		if (this._connectionState === state) return;
		this._connectionState = state;
		
		if (state === 'connecting') {
			this.connectingStartedAt = Date.now();
		} else if (state === 'connected') {
			this.connectedAt = Date.now();
		} else {
			this.connectingStartedAt = undefined;
			this.connectedAt = undefined;
		}
	}

	public get connectionState() {
		return this._connectionState;
	}

	private _checkVisited() {
		for (const [id, monitor] of this.mappedCodecMonitors) {
			if (monitor.visited) continue;
			this.mappedCodecMonitors.delete(id);
		}

		for (const [id, monitor] of this.mappedInboundRtpMonitors) {
			if (monitor.visited) continue;
			this.mappedInboundRtpMonitors.delete(id);
		}

		for (const [id, monitor] of this.mappedRemoteOutboundRtpMonitors) {
			if (monitor.visited) continue;
			this.mappedRemoteOutboundRtpMonitors.delete(id);
		}

		for (const [id, monitor] of this.mappedOutboundRtpMonitors) {
			if (monitor.visited) continue;
			this.mappedOutboundRtpMonitors.delete(id);
			monitor.getTrack()?.mappedOutboundRtps.delete(monitor.ssrc);
		}

		for (const [id, monitor] of this.mappedRemoteInboundRtpMonitors) {
			if (monitor.visited) continue;
			this.mappedRemoteInboundRtpMonitors.delete(id);
		}

		for (const [id, monitor] of this.mappedMediaSourceMonitors) {
			if (monitor.visited) continue;
			this.mappedMediaSourceMonitors.delete(id);
		}

		for (const [id, monitor] of this.mappedMediaPlayoutMonitors) {
			if (monitor.visited) continue;
			this.mappedMediaPlayoutMonitors.delete(id);
		}

		for (const [id, monitor] of this.mappedPeerConnectionTransportMonitors) {
			if (monitor.visited) continue;
			this.mappedPeerConnectionTransportMonitors.delete(id);
		}

		for (const [id, monitor] of this.mappedIceTransportMonitors) {
			if (monitor.visited) continue;
			this.mappedIceTransportMonitors.delete(id);
		}

		for (const [id, monitor] of this.mappedIceCandidateMonitors) {
			if (monitor.visited) continue;
			this.mappedIceCandidateMonitors.delete(id);
		}

		for (const [id, monitor] of this.mappedIceCandidatePairMonitors) {
			if (monitor.visited) continue;
			this.mappedIceCandidatePairMonitors.delete(id);
		}

		for (const [id, monitor] of this.mappedCertificateMonitors) {
			if (monitor.visited) continue;
			this.mappedCertificateMonitors.delete(id);
		}

		for (const [id, monitor] of this.mappedDataChannelMonitors) {
			if (monitor.visited) continue;
			this.mappedDataChannelMonitors.delete(id);
		}
	}

	public close() {
		if (this.closed) return;
		this.closed = true;

		// this will clear up everything since the second time
		// the visited will be false, hence will delete the monitors
		this._checkVisited();
		this._checkVisited();

		this.emit('close');
	}

	private _updateCodec(input: Partial<CodecStats>) {
		if (this.closed) return;
		if (
			input.id === undefined ||
			input.timestamp === undefined ||
			input.payloadType === undefined ||
			input.mimeType === undefined
		) {
			return logger.warn('Invalid codec stats', input);
		}

		const stats = input as CodecStats;
		
		let codecMonitor = this.mappedCodecMonitors.get(stats.id);
		if (!codecMonitor) {
			codecMonitor = new CodecMonitor(this, stats);
			this.mappedCodecMonitors.set(stats.id, codecMonitor);

			this.parent.emit('new-codec-monitor', {
				clientMonitor: this.parent,
				codecMonitor,
			});
		}

		codecMonitor.accept(stats);
	}

	private _updateInboundRtp(input: Partial<InboundRtpStats>): InboundRtpMonitor | undefined | void {
		if (this.closed) return;
		if (
			input.id === undefined ||
			input.timestamp === undefined ||
			input.ssrc === undefined ||
			input.kind === undefined ||
			input.trackIdentifier === undefined
		) {
			return logger.warn('Invalid inboundRtp stats', input);
		}

		const stats = input as InboundRtpStats;
		
		let inboundRtpMonitor = this.mappedInboundRtpMonitors.get(stats.ssrc);
		if (!inboundRtpMonitor) {
			inboundRtpMonitor = new InboundRtpMonitor(this, stats);
			this.mappedInboundRtpMonitors.set(stats.ssrc, inboundRtpMonitor);
			
			this.parent.emit('new-inbound-rtp-monitor', {
				clientMonitor: this.parent,
				inboundRtpMonitor,
			});

			const pendingTrack = this._pendingMediaStreamTracks.get(stats.trackIdentifier ?? '');

			if (pendingTrack) {
				this._createInboundTrackMonitor(pendingTrack.track, inboundRtpMonitor, pendingTrack.attachments);
			}
		}

		inboundRtpMonitor.accept(stats);

		return inboundRtpMonitor;
	}

	private _updateDataChannel(input: Partial<DataChannelStats>): DataChannelMonitor | undefined | void {
		if (this.closed) return;
		if (
			input.id === undefined ||
			input.timestamp === undefined ||
			input.label === undefined
		) {
			return logger.warn('Invalid dataChannel stats', input);
		}

		const stats = input as DataChannelStats;
		
		let dataChannelMonitor = this.mappedDataChannelMonitors.get(stats.id);
		if (!dataChannelMonitor) {
			dataChannelMonitor = new DataChannelMonitor(this, stats);
			this.mappedDataChannelMonitors.set(stats.id, dataChannelMonitor);

			this.parent.emit('new-data-channel-monitor', {
				clientMonitor: this.parent,
				dataChannelMonitor,
			});
		}

		dataChannelMonitor.accept(stats);

		return dataChannelMonitor;
	}

	private _updateRemoteOutboundRtp(input: Partial<RemoteOutboundRtpStats>): RemoteOutboundRtpMonitor | undefined | void {
		if (this.closed) return;
		if (
			input.id === undefined ||
			input.timestamp === undefined ||
			input.ssrc === undefined ||
			input.kind === undefined
		) {
			return logger.warn('Invalid remoteOutboundRtp stats', input);
		}

		const stats = input as RemoteOutboundRtpStats;
		
		let remoteOutboundRtpMonitor = this.mappedRemoteOutboundRtpMonitors.get(stats.ssrc);
		if (!remoteOutboundRtpMonitor) {
			remoteOutboundRtpMonitor = new RemoteOutboundRtpMonitor(this, stats);
			this.mappedRemoteOutboundRtpMonitors.set(stats.ssrc, remoteOutboundRtpMonitor);

			this.parent.emit('new-remote-outbound-rtp-monitor', {
				clientMonitor: this.parent,
				remoteOutboundRtpMonitor,
			});
		}

		remoteOutboundRtpMonitor.accept(stats);

		return remoteOutboundRtpMonitor;
	}

	private _updateOutboundRtp(input: Partial<OutboundRtpStats>): OutboundRtpMonitor | undefined | void {
		if (this.closed) return;
		if (
			input.id === undefined ||
			input.timestamp === undefined ||
			input.ssrc === undefined ||
			input.kind === undefined
		) {
			return logger.warn('Invalid outboundRtp stats', input);
		}

		const stats = input as OutboundRtpStats;
		
		let outboundRtpMonitor = this.mappedOutboundRtpMonitors.get(stats.ssrc);
		if (!outboundRtpMonitor) {
			outboundRtpMonitor = new OutboundRtpMonitor(this, stats);
			this.mappedOutboundRtpMonitors.set(stats.ssrc, outboundRtpMonitor);

			this.parent.emit('new-outbound-rtp-monitor', {
				clientMonitor: this.parent,
				outboundRtpMonitor,
			});

			const track = outboundRtpMonitor.getTrack();

			if (track && !track.mappedOutboundRtps.has(stats.ssrc)) {
				track.mappedOutboundRtps.set(stats.ssrc, outboundRtpMonitor);
			}
		}
		

		outboundRtpMonitor.accept(stats);

		return outboundRtpMonitor;
	}

	private _updateRemoteInboundRtp(input: Partial<RemoteInboundRtpStats>): RemoteInboundRtpMonitor | undefined | void {
		if (this.closed) return;
		if (
			input.id === undefined ||
			input.timestamp === undefined ||
			input.ssrc === undefined ||
			input.kind === undefined
		) {
			return logger.warn('Invalid remoteInboundRtp stats', input);
		}

		const stats = input as RemoteInboundRtpStats;
		
		let remoteInboundRtpMonitor = this.mappedRemoteInboundRtpMonitors.get(stats.ssrc);
		if (!remoteInboundRtpMonitor) {
			remoteInboundRtpMonitor = new RemoteInboundRtpMonitor(this, stats);
			this.mappedRemoteInboundRtpMonitors.set(stats.ssrc, remoteInboundRtpMonitor);

			this.parent.emit('new-remote-inbound-rtp-monitor', {
				clientMonitor: this.parent,
				remoteInboundRtpMonitor,
			});
		}

		remoteInboundRtpMonitor.accept(stats);

		return remoteInboundRtpMonitor;
	}

	private _updateMediaSource(input: Partial<MediaSourceStats>): MediaSourceMonitor | undefined | void {
		if (this.closed) return;
		if (
			input.id === undefined ||
			input.timestamp === undefined ||
			input.trackIdentifier === undefined ||
			input.kind === undefined
		) {
			return logger.warn('Invalid mediaSource stats', input);
		}

		const stats = input as MediaSourceStats;
		
		let mediaSourceMonitor = this.mappedMediaSourceMonitors.get(stats.id);
		if (!mediaSourceMonitor) {
			mediaSourceMonitor = new MediaSourceMonitor(this, stats);
			this.mappedMediaSourceMonitors.set(stats.id, mediaSourceMonitor);
			this.parent.emit('new-media-source-monitor', {
				clientMonitor: this.parent,
				mediaSourceMonitor,
			});

			if (stats.trackIdentifier) {
				const pendingTrack = this._pendingMediaStreamTracks.get(stats.trackIdentifier);

				if (pendingTrack) {
					this._createOutboundTrackMonitor(pendingTrack.track, mediaSourceMonitor, pendingTrack.attachments);
				}
			}
		}

		mediaSourceMonitor.accept(stats);

		return mediaSourceMonitor;
	}

	private _updateMediaPlayout(input: Partial<MediaPlayoutStats>): MediaPlayoutMonitor | undefined | void {
		if (this.closed) return;
		if (
			input.id === undefined ||
			input.timestamp === undefined ||
			input.kind === undefined
		) {
			return logger.warn('Invalid mediaPlayout stats', input);
		}

		const stats = input as MediaPlayoutStats;
		
		let mediaPlayoutMonitor = this.mappedMediaPlayoutMonitors.get(stats.id);
		if (!mediaPlayoutMonitor) {
			mediaPlayoutMonitor = new MediaPlayoutMonitor(this, stats);
			this.mappedMediaPlayoutMonitors.set(stats.id, mediaPlayoutMonitor);

			this.parent.emit('new-media-playout-monitor', {
				clientMonitor: this.parent,
				mediaPlayoutMonitor,
			});
		}

		mediaPlayoutMonitor.accept(stats);

		return mediaPlayoutMonitor;
	}

	public _updatePeerConnectionTransport(input: Partial<PeerConnectionTransportStats>): PeerConnectionTransportMonitor | undefined | void {
		if (this.closed) return;
		if (
			input.id === undefined ||
			input.timestamp === undefined ||
			input.dataChannelsOpened === undefined ||
			input.dataChannelsClosed === undefined
		) {
			return logger.warn('Invalid peerConnectionTransport stats', input);
		}

		const stats = input as PeerConnectionTransportStats;
		
		let peerConnectionTransportMonitor = this.mappedPeerConnectionTransportMonitors.get(stats.id);
		if (!peerConnectionTransportMonitor) {
			peerConnectionTransportMonitor = new PeerConnectionTransportMonitor(this, stats);
			this.mappedPeerConnectionTransportMonitors.set(stats.id, peerConnectionTransportMonitor);

			this.parent.emit('new-peer-connection-transport-monitor', {
				clientMonitor: this.parent,
				peerConnectionTransportMonitor,
			});
		}

		peerConnectionTransportMonitor.accept(stats);
		
		return peerConnectionTransportMonitor;
	}

	private _updateIceTransport(input: Partial<IceTransportStats>): IceTransportMonitor | undefined | void {
		if (this.closed) return;
		if (
			input.id === undefined ||
			input.timestamp === undefined
		) {
			return logger.warn('Invalid iceTransport stats', input);
		}

		const stats = input as IceTransportStats;
		
		let iceTransportMonitor = this.mappedIceTransportMonitors.get(stats.id);
		if (!iceTransportMonitor) {
			iceTransportMonitor = new IceTransportMonitor(this, stats);
			this.mappedIceTransportMonitors.set(stats.id, iceTransportMonitor);

			this.parent.emit('new-ice-transport-monitor', {
				clientMonitor: this.parent,
				iceTransportMonitor,
			});
		}

		iceTransportMonitor.accept(stats);

		return iceTransportMonitor;
	}

	private _updateIceCandidate(input: Partial<IceCandidateStats>): IceCandidateMonitor | undefined | void {
		if (this.closed) return;
		if (
			input.id === undefined ||
			input.timestamp === undefined ||
			input.protocol === undefined
		) {
			return logger.warn('Invalid iceCandidate stats', input);
		}

		const stats = input as IceCandidateStats;
		
		let iceCandidateMonitor = this.mappedIceCandidateMonitors.get(stats.id);
		if (!iceCandidateMonitor) {
			iceCandidateMonitor = new IceCandidateMonitor(this, stats);
			this.mappedIceCandidateMonitors.set(stats.id, iceCandidateMonitor);

			this.parent.emit('new-ice-candidate-monitor', {
				clientMonitor: this.parent,
				iceCandidateMonitor,
			});
		}

		iceCandidateMonitor.accept(stats);

		return iceCandidateMonitor;
	}

	private _updateIceCandidatePair(input: Partial<IceCandidatePairStats>): IceCandidatePairMonitor | undefined | void {
		if (this.closed) return;
		if (
			input.id === undefined ||
			input.timestamp === undefined ||
			input.state === undefined
		) {
			return logger.warn('Invalid iceCandidatePair stats', input);
		}

		const stats = input as IceCandidatePairStats;
		
		let iceCandidatePairMonitor = this.mappedIceCandidatePairMonitors.get(stats.id);
		if (!iceCandidatePairMonitor) {
			iceCandidatePairMonitor = new IceCandidatePairMonitor(this, stats);
			this.mappedIceCandidatePairMonitors.set(stats.id, iceCandidatePairMonitor);

			this.parent.emit('new-ice-candidate-pair-monitor', {
				clientMonitor: this.parent,
				iceCandidatePairMonitor,
			});
		}

		iceCandidatePairMonitor.accept(stats);

		return iceCandidatePairMonitor;
	}

	private _updateCertificate(input: Partial<CertificateStats>): CertificateMonitor | undefined | void {
		if (this.closed) return;
		if (
			input.id === undefined ||
			input.timestamp === undefined ||
			input.fingerprint === undefined ||
			input.fingerprintAlgorithm === undefined
		) {
			return logger.warn('Invalid certificate stats', input);
		}

		const stats = input as CertificateStats;
		
		let certificateMonitor = this.mappedCertificateMonitors.get(stats.id);
		if (!certificateMonitor) {
			certificateMonitor = new CertificateMonitor(this, stats);
			this.mappedCertificateMonitors.set(stats.id, certificateMonitor);

			this.parent.emit('new-certificate-monitor', {
				clientMonitor: this.parent,
				certificateMonitor,
			});
		}

		certificateMonitor.accept(stats);
	
		return certificateMonitor;
	}

	private _createOutboundTrackMonitor(track: MediaStreamTrack, mediaSourceMonitor: MediaSourceMonitor, attachments?: Record<string, unknown>) {
		if (this.mappedOutboundTracks.has(track.id)) return;

		const trackMonitor = new OutboundTrackMonitor(
			track,
			mediaSourceMonitor,
			attachments,
		);
		this._pendingMediaStreamTracks.delete(track.id);
		this.mappedOutboundTracks.set(track.id, trackMonitor);

		for (const outboundRtp of this.mappedOutboundRtpMonitors.values()) {
			if (outboundRtp.trackIdentifier !== track.id) continue;
			trackMonitor.mappedOutboundRtps.set(outboundRtp.ssrc, outboundRtp);
		}
	}

	private _createInboundTrackMonitor(track: MediaStreamTrack, inboundRtpMonitor: InboundRtpMonitor, attachments?: Record<string, unknown>) {
		if (this.mappedInboundTracks.has(track.id)) return;
	
		const trackMonitor = new InboundTrackMonitor(
			track,
			inboundRtpMonitor,
			attachments,
		);

		this._pendingMediaStreamTracks.delete(track.id);
		this.mappedInboundTracks.set(track.id, trackMonitor);
		
	}
}