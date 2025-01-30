import * as W3CStats from '../schema/W3cStatsIdentifiers';
import { createLogger } from '../utils/logger';

const logger = createLogger('StatsAdapter');

export type StatsAdapter = (stats: W3CStats.RtcStats[]) => W3CStats.RtcStats[];

export class StatsAdapters {
	private readonly _adapters: StatsAdapter[] = [];

	public add(adapter: StatsAdapter) {
		this._adapters.push(adapter);
	}

	public remove(adapter: StatsAdapter) {
		const index = this._adapters.indexOf(adapter);
		if (index < 0) return;
		this._adapters.splice(index, 1);
	}

	public adapt(input: W3CStats.RtcStats[]): W3CStats.RtcStats[] {
		let result: W3CStats.RtcStats[] = input;

		for (const adapter of this._adapters) {
			try {
				result = adapter(result);
			} catch (err) {
				logger.warn('Error adapting stats', err);
			}
		}

		return result;
	}
}