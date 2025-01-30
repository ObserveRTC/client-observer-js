import { PeerConnectionTransportStats } from "../schema/ClientSample";
import { PeerConnectionMonitor } from "./PeerConnectionMonitor";

export class PeerConnectionTransportMonitor implements PeerConnectionTransportStats {
	private _visited = true;

	timestamp: number;
	id: string;
	dataChannelsOpened?: number;
	dataChannelsClosed?: number;


	/**
	 * Additional data attached to this stats, will be shipped to the server
	 */
	attachments?: Record<string, unknown> | undefined;
	/**
	 * Additional data attached to this stats, will not be shipped to the server, 
	 * but can be used by the application
	 */
	public appData?: Record<string, unknown> | undefined;
	
	public constructor(
		private readonly _peerConnection: PeerConnectionMonitor,
		options: PeerConnectionTransportStats,
	) {
		this.id = options.id;
		this.timestamp = options.timestamp;

		Object.assign(this, options);
	}

	public get visited(): boolean {
		const result = this._visited;
		
		this._visited = false;

		return result;
	}

	public accept(stats: Omit<PeerConnectionTransportStats, 'appData'>): void {
		const elapsedInMs = stats.timestamp - this.timestamp;
		if (elapsedInMs <= 0) { 
			return; // logger?
		}

		Object.assign(this, stats);
	}

	public getPeerConnection() {
		return this._peerConnection;
	}

	public createSample(): PeerConnectionTransportStats {
		return {
			id: this.id,
			timestamp: this.timestamp,
			dataChannelsOpened: this.dataChannelsOpened,
			dataChannelsClosed: this.dataChannelsClosed,
			attachments: this.attachments,
		};
	}
}