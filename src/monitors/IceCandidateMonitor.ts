import { IceCandidateStats } from "../schema/ClientSample";
import { PeerConnectionMonitor } from "./PeerConnectionMonitor";

export class IceCandidateMonitor implements IceCandidateStats {
	private _visited = true;

	timestamp: number;
	id: string;
	transportId?: string | undefined;
	address?: string | undefined;
	port?: number | undefined;
	protocol?: string | undefined;
	candidateType?: string | undefined;
	priority?: number | undefined;
	url?: string | undefined;
	relayProtocol?: string | undefined;
	foundation?: string | undefined;
	relatedAddress?: string | undefined;
	relatedPort?: number | undefined;
	usernameFragment?: string | undefined;
	tcpType?: string | undefined;

	appData?: Record<string, unknown> | undefined;

	public constructor(
		public readonly peerConnection: PeerConnectionMonitor,
		options: IceCandidateStats,
	) {
		this.id = options.id;
		this.timestamp = options.timestamp;
	}

	public get visited(): boolean {
		const result = this._visited;
		
		this._visited = false;

		return result;
	}

	public accept(stats: Omit<IceCandidateStats, 'appData'>): void {
		this._visited = true;

		const elapsedInMs = stats.timestamp - this.timestamp;
		if (elapsedInMs <= 0) { 
			return; // logger?
		}

		Object.assign(this, stats);
	}

	public getIceTransport() {
		return this.peerConnection.mappedIceTransportMonitors.get(this.transportId ?? '');
	}

	public createSample(): IceCandidateStats {
		return {
			id: this.id,
			timestamp: this.timestamp,
			transportId: this.transportId,
			address: this.address,
			port: this.port,
			protocol: this.protocol,
			candidateType: this.candidateType,
			priority: this.priority,
			url: this.url,
			relayProtocol: this.relayProtocol,
			foundation: this.foundation,
			relatedAddress: this.relatedAddress,
			relatedPort: this.relatedPort,
			usernameFragment: this.usernameFragment,
			tcpType: this.tcpType,
			appData: this.appData,
		};
	}
}