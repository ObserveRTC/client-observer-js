import { InboundRtpStats } from "../schema/ClientSample";
import { RtcStats } from "../schema/W3cStatsIdentifiers";

export function mediasoupStatsAdapter(rtcStats: RtcStats[]): RtcStats[] {
	const result: RtcStats[] = [];

	for (const rtcStat of rtcStats) {
		if (!rtcStat) continue;
		if (rtcStat.type === 'inbound-rtp' ) {
			const inboundRtpStats = rtcStat as unknown as InboundRtpStats;
			if (inboundRtpStats.trackIdentifier === 'probator') continue;
		}

		result.push(rtcStat);
	}

	return result;
}