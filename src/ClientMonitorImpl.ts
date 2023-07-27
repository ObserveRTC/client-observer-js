import { Sampler, TrackRelation } from "./Sampler";
import { ClientDevices } from "./ClientDevices";
import { MediaDevices } from "./utils/MediaDevices";
import { AdapterConfig } from "./browser-adapters/Adapter";
import { Timer } from "./utils/Timer";
import { StatsReader, StatsStorage } from "./entries/StatsStorage";
import { Accumulator } from "./Accumulator";
import { createLogger, setLogLevel } from "./utils/logger";
import { ClientMonitor, ClientMonitorAlerts, ClientMonitorConfig, ClientMonitorEvents } from "./ClientMonitor";
import { Metrics, MetricsReader } from "./Metrics";
import * as validators from "./utils/validators";
import EventEmitter from "events";
import { Collectors, CollectorsConfig, CollectorsImpl } from "./Collectors";
import { 
    OperationSystem, 
    Browser, 
    Platform, 
    Engine, 
    MediaDevice, 
    ExtensionStat, 
    Samples,
    schemaVersion,
    CustomCallEvent,
    ClientSample,
} from './schema/Samples';
import { CallEventType } from "./utils/callEvents";
import { StatsEvaluatorProcess, Evaluators } from "./StatsEvaluators";
import { CongestionDetectorConfig, createCongestionDetector } from "./detectors/CongestionDetector";
import { AudioDesyncDetectorConfig, createAudioDesyncDetector } from "./detectors/AudioDesyncDetector";
import { CpuIssueDetectorConfig, createCpuIssueDetector } from "./detectors/CpuIssueDetector";
import { createLowStabilityScoreDetector, LowStabilityScoreDetectorConfig } from "./detectors/LowStabilityScoreDetector";
import { createLowMosDetector, LowMosDetectorConfig } from "./detectors/LowMoSDetector";

const logger = createLogger("ClientMonitor");

type ConstructorConfig = ClientMonitorConfig & {
    cpuIssueDetector: CpuIssueDetectorConfig,
    audioDesyncDetector: AudioDesyncDetectorConfig,
    congestionDetector: CongestionDetectorConfig,
    lowStabilityScoreDetector: LowStabilityScoreDetectorConfig,
    lowMosDetector: LowMosDetectorConfig,
};

const supplyDefaultConfig = () => {
    const defaultConfig: ConstructorConfig = {
        logLevel: 'warn',
        // samplingPeriodInMs: 5000,
        // sendingPeriodInMs: 10000,
        tickingTimeInMs: 1000,
        createCallEvents: false,
        cpuIssueDetector: {
            enabled: true,
            droppedIncomingFramesFractionAlertOn: 0.5,
            droppedIncomingFramesFractionAlertOff: 0.7,
        },
        audioDesyncDetector: {
            enabled: false,
            fractionalCorrectionAlertOnThreshold: 0.2,
            fractionalCorrectionAlertOffThreshold: 0.1,
        },
        congestionDetector: {
            enabled: true,
            minDurationThresholdInMs: 2000,
            minRTTDeviationThresholdInMs: 200,
            minMeasurementsLengthInMs: 10000,
            deviationFoldThreshold: 3.0,
            measurementsWindowInMs: 30000,
            fractionLossThreshold: 0.2,
            minConsecutiveTickThreshold: 2,
        },
        lowStabilityScoreDetector: {
            enabled: true,
            alertOffThreshold: 0.9,
            alertOnThreshold: 0.8,
        },
        lowMosDetector: {
            enabled: true,
            alertOffThreshold: 4.0,
            alertOnThreshold: 3.0,
        },
        storage: {
            outboundRtpStabilityScoresLength: 10,
        }
    };
    return defaultConfig;
};

logger.debug("Version of the loaded schema:", schemaVersion);

export class ClientMonitorImpl implements ClientMonitor {
    public static create(config?: Partial<ClientMonitorConfig>): ClientMonitor {
        if (config?.maxListeners !== undefined) {
            EventEmitter.setMaxListeners(config.maxListeners);
        }
        const appliedConfig = config ? Object.assign(supplyDefaultConfig(), config) : supplyDefaultConfig();
        if (appliedConfig.logLevel) {
            setLogLevel(appliedConfig.logLevel);
        }
        const result = new ClientMonitorImpl(appliedConfig);
        logger.debug("Created", appliedConfig);
        return result;
    }
    // init alerts
    public readonly alerts: ClientMonitorAlerts = {
        'audio-desync-alert': {
            state: 'off',
            trackIds: [],
        },
        'cpu-performance-alert': {
            state: 'off',
        },
        'mean-opinion-score-alert': {
            state: 'off',
            trackIds: [],
        },
        'stability-score-alert': {
            state: 'off',
            trackIds: [],
        }
    }

    private _closed = false;
    private _mediaDevices: MediaDevices;
    private _clientDevices: ClientDevices;
    private _collectors: CollectorsImpl;
    private _sampler: Sampler;
    private _timer?: Timer;
    public readonly stats = new StatsStorage();
    private _accumulator: Accumulator;
    private _metrics: Metrics;
    private _emitter = new EventEmitter();
    private _evaluators: Evaluators;

    private constructor(
        public readonly config: ConstructorConfig
    ) {
        this._clientDevices = new ClientDevices();
        this._mediaDevices = new MediaDevices();
        this._metrics = new Metrics();
        this._accumulator = Accumulator.create(config.accumulator);
        this._collectors = this._makeCollector();
        this._sampler = this._makeSampler();
        this._evaluators = this._makeEvaluators();
        this._createTimer();
    }

    public get closed() {
        return this._closed;
    }

    public get os(): OperationSystem {
        return this._clientDevices.os;
    }

    public get metrics(): MetricsReader {
        return this._metrics;
    }

    public get browser(): Browser {
        return this._clientDevices.browser;
    }

    public get platform(): Platform {
        return this._clientDevices.platform;
    }

    public get engine(): Engine {
        return this._clientDevices.engine;
    }

    public get storage(): StatsReader {
        return this._statsStorage;
    }

    public get collectors(): Collectors {
        return this._collectors;
    }

    public setMarker(value?: string) {
        this._sampler.setMarker(value);
    }

    public addStatsEvaluator(process: StatsEvaluatorProcess): void {
        this._evaluators.add(process);
    }

    public removeStatsEvaluator(process: StatsEvaluatorProcess): boolean {
        return this._evaluators.remove(process);
    }

    public setMediaDevices(...devices: MediaDevice[]): void {
        if (!devices) return;
        this._mediaDevices.update(...devices);
        for (const device of this._mediaDevices.sample()) {
            this._sampler.addMediaDevice(device);
        }
    }

    public setMediaConstraints(constrains: MediaStreamConstraints | MediaTrackConstraints): void {
        
    }

    /*eslint-disable @typescript-eslint/no-explicit-any */
    public addUserMediaError(err: any): void {
        const message = JSON.stringify(err);
        this._sampler.addUserMediaError(message);
    }

    public addMediaTrackAddedCallEvent(
        peerConnectionId: string, 
        mediaTrackId: string, 
        timestamp?: number,
        attachments?: string,
    ): void {
        const callEvent: CustomCallEvent = {
            name: CallEventType.MEDIA_TRACK_ADDED,
            peerConnectionId,
            mediaTrackId,
            timestamp: timestamp ?? Date.now(),
            attachments,
        }
        this.addCustomCallEvent(callEvent)
    }

    public addMediaTrackRemovedCallEvent(
        peerConnectionId: string, 
        mediaTrackId: string, 
        timestamp?: number,
        attachments?: string,
    ): void {
        const callEvent: CustomCallEvent = {
            name: CallEventType.MEDIA_TRACK_REMOVED,
            peerConnectionId,
            mediaTrackId,
            timestamp: timestamp ?? Date.now(),
            attachments,
        }
        this.addCustomCallEvent(callEvent)
    }

    public addPeerConnectionOpenedCallEvent(peerConnectionId: string, timestamp?: number): void {
        const callEvent: CustomCallEvent = {
            name: CallEventType.PEER_CONNECTION_OPENED,
            peerConnectionId,
            timestamp: timestamp ?? Date.now(),
        }
        this.addCustomCallEvent(callEvent)
    }

    public addPeerConnectionClosedCallEvent(peerConnectionId: string, timestamp?: number): void {
        const callEvent: CustomCallEvent = {
            name: CallEventType.PEER_CONNECTION_CLOSED,
            peerConnectionId,
            timestamp: timestamp ?? Date.now(),
        }
        this.addCustomCallEvent(callEvent)
    }
    
    public addIceConnectionStateChangedCallEvent(peerConnectionId: string, connectionState: RTCPeerConnectionState, timestamp?: number): void {
        const callEvent: CustomCallEvent = {
            name: CallEventType.ICE_CONNECTION_STATE_CHANGED,
            peerConnectionId,
            value: connectionState,
            timestamp: timestamp ?? Date.now(),
        }
        this.addCustomCallEvent(callEvent)
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

    public async collect(): Promise<void> {
        const started = Date.now();
        
        this._statsStorage.start();

        await this._collectors.collect().catch((err) => {
            logger.warn(`Error occurred while collecting`, err);
        });
        const elapsedInMs = Date.now() - started;

        // trim stats does not exists anymore
        this._statsStorage.commit();

        this._metrics.setCollectingTimeInMs(elapsedInMs);
        this._emit('stats-collected', {
            stats: this._collectors.lastStats()
        });
        
        this._metrics.setLastCollected(started + elapsedInMs);

        // evaluate
        await this._evaluate(elapsedInMs);
    }

    public sample(): ClientSample | undefined{
        try {
            this._collectClientDevices();
            const clientSample = this._sampler.make();
            if (!clientSample) return;
            this._accumulator.addClientSample(clientSample);
            this._emit('sample-created', {
                clientSample
            });

            return clientSample;
        } catch (error) {
            logger.warn(`An error occurred while sampling`, error);
        }
    }

    public send(): void {
        const samples: Samples[] = [];
        this._accumulator.drainTo((bufferedSamples) => {
            if (!bufferedSamples) return;
            samples.push(bufferedSamples);
        });
        this._emit('send', {
            samples
        })

        const now = Date.now();
        this._metrics.setLastSent(now);
    }

    public close(): void {
        if (this._closed) {
            logger.warn(`Attempted to close twice`);
            return;
        }
        try {
            if (this._timer) {
                this._timer.clear();
            }
            this.send();
            this._collectors.close();
            this._sampler.close();
            this._statsStorage.clear();
        } finally {
            this._closed = true;
            this._emit('close', undefined);
            logger.info(`Closed`);
        }
    }

    public setCollectingPeriod(collectingPeriodInMs: number): void {
        if (collectingPeriodInMs < 1) {
            this._timer?.clear("collect");
            return;
        }
        if (!this._timer) {
            this._timer = new Timer(this.config.tickingTimeInMs);
        }
        if (this._timer.hasListener("collect")) {
            this._timer.clear("collect");
        }
        this._timer.add({
            type: "collect",
            asyncProcess: this.collect.bind(this),
            fixedDelayInMs: collectingPeriodInMs,
            context: "Collect Stats",
        });
    }

    public setSamplingPeriod(samplingPeriodInMs: number): void {
        if (samplingPeriodInMs < 1) {
            this._timer?.clear("sample");
            return;
        }
        if (!this._timer) {
            this._timer = new Timer(this.config.tickingTimeInMs);
        }
        if (this._timer.hasListener("sample")) {
            this._timer.clear("sample");
        }
        this._timer.add({
            type: "sample",
            process: this.sample.bind(this),
            fixedDelayInMs: samplingPeriodInMs,
            initialDelayInMs: samplingPeriodInMs,
            context: "Creating Sample",
        });
    }

    public setSendingPeriod(sendingPeriodInMs: number): void {
        if (sendingPeriodInMs < 1) {
            this._timer?.clear("send");
            return;
        }
        if (!this._timer) {
            this._timer = new Timer(this.config.tickingTimeInMs);
        }
        if (this._timer.hasListener("send")) {
            this._timer.clear("send");
        }
        this._timer.add({
            type: "send",
            process: this.send.bind(this),
            fixedDelayInMs: sendingPeriodInMs,
            initialDelayInMs: sendingPeriodInMs,
            context: "Sending Samples",
        });
    }
    
    public on<K extends keyof ClientMonitorEvents>(event: K, listener: (data: ClientMonitorEvents[K]) => void): this {
        this._emitter.addListener(event, listener);
        return this;
    }

    public once<K extends keyof ClientMonitorEvents>(event: K, listener: (data: ClientMonitorEvents[K]) => void): this {
        this._emitter.once(event, listener);
        return this;
    }

    public off<K extends keyof ClientMonitorEvents>(event: K, listener: (data: ClientMonitorEvents[K]) => void): this {
        this._emitter.removeListener(event, listener);
        return this;
    }

    public _emit<K extends keyof ClientMonitorEvents>(event: K, data: ClientMonitorEvents[K]): boolean {
        return this._emitter.emit(event, data);
    }

    private _collectClientDevices(): void {
        this._clientDevices.collect();
        if (this._clientDevices.isOsChanged) {
            this._sampler.addOs(this._clientDevices.os);
        }
        if (this._clientDevices.isBrowserChanged) {
            this._sampler.addBrowser(this._clientDevices.browser);
        }
        if (this._clientDevices.isPlatformChanged) {
            this._sampler.addPlatform(this._clientDevices.platform);
        }
        if (this._clientDevices.isEngineChanged) {
            this._sampler.addEngine(this._clientDevices.engine);
        }
        this._clientDevices.pivot();
    }

    private _makeCollector(): CollectorsImpl {
        const collectorsConfig = this.config.collectors;
        const createdAdapterConfig: AdapterConfig = {
            browserType: this._clientDevices.browser?.name,
            browserVersion: this._clientDevices.browser?.version,
        };
        const appliedCollectorsConfig: CollectorsConfig = Object.assign(
            { adapter: createdAdapterConfig },
            collectorsConfig
        );
        const result = CollectorsImpl.create(appliedCollectorsConfig);
        result.statsAcceptor = this._statsStorage;
        result.clientMonitor = this;
        return result;
    }

    private _makeSampler(): Sampler {
        const result = new Sampler(
            this._statsStorage,
        )
        return result;
    }

    private async _evaluate(collectingTimeInMs: number) {
        const alertStates: ClientMonitorEvents['alerts-changed'] = {
            'audio-desync-alert': this.alerts["audio-desync-alert"].state,
            'cpu-performance-alert': this.alerts["cpu-performance-alert"].state,
            'mean-opinion-score-alert': this.alerts["mean-opinion-score-alert"].state,
            'stability-score-alert': this.alerts["stability-score-alert"].state,
        }
        
        await this._evaluators.use({
            collectingTimeInMs,
            storage: this._statsStorage,
        });

        let alertChanged = false;
        for (const [alertKey, alert] of Object.entries(this.alerts)) {
            const key = alertKey as keyof ClientMonitorAlerts;
            const prevState = alertStates[key];
            if (prevState !== alert.state) {
                alertChanged = true;
            }
            alertStates[key] = alert.state;
        }
        if (alertChanged) {
            this._emit('alerts-changed', alertStates)
        }
    }

    private _makeEvaluators(): Evaluators {
        const result = new Evaluators();
        result.add(createAudioDesyncDetector(
            this.alerts['audio-desync-alert'],
            this.config.audioDesyncDetector
        ));
        result.add(createCongestionDetector(
            this._emitter, 
            this.config.congestionDetector
        ));
        result.add(createCpuIssueDetector(
            this.alerts['cpu-performance-alert'], 
            this.config.cpuIssueDetector
        ));
        result.add(createLowStabilityScoreDetector(
            this.alerts['stability-score-alert'], 
            this.config.lowStabilityScoreDetector
        ));
        result.add(createLowMosDetector(
            this.alerts['mean-opinion-score-alert'], 
            this.config.lowMosDetector
        ));
        return result;
    }

    private _createTimer(): Timer | undefined {
        if (this._timer) {
            logger.warn(`Attempted to create timer twice`);
            return;
        }
        const { collectingPeriodInMs, samplingPeriodInMs, sendingPeriodInMs } = this.config;
        if (collectingPeriodInMs && 0 < collectingPeriodInMs) {
            this.setCollectingPeriod(collectingPeriodInMs);
        }
        if (samplingPeriodInMs && 0 < samplingPeriodInMs) {
            this.setSamplingPeriod(samplingPeriodInMs);
        }
        if (sendingPeriodInMs && 0 < sendingPeriodInMs) {
            this.setSendingPeriod(sendingPeriodInMs);
        }
    }
}
