import { Detector } from "./Detector";
import { InboundTrackMonitor } from "../monitors/InboundTrackMonitor";

export class AudioDesyncDetector implements Detector {
	public readonly name = 'audio-desync-detector';
	
	public constructor(
		public readonly trackMonitor: InboundTrackMonitor,
	) {
		
	}
	private _startedDesyncAt?: number;
	private _prevCorrectedSamples = 0;
	
	private get config() {
		return this.peerConnection.parent.config.audioDesyncDetector;
	}

	private get peerConnection() {
		return this.trackMonitor.getPeerConnection();
	}


	public update() {
		const inboundRtp = this.trackMonitor.getInboundRtp();
		if (!inboundRtp || inboundRtp.kind !== 'audio') return;
		if (this.config.disabled) return;

		const correctedSamples = (inboundRtp.insertedSamplesForDeceleration ?? 0) + (inboundRtp.removedSamplesForAcceleration ?? 0);
		const dCorrectedSamples = correctedSamples - this._prevCorrectedSamples;

		if (dCorrectedSamples < 1 || (inboundRtp.receivingAudioSamples ?? 0) < 1) return;

		const fractionalCorrection = dCorrectedSamples / (dCorrectedSamples + (inboundRtp.receivingAudioSamples ?? 0));

		const wasDesync = inboundRtp.desync;
		if (inboundRtp.desync) {
			inboundRtp.desync = this.config.fractionalCorrectionAlertOffThreshold < fractionalCorrection;
		} else {
			inboundRtp.desync = this.config.fractionalCorrectionAlertOnThreshold < fractionalCorrection;
		}

		if (!inboundRtp.desync) {
			if (wasDesync) {
				this._startedDesyncAt = undefined;
			}
			return;
		} else if (wasDesync) {
			return;
		}

		this._startedDesyncAt = Date.now();
		this.peerConnection.parent.emit('audio-desync-track', {
			clientMonitor: this.peerConnection.parent,
			trackMonitor: this.trackMonitor,
		});
	}
}
