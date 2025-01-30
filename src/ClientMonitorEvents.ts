import { ClientMonitor } from "./ClientMonitor";
import { CertificateMonitor } from "./monitors/CertificateMonitor";
import { CodecMonitor } from "./monitors/CodecMonitor";
import { DataChannelMonitor } from "./monitors/DataChannelMonitor";
import { IceCandidateMonitor } from "./monitors/IceCandidateMonitor";
import { IceCandidatePairMonitor } from "./monitors/IceCandidatePairMonitor";
import { IceTransportMonitor } from "./monitors/IceTransportMonitor";
import { InboundRtpMonitor } from "./monitors/InboundRtpMonitor";
import { InboundTrackMonitor } from "./monitors/InboundTrackMonitor";
import { MediaPlayoutMonitor } from "./monitors/MediaPlayoutMonitor";
import { MediaSourceMonitor } from "./monitors/MediaSourceMonitor";
import { OutboundRtpMonitor } from "./monitors/OutboundRtpMonitor";
import { PeerConnectionMonitor } from "./monitors/PeerConnectionMonitor";
import { PeerConnectionTransportMonitor } from "./monitors/PeerConnectionTransportMonitor";
import { RemoteInboundRtpMonitor } from "./monitors/RemoteInboundRtpMonitor";
import { RemoteOutboundRtpMonitor } from "./monitors/RemoteOutboundRtpMonitor";
import { ClientSample } from "./schema/ClientSample"
import { RtcStats } from "./schema/W3cStatsIdentifiers";

export type ClientIssue = {
	type: string,
	payload?: Record<string, unknown> | boolean | string | number,
	timestamp: number,
}

export type ClientEvent = {
	type: string,
	payload?: Record<string, unknown> | boolean | string | number,
	timestamp: number,
}

export type ClientMetaData = {
	type: string,
	payload?: Record<string, unknown> | boolean | string | number,
	timestamp: number,
}

export type ClientMonitorBaseEvent = {
	clientMonitor: ClientMonitor,
}

export type SampleCreatedEventPayload = ClientMonitorBaseEvent & {
	sample: ClientSample,
}

export type StatsCollectedEventPayload = ClientMonitorBaseEvent & {
	startedAt: number,
	durationOfCollectingStatsInMs: number,
	collectedStats: [string, RtcStats[]][],
}

export type CongestionEventPayload = ClientMonitorBaseEvent & {
	peerConnectionMonitor: PeerConnectionMonitor,
	availableIncomingBitrate: number;
	availableOutgoingBitrate: number;
	maxAvailableIncomingBitrate: number;
	maxAvailableOutgoingBitrate: number;
	maxReceivingBitrate: number;
	maxSendingBitrate: number;
}

export type AudioDesyncTrackEventPayload = ClientMonitorBaseEvent & {
	trackMonitor: InboundTrackMonitor,
}

export type FreezedVideoTrackEventPayload = ClientMonitorBaseEvent & {
	trackMonitor: InboundTrackMonitor,
}

export type DryInboundTrackEventPayload = ClientMonitorBaseEvent & {
	trackMonitor: InboundTrackMonitor,
}

export type TooLongPcConnectionEstablishmentEventPayload = ClientMonitorBaseEvent & {
	peerConnectionMonitor: PeerConnectionMonitor,
}

export type ScoreEventPayload = ClientMonitorBaseEvent & {
	clientScore: number,
	remarks?: string[],
}

export type NewCodecMonitorEventPayload = ClientMonitorBaseEvent & {
	codecMonitor: CodecMonitor,
}

export type NewPeerConnectionMonitorEventPayload = ClientMonitorBaseEvent & {
	peerConnectionMonitor: PeerConnectionMonitor,
}

export type NewInboundRtpMonitorEventPayload = ClientMonitorBaseEvent & {
	inboundRtpMonitor: InboundRtpMonitor,
}

export type NewInboundTrackMonitorEventPayload = ClientMonitorBaseEvent & {
	inboundTrackMonitor: InboundTrackMonitor,
}

export type NewOutboundTrackMonitorEventPayload = ClientMonitorBaseEvent & {
	outboundTrackMonitor: InboundTrackMonitor,
}

export type NewOutboundRtpMonitorEventPayload = ClientMonitorBaseEvent & {
	outboundRtpMonitor: OutboundRtpMonitor,
}

export type NewDataChannelMonitorEventPayload = ClientMonitorBaseEvent & {
	dataChannelMonitor: DataChannelMonitor,
}

export type NewIceCandidateMonitorPayload = ClientMonitorBaseEvent & {
	iceCandidateMonitor: IceCandidateMonitor,
}

export type NewIceCandidatePairMonitorEventPayload = ClientMonitorBaseEvent & {
	iceCandidatePairMonitor: IceCandidatePairMonitor,
}

export type NewIceTransportMonitorEventPayload = ClientMonitorBaseEvent & {
	iceTransportMonitor: IceTransportMonitor,
}

export type NewMediaPlayoutMonitorEventPayload = ClientMonitorBaseEvent & {
	mediaPlayoutMonitor: MediaPlayoutMonitor,
}

export type NewMediaSourceMonitorEventPayload = ClientMonitorBaseEvent & {
	mediaSourceMonitor: MediaSourceMonitor,
}

export type NewPeerConnectionTransportMonitorEventPayload = ClientMonitorBaseEvent & {
	peerConnectionTransportMonitor: PeerConnectionTransportMonitor,
}

export type NewRemoteInboundRtpMonitorEventPayload = ClientMonitorBaseEvent & {
	remoteInboundRtpMonitor: RemoteInboundRtpMonitor,
}

export type NewRemoteOutboundRtpMonitorEventPayload = ClientMonitorBaseEvent & {
	remoteOutboundRtpMonitor: RemoteOutboundRtpMonitor,
}

export type NewCertificateMonitorEventPayload = ClientMonitorBaseEvent & {
	certificateMonitor: CertificateMonitor,
}

export type ClientMonitorEvents = {
	'sample-created': [SampleCreatedEventPayload],
	"stats-collected": [StatsCollectedEventPayload],
	'close': [],
	'issue': [ClientIssue],
	'added-client-event': [ClientEvent],
	// detector events
	'congestion': [CongestionEventPayload],
	'cpulimitation': [ClientMonitorBaseEvent],
	'audio-desync-track': [AudioDesyncTrackEventPayload],
	'freezed-video-track': [FreezedVideoTrackEventPayload],
	'dry-inbound-track': [DryInboundTrackEventPayload],
	'too-long-pc-connection-establishment': [TooLongPcConnectionEstablishmentEventPayload]
	// 'ice-restart': [peerConnectionMonitor: PeerConnectionMonitor],
	'score': [ScoreEventPayload],

	// for appData
	'new-codec-monitor': [NewCodecMonitorEventPayload],
	'new-peerconnnection-monitor': [NewPeerConnectionMonitorEventPayload],
	'new-inbound-rtp-monitor': [NewInboundRtpMonitorEventPayload],
	'new-inbound-track-monitor': [NewInboundTrackMonitorEventPayload],
	'new-outbound-track-monitor': [NewOutboundTrackMonitorEventPayload],
	'new-outbound-rtp-monitor': [NewOutboundRtpMonitorEventPayload],
	'new-data-channel-monitor': [NewDataChannelMonitorEventPayload],
	'new-ice-transport-monitor': [NewIceTransportMonitorEventPayload],
	'new-ice-candidate-monitor': [NewIceCandidateMonitorPayload],
	'new-ice-candidate-pair-monitor': [NewIceCandidatePairMonitorEventPayload],
	'new-media-playout-monitor': [NewMediaPlayoutMonitorEventPayload],
	'new-media-source-monitor': [NewMediaSourceMonitorEventPayload],
	'new-peer-connection-transport-monitor': [NewPeerConnectionTransportMonitorEventPayload],
	'new-remote-inbound-rtp-monitor': [NewRemoteInboundRtpMonitorEventPayload],
	'new-remote-outbound-rtp-monitor': [NewRemoteOutboundRtpMonitorEventPayload],
	'new-certificate-monitor': [NewCertificateMonitorEventPayload],
}