import { CodecStats } from "../schema/ClientSample";
import { PeerConnectionMonitor } from "./PeerConnectionMonitor";

export class CodecMonitor implements CodecStats {
	private _visited = true;

	timestamp: number;
	id: string;
	payloadType?: number;
	transportId?: string;
	mimeType: string;
	clockRate?: number | undefined;
	channels?: number | undefined;
	sdpFmtpLine?: string | undefined;

	/**
	 * Additional data attached to this stats, will be shipped to the server
	 */
	attachments?: Record<string, unknown> | undefined;
	/**
	 * Additional data attached to this stats, will not be shipped to the server, 
	 * but can be used by the application
	 */
	public appData?: Record<string, unknown> | undefined;

	constructor(
		private readonly _peerConnection: PeerConnectionMonitor,
		options: CodecStats,
	) {
		this.id = options.id;
		this.timestamp = options.timestamp;
		this.mimeType = options.mimeType;

		Object.assign(this, options);
	}

	public get visited(): boolean {
		const result = this._visited;
		
		this._visited = false;

		return result;
	}

	public accept(stats: Omit<CodecStats, 'appData'>): void {
		this._visited = true;

		const elapsedInMs = stats.timestamp - this.timestamp;
		if (elapsedInMs <= 0) { 
			return; // logger?
		}

		Object.assign(this, stats);
	}

	public getPeerConnection() {
		return this._peerConnection;
	}

	public getIceTransport() {
		return this._peerConnection.mappedIceTransportMonitors.get(this.transportId ?? '');
	}

	public createSample(): CodecStats {
		return {
			id: this.id,
			timestamp: this.timestamp,
			payloadType: this.payloadType,
			transportId: this.transportId,
			mimeType: this.mimeType,
			clockRate: this.clockRate,
			channels: this.channels,
			sdpFmtpLine: this.sdpFmtpLine,
			attachments: this.attachments,
		};
	}
}