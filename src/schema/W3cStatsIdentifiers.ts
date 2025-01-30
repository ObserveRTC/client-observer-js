type RtcStatsVersion = {
    date: Date;
}

export const version: RtcStatsVersion = {
    date: new Date("2024-11-07"),
}

export enum StatsType {
    codec = "codec",
    inboundRtp = "inbound-rtp",
    outboundRtp = "outbound-rtp",
    remoteInboundRtp = "remote-inbound-rtp",
    remoteOutboundRtp = "remote-outbound-rtp",
    mediaSource = "media-source",
    mediaPlayout = "media-playout",
    peerConnection = "peer-connection", 
    dataChannel = "data-channel",
    transport = "transport",
    candidatePair = "candidate-pair",
    localCandidate = "local-candidate",
    remoteCandidate = "remote-candidate",
    certificate = "certificate",
    
    // Deprecated 2021
    // -----------------
    stream = "stream", 
    track = "track",

    // Deprecated 2022-09-21
    // ----------------------
    transceiver = "transceiver",
    csrc = "csrc", 
    sender = "sender", 
    receiver = "receiver", 
    sctpTransport = "sctp-transport", 
    iceServer = "ice-server",
}

// RTCStat (https://www.w3.org/TR/webrtc-stats/#dom-rtcstats)
export interface RtcStats {
    id: string;
    type: string;
    timestamp: number;
}

export type MediaKind = "audio" | "video";

export type RtcPeerConnectionState = "new" | "connecting" | "connected" | "disconnected" | "failed" | "closed";
// export type RtcMediaKind = "audio" | "video";
// export type RtcQualityLimitationReason = "none" | "cpu" | "bandwidth" | "other";
// export type RtcDataChannelState = "connecting" | "open" | "closing" | "closed";
// export type RtcIceRole = "unknown" | "controlling" | "controlled";
// export type RtcDtlsTransportState = "closed" | "connected" | "connecting" | "failed" | "new";
export type RtcIceTransportState =  "closed" | "connected" | "failed" | "new" | "checking" | "completed" | "disconnected";
// export type RtcDtlsRole = "client" | "server" | "unknown";
// export type RtcIceCandidateType = "host" | "prflx" | "relay" | "srflx";
// export type RtcTransportProtocol = "udp" | "tcp";
// export type RtcRelayProtocol = "udp" | "tcp" | "tls";
// export type RtcStatsIceCandidatePairState = "failed" | "cancelled" | "frozen" | "inprogress" | "succeeded" | "waiting";
// export type RtcIceTcpCandidateType = "active" | "passive" | "so";
