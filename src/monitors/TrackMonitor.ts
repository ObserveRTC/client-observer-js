import { InboundTrackMonitor } from "./InboundTrackMonitor";
import { OutboundTrackMonitor } from "./OutboundTrackMonitor";

export type TrackMonitor = (OutboundTrackMonitor & { direction: 'outbound' }) | (InboundTrackMonitor & { direction: 'inbound' });
