import { InboundTrackMonitor } from "../monitors/InboundTrackMonitor";
import { Detector } from "./Detector";


export class DryInboundTrackDetector implements Detector {
	public readonly name = 'dry-inbound-track-detector';
	
	public constructor(
		public readonly trackMonitor: InboundTrackMonitor,
	) {
	}

	private _evented = false;

	private get peerConnection() {
		return this.trackMonitor.getPeerConnection();
	}

	private get config() {
		return this.peerConnection.parent.config.stuckedInboundTrackDetector;
	}

	public update() {
		if (this._evented || this.config.disabled) return;
		if (this.trackMonitor.getInboundRtp()?.bytesReceived !== 0) return;
		const inboundRtp = this.trackMonitor.getInboundRtp();

		const duration = Date.now() - inboundRtp.addedAt;

		if (duration < this.config.thresholdInMs) return;

		this._evented = true;

		const clientMonitor = this.peerConnection.parent;

		clientMonitor.emit('dry-inbound-track', {
			trackMonitor: this.trackMonitor,
			clientMonitor: clientMonitor,
		});
	}
}