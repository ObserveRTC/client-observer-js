import * as W3C from '../schema/W3cStatsIdentifiers'
import { TypedEvents } from '../utils/TypedEmitter';
import { InboundTrackStats } from './InboundTrackStats';
import { OutboundTrackStats } from './OutboundTrackStats';

export interface StatsEntryAbs {
    /*eslint-disable @typescript-eslint/no-explicit-any */
    statsId: string;
    visited: boolean,
    getPeerConnection(): PeerConnectionEntry;
}

export type TrackStats = (InboundTrackStats | OutboundTrackStats) & {
    bitrate: number;
    fractionLoss: number;
    roundTripTimeInS: number;
    jitter: number;
};

/**
 * Wraps the [CodecStats](https://www.w3.org/TR/webrtc-stats/#dom-rtccodecstats) and provide methods
 * to navigate to its relations
 */
// export interface CodecEntry extends StatsEntryAbs {
//     stats: W3C.RtcCodecStats;
//     sampled: boolean;
//     /**
//      * Navigate to the related TransportEntry the codec is used
//      */
//     getTransport(): TransportEntry | undefined;
// }

interface RtpStreamEntry {
    /**
     * Navigate to the related TarnsportEnty the RtpStream belongs to
     */
    getTransport(): TransportEntry | undefined;
    /**
     * Navigate to the related CodecEntry the RtpStream uses
     */
    getCodec(): CodecEntry | undefined;
}

interface ReceivedRtpStreamEntry extends RtpStreamEntry, StatsEntryAbs {}

interface SenderRtpStreamEntry extends RtpStreamEntry, StatsEntryAbs {}

/**
 * Wraps the [CodecStats](https://www.w3.org/TR/webrtc-stats/#dom-rtccodecstats) and provide methods
 * to navigate to its relations
 */
export interface CodecEntry extends StatsEntryAbs {
    stats: W3C.CodecStats;
    sampled: boolean;
    /**
     * Navigate to the related TransportEntry the codec is used
     */
    getTransport(): TransportEntry | undefined;
}

/**
 * Wraps the [RTCInboundRtpStreamStats](https://www.w3.org/TR/webrtc-stats/#dom-rtcinboundrtpstreamstats) and provide methods
 * to navigate to its relations
 */
export interface InboundRtpEntry extends ReceivedRtpStreamEntry, StatsEntryAbs {
    stats: W3C.InboundRtpStats;
    expectedFrameRate?: number,
    sfuStreamId?: string,
    sfuSinkId?: string,
    remoteClientId?: string,

    // calculated fields
    score?: number,
    avgJitterBufferDelayInMs?: number,
    receivingBitrate?: number,
    receivedBytes?: number,
    lostPackets?: number,
    receivedPackets?: number,
    receivedFrames?: number,
    decodedFrames?: number,
    droppedFrames?: number,
    receivedSamples?: number,
    silentConcealedSamples?: number,
    fractionLoss?: number,
    avgRttInS?: number,
    framesPerSecond?: number,
    
    /**
     * a number between 0 and 1 that indicates the volatility of the decoded frames per sec
     */
    fpsVolatility?: number,
    avgFramesPerSec?: number,
    lastNFramesPerSec: number[],
    /**
     * Navigate to the related ReceiverEntry
     */
    getReceiver(): ReceiverEntry | undefined;
    /**
     * Gets the SSRC of the Rtp session
     */
    getSsrc(): number | undefined;
    getTrackId(): string | undefined;
    /**
     * Navigate to the related Remote-outbound entry based on inbound ssrc
     */
    getRemoteOutboundRtp(): RemoteOutboundRtpEntry | undefined;
    getAudioPlayout(): AudioPlayoutEntry | undefined;
    
    readonly kind: "audio" | "video" | undefined;
}

/**
 * Wraps the [RTCOutboundRtpStreamStats](https://www.w3.org/TR/webrtc-stats/#dom-rtcoutboundrtpstreamstats) and provide methods
 * to navigate to its relations
 */
export interface OutboundRtpEntry extends SenderRtpStreamEntry, StatsEntryAbs {
    stats: W3C.OutboundRtpStats;
    sfuStreamId?: string,

    // calculated fields
    score?: number;
    sendingBitrate?: number,
    sentBytes?: number,
    sentPackets?: number,
    /**
     * Gets the SSRC of the Rtp session
     */
    getSsrc(): number | undefined;
    getTrackId(): string | undefined;
    getMediaSource(): MediaSourceEntry | undefined;
    getSender(): SenderEntry | undefined;
    getRemoteInboundRtp(): RemoteInboundRtpEntry | undefined;

    readonly kind: "audio" | "video" | undefined;

}


/**
 * Wraps the [RTCRemoteInboundRtpStreamStats](https://www.w3.org/TR/webrtc-stats/#dom-rtcremoteinboundrtpstreamstats) and provide methods
 * to navigate to its relations
 */
export interface RemoteInboundRtpEntry extends ReceivedRtpStreamEntry, StatsEntryAbs {
    stats: W3C.RemoteInboundRtpStats;
    
    // calculated fields
    receivedPackets?: number,
    lostPackets?: number,

    getSsrc(): number | undefined;
    getOutboundRtp(): OutboundRtpEntry | undefined;
}

/**
 * Wraps the [RTCRemoteOutboundRtpStreamStats](https://www.w3.org/TR/webrtc-stats/#dom-rtcremoteoutboundrtpstreamstats) and provide methods
 * to navigate to its relations
 */
export interface RemoteOutboundRtpEntry extends SenderRtpStreamEntry, StatsEntryAbs {
    stats: W3C.RemoteOutboundRtpStats;
    getSsrc(): number | undefined;
    getInboundRtp(): InboundRtpEntry | undefined;
}

/**
 * Wraps the [RTCMediaSourceStats](https://www.w3.org/TR/webrtc-stats/#dom-rtcmediasourcestats) and provide methods
 * to navigate to its relations
 */
export interface MediaSourceEntry extends StatsEntryAbs {
    stats: W3C.MediaSourceStats;
    sampled: boolean;
}

/**
 * Wraps the [CodecStats]() and provide methods
 * to navigate to its relations
 *
 * Deprecated in WebRTC Stats since 2022-09-21
 */
export interface ContributingSourceEntry extends StatsEntryAbs {
    stats: W3C.ContributingSourceStats;
    sampled: boolean;

    getInboundRtp(): InboundRtpEntry | undefined;
}

/**
 * Wraps the [RTCRtpContributingSourceStats](https://www.w3.org/TR/webrtc-stats/#dom-rtcrtpcontributingsourcestats) and provide methods
 * to navigate to its relations
 */
export interface DataChannelEntry extends StatsEntryAbs {
    stats: W3C.DataChannelStats;
}

/**
 * Wraps the [RTCRtpTransceiverStats](https://www.w3.org/TR/webrtc-stats/#dom-rtcrtptransceiverstats) and provide methods
 * to navigate to its relations
 *
 * Deprecated in WebRTC Stats since 2022-09-21
 */
export interface TransceiverEntry extends StatsEntryAbs {
    stats: W3C.TransceiverStats;
    sampled: boolean;

    getSender(): SenderEntry | undefined;
    getReceiver(): ReceiverEntry | undefined;
}

/**
 * Wraps the [RTCVideoSenderStats](https://www.w3.org/TR/webrtc-stats/#dom-rtcvideoreceiverstats) or
 * [RTCAudioSenderStats](https://www.w3.org/TR/webrtc-stats/#dom-rtcaudiosenderstats) and provide methods
 * to navigate to its relations
 *
 * Deprecated in WebRTC Stats since 2022-09-21
 */
export interface SenderEntry extends StatsEntryAbs {
    stats: W3C.SenderStats;
    sampled: boolean;
    
    getMediaSource(): MediaSourceEntry | undefined;
}

/**
 * Wraps the [RTCVideoReceiverStats](https://www.w3.org/TR/webrtc-stats/#dom-rtcvideosenderstats) or
 * [RTCAudioReceiverStats](https://www.w3.org/TR/webrtc-stats/#dom-rtcaudiohandlerstats) and provide methods
 * to navigate to its relations
 *
 * Deprecated in WebRTC Stats since 2022-09-21
 */
export interface ReceiverEntry extends StatsEntryAbs {
    stats: W3C.ReceiverStats;
    sampled: boolean;

}

/**
 * Wraps the [RTCTransportStats](https://www.w3.org/TR/webrtc-stats/#transportstats-dict*) and provide methods
 * to navigate to its relations
 *
 * Deprecated in WebRTC Stats since 2022-09-21
 */
export interface TransportEntry extends StatsEntryAbs {
    stats: W3C.TransportStats;
    getRtcpTransport(): TransportEntry | undefined;
    getSelectedIceCandidatePair(): IceCandidatePairEntry | undefined;
    getLocalCertificate(): CertificateEntry | undefined;
    getRemoteCertificate(): CertificateEntry | undefined;
}

/**
 * Wraps the [RTCSctpTransportStats](https://www.w3.org/TR/webrtc-stats/#sctptransportstats-dict*) and provide methods
 * to navigate to its relations
 *
 * Deprecated in WebRTC Stats since 2022-09-21
 */
export interface SctpTransportEntry extends StatsEntryAbs {
    stats: W3C.SctpTransportStats;
    getTransport(): TransportEntry | undefined;
}

/**
 * Wraps the [RTCIceCandidatePairStats](https://www.w3.org/TR/webrtc-stats/#candidatepair-dict*) and provide methods
 * to navigate to its relations
 */
export interface IceCandidatePairEntry extends StatsEntryAbs {
    stats: W3C.CandidatePairStats;
    getTransport(): TransportEntry | undefined;
    getLocalCandidate(): LocalCandidateEntry | undefined;
    getRemoteCandidate(): RemoteCandidateEntry | undefined;
}

/**
 * Wraps the [RTCIceCandidateStats](https://www.w3.org/TR/webrtc-stats/#icecandidate-dict*) and provide methods
 * to navigate to its relations
 */
export interface LocalCandidateEntry extends StatsEntryAbs {
    stats: W3C.LocalCandidateStats;
    sampled: boolean;

    getTransport(): TransportEntry | undefined;
}

/**
 * Wraps the [RTCIceCandidateStats](https://www.w3.org/TR/webrtc-stats/#icecandidate-dict*) and provide methods
 * to navigate to its relations
 */
export interface RemoteCandidateEntry extends StatsEntryAbs {
    stats: W3C.RemoteCandidateStats;
    sampled: boolean;

    getTransport(): TransportEntry | undefined;
}

/**
 * Wraps the [RTCCertificateStats](https://www.w3.org/TR/webrtc-stats/#certificatestats-dict*) and provide methods
 * to navigate to its relations
 *
 */
export interface CertificateEntry extends StatsEntryAbs {
    stats: W3C.CertificateStats;
    sampled: boolean;

}

/**
 * Wraps the [RTCIceServerStats](https://www.w3.org/TR/webrtc-stats/#dom-rtciceserverstats) and provide methods
 * to navigate to its relations
 *
 * Deprecated in WebRTC Stats since 2022-09-21
 */
export interface IceServerEntry extends StatsEntryAbs {
    stats: W3C.IceServerStats;
    sampled: boolean;
    
}

export interface AudioPlayoutEntry extends StatsEntryAbs {
    stats: W3C.MediaPlayoutStats;
}

export type PeerConnectionStateUpdated = {
    pcConnectionState: W3C.RtcPeerConnectionState,
    iceState?: W3C.RtcIceTransportState,
    usingTURN: boolean,
    usingTCP: boolean,
}

export type PeerConnectionEntryEvents = {
    'inbound-rtp-added': InboundRtpEntry,
    'inbound-rtp-removed': InboundRtpEntry,
    'outbound-rtp-added': OutboundRtpEntry,
    'outbound-rtp-removed': OutboundRtpEntry,
    'remote-inbound-rtp-added': RemoteInboundRtpEntry,
    'remote-inbound-rtp-removed': RemoteInboundRtpEntry,
    'remote-outbound-rtp-added': RemoteOutboundRtpEntry,
    'remote-outbound-rtp-removed': RemoteOutboundRtpEntry,
    'state-updated': PeerConnectionStateUpdated,
    // 'connecting': void,
    // 'connected': void,
    'close': undefined,
}

/**
 * Wraps the [RTCPeerConnectionStats](https://www.w3.org/TR/webrtc-stats/#pcstats-dict*) and provide methods
 * to navigate to its relations
 */
export interface PeerConnectionEntry {
    readonly peerConnectionId: string;
    readonly statsId: string | undefined;
    readonly stats: W3C.PeerConnectionStats | undefined;
    readonly label: string | undefined;
    readonly events: TypedEvents<PeerConnectionEntryEvents>;

    readonly usingTCP: boolean;
    readonly usingTURN: boolean;

    readonly totalInboundPacketsLost: number;
    readonly totalInboundPacketsReceived: number;
    readonly totalOutboundPacketsLost: number;
    readonly totalOutboundPacketsReceived: number;
    readonly totalOutboundPacketsSent: number;
    readonly totalSentAudioBytes: number;
    readonly totalSentVideoBytes: number;
    readonly totalReceivedAudioBytes: number;
    readonly totalReceivedVideoBytes: number;
    readonly totalDataChannelBytesSent: number;
    readonly totalDataChannelBytesReceived: number;

    readonly deltaInboundPacketsLost?: number;
    readonly deltaInboundPacketsReceived?: number;
    readonly deltaOutboundPacketsLost?: number;
    readonly deltaOutboundPacketsReceived?: number;
    readonly deltaOutboundPacketsSent?: number;
    readonly deltaSentAudioBytes?: number;
    readonly deltaSentVideoBytes?: number;
    readonly deltaReceivedAudioBytes?: number;
    readonly deltaReceivedVideoBytes?: number;
    readonly deltaDataChannelBytesSent?: number;
    readonly deltaDataChannelBytesReceived?: number;

    readonly avgRttInS?: number;
    readonly sendingAudioBitrate?: number;
    readonly sendingVideoBitrate?: number;
    readonly sendingFractionalLoss?: number;

    readonly receivingAudioBitrate?: number;
    readonly receivingVideoBitrate?: number;
    readonly receivingFractionalLoss?: number;
    
    connectionState: W3C.RtcPeerConnectionState;
    connectionEstablishedDurationInMs?: number;
    congested?: boolean;

    getSelectedIceCandidatePair(): IceCandidatePairEntry | undefined;
    codecs(): IterableIterator<CodecEntry>;
    inboundRtps(ssrc?: number): IterableIterator<InboundRtpEntry>;
    outboundRtps(ssrc?: number): IterableIterator<OutboundRtpEntry>;
    remoteInboundRtps(): IterableIterator<RemoteInboundRtpEntry>;
    remoteOutboundRtps(): IterableIterator<RemoteOutboundRtpEntry>;
    mediaSources(): IterableIterator<MediaSourceEntry>;
    dataChannels(): IterableIterator<DataChannelEntry>;
    transports(): IterableIterator<TransportEntry>;
    iceCandidatePairs(): IterableIterator<IceCandidatePairEntry>;
    localCandidates(): IterableIterator<LocalCandidateEntry>;
    remoteCandidates(): IterableIterator<RemoteCandidateEntry>;
    audioPlayouts(): IterableIterator<AudioPlayoutEntry>;
    transceivers(): IterableIterator<TransceiverEntry>;
    senders(): IterableIterator<SenderEntry>;
    receivers(): IterableIterator<ReceiverEntry>;
    sctpTransports(): IterableIterator<SctpTransportEntry>;
    certificates(): IterableIterator<CertificateEntry>;
    iceServers(): IterableIterator<IceServerEntry>;
    contributingSources(): IterableIterator<ContributingSourceEntry>;
}
