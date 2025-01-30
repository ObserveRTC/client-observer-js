import { Detector } from "./Detector";
import { InboundTrackMonitor } from "../monitors/InboundTrackMonitor";

export class FreezedVideoTrackDetector implements Detector {
	public readonly name = 'freezed-video-track-detector';
	
	public constructor(
		public readonly trackMonitor: InboundTrackMonitor,
	) {
	}

	private get _config() {
		return this.peerConnection.parent.config.videoFreezesDetector;
	}

	private get peerConnection() {
		return this.trackMonitor.getPeerConnection();
	}

	private _lastFreezeCount = 0;

	public update() {
		const inboundRtp = this.trackMonitor.getInboundRtp();
		if (!inboundRtp || !inboundRtp.freezeCount || this._config.disabled) {
			return;
		}

		const wasFreezed = inboundRtp.isFreezed;
		const clientMonitor = this.peerConnection.parent;

		inboundRtp.isFreezed = 0 < Math.max(0, inboundRtp.freezeCount - this._lastFreezeCount);
		this._lastFreezeCount = inboundRtp.freezeCount;

		if (!wasFreezed && inboundRtp.isFreezed) {
			clientMonitor.emit('freezed-video-track', {
				clientMonitor: this.peerConnection.parent,
				trackMonitor: this.trackMonitor,
			})

		} else if (wasFreezed && !inboundRtp.isFreezed) {
			// clientMonitor.addIssue({
			// 	type: 'freezed-video-track',
			// 	payload: {
			// 		peerConnectionId: this.peerConnection.peerConnectionId,
			// 		trackId: inboundRtp.trackIdentifier,
			// 		ssrc: inboundRtp.ssrc,
			// 		duration: Date.now() - this._startedFreezeAt,
			// 		issueContext,
			// 	}
			// });
		}
	}
}
