import { IceTransportStats } from "../schema/ClientSample";
import { PeerConnectionMonitor } from "./PeerConnectionMonitor";

export class IceTransportMonitor implements IceTransportStats {
	private _visited = true;

	timestamp: number;
	id: string;
	packetsSent?: number | undefined;
	packetsReceived?: number | undefined;
	bytesSent?: number | undefined;
	bytesReceived?: number | undefined;
	iceRole?: string | undefined;
	iceLocalUsernameFragment?: string | undefined;
	dtlsState?: string | undefined;
	iceState?: string | undefined;
	selectedCandidatePairId?: string | undefined;
	localCertificateId?: string | undefined;
	remoteCertificateId?: string | undefined;
	tlsVersion?: string | undefined;
	dtlsCipher?: string | undefined;
	dtlsRole?: string | undefined;
	srtpCipher?: string | undefined;
	selectedCandidatePairChanges?: number | undefined;

	deltaPacketsSent?: number | undefined;
	deltaPacketsReceived?: number | undefined;
	deltaBytesSent?: number | undefined;
	deltaBytesReceived?: number | undefined;
	sendingBitrate?: number | undefined;
	receivingBitrate?: number | undefined;

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
		options: IceTransportStats,
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

	public getPeerConnection() {
		return this._peerConnection;
	}

	public getSelectedCandidatePair() {
		return this._peerConnection.mappedIceCandidatePairMonitors.get(this.selectedCandidatePairId ?? '');
	}

	public accept(stats: Omit<IceTransportStats, 'appData'>): void {
		this._visited = true;

		const elapsedInMs = stats.timestamp - this.timestamp;
		const elapsedInSec = elapsedInMs / 1000;

		if (elapsedInMs <= 0) {
			return; // logger?
		}

		if (this.packetsSent && stats.packetsSent) {
			this.deltaPacketsSent = stats.packetsSent - this.packetsSent;
		}
		if (this.packetsReceived && stats.packetsReceived) {
			this.deltaPacketsReceived = stats.packetsReceived - this.packetsReceived;
		}
		if (this.bytesSent && stats.bytesSent) {
			this.deltaBytesSent = stats.bytesSent - this.bytesSent;
			this.sendingBitrate = (this.deltaBytesSent * 8) / elapsedInSec;
		}
		if (this.bytesReceived && stats.bytesReceived) {
			this.deltaBytesReceived = stats.bytesReceived - this.bytesReceived;
			this.receivingBitrate = (this.deltaBytesReceived * 8) / elapsedInSec;
		}

		Object.assign(this, stats);
	}

	public createSample(): IceTransportStats {
		return {
			id: this.id,
			timestamp: this.timestamp,
			packetsSent: this.packetsSent,
			packetsReceived: this.packetsReceived,
			bytesSent: this.bytesSent,
			bytesReceived: this.bytesReceived,
			iceRole: this.iceRole,
			iceLocalUsernameFragment: this.iceLocalUsernameFragment,
			dtlsState: this.dtlsState,
			iceState: this.iceState,
			selectedCandidatePairId: this.selectedCandidatePairId,
			localCertificateId: this.localCertificateId,
			remoteCertificateId: this.remoteCertificateId,
			tlsVersion: this.tlsVersion,
			dtlsCipher: this.dtlsCipher,
			dtlsRole: this.dtlsRole,
			srtpCipher: this.srtpCipher,
			selectedCandidatePairChanges: this.selectedCandidatePairChanges,
			attachments: this.attachments,
		};
	}

}