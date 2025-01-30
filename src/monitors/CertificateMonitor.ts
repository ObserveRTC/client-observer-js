import { CertificateStats } from "../schema/ClientSample";
import { PeerConnectionMonitor } from "./PeerConnectionMonitor";

export class CertificateMonitor implements CertificateStats {
	private _visited = true;

	timestamp: number;
	id: string;
	fingerprint?: string | undefined;
	fingerprintAlgorithm?: string | undefined;
	base64Certificate?: string | undefined;
	issuerCertificateId?: string | undefined;

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
		options: CertificateStats,
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

	public accept(stats: Omit<CertificateStats, 'appData'>): void {
		this._visited = true;

		const elapsedInMs = stats.timestamp - this.timestamp;
		if (elapsedInMs <= 0) {
			return; // logger?
		}

		Object.assign(this, stats);
	}

	public createSample(): CertificateStats {
		return {
			id: this.id,
			timestamp: this.timestamp,
			fingerprint: this.fingerprint,
			fingerprintAlgorithm: this.fingerprintAlgorithm,
			base64Certificate: this.base64Certificate,
			issuerCertificateId: this.issuerCertificateId,
			attachments: this.attachments,
		};
	}
}