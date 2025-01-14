import { Detector } from "./Detector";
import { PeerConnectionMonitor } from "../monitors/PeerConnectionMonitor";

export class LongPcConnectionEstablishmentDetector implements Detector{

	private get config() {
		return this.peerConnection.parent.config.longPcConnectionEstablishmentDetector;
	}

	private _evented = false;

	public constructor(
		public readonly peerConnection: PeerConnectionMonitor,
	) {
		
	}

	public update(): void {
		if (this.config.disabled) return;
		if (this.peerConnection.connectionState !== 'connecting') {
			if (this._evented && this.peerConnection.connectionState === 'connected') {
				this._evented = false;
			}
		}
		if (this._evented) return;
		if (this.peerConnection.connectingStartedAt === undefined) return;
		
		const duration = Date.now() - this.peerConnection.connectingStartedAt;
		if (duration < this.config.thresholdInMs) {
			return;
		}
		this._evented = true;
		const clientMontior = this.peerConnection.parent;

		clientMontior.emit('too-long-pc-connection-establishment', {
			peerConnection: this.peerConnection,
		});

		clientMontior.addIssue({
			type: 'too-long-pc-connection-establishment',
			payload: {
				peerConnectionId: this.peerConnection.peerConnectionId,
				connectingStartedAt: this.peerConnection.connectingStartedAt,
				duration,
			},
		})
	}
}