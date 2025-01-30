import { ExtensionStat, 
    ClientSample, 
    ClientEvent as ClientSampleClientEvent, 
    ClientMetaData as ClientSampleClientMetaData, 
    ClientIssue as ClientSampleClientIssue, 
} from './schema/ClientSample';
import { createLogger } from "./utils/logger";
import { EventEmitter } from 'events';
import { 
    ClientEvent, 
    ClientIssue, 
    ClientMetaData, 
    ClientMonitorEvents 
} from './ClientMonitorEvents';
import { PeerConnectionMonitor } from './monitors/PeerConnectionMonitor';
import { ClientEventTypes } from './schema/ClientEventTypes';
import { ClientMonitorConfig } from './ClientMonitorConfig';
import { StatsAdapters } from './adapters/StatsAdapters';
import { Sources } from './sources/Sources';
import { PartialBy } from './utils/common';
import { Detectors } from './detectors/Detectors';
import { CpuPerformanceDetector } from './detectors/CpuPerformanceDetector';
import { OutboundTrackMonitor } from './monitors/OutboundTrackMonitor';
import { InboundTrackMonitor } from './monitors/InboundTrackMonitor';
import { TrackMonitor } from './monitors/TrackMonitor';
import { DefaultScoreCalculator } from './scores/DefaultScoreCalculator';
import { ScoreCalculator } from "./scores/ScoreCalculator";
import * as mediasoup from 'mediasoup-client';

const logger = createLogger('ClientMonitor');

export declare interface ClientMonitor {
    on<U extends keyof ClientMonitorEvents>(event: U, listener: (...args: ClientMonitorEvents[U]) => void): this;
    once<U extends keyof ClientMonitorEvents>(event: U, listener: (...args: ClientMonitorEvents[U]) => void): this;
    off<U extends keyof ClientMonitorEvents>(event: U, listener: (...args: ClientMonitorEvents[U]) => void): this;
    emit<U extends keyof ClientMonitorEvents>(event: U, ...args: ClientMonitorEvents[U]): boolean;
}

export class ClientMonitor extends EventEmitter {
    public readonly statsAdapters = new StatsAdapters();
    public readonly mappedPeerConnections = new Map<string, PeerConnectionMonitor>();
    public readonly detectors: Detectors;
    
    public scoreCalculator: ScoreCalculator;
    public bufferingSampleData: boolean;
    public closed = false;
    public lastSampledAt = 0;
    public lastCollectingStatsAt = 0;
    
    public cpuPerformanceAlertOn = false;
    
    public sendingAudioBitrate = -1;
    public sendingVideoBitrate = -1;
    public receivingAudioBitrate = -1;
    public receivingVideoBitrate = -1;
    public totalAvailableIncomingBitrate = -1;
    public totalAvailableOutgoingBitrate = -1;
    
    public avgRttInSec = -1;
    public score = 5.0;
    
    private readonly _sources: Sources;
    private _timer?: ReturnType<typeof setInterval>;
    private _samplingTick = 0;
    private _collectingCounter = 0;
    private _clientEvents: ClientSampleClientEvent[] = [];
    private _clientMetaItems: ClientSampleClientMetaData[] = [];
    private _clientIssues: ClientSampleClientIssue[] = [];
    private _extensionStats: ExtensionStat[] = [];
    public durationOfCollectingStatsInMs = 0;
    public readonly config: ClientMonitorConfig;

    /**
     * Additional data attached to this stats, will be shipped to the server if sample is created
     */
    public attachments?: Record<string, unknown>;

    public constructor(
        config: Partial<ClientMonitorConfig>
    ) {
        super();
        this.config = {
            ...config,
            collectingPeriodInMs: config?.collectingPeriodInMs ?? 2000,
            samplingPeriodInMs: config?.samplingPeriodInMs ?? 8000,
            
            integrateNavigatorMediaDevices: config?.integrateNavigatorMediaDevices ?? true,
            addClientJointEventOnCreated: config?.addClientJointEventOnCreated ?? true,
            addClientLeftEventOnClose: config?.addClientLeftEventOnClose ?? true,
    
            videoFreezesDetector: config?.videoFreezesDetector ?? {
            },
            stuckedInboundTrackDetector: config?.stuckedInboundTrackDetector ?? {
                thresholdInMs: 5000,
            },
            audioDesyncDetector: config?.audioDesyncDetector ?? {
                fractionalCorrectionAlertOffThreshold: 0.1,
                fractionalCorrectionAlertOnThreshold: 0.05,
            },
            congestionDetector: config?.congestionDetector ?? {
                sensitivity: 'medium',
            },
            cpuPerformanceDetector: config?.cpuPerformanceDetector ?? {
                fpsVolatilityThresholds: {
                    lowWatermark: 0.1,
                    highWatermark: 0.3,
                },
                durationOfCollectingStatsThreshold: {
                    lowWatermark: 5000,
                    highWatermark: 10000,
                },
            },
            longPcConnectionEstablishmentDetector: config?.longPcConnectionEstablishmentDetector ?? {
                thresholdInMs: 5000,
            },
        }

        this._sources = new Sources(this);
        this.scoreCalculator = new DefaultScoreCalculator(this);
        this.setMaxListeners(Infinity);
        this.setCollectingPeriod(this.config.collectingPeriodInMs);
        if (config.samplingPeriodInMs) {
            this.setSamplingPeriod(config.samplingPeriodInMs);
        }
        this.bufferingSampleData = 0 < this._samplingTick;

        if (this.config.addClientJointEventOnCreated === true) {
            this.addClientJoinEvent();
        }
        if (this.config.integrateNavigatorMediaDevices) {
            this._sources.watchNavigatorMediaDevices();
        }
        try {
            this._sources.fetchUserAgentData();
        } catch (err) {
            logger.error('Failed to fetch user agent data', err);
        }
        
        this.detectors = new Detectors(
            new CpuPerformanceDetector(this),
        );
    }

    public get clientId() { return this.config.clientId; }
    public set clientId(clientId: string | undefined) { this.config.clientId = clientId; }
    public get callId() { return this.config.callId; }
    public set callId(callId: string | undefined) { this.config.callId = callId; }
    public get appData() { return this.config.appData; }
    public set appData(appData: Record<string, unknown> | undefined) { this.config.appData = appData; }

    public close(): void {
        if (this.closed) {
            return;
        }
        clearInterval(this._timer);
        this._timer = undefined;

        if (this.config.addClientLeftEventOnClose) {
            this.addClientLeftEvent({});
        }
        if (0 < this._samplingTick) {
            // create the last sample before close
            this.createSample();
        }
        
        this.closed = true;
        this.emit('close');
    }

    public async collect(): Promise<[string, RTCStats[]][]> {
        if (this.closed) throw new Error('ClientMonitor is closed');
        
        this.lastCollectingStatsAt = Date.now();
        const result: [string, RTCStats[]][] = [];
        
        await Promise.allSettled(this.peerConnections.map(async (peerConnection) => {
            try {
                const collectedStats = await peerConnection.getStats();
                const adaptedStats = this.statsAdapters.adapt(collectedStats);
    
                peerConnection.accept(adaptedStats);
    
                result.push([peerConnection.peerConnectionId, collectedStats as RTCStats[]]);
            } catch (err) {
                logger.error(`Failed to get stats from peer connection ${peerConnection.peerConnectionId}`, err);
            }
        }));

        this.sendingAudioBitrate = this.peerConnections.reduce((acc, peerConnection) => acc + (peerConnection.sendingAudioBitrate ?? 0), 0);
        this.sendingVideoBitrate = this.peerConnections.reduce((acc, peerConnection) => acc + (peerConnection.sendingVideoBitrate ?? 0), 0);
        this.receivingAudioBitrate = this.peerConnections.reduce((acc, peerConnection) => acc + (peerConnection.receivingAudioBitrate ?? 0), 0);
        this.receivingVideoBitrate = this.peerConnections.reduce((acc, peerConnection) => acc + (peerConnection.receivingVideoBitrate ?? 0), 0);
        this.totalAvailableIncomingBitrate = this.peerConnections.reduce((acc, peerConnection) => acc + (peerConnection.totalAvailableIncomingBitrate ?? 0), 0);
        this.totalAvailableOutgoingBitrate = this.peerConnections.reduce((acc, peerConnection) => acc + (peerConnection.totalAvailableOutgoingBitrate ?? 0), 0);
        this.avgRttInSec = this.peerConnections.reduce((acc, peerConnection) => acc + (peerConnection.avgRttInSec ?? 0), 0) / this.peerConnections.length;
        this.durationOfCollectingStatsInMs = Date.now() - this.lastCollectingStatsAt;
        
        this.tracks.forEach(track => track.update());
        this.detectors.update();
        this.scoreCalculator.update();

        this.emit('stats-collected', {
            clientMonitor: this,
            startedAt: this.lastCollectingStatsAt,
            collectedStats: result,
            durationOfCollectingStatsInMs: this.durationOfCollectingStatsInMs,
        });
        
        if (0 < this._samplingTick) {
            const doSample = ++this._collectingCounter % this._samplingTick === 0;

            if (doSample) {
                this.createSample();
            }
        }
        
        return result;
    }

    public setScore(score: number): void {
        if (this.closed) return;
        
        this.score = score;
        this.emit('score', {
            clientMonitor: this,
            clientScore: score,
        });
    }

    public createSample(): ClientSample | undefined {
        if (this.closed) return;

        const clientSample: ClientSample = {
            clientId: this.clientId,
            timestamp: Date.now(),
            callId: this.callId,
            attachments: this.attachments,
            peerConnections: this.peerConnections.map(peerConnection => peerConnection.createSample()),
            clientEvents: this._clientEvents,
            clientMetaItems: this._clientMetaItems,
            clientIssues: this._clientIssues,
            extensionStats: this._extensionStats,
            score: this.score,
        };
        this._clientEvents = [];
        this._clientMetaItems = [];
        this._clientIssues = [];
        this._extensionStats = [];

        const timestamp = Date.now();
        if (!clientSample) {
            return;
        }
        this.emit('sample-created', {
            clientMonitor: this,
            sample: clientSample
        });
        this.lastSampledAt = timestamp;

        return clientSample;
    }

    public addPeerConnectionMonitor(peerConnectionMonitor: PeerConnectionMonitor): void {
        if (this.closed) return;
        if (this.mappedPeerConnections.has(peerConnectionMonitor.peerConnectionId)) {
            throw new Error(`PeerConnectionMonitor with id ${peerConnectionMonitor.peerConnectionId} already exists`);
        }

        peerConnectionMonitor.once('close', () => {
            this.mappedPeerConnections.delete(peerConnectionMonitor.peerConnectionId);
        })
        this.mappedPeerConnections.set(peerConnectionMonitor.peerConnectionId, peerConnectionMonitor);
        
        this.emit('new-peerconnnection-monitor', {
            peerConnectionMonitor,
            clientMonitor: this,
        });
    }


    public addClientJoinEvent(event?: { payload?: Record<string, unknown>, timestamp?: number }): void {
        if (this.closed) return;

        this.addEvent({
            type: ClientEventTypes.CLIENT_JOINED,
            payload: {
                ...event?.payload,
            },
            timestamp: event?.timestamp ?? Date.now(),
        })
    }

    public addClientLeftEvent(event?: { payload?: Record<string, unknown>, timestamp?: number }): void {
        if (this.closed) return;

        this.addEvent({
            type: ClientEventTypes.CLIENT_LEFT,
            payload: {
                ...event?.payload,
            },
            timestamp: event?.timestamp ?? Date.now(),
        })
    }

    public addEvent(event: PartialBy<ClientEvent, 'timestamp'>): void {
        if (this.closed) return;
        if (!this.bufferingSampleData) return;

        const payload = event.payload ? JSON.stringify(event.payload) : undefined;
        this._clientEvents.push({
            ...event,
            payload,
            timestamp: event.timestamp ?? Date.now(),
        });
    }

    public addIssue(issue: PartialBy<ClientIssue, 'timestamp'>): void {
        if (this.closed) return;
        if (!this.bufferingSampleData) return;
        
        const payload = issue.payload ? JSON.stringify(issue.payload) : undefined;
        const timestamp = issue.timestamp ?? Date.now();
        this._clientIssues.push({
            ...issue,
            payload,
            timestamp,
        });

        this.emit('issue', {
            ...issue,
            payload: issue.payload,
            timestamp
        });
    }

    public addMetaData(metaData: PartialBy<ClientMetaData, 'timestamp'>): void {
        if (this.closed) return;
        if (!this.bufferingSampleData) return;

        this._clientMetaItems.push({
            type: metaData.type,
            payload: metaData.payload ? JSON.stringify(metaData.payload) : undefined,
            timestamp: metaData.timestamp ?? Date.now(),
        });
    }

    public addExtensionStats(stats: { type: string, payload?: Record<string, unknown>}): void {
        if (this.closed) return;
        if (!this.bufferingSampleData) return;

        const payload = stats.payload ? JSON.stringify(stats.payload) : undefined;
        this._extensionStats.push({
            type: stats.type,
            payload,
        });
    }

    public addSource(source: unknown): void {
        if (this.closed) {
            throw new Error('Cannot add source to closed ClientMonitor');
        }
        const constructorName = (source as any)?.constructor?.name;

        if (source instanceof RTCPeerConnection || constructorName === 'RTCPeerConnection') {
            this._sources.addRTCPeerConnection({ peerConnection: source as RTCPeerConnection });
        } else if (source instanceof mediasoup.types.Device || constructorName === 'Device') {
            this._sources.addMediasoupDevice(source as mediasoup.types.Device);
        } else if (source instanceof mediasoup.types.Transport || constructorName === 'Transport') {
            this._sources.addMediasoupTransport(source as mediasoup.types.Transport);
        } else {
            throw new Error('Unknown source type');
        }
    }

    public fetchUserAgentData() {
        return this._sources.fetchUserAgentData();
    }

    public watchNavigatorMediaDevices() {
        this._sources.watchNavigatorMediaDevices();
    }
    
    public get peerConnections() {
        return [...this.mappedPeerConnections.values()];
    }

    public get codecs() {
        return [...this.peerConnections.flatMap(peerConnection => peerConnection.codecs)];
    }

    public get inboundRtps() {
        return [ ...this.peerConnections.flatMap(peerConnection => peerConnection.inboundRtps) ];
    }

    public get outboundRtps() {
        return [ ...this.peerConnections.flatMap(peerConnection => peerConnection.outboundRtps) ];
    }

    public get remoteInboundRtps() {
        return [ ...this.peerConnections.flatMap(peerConnection => peerConnection.remoteInboundRtps) ];
    }

    public get remoteOutboundRtps() {
        return [ ...this.peerConnections.flatMap(peerConnection => peerConnection.remoteOutboundRtps) ];
    }

    public get mediaSources() {
        return [ ...this.peerConnections.flatMap(peerConnection => peerConnection.mediaSources) ];
    }

    public get mediaPlayouts() {
        return [ ...this.peerConnections.flatMap(peerConnection => peerConnection.mediaPlayouts) ];
    }

    public get dataChannels() {
        return [ ...this.peerConnections.flatMap(peerConnection => peerConnection.dataChannels) ];
    }

    public get iceCandidatePairs() {
        return [ ...this.peerConnections.flatMap(peerConnection => peerConnection.iceCandidatePairs) ];
    }

    public get iceCandidates() {
        return [ ...this.peerConnections.flatMap(peerConnection => peerConnection.iceCandidates) ];
    }

    public get iceTransports() {
        return [ ...this.peerConnections.flatMap(peerConnection => peerConnection.iceTransports) ];
    }

    public get certificates() {
        return [ ...this.peerConnections.flatMap(peerConnection => peerConnection.certificates) ];
    }

    public get tracks(): TrackMonitor[] {
        return [ ...this.peerConnections.flatMap(peerConnection => peerConnection.tracks) ];
    }

    public getTrackMonitor(trackId: string): TrackMonitor | undefined {
        return this.getInboundTrackMonitor(trackId) ?? this.getOutboundTrackMonitor(trackId);
    }

    public getInboundTrackMonitor(trackId: string): InboundTrackMonitor | undefined {
        return this.peerConnections.find(peerConnection => 
            peerConnection.mappedInboundTracks.has(trackId)
        )?.mappedInboundTracks.get(trackId);
    }

    public getOutboundTrackMonitor(trackId: string): OutboundTrackMonitor | undefined {
        return this.peerConnections.find(peerConnection => 
            peerConnection.mappedOutboundTracks.has(trackId)
        )?.mappedOutboundTracks.get(trackId);
    }

    public setCollectingPeriod(collectingPeriodInMs: number): void {
        this._timer && clearInterval(this._timer);
        this._timer = undefined;
        this.config.collectingPeriodInMs = collectingPeriodInMs;
        
        if (!this.config.collectingPeriodInMs) return;

        this._timer = setInterval(() => {
            this.collect().catch(err => logger.error(err));
        }, this.config.collectingPeriodInMs);
    }

    public setSamplingPeriod(samplingPeriodInMs: number): void {
        this.config.samplingPeriodInMs = samplingPeriodInMs;

        if (0 < this.config.collectingPeriodInMs && this.config.samplingPeriodInMs !== undefined && 0 < this.config.samplingPeriodInMs) {
            if (this.config.samplingPeriodInMs % this.config.collectingPeriodInMs !== 0) {
                logger.warn(`The samplingPeriodInMs (${this.config.samplingPeriodInMs}) should be a multiple of collectingPeriodInMs (${this.config.collectingPeriodInMs}), otherwise the sampling will not be accurate`);
            }
            this._samplingTick = Math.max(1, 
                Math.floor(this.config.samplingPeriodInMs / this.config.collectingPeriodInMs)
            );
        }
    }
}
