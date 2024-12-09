import EventEmitter from "events";
import { IceCandidatePairEntry, PeerConnectionEntry } from "../entries/StatsEntryInterfaces";
import { Detector } from "./Detector";
import { AlertState } from "../ClientMonitor";

type PeerConnectionState = {
	peerConnectionId: string;
	ewmaRttInS?: number;
	ewmaFl?: number;

	congested: boolean;
	outgoingBitrateBeforeCongestion?: number;
	outgoingBitrateAfterCongestion?: number;
	incomingBitrateBeforeCongestion?: number;
	incomingBitrateAfterCongestion?: number;		
}

export type CongestionDetectorEvents = {
	'alert-state': [AlertState];
	congestion: [{
		peerConnectionIds: string[],
		outgoingBitrateBeforeCongestion?: number;
		outgoingBitrateAfterCongestion?: number;
		incomingBitrateBeforeCongestion?: number;
		incomingBitrateAfterCongestion?: number;
	}];
	close: [];
}

export type CongestionDetectorConfig = {
	sensitivity: 'high' | 'medium' | 'low';
}

export declare interface CongestionDetector extends Detector {
	on<K extends keyof CongestionDetectorEvents>(event: K, listener: (...events: CongestionDetectorEvents[K]) => void): this;
	off<K extends keyof CongestionDetectorEvents>(event: K, listener: (...events: CongestionDetectorEvents[K]) => void): this;
	once<K extends keyof CongestionDetectorEvents>(event: K, listener: (...events: CongestionDetectorEvents[K]) => void): this;
	emit<K extends keyof CongestionDetectorEvents>(event: K, ...events: CongestionDetectorEvents[K]): boolean;
}

export class CongestionDetector extends EventEmitter {
	private _closed = false;
	private _states = new Map<string, PeerConnectionState>();

	public constructor(
		public readonly config: CongestionDetectorConfig
	) {
		super();
		this.setMaxListeners(Infinity);
	}

	public get states(): ReadonlyMap<string, PeerConnectionState> {
		return this._states;
	}

	public update(peerConnections: IterableIterator<PeerConnectionEntry>) {
		const visitedPeerConnectionIds = new Set<string>();
		let gotCongested = false;

		for (const peerConnection of peerConnections) {
			const { peerConnectionId } = peerConnection;
			let state = this._states.get(peerConnectionId);

			visitedPeerConnectionIds.add(peerConnectionId);

			if (!state) {
				state = {
					peerConnectionId,
					congested: false,
					// outgoingBitrateBeforeCongestion: 0,
					// outgoingBitrateAfterCongestion: 0,
					// incomingBitrateBeforeCongestion: 0,
					// incomingBitrateAfterCongestion: 0,
				};
				this._states.set(peerConnectionId, state);
			}
			const wasCongested = state.congested;
			let hasBwLimitedOutboundRtp = false;
			
			for (const outboundRtp of peerConnection.outboundRtps()) {
				hasBwLimitedOutboundRtp ||= outboundRtp.stats.qualityLimitationReason === 'bandwidth';
				// isCongested ||= outboundRtp.stats.qualityLimitationReason === 'bandwidth';
			}
			
			let rttDiffInS = 0;
			if (peerConnection.avgRttInS !== undefined) {
				if (state.ewmaRttInS === undefined) {
					state.ewmaRttInS = peerConnection.avgRttInS;
				}
				rttDiffInS = Math.abs(peerConnection.avgRttInS - state.ewmaRttInS);
			}
			
			let isCongested = false;
			switch (this.config.sensitivity) {
				case 'high':
					isCongested = hasBwLimitedOutboundRtp;
					break;
				case 'medium': {
					if (!state.ewmaRttInS) break;
					
					const rttDiffThreshold = Math.min(0.15, Math.max(0.05, state.ewmaRttInS * 0.33));
					
					isCongested = hasBwLimitedOutboundRtp && rttDiffInS > rttDiffThreshold;

					break;
				}
				case 'low': {
					if (!state.ewmaRttInS || !peerConnection.sendingFractionalLoss) break;
					
					isCongested = hasBwLimitedOutboundRtp && peerConnection.sendingFractionalLoss > 0.05;
					break;
				}
			}

			if (peerConnection.avgRttInS && state.ewmaRttInS) {
				const alpha = isCongested ? 0.02 : 0.1;
				
				state.ewmaRttInS = ((1.0 - alpha) * state.ewmaRttInS) + (alpha * peerConnection.avgRttInS);
			}

			peerConnection.sendingFractionalLoss;

			let selectedCandidatePair: IceCandidatePairEntry | undefined;
			for (const transport of peerConnection.transports()) {
				selectedCandidatePair = transport.getSelectedIceCandidatePair();
				if (selectedCandidatePair) break;
			}

			if (!selectedCandidatePair) {
				selectedCandidatePair = Array.from(peerConnection.iceCandidatePairs()).find(pair => pair.stats.nominated === true);
			}

			selectedCandidatePair?.stats.availableIncomingBitrate;
			selectedCandidatePair?.stats.availableOutgoingBitrate;

			if (isCongested) {
				state.incomingBitrateAfterCongestion = selectedCandidatePair?.stats.availableIncomingBitrate ?? state.incomingBitrateAfterCongestion;
				state.outgoingBitrateAfterCongestion = selectedCandidatePair?.stats.availableOutgoingBitrate ?? state.outgoingBitrateAfterCongestion;
				state.congested = true;
				peerConnection.congested = true;
			} else {
				state.incomingBitrateBeforeCongestion = selectedCandidatePair?.stats.availableIncomingBitrate ?? state.incomingBitrateBeforeCongestion;
				state.outgoingBitrateBeforeCongestion = selectedCandidatePair?.stats.availableOutgoingBitrate ?? state.outgoingBitrateBeforeCongestion;
				state.congested = false;
				peerConnection.congested = false;
			}
			
			if (wasCongested === isCongested) {
				if (isCongested) {
					state.incomingBitrateBeforeCongestion = undefined;
					state.outgoingBitrateBeforeCongestion = undefined;
				} else {
					state.incomingBitrateAfterCongestion = undefined;
					state.outgoingBitrateAfterCongestion = undefined;
				}
			} else if (!wasCongested && isCongested) {
				gotCongested = true;
				this.emit('alert-state', 'on');
			} else if (wasCongested && !isCongested) {
				this.emit('alert-state', 'off');
			}
		}

		if (gotCongested) {
			this.emit('congestion', {
				peerConnectionIds: Array.from(this._states.values()).filter(s => s.congested).map(s => s.peerConnectionId),
				incomingBitrateAfterCongestion: Array.from(this._states.values()).reduce((acc, s) => acc + (s.incomingBitrateAfterCongestion ?? 0), 0),
				outgoingBitrateAfterCongestion: Array.from(this._states.values()).reduce((acc, s) => acc + (s.outgoingBitrateAfterCongestion ?? 0), 0),
				incomingBitrateBeforeCongestion: Array.from(this._states.values()).reduce((acc, s) => acc + (s.incomingBitrateBeforeCongestion ?? 0), 0),
				outgoingBitrateBeforeCongestion: Array.from(this._states.values()).reduce((acc, s) => acc + (s.outgoingBitrateBeforeCongestion ?? 0), 0),
			});
		}
		// gotCongested && this.emit('congestion', Array.from(this._states.values()));

		for (const [peerConnectionId] of Array.from(this._states)) {
			if (!visitedPeerConnectionIds.has(peerConnectionId)) {
				this._states.delete(peerConnectionId);
			}
		}
	}

	public get closed() {
		return this._closed;
	}

	public close() {
		if (this._closed) return;
		this._closed = true;

		this.emit('close');
	}
}
