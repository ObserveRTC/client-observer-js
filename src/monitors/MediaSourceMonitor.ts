import { MediaSourceStats } from "../schema/ClientSample";
import { MediaKind } from "../schema/W3cStatsIdentifiers";
import { PeerConnectionMonitor } from "./PeerConnectionMonitor";

export class MediaSourceMonitor implements MediaSourceStats {
	private _visited = true;
	
	timestamp: number;
	id: string;
	kind: MediaKind;
	audioLevel?: number | undefined;
	trackIdentifier?: string;
	totalAudioEnergy?: number | undefined;
	totalSamplesDuration?: number | undefined;
	echoReturnLoss?: number | undefined;
	echoReturnLossEnhancement?: number | undefined;
	width?: number | undefined;
	height?: number | undefined;
	frames?: number | undefined;
	framesPerSecond?: number | undefined;
	
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
		options: MediaSourceStats,
	) {
		this.id = options.id;
		this.timestamp = options.timestamp;
		this.kind = options.kind as MediaKind;

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

	public getTrack() {
		return this._peerConnection.mappedOutboundTracks.get(this.trackIdentifier ?? '');
	}

	public accept(stats: Omit<MediaSourceStats, 'appData'>): void {
		this._visited = true;

		const elapsedInMs = stats.timestamp - this.timestamp;
		if (elapsedInMs <= 0) { 
			return; // logger?
		}

		Object.assign(this, stats);
	}

	public createSample(): MediaSourceStats {
		return {
			id: this.id,
			timestamp: this.timestamp,
			kind: this.kind,
			audioLevel: this.audioLevel,
			trackIdentifier: this.trackIdentifier,
			totalAudioEnergy: this.totalAudioEnergy,
			totalSamplesDuration: this.totalSamplesDuration,
			echoReturnLoss: this.echoReturnLoss,
			echoReturnLossEnhancement: this.echoReturnLossEnhancement,
			width: this.width,
			height: this.height,
			frames: this.frames,
			framesPerSecond: this.framesPerSecond,
			attachments: this.attachments,
		};
	}
}