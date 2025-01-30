import { Detector } from "./Detector";
import { PeerConnectionMonitor } from "../monitors/PeerConnectionMonitor";

export class LongPcConnectionEstablishmentDetector implements Detector{
	public readonly name = 'long-pc-connection-establishment-detector';
	
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
		const clientMonitor = this.peerConnection.parent;

		clientMonitor.emit('too-long-pc-connection-establishment', {
			peerConnectionMonitor: this.peerConnection,
			clientMonitor,
		}
);
	}
}