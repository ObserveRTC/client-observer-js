import { ClientMonitor } from "./ClientMonitor";
import { ClientMonitorConfig } from "./ClientMonitorConfig";

export {
    ClientMonitor,
} from "./ClientMonitor";
export type {
    ClientMonitorConfig
} from "./ClientMonitorConfig";
export type {
    ClientEvent,
    ClientIssue,
    ClientMetaData,
    SampleCreatedEventPayload,
    StatsCollectedEventPayload,
    CongestionEventPayload,
    AudioDesyncTrackEventPayload,
    FreezedVideoTrackEventPayload,
    DryInboundTrackEventPayload,
    TooLongPcConnectionEstablishmentEventPayload,
    ScoreEventPayload,
    ClientMonitorEvents,
} from "./ClientMonitorEvents";
export type { 
    Detector,
} from './detectors/Detector';
export {
    Detectors
} from './detectors/Detectors';
export type { 
    ScoreCalculator 
} from './scores/ScoreCalculator';


export type { 
    DefaultScoreCalculator,
    DefaultScoreCalclulatorInboundVideoScoreAppData,
    DefaultScoreCalclulatorOutboundTrackScoreAppData, 
} from './scores/DefaultScoreCalculator';

export type { 
	ClientSample,
	ExtensionStat,
	PeerConnectionTransportStats,
	MediaSourceStats,
	CodecStats,
    IceCandidateStats,
    IceCandidatePairStats,
    IceTransportStats,
    InboundRtpStats,
    OutboundRtpStats,
    RemoteInboundRtpStats,
    RemoteOutboundRtpStats,
} from './schema/ClientSample';
export {
    setLogger,
} from "./utils/logger";

export function createClientMonitor(config: Partial<ClientMonitorConfig>): ClientMonitor {
    return new ClientMonitor(config);
}

