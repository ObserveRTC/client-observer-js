import { RtcStats } from "../schema/W3cStatsIdentifiers";

export function firefox94StatsAdapter(rtcStats: RtcStats[]): RtcStats[] {
	for (const rtcStatValue of rtcStats) {
		if (!rtcStatValue) continue;
		const rawType = rtcStatValue.type;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const rawValue = rtcStatValue as any;
		if (!rawType || typeof rawType !== "string") continue;
		if (
				rawType === "inbound-rtp" ||
				rawType === "outbound-rtp" ||
				rawType === "remote-inbound-rtp" ||
				rawType === "remote-outbound-rtp"
		) {
				if (rawValue.mediaType && !rawValue.kind) {
						rawValue.kind = rawValue.mediaType;
						delete rawValue.mediaType;
				}
		}
		// firefox put the track identifier inside brackets ({})
		if (rawValue.trackIdentifier) {
				rawValue.trackIdentifier = rawValue.trackIdentifier.replace("{", "").replace("}", "");
		}
	}

	return rtcStats;
}