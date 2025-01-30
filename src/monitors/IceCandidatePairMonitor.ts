import { IceCandidatePairStats } from "../schema/ClientSample";
import { PeerConnectionMonitor } from "./PeerConnectionMonitor";

export class IceCandidatePairMonitor implements IceCandidatePairStats{
	private _visited = true;

	id: string;
	timestamp: number;
	transportId?: string | undefined;
	localCandidateId?: string | undefined;
	remoteCandidateId?: string | undefined;
	state?: "new" | "inProgress" | "failed" | "succeeded" | undefined;
	nominated?: boolean | undefined;
	packetsSent?: number | undefined;
	packetsReceived?: number | undefined;
	bytesSent?: number | undefined;
	bytesReceived?: number | undefined;
	lastPacketSentTimestamp?: number | undefined;
	lastPacketReceivedTimestamp?: number | undefined;
	totalRoundTripTime?: number | undefined;
	currentRoundTripTime?: number | undefined;
	availableOutgoingBitrate?: number | undefined;
	availableIncomingBitrate?: number | undefined;
	requestsReceived?: number | undefined;
	requestsSent?: number | undefined;
	responsesReceived?: number | undefined;
	responsesSent?: number | undefined;
	consentRequestsSent?: number | undefined;
	packetsDiscardedOnSend?: number | undefined;
	bytesDiscardedOnSend?: number | undefined;
	
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
		options: IceCandidatePairStats,
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

	public accept(stats: Omit<IceCandidatePairStats, 'appData'>): void {
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

	public getLocalCandidate() {
		return this._peerConnection.mappedIceCandidateMonitors.get(this.localCandidateId ?? '');
	}

	public getRemoteCandidate() {
		return this._peerConnection.mappedIceCandidateMonitors.get(this.remoteCandidateId ?? '');
	}

	public createSample(): IceCandidatePairStats {
		return {
			id: this.id,
			timestamp: this.timestamp,
			transportId: this.transportId,
			localCandidateId: this.localCandidateId,
			remoteCandidateId: this.remoteCandidateId,
			state: this.state,
			nominated: this.nominated,
			packetsSent: this.packetsSent,
			packetsReceived: this.packetsReceived,
			bytesSent: this.bytesSent,
			bytesReceived: this.bytesReceived,
			lastPacketSentTimestamp: this.lastPacketSentTimestamp,
			lastPacketReceivedTimestamp: this.lastPacketReceivedTimestamp,
			totalRoundTripTime: this.totalRoundTripTime,
			currentRoundTripTime: this.currentRoundTripTime,
			availableOutgoingBitrate: this.availableOutgoingBitrate,
			availableIncomingBitrate: this.availableIncomingBitrate,
			requestsReceived: this.requestsReceived,
			requestsSent: this.requestsSent,
			responsesReceived: this.responsesReceived,
			responsesSent: this.responsesSent,
			consentRequestsSent: this.consentRequestsSent,
			packetsDiscardedOnSend: this.packetsDiscardedOnSend,
			bytesDiscardedOnSend: this.bytesDiscardedOnSend,
			attachments: this.attachments,
		};
	}
}