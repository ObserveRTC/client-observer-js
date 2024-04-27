import { MediaDevice, CustomCallEvent, ExtensionStat, ClientSample } from './schema/Samples';
import { CollectedStats, createCollectors } from "./Collectors";
import { createLogger } from "./utils/logger";
import { ClientMetaData } from './ClientMetaData';
import { StatsStorage } from './entries/StatsStorage';
import { TypedEventEmitter } from './utils/TypedEmitter';
import { Sampler } from './Sampler';
import { createAdapterMiddlewares } from './collectors/Adapter';
import * as validators from './utils/validators';
import { PeerConnectionEntry, PeerConnectionStateUpdated, TrackStats } from './entries/StatsEntryInterfaces';
import { AudioDesyncDetector, AudioDesyncDetectorConfig } from './detectors/AudioDesyncDetector';
import { CongestionDetector, CongestionDetectorEvents } from './detectors/CongestionDetector';
import { CpuPerformanceDetector, CpuPerformanceDetectorConfig } from './detectors/CpuPerformanceDetector';
import  {
    VideoFreezesDetector,
    VideoFreezesDetectorConfig,
    FreezedVideoStartedEvent,
    FreezedVideoEndedEvent,
} from './detectors/VideoFreezesDetector';
import { StuckedInboundTrackDetector, StuckedInboundTrackDetectorConfig } from './detectors/StuckedInboundTrack';
import { LongPcConnectionEstablishmentDetector, LongPcConnectionEstablishmentDetectorConfig } from './detectors/LongPcConnectionEstablishment';

const logger = createLogger('ClientMonitor');

type ClientDetectorIssueDetectionExtension = {
    severity: 'critical' | 'major' | 'minor',
    description?: string,
    attachments?: Record<string, unknown>,
}

export type ClientMonitorConfig = {

    /**
     * By setting this, the observer calls the added statsCollectors periodically
     * and pulls the stats.
     *
     * DEFAULT: undefined
     */
    collectingPeriodInMs?: number;

    /**
     * By setting this, the observer makes samples after n number or collected stats.
     * 
     * For example if the value is 10, the observer makes a sample after 10 collected stats (in every 10 collectingPeriodInMs).
     *
     * DEFAULT: undefined
     */
    samplingTick?: number;

    /**
     * Configuration for detecting issues.
     */
    detectIssues?: {
        /**
         * Configuration for detecting congestion issues.
         */
        congestion?: ClientIssue['severity'] | ClientDetectorIssueDetectionExtension,
        
        /**
         * Configuration for detecting audio desynchronization issues.
         */
        audioDesync?: ClientIssue['severity'] | ClientDetectorIssueDetectionExtension,
        
        /**
         * Configuration for detecting frozen video issues.
         */
        freezedVideo?: ClientIssue['severity'] | ClientDetectorIssueDetectionExtension,
        
        /**
         * Configuration for detecting CPU limitation issues.
         */
        cpuLimitation?: ClientIssue['severity'] | ClientDetectorIssueDetectionExtension,
        
        /**
         * Configuration for detecting stucked inbound track issues.
         */
        stuckedInboundTrack?: ClientIssue['severity'] | ClientDetectorIssueDetectionExtension,

        /**
         * Configuration for detecting long peer connection establishment issues.
         */
        longPcConnectionEstablishment?: ClientIssue['severity'] | ClientDetectorIssueDetectionExtension,
    }
};

export type ClientIssue = {
    severity: 'critical' | 'major' | 'minor';
    timestamp?: number,
    description?: string,
    peerConnectionId?: string,
    mediaTrackId?: string,
    attachments?: Record<string, unknown>,
}

export type AlertState = 'on' | 'off';

export interface ClientMonitorEvents {
    'error': Error,
    'close': undefined,
    'stats-collected': {
        elapsedSinceLastCollectedInMs: number,
        collectedStats: CollectedStats,
    },
    'sample-created': {
        elapsedSinceLastSampleInMs: number,
        clientSample: ClientSample,
    },
    // 'congestion': {
    //     incomingBitrateAfterCongestion: number | undefined;
    //     incomingBitrateBeforeCongestion: number | undefined;
    //     outgoingBitrateAfterCongestion: number | undefined;
    //     outgoingBitrateBeforeCongestion: number | undefined;
    // },
    'usermediaerror': string,
    // 'cpulimitation': AlertState,
    // 'audio-desync': AlertState,
    // 'freezed-video': {
    //     trackId: string,
    //     peerConnectionId: string | undefined,
    // },
    'peerconnection-state-updated': PeerConnectionStateUpdated & {
        peerConnectionId: string,
    },
    'using-turn': boolean,
    'issue': ClientIssue,
}

export class ClientMonitor extends TypedEventEmitter<ClientMonitorEvents> {
    public readonly created = Date.now();
    public readonly meta: ClientMetaData;
    public readonly storage = new StatsStorage();
    public readonly collectors = createCollectors({
        storage: this.storage,
    });
    private readonly _detectors = new Map<string, { close: () => void, once: (e: 'close', l: () => void) => void }>();

    private readonly _sampler = new Sampler(this.storage);
    private _timer?: ReturnType<typeof setInterval>;
    
    private _joined = false;
    private _left = false;
    private _lastCollectedAt = Date.now();
    private _lastSampledAt = 0;
    private _closed = false;
    private _actualCollectingTick = 0;

    public constructor(
        private _config: ClientMonitorConfig
    ) {
        super();
        this.setMaxListeners(Infinity);

        this.meta = new ClientMetaData();
        this._sampler.addBrowser(this.meta.browser);
        this._sampler.addEngine(this.meta.engine);
        this._sampler.addOperationSystem(this.meta.operationSystem);
        this._sampler.addPlatform(this.meta.platform);
        this._setupTimer();

        // connect components
        const adapterMiddlewares = createAdapterMiddlewares({
            browserType: this.meta.browser.name ?? 'Unknown',
            browserVersion: this.meta.browser.version ?? 'Unknown',
        });

        const onCallEventListener = (event: CustomCallEvent) => {
            this.addCustomCallEvent(event);
        };
        const onPeerConnectionAdded = (peerConnectionEntry: PeerConnectionEntry) => {
            const onStateUpdated = (event: PeerConnectionStateUpdated) => {
                this.emit('peerconnection-state-updated', {
                    ...event,
                    peerConnectionId: peerConnectionEntry.peerConnectionId,
                })
            };
            peerConnectionEntry.events.once('close', () => {
                peerConnectionEntry.events.off('state-updated', onStateUpdated);
            });
            peerConnectionEntry.events.on('state-updated', onStateUpdated);
        };

        this.once('close', () => {
            this.collectors.off('custom-call-event', onCallEventListener);
            this.storage.events.off('peer-connection-added', onPeerConnectionAdded);
            adapterMiddlewares.forEach((middleware) => {
                this.collectors.processor.removeMiddleware(middleware);
            });
        });
        this.collectors.on('custom-call-event', onCallEventListener);
        this.storage.events.on('peer-connection-added', onPeerConnectionAdded);
        adapterMiddlewares.forEach((middleware) => {
            this.collectors.processor.addMiddleware(middleware);
        });

        if (this._config.detectIssues) {
            this._setupDetectors(this._config.detectIssues);
        }
    }

    public get processor() {
        return this.storage.processor;
    }

    public get closed() {
        return this._closed;
    }

    public close(): void {
        if (this._closed) {
            return;
        }
        this._closed = true;
        clearInterval(this._timer);

        if (!this._left) this.leave();
        if (0 < (this._config.samplingTick ?? 0)) {
            this.sample();
        }
        
        this.storage.clear();
        this.collectors.clear();
        this._sampler.clear();

        this._timer = undefined;
    }
    
    public async collect(): Promise<CollectedStats> {
        if (this._closed) throw new Error('ClientMonitor is closed');
        const wasUsingTURN = this.peerConnections.some(pc => pc.usingTURN);
        const collectedStats = await this.collectors.collect();
        this.storage.update(collectedStats);
        const timestamp = Date.now();
        
        this.emit('stats-collected', {
            collectedStats,
            elapsedSinceLastCollectedInMs: timestamp - this._lastCollectedAt,
        });
        
        this._lastCollectedAt = timestamp;
        
        if (this._config.samplingTick && this._config.samplingTick <= ++this._actualCollectingTick ) {
            this._actualCollectingTick = 0;
            this.sample();
        }
        
        const isUsingTURN = this.peerConnections.some(pc => pc.usingTURN);
        
        if (wasUsingTURN !== isUsingTURN) {
            this.emit('using-turn', isUsingTURN);
        }
        return collectedStats;
    }

    public sample(): ClientSample | undefined {
        if (this._closed) return;
        if (!this._joined) this.join();

        const clientSample = this._sampler.createClientSample();
        const timestamp = Date.now();
        if (!clientSample) {
            return;
        }
        this.emit('sample-created', {
            clientSample,
            elapsedSinceLastSampleInMs: timestamp - this._lastSampledAt,
        });
        this._lastSampledAt = timestamp;
        return clientSample;
    }

    public join(settings?: Pick<CustomCallEvent, 'attachments' | 'timestamp' | 'message'>): void {
        if (this._joined) return;
        this._joined = true;

        this._sampler.addCustomCallEvent({
            name: 'CLIENT_JOINED',
            message: settings?.message ?? 'Client joined',
            timestamp: settings?.timestamp ?? this.created,
            attachments: settings?.attachments,
        })
    }

    public leave(settings?: Pick<CustomCallEvent, 'attachments' | 'timestamp' | 'message'>): void {
        if (!this._left) return;
        this._left = true;
        
        this._sampler.addCustomCallEvent({
            name: 'CLIENT_LEFT',
            message: settings?.message ?? 'Client left',
            timestamp: settings?.timestamp ?? Date.now(),
            attachments: settings?.attachments,
        });
    }


    public setMarker(value?: string) {
        this._sampler.setMarker(value);
    }

    public setUserId(userId?: string) {
        this._sampler.setUserId(userId);
    }

    public setMediaDevices(...devices: MediaDevice[]): void {
        if (!devices) return;
        this.meta.mediaDevices = devices;
        const storedDevices = [
            ...Array.from(this.meta.audioInputs()),
            ...Array.from(this.meta.audioOutputs()),
            ...Array.from(this.meta.videoInputs()),
        ];
        for (const device of storedDevices) {
            if (device.sampled) continue;
            this._sampler.addMediaDevice(device);
        }
    }

    public addUserMediaError(err: unknown): void {
        const message = `${err}`;
        
        if(0 < (this._config.samplingTick ?? 0))
            this._sampler.addUserMediaError(message);

        this.emit('usermediaerror', message);
    }

    public setMediaConstraints(constrains: MediaStreamConstraints | MediaTrackConstraints): void {
        this._sampler.addMediaConstraints(JSON.stringify(constrains));
    }

    public addExtensionStats(stats: ExtensionStat): void {
        if (!!stats.payload && !validators.isValidJsonString(stats.payload)) {
            logger.warn("Extension stats payload must be a valid json string");
            return;
        }
        this._sampler.addExtensionStats(stats);
    }

    public addCustomCallEvent(event: CustomCallEvent) {
        this._sampler.addCustomCallEvent(event);
    }

    public addLocalSDP(localSDP: string[]): void {
        this._sampler.addLocalSDP(localSDP);
    }

    public addIssue(issue: ClientIssue) {
        this._sampler.addCustomCallEvent({
            name: 'CLIENT_ISSUE',
            value: issue.severity,
            peerConnectionId: issue.peerConnectionId,
            mediaTrackId: issue.mediaTrackId,
            message: issue.description,
            timestamp: issue.timestamp ?? Date.now(),
            attachments: issue.attachments ? JSON.stringify(issue.attachments): undefined,
        });

        this.emit('issue', issue);
    }

    public setCollectingPeriod(collectingPeriodInMs: number): void {
        this._config.collectingPeriodInMs = collectingPeriodInMs;
        this._setupTimer();
    }

    public setSamplingTick(samplingTick: number): void {
        this._config.samplingTick = samplingTick;
        this._setupTimer();
    }

    public createCongestionDetector(options?: { 
        createIssueOnDetection?: ClientDetectorIssueDetectionExtension,
    }): CongestionDetector {
        const existingDetector = this._detectors.get(CongestionDetector.name);
        const {
            createIssueOnDetection,
        } = options ?? {};

        if (existingDetector) return existingDetector as CongestionDetector;

        const detector = new CongestionDetector();
        const onUpdate = () => detector.update(this.storage.peerConnections());
        const onCongestion = (...event: CongestionDetectorEvents['congestion']) => {
            const [
                peerConnectionStates
            ] = event;
            let incomingBitrateAfterCongestion: number | undefined;
            let incomingBitrateBeforeCongestion: number | undefined;
            let outgoingBitrateAfterCongestion: number | undefined;
            let outgoingBitrateBeforeCongestion: number | undefined;
            for (const state of peerConnectionStates) {
                if (state.incomingBitrateAfterCongestion) {
                    incomingBitrateAfterCongestion = (incomingBitrateAfterCongestion ?? 0) + state.incomingBitrateAfterCongestion;
                }
                if (state.incomingBitrateBeforeCongestion) {
                    incomingBitrateBeforeCongestion = (incomingBitrateBeforeCongestion ?? 0) + state.incomingBitrateBeforeCongestion;
                }
                if (state.outgoingBitrateAfterCongestion) {
                    outgoingBitrateAfterCongestion = (outgoingBitrateAfterCongestion ?? 0) + state.outgoingBitrateAfterCongestion;
                }
                if (state.outgoingBitrateBeforeCongestion) {
                    outgoingBitrateBeforeCongestion = (outgoingBitrateBeforeCongestion ?? 0) + state.outgoingBitrateBeforeCongestion;
                }
            }
            // this.emit('congestion', {
            //     incomingBitrateAfterCongestion,
            //     incomingBitrateBeforeCongestion,
            //     outgoingBitrateAfterCongestion,
            //     outgoingBitrateBeforeCongestion,
            // });

            if (createIssueOnDetection) {
                this.addIssue({
                    severity: createIssueOnDetection.severity,
                    description: createIssueOnDetection.description ?? 'Congestion detected',
                    timestamp: Date.now(),
                    attachments: {
                        ...(createIssueOnDetection.attachments ?? {}),
                        incomingBitrateAfterCongestion,
                        incomingBitrateBeforeCongestion,
                        outgoingBitrateAfterCongestion,
                        outgoingBitrateBeforeCongestion,
                        
                    },
                })
            }
        }

        detector.once('close', () => {
            this.off('stats-collected', onUpdate);
            detector.off('congestion', onCongestion);
            this._detectors.delete(CongestionDetector.name);
        });
        this.on('stats-collected', onUpdate);
        detector.on('congestion', onCongestion);
        this._detectors.set(CongestionDetector.name, detector);

        return detector;
    }

    public createAudioDesyncDetector(config?: AudioDesyncDetectorConfig & { 
        createIssueOnDetection?: ClientDetectorIssueDetectionExtension,
    }): AudioDesyncDetector {
        const existingDetector = this._detectors.get(AudioDesyncDetector.name);

        if (existingDetector) return existingDetector as AudioDesyncDetector;

        const detector = new AudioDesyncDetector({
            fractionalCorrectionAlertOnThreshold: config?.fractionalCorrectionAlertOnThreshold ?? 0.1,
            fractionalCorrectionAlertOffThreshold: config?.fractionalCorrectionAlertOffThreshold ?? 0.05,
        });
        const onUpdate = () => detector.update(this.storage.inboundRtps());
        const {
            createIssueOnDetection,
        } = config ?? {};

        const onDesync = (trackId: string) => {
            // this.emit('audio-desync', 'on');
            if (!createIssueOnDetection) return;

            this.addIssue({
                severity: createIssueOnDetection.severity,
                description: createIssueOnDetection.description ?? 'Audio desync detected',
                timestamp: Date.now(),
                peerConnectionId: this.storage.getTrack(trackId)?.getPeerConnection()?.peerConnectionId,
                mediaTrackId: trackId,
                attachments: createIssueOnDetection.attachments,
            });
        };
        const onSync = () => {
            // this.emit('audio-desync', 'off');
        }

        detector.once('close', () => {
            this.off('stats-collected', onUpdate);
            detector.off('desync', onDesync);
            detector.off('sync', onSync);
            this._detectors.delete(AudioDesyncDetector.name);
        });
        this.on('stats-collected', onUpdate);
        detector.on('desync', onDesync);
        detector.on('sync', onSync);

        this._detectors.set(AudioDesyncDetector.name, detector);

        return detector;
    }

    public createVideoFreezesDetector(config?: VideoFreezesDetectorConfig & { 
        createIssueOnDetection?: ClientDetectorIssueDetectionExtension,
    }): VideoFreezesDetector {
        const existingDetector = this._detectors.get(VideoFreezesDetector.name);

        if (existingDetector) return existingDetector as VideoFreezesDetector;

        const detector = new VideoFreezesDetector({
        });
        const onUpdate = () => detector.update(this.storage.inboundRtps());
        const {
            createIssueOnDetection,
        } = config ?? {};

        const onFreezeStarted = (event: FreezedVideoStartedEvent) => {
            // this.emit('freezed-video', {
            //     peerConnectionId: event.peerConnectionId,
            //     trackId: event.trackId,
            // });
        };
        const onFreezeEnded = (event: FreezedVideoEndedEvent) => {
            if (createIssueOnDetection) {
                this.addIssue({
                    severity: createIssueOnDetection.severity,
                    description: createIssueOnDetection.description ?? 'Video Freeze detected',
                    timestamp: Date.now(),
                    peerConnectionId: event.peerConnectionId,
                    mediaTrackId: event.trackId,
                    attachments: {
                        durationInS: event.durationInS,
                        ...(createIssueOnDetection.attachments ?? {})
                    },
                });
            }
        }

        detector.once('close', () => {
            this.off('stats-collected', onUpdate);
            detector.off('freezedVideoStarted', onFreezeStarted);
            detector.off('freezedVideoEnded', onFreezeEnded);
            this._detectors.delete(VideoFreezesDetector.name);
        });
        detector.on('freezedVideoStarted', onFreezeStarted);
        detector.on('freezedVideoEnded', onFreezeEnded);

        this._detectors.set(VideoFreezesDetector.name, detector);

        return detector;
    }

    public createCpuPerformanceIssueDetector(config?: CpuPerformanceDetectorConfig & { 
        createIssueOnDetection?: ClientDetectorIssueDetectionExtension,
    }): CpuPerformanceDetector {
        const existingDetector = this._detectors.get(CpuPerformanceDetector.name);

        if (existingDetector) return existingDetector as CpuPerformanceDetector;

        const detector = new CpuPerformanceDetector(config ?? {});
        const onUpdate = () => detector.update(this.storage.peerConnections());
        const {
            createIssueOnDetection,
        } = config ?? {};

        const onStateChanged = (state: AlertState) => {
            // this.emit('cpulimitation', state);
            
            if (!createIssueOnDetection || state !== 'on') return;

            this.addIssue({
                severity: createIssueOnDetection.severity,
                description: createIssueOnDetection.description ?? 'Audio desync detected',
                timestamp: Date.now(),
                attachments: createIssueOnDetection.attachments,
            });
        };

        detector.once('close', () => {
            this.off('stats-collected', onUpdate);
            detector.off('statechanged', onStateChanged);
            this._detectors.delete(CpuPerformanceDetector.name);
        });
        this.on('stats-collected', onUpdate);
        detector.on('statechanged', onStateChanged);

        this._detectors.set(CpuPerformanceDetector.name, detector);

        return detector;
    }

    public createStuckedInboundTrackDetector(config?: StuckedInboundTrackDetectorConfig & {
        createIssueOnDetection?: ClientDetectorIssueDetectionExtension,
    }): StuckedInboundTrackDetector {
        const existingDetector = this._detectors.get(StuckedInboundTrackDetector.name);

        if (existingDetector) return existingDetector as StuckedInboundTrackDetector;

        const detector = new StuckedInboundTrackDetector(config ?? {
            minStuckedDurationInMs: 5000,
        });
        const onUpdate = () => detector.update(this.storage.inboundRtps());
        const {
            createIssueOnDetection,
        } = config ?? {};

        const onStuckedTrack = (event: { peerConnectionId: string, trackId: string, ssrc: number }) => {
            if (createIssueOnDetection) {
                this.addIssue({
                    severity: createIssueOnDetection.severity,
                    description: createIssueOnDetection.description ?? 'Stucked track detected',
                    timestamp: Date.now(),
                    peerConnectionId: event.peerConnectionId,
                    mediaTrackId: event.trackId,
                    attachments: {
                        ssrc: event.ssrc,
                        ...(createIssueOnDetection.attachments ?? {})
                    },
                });
            }
        }

        detector.once('close', () => {
            this.off('stats-collected', onUpdate);
            detector.off('stuckedtrack', onStuckedTrack);
            this._detectors.delete('StuckedInboundTrack');
        });
        this.on('stats-collected', onUpdate);
        detector.on('stuckedtrack', onStuckedTrack);

        this._detectors.set('StuckedInboundTrack', detector);

        return detector;
    }

    public createLongPcConnectionEstablishmentDetector(config?: LongPcConnectionEstablishmentDetectorConfig & {
        createIssueOnDetection?: ClientDetectorIssueDetectionExtension,
    }): LongPcConnectionEstablishmentDetector {
        const existingDetector = this._detectors.get(LongPcConnectionEstablishmentDetector.name);

        if (existingDetector) return existingDetector as LongPcConnectionEstablishmentDetector;

        const detector = new LongPcConnectionEstablishmentDetector(config ?? {
            thresholdInMs: 3000,
        }, this);

        const {
            createIssueOnDetection,
        } = config ?? {};

        const onLongConnection = (event: { peerConnectionId: string }) => {
            if (createIssueOnDetection) {
                this.addIssue({
                    severity: createIssueOnDetection.severity,
                    description: createIssueOnDetection.description ?? 'Long peer connection establishment detected',
                    timestamp: Date.now(),
                    peerConnectionId: event.peerConnectionId,
                    attachments: createIssueOnDetection.attachments,
                });
            }
        }

        detector.once('close', () => {
            detector.off('too-long-connection-establishment', onLongConnection);
        });
        detector.on('too-long-connection-establishment', onLongConnection);

        return detector;
    }

    public getTrackStats(trackId: string): TrackStats | undefined {
        return this.storage.getTrack(trackId);
    }

    public getPeerConnectionStats(peerConnectionId: string): PeerConnectionEntry | undefined {
        return this.storage.getPeerConnection(peerConnectionId);
    }

    public get codecs() {
        return [...this.storage.codecs()];
    }

    public get inboundRtps() {
        return [...this.storage.inboundRtps()];
    }

    public get outboundRtps() {
        return [...this.storage.outboundRtps()];
    }

    public get remoteInboundRtps() {
        return [...this.storage.remoteInboundRtps()];
    }

    public get remoteOutboundRtps() {
        return [...this.storage.remoteOutboundRtps()];
    }

    public get mediaSources() {
        return [...this.storage.mediaSources()];
    }

    public get contributingSources() {
        return [...this.storage.contributingSources()];
    }

    public get dataChannels() {
        return [...this.storage.dataChannels()];
    }

    public get transceivers() {
        return [...this.storage.transceivers()];
    }

    public get senders() {
        return [...this.storage.senders()];
    }

    public get receivers() {
        return [...this.storage.receivers()];
    }

    public get transports() {
        return [...this.storage.transports()];
    }

    public get sctpTransports() {
        return [...this.storage.sctpTransports()];
    }

    public get iceCandidatePairs() {
        return [...this.storage.iceCandidatePairs()];
    }

    public get iceLocalCandidates() {
        return [...this.storage.localCandidates()];
    }

    public get iceRemoteCandidates() {
        return [...this.storage.remoteCandidates()];
    }

    public get certificates() {
        return [...this.storage.certificates()];
    }

    public get iceServers() {
        return [...this.storage.iceServers()];
    }

    public get peerConnections() {
        return [...this.storage.peerConnections()];
    }

    public get tracks() {
        return [...this.storage.tracks()];
    }

    public get sendingAudioBitrate() {
        return this.storage.sendingAudioBitrate;
    }

    public get sendingVideoBitrate() {
        return this.storage.sendingVideoBitrate;
    }

    public get receivingAudioBitrate() {
        return this.storage.receivingAudioBitrate;
    }

    public get receivingVideoBitrate() {
        return this.storage.receivingVideoBitrate;
    }

    public get totalInboundPacketsLost() {
        return this.storage.totalInboundPacketsLost;
    }

    public get totalInboundPacketsReceived() {
        return this.storage.totalInboundPacketsReceived;
    }

    public get totalOutboundPacketsSent() {
        return this.storage.totalOutboundPacketsSent;
    }

    public get totalOutboundPacketsReceived() {
        return this.storage.totalOutboundPacketsReceived;
    }

    public get totalOutboundPacketsLost() {
        return this.storage.totalOutboundPacketsLost;
    }

    public get totalDataChannelBytesSent() {
        return this.storage.totalDataChannelBytesSent;
    }

    public get totalDataChannelBytesReceived() {
        return this.storage.totalDataChannelBytesReceived;
    }

    public get totalSentAudioBytes() {
        return this.storage.totalSentAudioBytes;
    }

    public get totalSentVideoBytes() {
        return this.storage.totalSentVideoBytes;
    }

    public get totalReceivedAudioBytes() {
        return this.storage.totalReceivedAudioBytes;
    }

    public get totalReceivedVideoBytes() {
        return this.storage.totalReceivedVideoBytes;
    }

    public get totalAvailableIncomingBitrate() {
        return this.storage.totalAvailableIncomingBitrate;
    }

    public get totalAvailableOutgoingBitrate() {
        return this.storage.totalAvailableOutgoingBitrate;
    }

    public get deltaInboundPacketsLost() {
        return this.storage.deltaInboundPacketsLost;
    }

    public get deltaInboundPacketsReceived() {
        return this.storage.deltaInboundPacketsReceived;
    }

    public get deltaOutboundPacketsSent() {
        return this.storage.deltaOutboundPacketsSent;
    }

    public get deltaOutboundPacketsReceived() {
        return this.storage.deltaOutboundPacketsReceived;
    }

    public get deltaOutboundPacketsLost() {
        return this.storage.deltaOutboundPacketsLost;
    }

    public get deltaDataChannelBytesSent() {
        return this.storage.deltaDataChannelBytesSent;
    }

    public get deltaDataChannelBytesReceived() {
        return this.storage.deltaDataChannelBytesReceived;
    }

    public get deltaSentAudioBytes() {
        return this.storage.deltaSentAudioBytes;
    }

    public get deltaSentVideoBytes() {
        return this.storage.deltaSentVideoBytes;
    }

    public get deltaReceivedAudioBytes() {
        return this.storage.deltaReceivedAudioBytes;
    }

    public get deltaReceivedVideoBytes() {
        return this.storage.deltaReceivedVideoBytes;
    }

    public get avgRttInSec() {
        return this.storage.avgRttInS;
    }

    public get highestSeenSendingBitrate() {
        return this.storage.highestSeenSendingBitrate;
    }

    public get highestSeenReceivingBitrate() {
        return this.storage.highestSeenReceivingBitrate;
    }

    public get highestSeenAvailableOutgoingBitrate() {
        return this.storage.highestSeenAvailableOutgoingBitrate;
    }

    public get highestSeenAvailableIncomingBitrate() {
        return this.storage.highestSeenAvailableIncomingBitrate;
    }

    public get sendingFractionLost() {
        return this.storage.sendingFractionLost;
    }

    public get receivingFractionLost() {
        return this.storage.receivingFractionLost;
    }

    private _setupDetectors(settings: ClientMonitorConfig['detectIssues']): void {
        if (!settings) return;

        if (settings.congestion) {
            this.createCongestionDetector({
                createIssueOnDetection: typeof settings.congestion === 'string' ? {
                    severity: settings.congestion
                } : settings.congestion,
            });
        }

        if (settings.audioDesync) {
            this.createAudioDesyncDetector({
                fractionalCorrectionAlertOffThreshold: 0.05,
                fractionalCorrectionAlertOnThreshold: 0.1,
                createIssueOnDetection: typeof settings.audioDesync === 'string' ? {
                    severity: settings.audioDesync
                } : settings.audioDesync,
            });
        }

        if (settings.freezedVideo) {
            this.createVideoFreezesDetector({
                createIssueOnDetection: typeof settings.freezedVideo === 'string' ? {
                    severity: settings.freezedVideo
                } : settings.freezedVideo,
            });
        }

        if (settings.cpuLimitation) {
            this.createCpuPerformanceIssueDetector({
                createIssueOnDetection: typeof settings.cpuLimitation === 'string' ? {
                    severity: settings.cpuLimitation
                } : settings.cpuLimitation,
            });
        }

        if (settings.stuckedInboundTrack) {
            this.createStuckedInboundTrackDetector({
                minStuckedDurationInMs: 5000,
                createIssueOnDetection: typeof settings.stuckedInboundTrack === 'string' ? {
                    severity: settings.stuckedInboundTrack
                } : settings.stuckedInboundTrack,
            });
        }

        if (settings.longPcConnectionEstablishment) {
            this.createLongPcConnectionEstablishmentDetector({
                thresholdInMs: 3000,
                createIssueOnDetection: typeof settings.longPcConnectionEstablishment === 'string' ? {
                    severity: settings.longPcConnectionEstablishment
                } : settings.longPcConnectionEstablishment,
            });
        }
    }

    private _setupTimer(): void {
        this._timer && clearInterval(this._timer);
        this._timer = undefined;
        
        if (!this._config.collectingPeriodInMs) return;

        this._timer = setInterval(() => {
            this.collect().catch(err => logger.error(err));
        }, this._config.collectingPeriodInMs);
    }
}
