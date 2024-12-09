import { StatsMap, StatsVisitor, createStatsVisitor } from "../utils/Stats";
import {
    CodecEntry,
    ContributingSourceEntry,
    InboundRtpEntry,
    OutboundRtpEntry,
    RemoteInboundRtpEntry,
    RemoteOutboundRtpEntry,
    DataChannelEntry,
    TransceiverEntry,
    SenderEntry,
    ReceiverEntry,
    TransportEntry,
    SctpTransportEntry,
    IceCandidatePairEntry,
    LocalCandidateEntry,
    RemoteCandidateEntry,
    CertificateEntry,
    IceServerEntry,
    MediaSourceEntry,
    StatsEntryAbs,
    PeerConnectionEntry,
    AudioPlayoutEntry,
    PeerConnectionEntryEvents,
} from "./StatsEntryInterfaces";
import * as W3C from '../schema/W3cStatsIdentifiers'
import { TypedEventEmitter, TypedEvents } from "../utils/TypedEmitter";
import { IndexedMap } from "../utils/IndexedMap";
import { calculateAudioMOS, calculateVideoMOS } from "./UpdateFields";
import type { StatsStorage } from "./StatsStorage";

const SSRC_INDEX = 'ssrc';


interface InnerOutboundRtpEntry extends OutboundRtpEntry {
    updateStabilityScore(currentRtt: number): void;
}

export class PeerConnectionEntryManifest implements PeerConnectionEntry {
    
    public totalInboundPacketsLost = 0;
    public totalInboundPacketsReceived = 0;
    public totalOutboundPacketsLost = 0;
    public totalOutboundPacketsReceived = 0;
    public totalOutboundPacketsSent = 0;
    public totalDataChannelBytesSent = 0;
    public totalDataChannelBytesReceived = 0;
    public totalSentAudioBytes = 0;
    public totalSentVideoBytes = 0;
    public totalReceivedAudioBytes = 0;
    public totalReceivedVideoBytes = 0;

    public deltaInboundPacketsLost?: number;
    public deltaInboundPacketsReceived?: number;
    public deltaOutboundPacketsLost?: number;
    public deltaOutboundPacketsReceived?: number;
    public deltaOutboundPacketsSent?: number;
    public deltaDataChannelBytesSent?: number;
    public deltaDataChannelBytesReceived?: number;
    public deltaReceivedAudioBytes?: number;
    public deltaReceivedVideoBytes?: number;
    public deltaSentAudioBytes?: number;
    public deltaSentVideoBytes?: number;

    public avgRttInS?: number;
    public sendingAudioBitrate?: number;
    public sendingVideoBitrate?: number;
    public sendingFractionLost?: number;

    public receivingAudioBitrate?: number;
    public receivingVideoBitrate?: number;
    public receivingFractionLost?: number;

    private _connectionState: W3C.RtcPeerConnectionState = 'new';
    public _connectingStartedAt?: number;
    public _connectionEstablihedDurationInMs?: number;
    public congested?: boolean;

    public readonly config: {
        outbStabilityScoresLength: number;
        framesPerSecWindowLength: number,
    };

    private readonly _emitter = new TypedEventEmitter<PeerConnectionEntryEvents>();

    private _closed = false;
    public stats: W3C.PeerConnectionStats | undefined;

    private readonly _codecs = new Map<string, CodecEntry>();
    private readonly _inboundRtps = new IndexedMap<string, InboundRtpEntry, number | string>();
    private readonly _outboundRtps = new IndexedMap<string, InnerOutboundRtpEntry, number | string>();
    private readonly _remoteInboundRtps = new IndexedMap<string, RemoteInboundRtpEntry, number | string>();
    private readonly _remoteOutboundRtps = new IndexedMap<string, RemoteOutboundRtpEntry,  number | string>();
    private readonly _mediaSources = new Map<string, MediaSourceEntry>();
    private readonly _contributingSources = new Map<string, ContributingSourceEntry>();
    private readonly _dataChannels = new Map<string, DataChannelEntry>();
    private readonly _transports = new Map<string, TransportEntry>();
    private readonly _iceCandidatePairs = new Map<string, IceCandidatePairEntry>();
    private readonly _localCandidates = new Map<string, LocalCandidateEntry>();
    private readonly _remoteCandidates = new Map<string, RemoteCandidateEntry>();
    private readonly _certificates = new Map<string, CertificateEntry>();
    private readonly _audioPlayouts = new Map<string, AudioPlayoutEntry>();

    // Deprecated collections due to webrtc stats changes
    // --------------------------------------------------
    private readonly _transceivers = new Map<string, TransceiverEntry>();
    private readonly _senders = new Map<string, SenderEntry>();
    private readonly _receivers = new Map<string, ReceiverEntry>();
    private readonly _sctpTransports = new Map<string, SctpTransportEntry>();
    private readonly _iceServers = new Map<string, IceServerEntry>();

    // helper fields
    // private _lastAvgRttInS = -1;
    private _visit: StatsVisitor;
    
    public constructor(
        public readonly storage: StatsStorage,
        public readonly peerConnectionId: string,
        public readonly label: string | undefined,
    ) {
        this.config = {
            outbStabilityScoresLength: 10,
            framesPerSecWindowLength: 8,
        }
        this._inboundRtps
            .addIndex(SSRC_INDEX, (entry) => entry.stats.ssrc)
        
        this._outboundRtps
            .addIndex(SSRC_INDEX, (entry) => entry.stats.ssrc)

        this._remoteInboundRtps
            .addIndex(SSRC_INDEX, (entry) => entry.stats.ssrc);
        
        this._remoteOutboundRtps
            .addIndex(SSRC_INDEX, (entry) => entry.stats.ssrc);

        this._visit = createStatsVisitor({
            codec: (stats: W3C.CodecStats) => this._visitCodec(stats),
            inboundRtp: (stats: W3C.InboundRtpStats) => this._visitInboundRtp(stats),
            outboundRtp: (stats: W3C.OutboundRtpStats) => this._visitOutboundRtp(stats),
            remoteInboundRtp: (stats: W3C.RemoteInboundRtpStats) => this._visitRemoteInboundRtp(stats),
            remoteOutboundRtp: (stats: W3C.RemoteOutboundRtpStats) => this._visitRemoteOutboundRtp(stats),
            mediaSource: (stats: W3C.MediaSourceStats) => this._visitMediaSource(stats),
            peerConnection: (stats: W3C.PeerConnectionStats) => this._visitPeerConnection(stats),
            dataChannel: (stats: W3C.DataChannelStats) => this._visitDataChannel(stats),
            iceCandidatePair: (stats: W3C.CandidatePairStats) => this._visitIceCandidatePair(stats),
            localCandidate: (stats: W3C.LocalCandidateStats) => this._visitLocalCandidate(stats),
            remoteCandidate: (stats: W3C.RemoteCandidateStats) => this._visitRemoteCandidate(stats),
            certificate: (stats: W3C.CertificateStats) => this._visitCertificate(stats),
            mediaPlayout: (stats: W3C.MediaPlayoutStats) => this._visitAudioPlayout(stats),
            contributingSource: (stats: W3C.ContributingSourceStats) => this._visitContributingSource(stats),
            transceiver: (stats: W3C.TransceiverStats) => this._visitTransceiver(stats),
            sender: (stats: W3C.SenderStats) => this._visitSender(stats),
            receiver: (stats: W3C.ReceiverStats) => this._visitReceiver(stats),
            transport: (stats: W3C.TransportStats) => this._visitTransport(stats),
            sctpTransport: (stats: W3C.SctpTransportStats) => this._visitSctpTransport(stats),
            iceServer: (stats: W3C.IceServerStats) => this._visitIceServer(stats),
        });
    }

    public get statsId(): string | undefined {
        return this.stats?.id;
    }

    public get events(): TypedEvents<PeerConnectionEntryEvents> {
        return this._emitter;
    }

    public get usingTCP(): boolean {
        return this.getSelectedIceCandidatePair()?.getLocalCandidate()?.stats.protocol === 'tcp';
    }

    public get usingTURN(): boolean {
        return (this.getSelectedIceCandidatePair()?.getLocalCandidate()?.stats.candidateType === 'relay') &&
            (this.getSelectedIceCandidatePair()?.getRemoteCandidate()?.stats.url?.startsWith('turn:') ?? false);
    }

    public get iceState() {
        return this.getSelectedIceCandidatePair()?.getTransport()?.stats.iceState;
    }

    public get connectionEstablihedDurationInMs() {
        return this._connectionEstablihedDurationInMs;
    }

    public get connectionState(): W3C.RtcPeerConnectionState {
        return this._connectionState;
    }

    public set connectionState(state: W3C.RtcPeerConnectionState) {
        const oldState = this._connectionState;
        switch (state) {
            case 'connecting':
                this._connectionEstablihedDurationInMs = undefined;
                this._connectingStartedAt = Date.now();
                break;
            case 'connected':
                if (this._connectingStartedAt !== undefined) {
                    this._connectionEstablihedDurationInMs = Date.now() - this._connectingStartedAt 
                }
                break;
        }
        this._connectionState = state;

        if (oldState !== state) {
            this._emitState();
        }
    }

    private _getStateSummaryString() {
        return `${this.iceState}-${this.usingTCP}-${this.usingTURN}`;
    }

    private _emitState() {
        this._emitter.emit('state-updated', {
            pcConnectionState: this.connectionState,
            iceState: this.iceState,
            usingTCP: this.usingTCP,
            usingTURN: this.usingTURN,
        });
    }

    public update(statsMap: StatsMap) {
        const oldStateSummary = this._getStateSummaryString();

        for (const statsValue of statsMap) {
            this._visit(statsValue);
        }

        const newStateSummary = this._getStateSummaryString();
        
        this._trimEntries();
        this._updateMetrics();

        if (oldStateSummary !== newStateSummary) {
            this._emitState();
        }
    }

    public close() {
        if (this._closed) {
            return;
        }
        this._closed = true;
        // make sure every entry is removed due to not visited
        this._trimEntries();
        this._trimEntries();
        this._emitter.emit('close', undefined);
    }

    public codecs(): IterableIterator<CodecEntry> {
        return this._codecs.values();
    }

    public inboundRtps(ssrc?: number): IterableIterator<InboundRtpEntry> {
        if (ssrc) return this._inboundRtps.getAllByIndex(SSRC_INDEX, ssrc)?.values() ?? [];
        return this._inboundRtps.values();
    }

    public outboundRtps(ssrc?: number): IterableIterator<OutboundRtpEntry> {
        if (ssrc) return this._outboundRtps.getAllByIndex(SSRC_INDEX, ssrc)?.values() ?? [];
        return this._outboundRtps.values();
    }

    public remoteInboundRtps(): IterableIterator<RemoteInboundRtpEntry> {
        return this._remoteInboundRtps.values();
    }

    public remoteOutboundRtps(): IterableIterator<RemoteOutboundRtpEntry> {
        return this._remoteOutboundRtps.values();
    }

    public mediaSources(): IterableIterator<MediaSourceEntry> {
        return this._mediaSources.values();
    }

    public contributingSources(): IterableIterator<ContributingSourceEntry> {
        return this._contributingSources.values();
    }

    public dataChannels(): IterableIterator<DataChannelEntry> {
        return this._dataChannels.values();
    }

    public transports(): IterableIterator<TransportEntry> {
        return this._transports.values();
    }

    public iceCandidatePairs(): IterableIterator<IceCandidatePairEntry> {
        return this._iceCandidatePairs.values();
    }

    public localCandidates(): IterableIterator<LocalCandidateEntry> {
        return this._localCandidates.values();
    }

    public remoteCandidates(): IterableIterator<RemoteCandidateEntry> {
        return this._remoteCandidates.values();
    }

    public certificates(): IterableIterator<CertificateEntry> {
        return this._certificates.values();
    }
    
    public audioPlayouts(): IterableIterator<AudioPlayoutEntry> {
        return this._audioPlayouts.values();
    }
    
    public transceivers(): IterableIterator<TransceiverEntry> {
        return this._transceivers.values();
    }
    
    public senders(): IterableIterator<SenderEntry> {
        return this._senders.values();
    }

    public receivers(): IterableIterator<ReceiverEntry> {
        return this._receivers.values();
    }
    
    public sctpTransports(): IterableIterator<SctpTransportEntry> {
        return this._sctpTransports.values();
    }

    public iceServers(): IterableIterator<IceServerEntry> {
        return this._iceServers.values();
    }

    public getSelectedIceCandidatePair(): IceCandidatePairEntry | undefined {
        for (const transport of this.transports()) {
            const result = transport.getSelectedIceCandidatePair();
            if (result) return result;
        }
    }

    private _visitPeerConnection(stats: W3C.PeerConnectionStats): void {
        this.stats = stats;
    }

    private _visitCodec(stats: W3C.CodecStats): void {
        let entry = this._codecs.get(stats.id);
        if (!entry) {
            entry = this._createCodecEntry(stats);
            this._codecs.set(stats.id, entry);
        }
        entry.stats = stats;
        entry.visited = true;
    }

    private _visitInboundRtp(stats: W3C.InboundRtpStats): void {
        let entry = this._inboundRtps.get(stats.id);
        if (!entry) {
            entry = this._createInboundRtpEntry(stats);
            this._inboundRtps.set(stats.id, entry);
            this._emitter.emit('inbound-rtp-added', entry);
        }
        const elapsedTimeInSec = (stats.timestamp - entry.stats.timestamp) / 1000.0;
        entry.avgJitterBufferDelayInMs = (((stats.jitterBufferDelay ?? 0) - (entry.stats.jitterBufferDelay ?? 0)) / ((Math.max(stats.jitterBufferEmittedCount ?? 1, 1)) - (entry.stats.jitterBufferEmittedCount ?? 0))) * 1000.0;
        entry.receivedPackets = (stats.packetsReceived ?? 0) - (entry.stats.packetsReceived ?? 0);
        entry.receivingBitrate = (((stats.bytesReceived ?? 0) - (entry.stats.bytesReceived ?? 0)) * 8) / elapsedTimeInSec;
        entry.receivedBytes = ((stats.bytesReceived ?? 0) - (entry.stats.bytesReceived ?? 0));
        entry.lostPackets = (stats.packetsLost ?? 0) - (entry.stats.packetsLost ?? 0);
        entry.receivedFrames = (stats.framesReceived ?? 0) - (entry.stats.framesReceived ?? 0);
        entry.decodedFrames = (stats.framesDecoded ?? 0) - (entry.stats.framesDecoded ?? 0);
        entry.droppedFrames = (stats.framesDropped ?? 0) - (entry.stats.framesDropped ?? 0);
        entry.receivedSamples = (stats.totalSamplesReceived ?? 0) - (entry.stats.totalSamplesReceived ?? 0);
        entry.silentConcealedSamples = (stats.silentConcealedSamples ?? 0) - (entry.stats.silentConcealedSamples ?? 0);
        entry.fractionLoss = entry.lostPackets === 0 && entry.receivedPackets === 0 ? 0 : entry.lostPackets / (entry.lostPackets +  entry.receivedPackets);
        entry.framesPerSecond = stats.framesPerSecond ?? (entry.receivedFrames ? (entry.receivedFrames / Math.max(1, elapsedTimeInSec)) : 0);

        entry.stats = stats;
        entry.visited = true;

        if (entry.stats.kind === 'audio') {
            entry.score = calculateAudioMOS(
                entry.receivingBitrate,
                entry.fractionLoss,
                entry.avgJitterBufferDelayInMs,
                (this.avgRttInS ?? 0) * 1000.0,
                false,
                false,
            );
        } else if (entry.stats.kind === 'video') {
            entry.score = calculateVideoMOS(
                entry.receivingBitrate,
                entry.stats.frameWidth ?? 640,
                entry.stats.frameHeight ?? 480,
                entry.avgJitterBufferDelayInMs,
                (this.avgRttInS ?? 0) * 1000.0,
                'vp8',
                entry.stats.framesPerSecond ?? 30,
                entry.expectedFrameRate ?? 30,
            );

            entry.framesPerSecond && entry.lastNFramesPerSec.push(entry.framesPerSecond);
            while (this.config.framesPerSecWindowLength < entry.lastNFramesPerSec.length) {
                entry.lastNFramesPerSec.shift();
            }
            if (0 < entry.lastNFramesPerSec.length) {
                const avgFramesPerSec = entry.lastNFramesPerSec.reduce((acc, fps) => acc + fps, 0) / entry.lastNFramesPerSec.length;
                const avgDiff = entry.lastNFramesPerSec.reduce((acc, fps) => acc + Math.abs(fps - avgFramesPerSec), 0) / entry.lastNFramesPerSec.length

                entry.avgFramesPerSec = avgFramesPerSec;
                entry.fpsVolatility = avgDiff / avgFramesPerSec;
            }
            
        }
    }
    
    private _visitOutboundRtp(stats: W3C.OutboundRtpStats): void {
        let entry = this._outboundRtps.get(stats.id);
        if (!entry) {
            entry = this._createOutboundRtpEntry(stats);
            this._outboundRtps.set(stats.id, entry);
            this._emitter.emit('outbound-rtp-added', entry);
        }
        const elapsedTimeInSec = (stats.timestamp - entry.stats.timestamp) / 1000.0;
        entry.sentBytes = Math.max(0, ((stats.bytesSent ?? 0) - (entry.stats.bytesSent ?? 0)));
        entry.sendingBitrate = (((stats.bytesSent ?? 0) - (entry.stats.bytesSent ?? 0)) * 8) / elapsedTimeInSec;
        entry.sentPackets = (stats.packetsSent ?? 0) - (entry.stats.packetsSent ?? 0);
        entry.stats = stats;
        entry.visited = true;
    }

    private _visitRemoteInboundRtp(stats: W3C.RemoteInboundRtpStats): void {
        let entry = this._remoteInboundRtps.get(stats.id);
        if (!entry) {
            entry = this._createRemoteInboundRtpEntry(stats);
            this._remoteInboundRtps.set(stats.id, entry);
            this._emitter.emit('remote-inbound-rtp-added', entry);
        }
        entry.receivedPackets = Math.max(0, (stats.packetsReceived ?? 0) - (entry.stats.packetsReceived ?? 0));
        entry.lostPackets = (stats.packetsLost ?? 0) - (entry.stats.packetsLost ?? 0);
        entry.stats = stats;
        entry.visited = true;
    }

    private _visitRemoteOutboundRtp(stats: W3C.RemoteOutboundRtpStats): void {
        let entry = this._remoteOutboundRtps.get(stats.id);
        if (!entry) {
            entry = this._createRemoteOutboundRtpEntry(stats);
            this._remoteOutboundRtps.set(stats.id, entry);
            this._emitter.emit('remote-outbound-rtp-added', entry);
        }
        entry.stats = stats;
        entry.visited = true;
    }

    private _visitMediaSource(stats: W3C.MediaSourceStats): void {
        let entry = this._mediaSources.get(stats.id);
        if (!entry) {
            entry = this._createMediaSourceEntry(stats);
            this._mediaSources.set(stats.id, entry);
        }
        entry.stats = stats;
        entry.visited = true;
    }

    private _visitContributingSource(stats: W3C.ContributingSourceStats): void {
        let entry = this._contributingSources.get(stats.id);
        if (!entry) {
            entry = this._createContributingSourceEntry(stats);
            this._contributingSources.set(stats.id, entry);
        }
        entry.stats = stats;
        entry.visited = true;
    }

    private _visitDataChannel(stats: W3C.DataChannelStats): void {
        let entry = this._dataChannels.get(stats.id);
        if (!entry) {
            entry = this._createDataChannelEntry(stats);
            this._dataChannels.set(stats.id, entry);
        }
        entry.stats = stats;
        entry.visited = true;
    }

    private _visitTransport(stats: W3C.TransportStats): void {
        let entry = this._transports.get(stats.id);
        if (!entry) {
            entry = this._createTransportEntry(stats);
            this._transports.set(stats.id, entry);
        }
        entry.stats = stats;
        entry.visited = true;
    }

    private _visitIceCandidatePair(stats: W3C.CandidatePairStats): void {
        let entry = this._iceCandidatePairs.get(stats.id);
        if (!entry) {
            entry = this._createIceCandidatePairEntry(stats);
            this._iceCandidatePairs.set(stats.id, entry);
        }
        entry.stats = stats;
        entry.visited = true;
    }


    private _visitLocalCandidate(stats: W3C.LocalCandidateStats): void {
        let entry = this._localCandidates.get(stats.id);
        if (!entry) {
            entry = this._createLocalCandidateEntry(stats);
            this._localCandidates.set(stats.id, entry);
        }
        entry.stats = stats;
        entry.visited = true;
    }

    private _visitRemoteCandidate(stats: W3C.RemoteCandidateStats): void {
        let entry = this._remoteCandidates.get(stats.id);
        if (!entry) {
            entry = this._createRemoteCandidateEntry(stats);
            this._remoteCandidates.set(stats.id, entry);
        }
        entry.stats = stats;
        entry.visited = true;
    }

    private _visitCertificate(stats: W3C.CertificateStats): void {
        let entry = this._certificates.get(stats.id);
        if (!entry) {
            entry = this._createCertificateEntry(stats);
            this._certificates.set(stats.id, entry);
        }
        entry.stats = stats;
        entry.visited = true;
    }

    private _visitAudioPlayout(stats: W3C.MediaPlayoutStats): void {
        let entry = this._audioPlayouts.get(stats.id);
        if (!entry) {
            entry = this._createAudioPlayoutEntry(stats);
            this._audioPlayouts.set(stats.id, entry);
        }
        entry.stats = stats;
        entry.visited = true;
    }

    private _visitTransceiver(stats: W3C.TransceiverStats): void {
        let entry = this._transceivers.get(stats.id);
        if (!entry) {
            entry = this._createTransceiverEntry(stats);
            this._transceivers.set(stats.id, entry);
        }
        entry.stats = stats;
        entry.visited = true;
    }

    private _visitSender(stats: W3C.SenderStats): void {
        let entry = this._senders.get(stats.id);
        if (!entry) {
            entry = this._createSenderEntry(stats);
            this._senders.set(stats.id, entry);
        }
        entry.stats = stats;
        entry.visited = true;
    }

    private _visitReceiver(stats: W3C.ReceiverStats): void {
        let entry = this._receivers.get(stats.id);
        if (!entry) {
            entry = this._createReceiverEntry(stats);
            this._receivers.set(stats.id, entry);
        }
        entry.stats = stats;
        entry.visited = true;
    }

    private _visitSctpTransport(stats: W3C.SctpTransportStats): void {
        let entry = this._sctpTransports.get(stats.id);
        if (!entry) {
            entry = this._createSctpTransportEntry(stats);
            this._sctpTransports.set(stats.id, entry);
        }
        entry.stats = stats;
        entry.visited = true;
    }

    private _visitIceServer(stats: W3C.IceServerStats): void {
        let entry = this._iceServers.get(stats.id);
        if (!entry) {
            entry = this._createIceServerEntry(stats);
            this._iceServers.set(stats.id, entry);
        }
        entry.stats = stats;
        entry.visited = true;
    }

    private _updateMetrics() {
        this.deltaInboundPacketsLost = 0;
        this.deltaInboundPacketsReceived = 0;
        this.deltaOutboundPacketsLost = 0;
        this.deltaOutboundPacketsReceived = 0;
        this.deltaOutboundPacketsSent = 0;
        this.sendingAudioBitrate = 0;
        this.sendingVideoBitrate = 0;
        this.receivingAudioBitrate = 0;
        this.receivingVideoBitrate = 0;
        this.deltaDataChannelBytesSent = 0;
        this.deltaDataChannelBytesReceived = 0;
        this.deltaReceivedAudioBytes = 0;
        this.deltaReceivedVideoBytes = 0;
        this.deltaSentAudioBytes = 0;
        this.deltaSentVideoBytes = 0;

        const roundTripTimesInS = [];
        for (const inboundRtpEntry of this.inboundRtps()) {
            if (inboundRtpEntry.stats.kind === 'audio') {
                this.receivingAudioBitrate += inboundRtpEntry.receivingBitrate ?? 0;
                this.deltaReceivedAudioBytes += inboundRtpEntry.receivedBytes ?? 0;
            } else if (inboundRtpEntry.stats.kind === 'video') {
                this.receivingVideoBitrate += inboundRtpEntry.receivingBitrate ?? 0;
                this.deltaReceivedVideoBytes += inboundRtpEntry.receivedBytes ?? 0;
            }
            this.deltaInboundPacketsLost += inboundRtpEntry.lostPackets ?? 0;
            this.deltaInboundPacketsReceived += inboundRtpEntry.receivedPackets ?? 0;
        }

        for (const remoteInboundRtpEntry of this.remoteInboundRtps()) {
            this.deltaOutboundPacketsLost += remoteInboundRtpEntry.stats.packetsLost ?? 0;
            this.deltaOutboundPacketsReceived += remoteInboundRtpEntry.stats.packetsReceived ?? 0;
        }
        this.totalInboundPacketsLost += this.deltaInboundPacketsLost;
        this.totalInboundPacketsReceived += this.deltaInboundPacketsReceived;
        this.totalOutboundPacketsLost += this.deltaOutboundPacketsLost;
        this.totalOutboundPacketsReceived += this.deltaOutboundPacketsReceived;
        this.totalReceivedAudioBytes += this.deltaReceivedAudioBytes;
        this.totalReceivedVideoBytes += this.deltaReceivedVideoBytes;

        for (const remoteInboundRtpEntry of this.remoteInboundRtps()) {
            const { roundTripTime } = remoteInboundRtpEntry.stats;
            if (roundTripTime && 0 < roundTripTime) {
                roundTripTimesInS.push(roundTripTime)
            }
        }

        for (const remoteOutboundRtp of this.remoteOutboundRtps()) {
            const { roundTripTime } = remoteOutboundRtp.stats;
            if (roundTripTime && 0 < roundTripTime) {
                roundTripTimesInS.push(roundTripTime)
            }
        }

        for (const iceCandidatePair of this.iceCandidatePairs()) {
            const { currentRoundTripTime } = iceCandidatePair.stats;
            if (currentRoundTripTime && 0 < currentRoundTripTime) {
                roundTripTimesInS.push(currentRoundTripTime)
            }
        }
        
        const avgRttInS = (roundTripTimesInS.length < 1 ? this.avgRttInS : Math.max(0, roundTripTimesInS.reduce((acc, rtt) => acc + rtt, 0) / roundTripTimesInS.length));
        
        for (const outboundRtpEntry of this._outboundRtps.values()) {
            if (outboundRtpEntry.stats.kind === 'audio') {
                this.sendingAudioBitrate += outboundRtpEntry.sendingBitrate ?? 0;
                this.deltaSentAudioBytes += outboundRtpEntry.sentBytes ?? 0;
            } else if (outboundRtpEntry.stats.kind === 'video') {
                this.sendingVideoBitrate += outboundRtpEntry.sendingBitrate ?? 0;
                this.deltaSentVideoBytes += outboundRtpEntry.sentBytes ?? 0;
            }
            this.deltaOutboundPacketsSent += outboundRtpEntry.sentPackets ?? 0;
            avgRttInS && outboundRtpEntry.updateStabilityScore(avgRttInS);
        }
        this.totalOutboundPacketsSent += this.deltaOutboundPacketsSent;
        this.totalSentAudioBytes += this.deltaSentAudioBytes;
        this.totalSentVideoBytes += this.deltaSentVideoBytes;

        for (const dataChannelEntry of this.dataChannels()) {
            this.deltaDataChannelBytesSent += dataChannelEntry.stats.bytesSent ?? 0;
            this.deltaDataChannelBytesReceived += dataChannelEntry.stats.bytesReceived ?? 0;
        }
        this.totalDataChannelBytesReceived += this.deltaDataChannelBytesReceived;
        this.totalDataChannelBytesSent += this.deltaDataChannelBytesSent;
        this.avgRttInS = avgRttInS;

        if (0 < this.deltaOutboundPacketsLost + this.deltaOutboundPacketsReceived) {
            this.sendingFractionLost = this.deltaOutboundPacketsLost / (this.deltaOutboundPacketsLost + this.deltaOutboundPacketsReceived);
        }

        if (0 < this.deltaInboundPacketsLost + this.deltaInboundPacketsReceived) {
            this.receivingFractionLost = this.deltaInboundPacketsLost / (this.deltaInboundPacketsLost + this.deltaInboundPacketsReceived);
        }
    }

    private _createCodecEntry(stats: W3C.CodecStats): CodecEntry {
        const result = {
            statsId: stats.id,
            stats,
            visited: true,
            sampled: false,
            getPeerConnection: () => {
                return this;
            },
            getTransport: () => {
                return this._transports.get(result.stats.transportId);
            },
        }
        return result;
    }

    private _createInboundRtpEntry(stats: W3C.InboundRtpStats): InboundRtpEntry {
        const result = {
            appData: {},
            statsId: stats.id,
            stats,
            visited: true,
            expectedFrameRate: stats.kind === 'video' ? 30 : undefined,
            
            lastNFramesPerSec: [],

            getPeerConnection: () => {
                return this;
            },
            getSsrc: () => {
                return result.stats.ssrc;
            },
            getTrackId: () => {
                if (result.stats.trackIdentifier) {
                    return result.stats.trackIdentifier;
                }
                const { stats: receiverStats } = result.getReceiver() ?? {};
                return receiverStats?.trackIdentifier;
            },
            getReceiver: () => {
                const receiverId = result.stats.receiverId;
                if (receiverId === undefined) {
                    return undefined;
                }
                return this._receivers.get(receiverId);
            },
            getCodec: () => {
                const codecId = result.stats.codecId;
                if (!codecId) return undefined;
                return this._codecs.get(codecId);
            },
            getTransport: () => {
                const transportId = result.stats.transportId;
                if (!transportId) return undefined;
                return this._transports.get(transportId);
            },
            getRemoteOutboundRtp: () => {
                if (result.stats.remoteId) {
                    return this._remoteOutboundRtps.get(result.stats.remoteId);
                }
                const remoteOutboundRtps = this._remoteOutboundRtps.getAllByIndex(SSRC_INDEX, result.stats.ssrc);
                if (remoteOutboundRtps.length < 1) {
                    return;
                }
                return remoteOutboundRtps[0];
            },
            getAudioPlayout: () => {
                if (!result.stats?.playoutId) {
                    return undefined;
                }
                return this._audioPlayouts.get(result.stats.playoutId);
            },
            get kind() {
                return result.stats.kind;
            }
        }
        return result;
    }

    private _createOutboundRtpEntry(stats: W3C.OutboundRtpStats): InnerOutboundRtpEntry {
        const stabilityScores: number[] = [];
        const result: InnerOutboundRtpEntry = {
            statsId: stats.id,
            stats,
            visited: true,
            getPeerConnection: () => {
                return this;
            },
            getSsrc: () => {
                return result.stats.ssrc;
            },
            getTrackId: () => {
                const { stats: mediaSourceStats } = result.getMediaSource() ?? {};
                if (mediaSourceStats != undefined) {
                    return mediaSourceStats.trackIdentifier;
                }
                const { stats: senderStats } = result.getSender() ?? {};
                if (senderStats?.trackIdentifier) {
                    return senderStats.trackIdentifier;
                }
                return undefined;
            },
            getSender: () => {
                const senderId = result.stats.senderId;
                if (!senderId) return undefined;
                return this._senders.get(senderId);
            },
            getCodec: () => {
                const codecId = result.stats.codecId;
                if (!codecId) return undefined;
                return this._codecs.get(codecId);
            },
            getTransport: () => {
                const transportId = result.stats.transportId;
                if (!transportId) return undefined;
                return this._transports.get(transportId);
            },
            getMediaSource: () => {
                const mediaSourceId = result.stats.mediaSourceId;
                if (!mediaSourceId) return undefined;
                return this._mediaSources.get(mediaSourceId);
            },
            getRemoteInboundRtp: () => {
                if (result.stats.remoteId) {
                    return this._remoteInboundRtps.get(result.stats.remoteId);
                }
                const remoteInboundRtps = this._remoteInboundRtps.getAllByIndex(SSRC_INDEX, result.stats.ssrc);
                if (remoteInboundRtps.length < 1) {
                    return;
                }
                return remoteInboundRtps[0];
            },
            get kind() {
                return result.stats.kind;
            },

            updateStabilityScore: (currentRttInS: number) => {
                const remoteInb = result.getRemoteInboundRtp();
                if (!remoteInb) return;
                // Packet Jitter measured in seconds
                // let's say we normalize it to a deviation of 100ms in a linear scale
                const latencyFactor = 1.0 - Math.min(0.1, Math.abs(currentRttInS - (this.avgRttInS ?? 0))) / 0.1
                const sentPackets = Math.max(1, (result.sentPackets ?? 0));
                const lostPackets = remoteInb.lostPackets ?? 0;
                const deliveryFactor = 1.0 - ((lostPackets) / (lostPackets + sentPackets));
                // let's push the actual stability score
                stabilityScores.push((latencyFactor * 0.33 + deliveryFactor * 0.67) ** 2);
                if (this.config.outbStabilityScoresLength < stabilityScores.length) {
                    stabilityScores.shift();
                } else if (stabilityScores.length < this.config.outbStabilityScoresLength / 2) {
                    return;
                }
                let counter = 0;
                let weight = 0;
                let totalScore = 0;
                for (const score of stabilityScores) {
                    weight += 1;
                    counter += weight;
                    totalScore += weight * score;
                }
                result.score = totalScore / counter;
            },
        }
        return result;
    }

    private _createRemoteInboundRtpEntry(stats: W3C.RemoteInboundRtpStats): RemoteInboundRtpEntry {
        const result = {
            statsId: stats.id,
            stats,
            visited: true,
            getPeerConnection: () => {
                return this;
            },
            getSsrc: () => {
                return result.stats.ssrc;
            },
            getCodec: () => {
                const codecId = result.stats.codecId;
                if (!codecId) return undefined;
                return this._codecs.get(codecId);
            },
            getTransport: () => {
                const transportId = result.stats.transportId;
                if (!transportId) return undefined;
                return this._transports.get(transportId);
            },
            getOutboundRtp: () => {
                const outboundRtps = this._outboundRtps.getAllByIndex(SSRC_INDEX, result.stats.ssrc);
                if (outboundRtps.length < 1) {
                    return undefined;
                }
                return outboundRtps[0];
            },
        }
        return result;
    }

    private _createRemoteOutboundRtpEntry(stats: W3C.RemoteOutboundRtpStats): RemoteOutboundRtpEntry {
        const result = {
            statsId: stats.id,
            stats,
            visited: true,
            getPeerConnection: () => {
                return this;
            },
            getSsrc: () => {
                return result.stats.ssrc;
            },
            getCodec: () => {
                const codecId = result.stats.codecId;
                if (!codecId) return undefined;
                return this._codecs.get(codecId);
            },
            getTransport: () => {
                const transportId = result.stats.transportId;
                if (!transportId) return undefined;
                return this._transports.get(transportId);
            },
            getInboundRtp: () => {
                const inboundRtps = this._inboundRtps.getAllByIndex(SSRC_INDEX, result.stats.ssrc);
                if (inboundRtps.length < 1) {
                    return undefined;
                }
                return inboundRtps[0];
            },
        }
        return result;
    }

    private _createMediaSourceEntry(stats: W3C.MediaSourceStats): MediaSourceEntry {
        const result = {
            statsId: stats.id,
            stats,
            visited: true,
            sampled: false,
            getPeerConnection: () => {
                return this;
            }
        }
        return result;
    }
    
    private _createContributingSourceEntry(stats: W3C.ContributingSourceStats): ContributingSourceEntry {
        const result = {
            statsId: stats.id,
            stats,
            sampled: false,
            visited: true,
            getPeerConnection: () => {
                return this;
            },
            getInboundRtp: () => {
                const inboundRtpId = result.stats.inboundRtpStreamId;
                return this._inboundRtps.get(inboundRtpId);
            },
        }
        return result;
    }

    private _createDataChannelEntry(stats: W3C.DataChannelStats): DataChannelEntry {
        const result = {
            statsId: stats.id,
            stats,
            visited: true,
            getPeerConnection: () => {
                return this;
            }
        }
        return result;
    }

    private _createTransportEntry(stats: W3C.TransportStats): TransportEntry {
        const result = {
            statsId: stats.id,
            stats,
            visited: true,
            getPeerConnection: () => {
                return this;
            },
            getSelectedIceCandidatePair: () => {
                const selectedIceCandidatePairId = result.stats.selectedCandidatePairId;
                if (!selectedIceCandidatePairId) return undefined;
                return this._iceCandidatePairs.get(selectedIceCandidatePairId);
            },
            getLocalCertificate: () => {
                return this._certificates.get(result.stats.localCertificateId ?? '');
            },
            getRemoteCertificate: () => {
                return this._certificates.get(result.stats.remoteCertificateId ?? '');
            },
            getRtcpTransport: () => {
                const rtcpTransportId = result.stats.rtcpTransportStatsId;
                if (!rtcpTransportId) return undefined;
                return this._transports.get(rtcpTransportId);
            }
        }
        return result;
    }

    private _createIceCandidatePairEntry(stats: W3C.CandidatePairStats): IceCandidatePairEntry {
        const result = {
            statsId: stats.id,
            stats,
            visited: true,
            getPeerConnection: () => {
                return this;
            },
            getTransport: () => {
                const transportId = result.stats.transportId;
                if (!transportId) return undefined;
                return this._transports.get(transportId);
            },
            getLocalCandidate: () => {
                const candidateId = result.stats.localCandidateId;
                if (!candidateId) return undefined;
                return this._localCandidates.get(candidateId);
            },
            getRemoteCandidate: () => {
                const candidateId = result.stats.remoteCandidateId;
                if (!candidateId) return undefined;
                return this._remoteCandidates.get(candidateId);
            },
        }
        return result;
    }

    private _createLocalCandidateEntry(stats: W3C.LocalCandidateStats): LocalCandidateEntry {
        const result = {
            statsId: stats.id,
            stats,
            sampled: false,
            visited: true,
            getPeerConnection: () => {
                return this;
            },
            getTransport: () => {
                const transportId = result.stats.transportId;
                if (!transportId) return undefined;
                return this._transports.get(transportId);
            },
        }
        return result;
    }

    private _createRemoteCandidateEntry(stats: W3C.RemoteCandidateStats): RemoteCandidateEntry {
        const result = {
            statsId: stats.id,
            stats,
            sampled: false,
            visited: true,
            getPeerConnection: () => {
                return this;
            },
            getTransport: () => {
                const transportId = result.stats.transportId;
                if (!transportId) return undefined;
                return this._transports.get(transportId);
            },
        }
        return result;
    }

    private _createCertificateEntry(stats: W3C.CertificateStats): CertificateEntry {
        const result = {
            statsId: stats.id,
            stats,
            sampled: false,
            visited: true,
            getPeerConnection: () => {
                return this;
            },
        }
        return result;
    }

    private _createAudioPlayoutEntry(stats: W3C.MediaPlayoutStats): AudioPlayoutEntry {
        const result = {
            statsId: stats.id,
            stats,
            visited: true,
            getPeerConnection: () => {
                return this;
            },
            
        }
        return result;
    }

    private _createTransceiverEntry(stats: W3C.TransceiverStats): TransceiverEntry {
        const result = {
            statsId: stats.id,
            stats,
            sampled: false,
            visited: true,
            getPeerConnection: () => {
                return this;
            },
            getSender: () => {
                const senderId = result.stats.senderId;
                return this._senders.get(senderId);
            },
            getReceiver: () => {
                const receiverId = result.stats.senderId;
                return this._receivers.get(receiverId);
            },
        }
        return result;
    }

    private _createSenderEntry(stats: W3C.SenderStats): SenderEntry {
        const result = {
            statsId: stats.id,
            stats,
            sampled: false,
            visited: true,
            getPeerConnection: () => {
                return this;
            },
            getMediaSource: () => {
                const mediaSourceId = result.stats.mediaSourceId;
                if (!mediaSourceId) return undefined;
                return this._mediaSources.get(mediaSourceId);
            },
        }
        return result;
    }

    private _createReceiverEntry(stats: W3C.ReceiverStats): ReceiverEntry {
        const result = {
            statsId: stats.id,
            stats,
            sampled: false,
            visited: true,
            getPeerConnection: () => {
                return this;
            },
        }
        return result;
    }

    private _createSctpTransportEntry(stats: W3C.SctpTransportStats): SctpTransportEntry {
        const result = {
            statsId: stats.id,
            visited: true,
            getPeerConnection: () => {
                return this;
            },
            stats,
            getTransport: () => {
                const transportId = result.stats.transportId;
                if (!transportId) return undefined;
                return this._transports.get(transportId);
            },
        }
        return result;
    }

    private _createIceServerEntry(stats: W3C.IceServerStats): IceServerEntry {
        const result = {
            statsId: stats.id,
            stats,
            sampled: false,
            visited: true,
            getPeerConnection: () => {
                return this;
            },
        }
        return result;
    }

    private _trimEntries() {
        for (const [, entryMap] of this._getEntryMaps()) {
            const keysToDelete: [string, StatsEntryAbs][] = [];
            for (const [key, value] of entryMap.entries()) {
                if (value.visited) {
                    value.visited = false;
                } else {
                    keysToDelete.push([key, value]);
                }
            }
            for (const [key] of keysToDelete) {
                entryMap.delete(key);
            }
        }
    }

    private _getEntryMaps(): IterableIterator<[W3C.StatsType, Map<string, StatsEntryAbs>]> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const pcEntry = this;
        function *iterator(): Generator<[W3C.StatsType, Map<string, StatsEntryAbs>], undefined, void> {
            yield ['codec', pcEntry._codecs];
            yield ['inbound-rtp', pcEntry._inboundRtps];
            yield ['outbound-rtp', pcEntry._outboundRtps];
            yield ['remote-inbound-rtp', pcEntry._remoteInboundRtps];
            yield ['remote-outbound-rtp', pcEntry._remoteOutboundRtps];
            yield ['media-source', pcEntry._mediaSources];
            yield ['csrc', pcEntry._contributingSources];
            yield ['data-channel', pcEntry._dataChannels];
            yield ['sender', pcEntry._senders];
            yield ['receiver', pcEntry._receivers];
            yield ['transport', pcEntry._transports];
            yield ['candidate-pair', pcEntry._iceCandidatePairs];
            yield ['local-candidate', pcEntry._localCandidates];
            yield ['remote-candidate', pcEntry._remoteCandidates];
            yield ['certificate', pcEntry._certificates];
            yield ['ice-server', pcEntry._iceServers];
            yield ['sctp-transport', pcEntry._sctpTransports];
            return;
        }
        return iterator();
    }
}
