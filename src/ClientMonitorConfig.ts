
export type ClientMonitorConfig = {
    /**
     * A unique identifier for the client. This is typically provided by the application
     * to distinguish the current client instance and added to every sample created by the monitor
     *
     * OPTIONAL
     */
    clientId?: string;

    /**
     * A unique identifier for the call or session. This is used to track metrics
     * and events associated with a specific communication session.
     *
     * OPTIONAL
     */
    callId?: string;

    /**
     * Specifies the interval (in milliseconds) at which the observer calls
     * the added statsCollectors and pulls the stats.
     *
     * DEFAULT: 2000 (2 seconds)
     */
    collectingPeriodInMs: number;

    /**
     * Specifies the sampling interval (in milliseconds) for processing stats.
     * If not provided, the default value will be used.
     *
     * OPTIONAL
     */
    samplingPeriodInMs?: number;

    /**
     * If true, the monitor integrates with `navigator.mediaDevices` by patching
     * the `getUserMedia` method and subscribing to the `ondevicechange` event.
     *
     * DEFAULT: true
     */
    integrateNavigatorMediaDevices: boolean | MediaDevices;

    /**
     * If true, the monitor generates a `CLIENT_JOINED` event when it is created.
     *
     * DEFAULT: true
     */
    addClientJointEventOnCreated?: boolean;

    /**
     * If true, the monitor generates a `CLIENT_LEFT` event when it is closed.
     *
     * DEFAULT: true
     */
    addClientLeftEventOnClose?: boolean;

    /**
     * Configuration for detecting video freezes during monitoring.
     */
    videoFreezesDetector: {
        /**
         * If true, the video freeze detection is disabled.
         *
         * DEFAULT: false
         */
        disabled?: boolean;
    };

    /**
     * Configuration for detecting inbound track stalling during monitoring.
     */
    stuckedInboundTrackDetector: {
        /**
         * If true, the detection of stalled inbound tracks is disabled.
         *
         * DEFAULT: false
         */
        disabled?: boolean;

        /**
         * The time threshold (in milliseconds) to determine if an inbound track
         * is considered stalled.
         */
        thresholdInMs: number;
    };

    /**
     * Configuration for detecting audio desynchronization during monitoring.
     */
    audioDesyncDetector: {
        /**
         * If true, the detection of audio desynchronization is disabled.
         *
         * DEFAULT: false
         */
        disabled?: boolean;

        /**
         * The fractional threshold used to determine if audio desynchronization
         * correction is considered significant. Represents the minimum required ratio
         * of corrected samples to total samples to trigger an alert.
         *
         * For example:
         * - A value of 0.1 means that if the corrected samples ratio exceeds 10%,
         *   it will be considered a significant issue.
         */
        fractionalCorrectionAlertOnThreshold: number;

        /**
         * The fractional threshold used to determine if audio desynchronization
         * correction is considered negligible and the alert should be turned off.
         * Represents the maximum allowed ratio of corrected samples to total samples.
         *
         * For example:
         * - A value of 0.05 means that if the corrected samples ratio falls below 5%,
         *   the audio desynchronization alert will be turned off.
         */
        fractionalCorrectionAlertOffThreshold: number;
    };

    /**
     * Configuration for detecting network congestion during monitoring.
     */
    congestionDetector: {
        /**
         * If true, the congestion detection is disabled.
         *
         * DEFAULT: false
         */
        disabled?: boolean;

        /**
         * Specifies the sensitivity level for congestion detection.
         * Accepted values are:
         * - 'low': Less sensitive to congestion changes.
         * - 'medium': Moderate sensitivity to congestion changes.
         * - 'high': Highly sensitive to congestion changes.
         */
        sensitivity: 'low' | 'medium' | 'high';
    };

    /**
     * Configuration for detecting CPU performance issues during monitoring.
     */
    cpuPerformanceDetector: {
        /**
         * If true, the CPU performance detection is disabled.
         *
         * DEFAULT: false
         */
        disabled?: boolean;

        /**
         * Thresholds for detecting frames-per-second (FPS) volatility during monitoring.
         * - `lowWatermark`: The minimum FPS threshold.
         * - `highWatermark`: The maximum FPS threshold.
         */
        fpsVolatilityThresholds: {
            lowWatermark: number;
            highWatermark: number;
        };

        /**
         * Thresholds for the duration of collecting performance stats.
         * - `lowWatermark`: The minimum duration threshold (in milliseconds).
         * - `highWatermark`: The maximum duration threshold (in milliseconds).
         */
        durationOfCollectingStatsThreshold: {
            lowWatermark: number;
            highWatermark: number;
        };
    };

    /**
     * Configuration for detecting prolonged PeerConnection establishment times.
     */
    longPcConnectionEstablishmentDetector: {
        /**
         * If true, the detection of long PeerConnection establishment times is disabled.
         *
         * DEFAULT: false
         */
        disabled?: boolean;

        /**
         * The time threshold (in milliseconds) for detecting prolonged
         * PeerConnection establishment.
         */
        thresholdInMs: number;
    };

    /**
     * Additional metadata to be included in the client monitor.
     * 
     * OPTIONAL
     */
    appData?: Record<string, unknown>;
};
