import * as W3C from '../schema/W3cStatsIdentifiers'
import { createLogger } from './logger';

const logger = createLogger('StatsCollector');

export function createStatsFromRTCStatsReportProvider(statsProvider: () => Promise<RTCStatsReport>) {
    return async () => {
        try {
            const stats = await statsProvider();
    
            const result: W3C.RtcStats[] = [];
    
            // legacy support
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((stats as any).values) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rtcStats = stats as any;
                if (rtcStats.values || typeof rtcStats.values === "function") {
                    for (const rtcStatValue of rtcStats.values()) {
                        if (
                            !rtcStatValue ||
                            !rtcStatValue.type ||
                            typeof rtcStatValue.type !== "string" ||
                            !rtcStatValue.id ||
                            !rtcStatValue.timestamp ||
                            false
                        ) {
                            continue;
                        }
                        result.push(rtcStatValue);
                    }
        
                    return result;
                }
            }
        
            stats.forEach((report) => {
                if (!report.id) return;
                if (!report.timestamp) return;
                if (!report.type) return;
        
                result.push(report);
            });
        
            return result;
        } catch (err) {
            logger.error('Error getting stats report', err);
            return [];
        }
    }
}
