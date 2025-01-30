## User Manual

client-monitor / [Monitors](./monitors.md) / [Detectors](./detectors.md) / [Sampling](./sampling.md) / [Scores](scores.md) / [Sources](./sources.md)

 - appData,
  - score calculation
	 - statsAdapters
	 

## Table of Contents

1. [Installation](#installation)
2. [Integrations](#integrations)
3. [Configuration](#configuration)
4. [ClientMonitor](#client-monitor)
5. [Detectors](#detectors)
5. [Sources](#sources)
5. [Collecting and Adapting Stats](#collecting-and-adapting-stats)
6. [Sampling](#sampling)
6. [Scores](#scores)
8. [Events and Issues](#events-and-issues)
6. [WebRTC Monitors](#stats-monitors)
6. [Examples](#examples)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [Schema compatibility Table](#hamokmessage-compatibility-table)
10. [FAQ](#faq)

## Installation

```
npm i @observertc/client-monitor-js
```

or

```
yarn add @observertc/client-monitor-js
```

## Integrations

### Mediasoup

```javascript
import { createClientMonitor } from "@observertc/client-monitor-js";
import mediasoup from "mediaousp-client";

const mediasoupDevice = new mediasoup.Device();
const monitor = createClientMonitor();

monitor.sources.addMediasoupDevice(mediasoupDevice);
```

**Important Note**: The created collector is hooked to the device's 'newtransport' event and can automatically detect transports created **after** the device has been added. If you create transports before adding the device to the monitor, those previously created transports will not be monitored automatically. You will need to manually add them to the stats collector like this:

```javascript
const myTransport = monitor.sources.addMediasoupTransport(myTransport); // your transport created before the device is added to the monitor
```

### Logger Integration

ClientMonitor by default write logs to the console only on warning and errors.
If you want to integrate your logger or change the level you can do that by setting up your own logging logis as follows:


```javascript
import { setLogger, Logger } from "@observertc/client-monitor-js";

let myLogger: Logger = new class implements Logger {
  trace = () => void 0; 
  debug = (...args: any[]) => console.debug(...args); 
  info = (...args: any[]) => console.info(...args);
  warn = (...args: any[]) => console.warn(...args);
  error = (...args: any[]) => console.error(...args);
};

setLogger(myLogger);
```

## Configuration

```javascript
import { createClientMonitor } from "@observertc/client-monitor-js";

const monitor = createClientMonitor({
    clientId: 'applicationClientId',
		collectingPeriodInMs: 2000
		samplingPeriodInMs: 4000,

		congestionDetector: {
        disabled: false,
        sensitivity: 'medium',
    },
});
```
The structure and all otions for the configuration is below:

```typescript
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
     * If true, the monitor fetches the user agent data from the browser
     *
     * DEFAULT: true
     */
    fetchUserAgentData: boolean;

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
				 * 
				 * DEFAULT: 'medium'
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
```

## ClientMonitor

The ClientMonitor is the primary tool for collecting stats and useful information from multiple sources, such as peer connections, browser user agents, and media devices. Serving as the central hub for orchestrating stats collection and sampling, it enables real-time performance tracking, anomaly detection, and event-driven responses. It offers a robust solution for WebRTC monitoring, supporting custom event handling and comprehensive performance scoring for various application needs.

### **ClientMonitor(config: ClientMonitorConfig)**

Creates a new instance of `ClientMonitor`.

- `config: ClientMonitorConfig`  
  The configuration object for the client monitor. It contains options such as `clientId`, `callId`, `collectingPeriodInMs`, and other settings.


### **Public Properties**

 * **sources**: Manage data sources for the monitor, including integrating RTCPeerConnection, getUserMedia and others. Detailed description about Sources in the [Sources](#sources) section.
 * **statsAdapters**: Adapts browser fetched raw WebRTC stats to a format the Monitor can .
 * **detectors**: Manages detection algorithms, attached to the ClientMonitor. Detailed description in the [Detectors](#detectors) section
 * **scoreCalculator** Handles the calculation of scores. Detailed description in the [Scores](#scores) section.
 * **appData**: Optional application-specific metadata.
 * **bufferingSampleData**: Indicates whether stats data is currently being buffered for sampling.
 * **closed** : Indicates whether the monitor is closed.
 * **lastSampledAt**: Timestamp of the last sampling event.

#### **Stats Properties**

 * **sendingAudioBitrate**: Represents the bitrate (in kbps) of audio being sent from the client.  
 * **sendingVideoBitrate**: Represents the bitrate (in kbps) of video being sent from the client.  
 * **receivingAudioBitrate**: Represents the bitrate (in kbps) of audio being received by the client.  
 * **receivingVideoBitrate**: Represents the bitrate (in kbps) of video being received by the client.  
 * **totalAvailableIncomingBitrate**: The total available bandwidth (in kbps) for incoming data streams.  
 * **totalAvailableOutgoingBitrate**: The total available bandwidth (in kbps) for outgoing data streams.  
 * **avgRttInSec**: The average round-trip time (RTT) for data packets, measured in seconds.  
 * **score**: The current performance score of the WebRTC session, ranging from 0.0 (worst) to 5.0 (best).  

### **Public Methods**
 * **close(): void**: Closes the `ClientMonitor` instance.  
   - Stops all periodic tasks and emits a `close` event.  
   - If configured, creates a final sample and logs a client left event.
 * **collect(): Promise<[string, RTCStats[]][]>**: Collects stats from all monitored peer connections.  
 * **setScore(score: number): void**: Sets the performance score for the client.
 * **createSample(): ClientSample | undefined**: Creates a new client sample, aggregating stats, events, metadata, issues, and scores.  
 * **addClientJoinEvent(event?: { payload?: Record<string, unknown>, timestamp?: number }): void**: Adds a "client joined" event.
 * **addClientLeftEvent(event?: { payload?: Record<string, unknown>, timestamp?: number }): void**: Adds a "client left" event.
 * **addEvent(event: PartialBy<AcceptedClientEvent, 'timestamp'>): void**: Adds a custom client event.
 * **addIssue(issue: PartialBy<AcceptedClientIssue, 'timestamp'>): void**: Adds a client issue.
 * **addMetaData(metaData: PartialBy<AcceptedClientMetaData, 'timestamp'>): void**: Adds metadata to the client monitor.
 * **addExtensionStats(stats: { type: string, payload?: Record<string, unknown> }): void**: Adds extension-specific stats.
 * **setCollectingPeriod(collectingPeriodInMs: number): void**: Sets the interval for stats collection.
 * **setSamplingPeriod(samplingPeriodInMs: number): void**: Sets the interval for stats sampling.

#### **Event Handling**

 * `on(event: string, listener: Function): this`
 * `once(event: string, listener: Function): this`
 * `off(event: string, listener: Function): this`
 * `emit(event: string, ...args: any[]): boolean`


### Events

The `ClientMonitor` class emits various events to notify of significant changes, issues, and detections related to WebRTC connections and monitoring. Each event carries specific data, providing insights into the system's current state and facilitating actions like troubleshooting or triggering other processes.

  * **`sample-created`**: Emitted when a new sample of the client's data is successfully created. A sample aggregates statistics, events, metadata, issues, and performance scores, providing a snapshot of the client’s current state.
    - **Payload**: `ClientSample` - The newly created sample object.
	
  * **`stats-collected`**: Emitted after the `ClientMonitor` collects stats from all monitored peer connections. This event provides insights into the duration of the collection process and the actual stats collected.
    - **Payload**:
      - `durationOfCollectingStatsInMs`: The duration of the stats collection process in milliseconds.
      - `collectedStats`: An array containing pairs of peer connection IDs and their associated RTC stats.

  * **`close`**: Emitted when the `ClientMonitor` instance is closed. This signifies that monitoring has stopped and no further operations will occur.
    - **Payload**: None

  * **`issue`**: This event is emitted when a client issue is detected. Issues could relate to performance, connectivity, or other detected problems during monitoring.
    - **Payload**: `AcceptedClientIssue` - An object describing the issue with a type, optional payload (containing further details), and a timestamp.

  * **`congestion`**: Emitted when congestion is detected in a peer connection. Congestion typically occurs when the incoming or outgoing bitrate exceeds the available network bandwidth.
    - **Payload**:
      - `peerConnectionMonitor`: The `PeerConnectionMonitor` instance that detected the congestion.
      - `targetIncomingBitrateAfterCongestion`: The target incoming bitrate after congestion is detected (in kbps).
      - `targetIncomingBitrateBeforeCongestion`: The target incoming bitrate before congestion was detected.
      - `targetOutgoingBitrateAfterCongestion`: The target outgoing bitrate after congestion.
      - `targetOutgoingBitrateBeforeCongestion`: The target outgoing bitrate before congestion was detected.
      - `highestSeenOutgoingBitrateBeforeCongestion`: The highest outgoing bitrate seen before the congestion event.
      - `highestSeenIncomingBitrateBeforeCongestion`: The highest incoming bitrate observed before congestion.

  * **`cpulimitation`**: Emitted when the client’s CPU is detected to be overloaded or under stress, potentially affecting performance.
    - **Payload**: None

  * **`audio-desync-track`**: This event is triggered when an inbound audio track experiences a synchronization issue, such as audio and video being out of sync.
    - **Payload**: `trackMonitor`: The `InboundTrackMonitor` instance responsible for the affected audio track.

  * **`freezed-video-track`**: Emitted when an inbound video track freezes, meaning the video feed stops updating.
    - **Payload**: `trackMonitor`: The `InboundTrackMonitor` instance monitoring the affected video track.

  * **`stucked-inbound-track`**: This event occurs when an inbound track (audio or video) becomes "stuck," meaning it stops transmitting data or becomes unresponsive.
    - **Payload**: `trackMonitor`: The `InboundTrackMonitor` instance responsible for monitoring the stuck track.

  * **`too-long-pc-connection-establishment`**: Emitted when a peer connection takes too long to establish. This event can help identify connection issues that result in delays.
    - **Payload**: `peerConnectionMonitor`: The `PeerConnectionMonitor` instance tracking the peer connection establishment process.

  * **`score`**: Emitted when the client’s performance score is updated. This event tracks the overall performance of the client, typically based on factors like latency, bitrate, and other monitored parameters.
    - **Payload**:
      - `clientScore`: The updated performance score, ranging from 0.0 to 5.0.
      - `remarks` (Optional): Additional remarks or explanations about the score, providing context for the calculated performance.

Your document provides a good explanation of detectors and how to configure and use them within the system. Here’s a review with some minor suggestions to improve clarity, consistency, and readability:

---

## Detectors

Detectors are attached to monitors such as `ClientMonitor`, `PeerConnectionMonitor`, and `TrackMonitor`. Each detector is responsible for detecting anomalies in the corresponding monitor object it is associated with.

The built-in detectors detect issues and emit events accordingly. You can also write your own custom detector and add it to a monitor.

### Configuration of Detectors

The configuration of built-in detectors can be adjusted via the `ClientMonitor` configuration. These settings can be modified even after the `ClientMonitor` is instantiated. For example, you can disable the Audio Desync detector by setting `monitor.config.audioDesyncDetector.disabled = true`, or you can change its thresholds and parameters accordingly.

### Built in detectors:

 * `AudioDesyncDetector` is a built-in detector that is attached to a `TrackMonitor` if the track is inbound and has an audio kind. It detects if the played audio accelerates or decelerates, indicating synchronization issues with the corresponding video.
 * `CongestionDetector` is a built-in detector that monitors network congestion issues. It is attached to a PeerConnectionMonitor and helps identify when the network is experiencing high levels of congestion, which can affect the quality of the media being transmitted.
 * `CpuPerformanceDetector` is a built-in detector that monitors the CPU performance of the client. It detects when the CPU is overloaded or under stress, potentially affecting the performance of the WebRTC session.
 * `FreezedVideoTrackDetector` is a built-in detector that identifies when an inbound video track freezes, meaning the video feed stops updating. It is attached to an `InboundTrackMonitor` and helps detect issues with video transmission.
 * `LongPcConnectionEstablishmentDetector` is a built-in detector that identifies when a peer connection takes too long to establish. It helps detect connection issues that result in delays in establishing a connection.
 * `StuckedInboundTrackDetector` is a built-in detector that identifies when an inbound track (audio or video) becomes stuck, meaning it stops transmitting data or becomes unresponsive. It is attached to an `InboundTrackMonitor` and helps detect issues with track transmission.

### Adding / Removing Custom Detectors

To create your own custom detector, you need to implement the `Detector` interface:

```javascript
import { Detector } from "@observertc/client-monitor-js";

export class MyDetector implements Detector {
	public readonly name = 'my-custom-detector';

	public update() {
		// Custom detecting logic
	}
}

// Add the custom detector to a monitor
const myDetector = new MyDetector();

// Adding the detector to the monitor
monitor.detectors.add(myDetector);

// Removing the detector from the monitor
monitor.detectors.remove(myDetector);
```

Detectors are updated via the `update()` method. This method is called on each attached detector via the `Detectors` object associated with the monitor. If an exception occurs in any detector, it will be caught by the `Detectors` object.

# Sources

Sources are responsible for collecting data from various inputs, such as WebRTC peer connections, media devices, and browser user agents. The `ClientMonitor` manages these sources and provides methods to add, remove, and monitor them. They play a central role in determining which data sources to include and what specific data to collect.

Sources also serve as integration points. For example, you can provide an `RTCPeerConnection` object to the sources via `addRTCPeerConnection` or a Mediasoup `Device` object via `addMediasoupDevice`.

## Supported Sources

The following sources can be accessed via `monitor.sources`, with their corresponding functionalities:

- **`addRTCPeerConnection(peerConnection: RTCPeerConnection): PeerConnectionMonitor`**  
  Adds an `RTCPeerConnection` as a source and creates a `PeerConnectionMonitor` to monitor it.

- **`addMediasoupDevice(device: Device): MediasoupDeviceMonitor`**  
  Adds a Mediasoup `Device` as a source and creates a `MediasoupDeviceMonitor` to monitor it.

- **`addMediasoupTransport(transport: Transport): MediasoupTransportMonitor`**  
  Adds a Mediasoup `Transport` as a source and creates a `MediasoupTransportMonitor`.

- **`fetchUserAgentData()`**  
  Fetches the user agent data from the browser and integrates it with the monitor.

- **`watchMediaDevices()`**  
  Integrates with `navigator.mediaDevices` by patching the `getUserMedia` method and subscribing to the `ondevicechange` event.

## Example Usage

```javascript
import { createClientMonitor } from "@observertc/client-monitor-js";
import mediasoup from "mediasoup-client";

const mediasoupDevice = new mediasoup.Device();
const monitor = createClientMonitor();

monitor.sources
  .fetchUserAgentData()
  .watchMediaDevices()
  .addMediasoupDevice(mediasoupDevice);
```

In the example above:  
- A Mediasoup `Device` is added as a source to the monitor.  
- The `fetchUserAgentData()` method collects user agent details from the browser.  
- The `watchMediaDevices()` method monitors media devices by integrating with `navigator.mediaDevices`.  

By default, the `watchMediaDevices()` and `fetchUserAgentData()` methods are invoked automatically if the corresponding configuration options are set to `true` when the `ClientMonitor` is created.

## Collecting and Adapting Stats

Each `PeerConnectionMonitor` instance includes a `getStats()` method that collects statistics from its associated `RTCPeerConnection`. These raw stats are then transformed into a format that the monitor can process, using the `statsAdapters` object.

### Stats Adapters

The `statsAdapters` object handles adapting raw statistics into the monitor's expected format. It includes methods for processing various types of stats, such as:  
- `RTCIceCandidateStats`  
- `RTCCodecStats`  
- `RTCInboundRtpStreamStats`  

Different `statsAdapters` are applied depending on the browser type, version, and the integration type. For instance:  
- Firefox may require adapting the `trackIdentifier` field (due to its use of `{` and `}` in the ID string).  
- Mediasoup integrations may require omitting `inbound-rtp` stats for the `probator` track.  

These adaptations are automatically applied if the monitor has information about the browser type and version. For this reason, it's essential to call `monitor.sources.fetchUserAgentData()` to retrieve browser data (enabled by default).

### Custom Stats Adapters

You can define custom stats adapters to address specific requirements:

```javascript
monitor.statsAdapters.add((stats) => {
  // Custom adaptation logic
  return adaptedStats;
});
```

In summary, stats adapters simplify the process of normalizing and customizing the collected stats to ensure compatibility with the monitor's processing logic.

## Sampling

The `ClientMonitor` can create samples through the `createSample()` method. This method aggregates stats, events, metadata, issues, and performance scores into a single object, providing a comprehensive snapshot of the client's current state.

The generated sample is a `ClientSample` object based on the [schema](#schema). This snapshot can be forwarded to a server for analysis or stored for historical tracking.

### Sample Size and Compression

Without compression, a `ClientSample` can become quite large, particularly when collecting stats from multiple peer connections. To optimize network usage, it is recommended to compress the sample data before sending it. For this purpose, you can use the [samples-encoder](https://www.npmjs.com/package/@observertc/samples-encoder) and [samples-decoder](https://www.npmjs.com/package/@observertc/samples-decoder) libraries.

### Automatic vs. Manual Sampling

Samples are created automatically if the `samplingPeriodInMs` configuration is set in the `ClientMonitor`. This value specifies the interval for processing stats and generating samples.

- **Automatic Sampling:**  
   To enable automatic sampling, set a positive value for `samplingPeriodInMs`. Ensure that the `collectingPeriod` (used for gathering stats) is also configured with a value greater than 0. Note that `samplingPeriodInMs` should be a multiple of the `collectingPeriod` for consistent behavior. If it isn’t, sampling will occur at the nearest multiple of the `collectingPeriod`.

- **Manual Sampling:**  
   If `samplingPeriodInMs` is set to `0`, samples will not be created automatically. In this case, you must manually call `createSample()` to generate a snapshot. To ensure proper buffering of stats data for sampling, set `clientMonitor.bufferingSampleData` to `true` before invoking `createSample()`.

### Changing the Sampling Period

The sampling interval can be adjusted dynamically using the `setSamplingPeriodInMs()` method on the `ClientMonitor`. Keep in mind that automatic sampling requires both the `samplingPeriodInMs` and `collectingPeriod` to be properly configured.


## Scores

Score calculation is a performance evaluation aspect of the `ClientMonitor`, providing a quantitative measure of the client's performance. By default the score is calculated based on various factors, such as latency, bitrate, and other monitored parameters. The score ranges from 0.0 (worst) to 5.0 (best), with higher scores indicating better performance.

SCores can be accessible through `clientMontior.score` property. The score is updated automatically based on the monitored parameters and events. You can also manually set the score using the `setScore()` method.

### Default Score Calculation

By default the score is calculated as a weight average based on the following factors:
 - peer connection monitor stability score
 - inbound audio track monitor calculated score
 - inbound video track monitor calculated score
 - outbound audio track monitor calculated score
 - outbound video track monitor calculated score

#### Peer Connection Stability Score Calculation

The `_calculatePeerConnectionStabilityScore` function evaluates the stability of a peer connection using RTT and packet loss data. It computes a stability score based on latency and delivery factors, both weighted equally.

#### Video Score Calculation

The video score is determined based on the bitrate per pixel (BPP), considering the video’s resolution, bitrate, frame rate, codec, and content type. Here's how the calculation works:

1. **Input Validation**: 
   - Ensures that `frameHeight`, `frameWidth`, `bitrate`, and `framesPerSecond` are provided. Missing data results in a score of 0.0 and a "Missing data for score calculation" remark.

2. **Codec Validation**: 
   - Validates that the codec is one of the supported types (`vp8`, `vp9`, `h264`, `h265`). If unsupported, the score is 0.0 with a "Unsupported codec" message.

3. **BPP Calculation**: 
   The Bitrate Per Pixel (BPP) is calculated with the formula:
   \[
   BPP = \frac{\text{bitrate}}{\text{frameHeight} \times \text{frameWidth} \times \text{framesPerSecond}}
   \]
   This value represents how efficiently the video is encoded.

4. **Content Type and Codec Range**: 
   Based on the content type (`lowmotion`, `standard`, or `highmotion`) and codec, the appropriate BPP range is fetched. This range sets the expected BPP limits for each codec and content type combination.

5. **Score Calculation**: 
   - If BPP is below the lower threshold, the score is scaled proportionally to this threshold.
   - If BPP exceeds the upper threshold, the score is set to 5.0 (excellent quality).
   - If BPP is within the range, it’s normalized using a logarithmic scale to fit within a score range of 0.0 to 5.0.

For a video with resolution 1920x1080, bitrate of 5000000 bps, frame rate of 30 fps, `h264` codec, and `standard` content:
- Calculate the BPP.
- The BPP range for `h264` under `standard` content is 0.15–0.25.
- If the BPP falls within this range, normalize it to a score and return an appropriate remark.

#### Audio Score Calculation

The **Mean Opinion Score (MOS)** for audio quality is calculated using the E-Model algorithm, considering factors like bitrate, packet loss, delay, and error correction.

#### Changing weight of the score calculations

The score calculation can be adjusted by modifying the `weight` parameter of the `calculatedScore` object on the corresponding monitor. For example, to increase the weight of the `inboundAudioTrackMonitor` score in the calculation, you can set:

```javascript
trackMonitor.calculatedScore.weight = 2;
```

By default the weight is set to 1 for all monitors, increasing or decreasing it will affect the impact of the monitor on the final score.


#### Changing contentType of Tracks

The `contentType` of the tracks can be changed to affect the score calculation. By default the `contentType` is set to `standard` for video tracks. You can change it to `lowmotion`, or `highmotion` to affect the score calculation. For example screen sharing video tracks can be set to `lowmotion` to adjust the score calculation for screen sharing scenarios.

```javascript
trackMonitor.contentType = 'lowmotion';
```

### Custom Score Calculation

You can implement custom score calculation logic by extending the `ScoreCalculator` class and overriding the `calculateScore()` method. This allows you to define your own scoring algorithm based on specific requirements or metrics.

```javascript
import { ScoreCalculator } from "@observertc/client-monitor-js";

class CustomScoreCalculator extends ScoreCalculator {
  update() {
    for (const pcMonitor of clientMonitor.peerConnections) {
      pcMonitor.calculatedScore.value = 1.0
    }
    clientMonitor.setScore(1.0);
  }
}

clientMonitor.scoreCalculator = new CustomScoreCalculator();
```

## Events and Issues

The `ClientMonitor` emits events and issues to notify about significant changes, anomalies, and detections related to WebRTC connections and monitoring. These events provide insights into the system's current state and facilitate actions like troubleshooting or triggering other processes. 

When Sampling is enabled, the events and issues are included in the `ClientSample` object, providing a comprehensive snapshot of the client's performance and status.

By default the ClientMonitor automatically generate events when a PeerConnection state changes, new track added, ended, paused, etc. Additionally it generates events when issues are detected by the built-in detectors.

Custom events and issues can be added to the monitor using the `addEvent()` and `addIssue()` methods. These custom events and issues can provide additional context or information about the client's state.

```javascript
monitor.addEvent({
  type: 'custom-event',
  payload: { message: 'Custom event added' },
  timestamp: Date.now(),
});

monitor.addIssue({
  type: 'custom-issue',
  payload: { message: 'Custom issue detected' },
  timestamp: Date.now(),
});
```


## WebRTC Monitors

Every WebRTC source added to the `ClientMonitor` creates a corresponding monitor object within the `ClientMonitor`, where stats properties are tracked, anomalies are detected, and derived fields are calculated. For example, when a peer connection is added via `monitor.sources.addRTCPeerConnection(peerConnection)`, a corresponding `PeerConnectionMonitor` is created. If stats are collected through the `monitor.collect()` method (automatically called when `collectingPeriodInMs` is configured), the monitor will create an `OutboundRtpMonitor` if the stats indicate that a new `outbound-rtp` entry has not been previously monitored. Conversely, if stats for an existing entry are no longer present in the new stats collection, the monitor will remove the corresponding `OutboundRtpMonitor` instance.

Each WebRTC stats-based monitor contains all fields from the corresponding stats, as well as derived fields calculated from the difference between two consecutive stats (e.g., `bitrate`). Additionally, the monitor provides navigation capabilities to related stats (e.g., navigating from an `OutboundRtpMonitor` to the corresponding `MediaSourceMonitor`). This structure ensures efficient navigation and data extraction for the application using the monitor.

In addition to `PeerConnectionMonitor` and related WebRTC Stats Monitors, `TrackMonitor` instances are also created and tracked.

### `CertificateMonitor`

The `CertificateMonitor` is an extension of the `certificate` [stats](https://www.w3.org/TR/webrtc-stats/#certificatestats-dict*) collected from the `PeerConnection`. In addition to the fields contained within the stats, it includes calculated properties and navigational methods.

#### **Properties:**

Contains all the fields of the [certificate](https://www.w3.org/TR/webrtc-stats/#certificatestats-dict*) stats, plus the following:

* **`appData?`** (`Record<string, unknown>` or `undefined`): Optional application-specific metadata associated with the certificate. This data is included in the sample.

#### **Methods:**

* **`visited`** (`boolean`): A getter used by the `PeerConnectionMonitor` to manage the lifecycle of the stats. This tracks whether the certificate stats have been visited.

* **`createSample(): CertificateStats`**: Used by the `ClientMonitor` to create a complete `ClientSample`. More details on sampling can be found in the [sampling](#sampling) section.

* **`accept(stats: Omit<CertificateStats, 'appData'>): void`**: Method called by the `PeerConnectionMonitor` to accept new certificate stats and update the internal fields of the `CertificateMonitor` instance.


##### **Navigational Methods:**

* **`getPeerConnection()`**: Navigates to the `PeerConnectionMonitor` that this `CertificateMonitor` belongs to.


### `CodecMonitor`

The `CodecMonitor` is an extension of the `CodecStats` collected from the `PeerConnection`. It tracks codec-related information, including MIME types, payload types, and transport properties. The `CodecMonitor` also provides derived fields and methods for navigating through related stats and updating the internal state based on incoming data.

#### **Properties:**

Contains all the fields of the [CodecStats](https://www.w3.org/TR/webrtc-stats/#codecstats-dict*) stats, plus the following:

* **`appData?`** (`Record<string, unknown>` or `undefined`): Optional application-specific metadata associated with the codec. This data is included in the sample.

#### **Methods:**

* **`visited`** (`boolean`): A getter that returns whether the `CodecMonitor` has been visited. It is used to manage the lifecycle of stats and is reset after each access.
* **`createSample(): CodecStats`**: Used by the `ClientMonitor` to create a complete `ClientSample`. More details on sampling can be found in the [sampling](#sampling) section.
* **`accept(stats: Omit<CodecStats, 'appData'>): void`**: Method called by the `PeerConnectionMonitor` to accept new codec stats and update the internal fields of the `CodecMonitor` instance.

##### **Navigational Methods:**

* **`getPeerConnection()`**: Navigates to the `PeerConnectionMonitor` this `CodecMonitor` belongs to.
* **`getIceTransport()`**: Navigates to the corresponding `IceTransportMonitor` based on the codec’s transport ID.


### `IceCandidateMonitor`

The `IceCandidateMonitor` is an extension of the `IceCandidateStats` collected from the `PeerConnection`. It tracks information related to ICE candidates, such as transport details, protocol type, priority, and more. The `IceCandidateMonitor` also provides derived fields and methods for navigating related stats and updating internal states based on incoming data.

#### **Properties:**

Contains all the fields of the [IceCandidateStats](https://www.w3.org/TR/webrtc-stats/#icecandidatestats-dict*) stats, plus the following:

* **`appData?`** (`Record<string, unknown>` or `undefined`): Optional application-specific metadata associated with the ICE candidate. This data is included in the sample.

#### **Methods:**

* **`visited`** (`boolean`): A getter that returns whether the `IceCandidateMonitor` has been visited. It is used to manage the lifecycle of stats and is reset after each access.
* **`createSample(): IceCandidateStats`**: Used by the `ClientMonitor` to create a complete `ClientSample`. More details on sampling can be found in the [sampling](#sampling) section.
* **`accept(stats: Omit<IceCandidateStats, 'appData'>): void`**: Method called by the `PeerConnectionMonitor` to accept new ICE candidate stats and update the internal fields of the `IceCandidateMonitor` instance. The method ensures that only valid stats with a positive time difference are applied.

##### **Navigational Methods:**

* **`getPeerConnection()`**: Navigates to the `PeerConnectionMonitor` this `IceCandidateMonitor` belongs to.
* **`getIceTransport()`**: Navigates to the corresponding `IceTransportMonitor` based on the candidate’s transport ID.

### `IceCandidatePairMonitor`

The `IceCandidatePairMonitor` tracks information related to pairs of ICE candidates in the WebRTC peer connection. This monitor tracks key metrics such as round-trip time, bytes sent and received, consent requests, and the state of the candidate pair (whether it is new, in progress, failed, or succeeded). It also provides methods for navigating related stats such as the local and remote candidates, and the transport associated with the candidate pair.

#### **Properties:**

Contains all the fields of the [IceCandidatePairStats](https://www.w3.org/TR/webrtc-stats/#icecandidatepairstats-dict*) stats, plus the following:

* **`appData?`** (`Record<string, unknown>` or `undefined`): Optional application-specific metadata associated with the ICE candidate pair. This data is included in the sample.

#### **Methods:**

* **`visited`** (`boolean`): A getter that returns whether the `IceCandidatePairMonitor` has been visited. It is used to manage the lifecycle of stats and is reset after each access.
* **`createSample(): IceCandidateStats`**: Used by the `ClientMonitor` to create a complete `ClientSample`. More details on sampling can be found in the [sampling](#sampling) section.
* **`accept(stats: Omit<IceCandidatePairStats, 'appData'>): void`**: Method called by the `PeerConnectionMonitor` to accept new ICE candidate pair stats and update the internal fields of the `IceCandidatePairMonitor` instance. The method ensures that only valid stats with a positive time difference are applied.


##### **Navigational Methods:**

* **`getPeerConnection()`**: Navigates to the `PeerConnectionMonitor` this `IceCandidatePairMonitor` belongs to.
* **`getIceTransport()`**: Navigates to the corresponding `IceTransportMonitor` based on the candidate pair's transport ID.
* **`getLocalCandidate()`**: Navigates to the `IceCandidateMonitor` corresponding to the local candidate ID.
* **`getRemoteCandidate()`**: Navigates to the `IceCandidateMonitor` corresponding to the remote candidate ID.

### `IceTransportMonitor`

The `IceTransportMonitor` tracks information related to the ICE transport layer in a WebRTC peer connection. This monitor tracks key metrics such as packets sent and received, bytes sent and received, and various ICE and DTLS states. It also provides methods for navigating related stats such as the selected candidate pair and the associated peer connection.

#### **Properties:**

Contains all the fields of the [IceTransportStats](https://www.w3.org/TR/webrtc-stats/#icetransportstats-dict*) stats, plus the following:

* **`appData?`** (`Record<string, unknown>` or `undefined`): Optional application-specific metadata associated with the ICE transport. This data is included in the sample.

#### **Methods:**

* **`visited`** (`boolean`): A getter that returns whether the `IceTransportMonitor` has been visited. It is used to manage the lifecycle of stats and is reset after each access.
* **`createSample(): IceTransportStats`**: Used by the `ClientMonitor` to create a complete `ClientSample`. More details on sampling can be found in the [sampling](#sampling) section.
* **`accept(stats: Omit<IceTransportStats, 'appData'>): void`**: Method called by the `PeerConnectionMonitor` to accept new ICE transport stats and update the internal fields of the `IceTransportMonitor` instance. The method ensures that only valid stats with a positive time difference are applied.

##### **Navigational Methods:**

* **`getPeerConnection()`**: Navigates to the `PeerConnectionMonitor` this `IceTransportMonitor` belongs to.
* **`getSelectedCandidatePair()`**: Navigates to the `IceCandidatePairMonitor` corresponding to the selected candidate pair ID.

### `InboundRtpMonitor`

The `InboundRtpMonitor` tracks information related to inbound RTP streams in a WebRTC peer connection. It monitors various metrics related to audio and video media, such as packet loss, jitter, frames per second, audio energy, and more. It also provides methods for navigating related stats like the codec, track, and remote outbound RTP.

#### **Properties:**

Contains all the fields of the [InboundRtpStats](https://www.w3.org/TR/webrtc-stats/#inboundrtpstats-dict*) stats, plus the following:

* **`appData?`** (`Record<string, unknown>` or `undefined`): Optional application-specific metadata associated with the inbound RTP. This data is included in the sample.
* **`bitrate?`** (`number` or `undefined`): The calculated bitrate for the inbound RTP stream, in bits per second.
* **`isFreezed?`** (`boolean` or `undefined`): Indicates whether the video track is frozen.
* **`desync?`** (`boolean` or `undefined`): Indicates whether there is audio desynchronization.
* **`avgFramesPerSec?`** (`number` or `undefined`): The average frames per second of the video track.
* **`fpsVolatility?`** (`number` or `undefined`): The volatility in frames per second, indicating fluctuations in the video frame rate.
* **`lastNFramesPerSec?`** (`number[]`): An array holding the last 10 frames per second values to calculate average FPS and volatility.
* **`fractionLost?`** (`number` or `undefined`): The fraction of packets lost in the stream.
* **`deltaPacketsLost?`** (`number` or `undefined`): The change in packets lost between the current and previous stats.

#### **Methods:**

* **`visited`** (`boolean`): A getter that returns whether the `InboundRtpMonitor` has been visited. It is used to manage the lifecycle of stats and is reset after each access.
* **`createSample(): InboundRtpStats`**: Used by the `ClientMonitor` to create a complete `ClientSample`. More details on sampling can be found in the [sampling](#sampling) section.
* **`accept(stats: Omit<InboundRtpStats, 'appData'>): void`**: Method called by the `PeerConnectionMonitor` to accept new inbound RTP stats and update the internal fields of the `InboundRtpMonitor` instance. The method ensures that only valid stats with a positive time difference are applied.

#### **Navigational Methods:**

* **`getPeerConnection()`**: Returns the `PeerConnectionMonitor` associated with the `InboundRtpMonitor`. This is used to navigate back to the parent `PeerConnectionMonitor`.
* **`getRemoteOutboundRtp()`**: Returns the `RemoteOutboundRtpMonitor` associated with the inbound RTP stream, using the SSRC.
* **`getIceTransport()`**: Retrieves the `IceTransportMonitor` associated with the transport ID.
* **`getCodec()`**: Retrieves the `CodecMonitor` associated with the codec ID.
* **`getMediaPlayout()`**: Retrieves the `MediaPlayoutMonitor` associated with the playout ID.
* **`getTrack()`**: Retrieves the track associated with the `trackIdentifier` from the `PeerConnectionMonitor`.


### `InboundTrackMonitor`

The `InboundTrackMonitor` tracks and monitors the inbound media track in a WebRTC peer connection. It aggregates statistics from the associated `InboundRtpMonitor` and applies various detection mechanisms to evaluate the track's health, such as detecting stuck inbound tracks or desync issues in audio and video streams.

#### **Properties:**

* **`direction`** (`'inbound'`): Indicates the direction of the media track. For this class, the direction is always inbound.
* **`detectors`** (`Detectors`): An instance of the `Detectors` class, which manages different detection mechanisms for the track (e.g., stuck tracks, audio desynchronization, and frozen video).
* **`contentType`** (`'lowmotion' | 'highmotion' | 'standard'`): Defines the type of content in the track based on motion characteristics. Defaults to `'standard'`.
* **`dtxMode`** (`boolean`): Indicates whether the track is in DTX (Discontinuous Transmission) mode, which is typically used in audio for saving bandwidth when silence is detected.
* **`calculatedScore`** (`CalculatedScore`): An object holding the calculated score for the track, including the weight, score value, and any remarks.
* **`score`** (`number | undefined`): A getter that returns the calculated score value for the track.
* **`kind`** (`MediaKind`): A getter that returns the media kind (audio or video) of the track, sourced from the associated `InboundRtpMonitor`.
* **`bitrate`** (`number | undefined`): A getter that returns the bitrate of the inbound RTP stream, based on `InboundRtpMonitor`.
* **`jitter`** (`number | undefined`): A getter that returns the jitter value from the `InboundRtpMonitor`.
* **`fractionLost`** (`number | undefined`): A getter that returns the packet loss fraction from the `InboundRtpMonitor`.

#### **Methods:**

* **`update()`**: Calls the `update()` method on the `Detectors` instance to update the status of all active detectors.

#### **Navigational Methods:**

* **`getInboundRtp()`**: Returns the `InboundRtpMonitor` instance associated with the track. This method is used to retrieve detailed RTP statistics.
* **`getPeerConnection()`**: Returns the `PeerConnectionMonitor` from the associated `InboundRtpMonitor`.


### `MediaPlayoutMonitor`

The `MediaPlayoutMonitor` tracks information related to media playout in a WebRTC peer connection, such as the duration of synthesized samples, playout delays, and total sample count. It provides methods to update, accept new statistics, and create samples of the media playout metrics.

#### **Properties:**

Contains all the fields of the [MediaPlayout](https://www.w3.org/TR/webrtc-stats/#dom-rtcstatstype-media-playout) stats, plus the following:

* **`appData`** (`Record<string, unknown> | undefined`): Optional application-specific metadata associated with the media playout.

#### **Methods:**

* **`visited`** (`boolean`): A getter that returns whether the `MediaPlayoutMonitor` has been visited. It is used to manage the lifecycle of stats and is reset after each access.
* **`createSample(): MediaPlayoutStats`**: Used by the `ClientMonitor` to create a complete `ClientSample`. More details on sampling can be found in the [sampling](#sampling) section.
* **`accept(stats: Omit<MediaPlayoutStats, 'appData'>): void`**: Method called by the `PeerConnectionMonitor` to accept new inbound RTP stats and update the internal fields of the `MediaPlayoutStats` instance. The method ensures that only valid stats with a positive time difference are applied.

#### **Navigational Methods:**

* **`getPeerConnection()`**: Returns the `PeerConnectionMonitor` associated with the `InboundRtpMonitor`. This is used to navigate back to the parent `PeerConnectionMonitor`.

### `MediaSourceMonitor`

The `MediaSourceMonitor` extends the `MediaSourceStats` collected from the `PeerConnection`. It tracks media-related statistics, including audio levels, video dimensions, frame rates, and more. The `MediaSourceMonitor` also provides derived fields and methods for managing and updating internal states based on incoming stats.

#### **Properties:**

Contains all the fields of the [MediaSourceStats](https://www.w3.org/TR/webrtc-stats/#mediasourcestats-dict*) stats, plus the following:

* **`appData?`** (`Record<string, unknown>` or `undefined`): Optional application-specific metadata associated with the media source. This data is included in the sample.

#### **Methods:**

* **`visited`** (`boolean`): A getter that returns whether the `MediaSourceMonitor` has been visited. It is used to manage the lifecycle of stats and is reset after each access.
* **`createSample(): MediaSourceStats`**: Creates and returns a sample of the current media source stats, including the metrics and optional `appData`.
* **`accept(stats: Omit<MediaSourceStats, 'appData'>): void`**: Method called to accept new media source stats and update the internal fields of the `MediaSourceMonitor` instance. Only stats with a positive time difference are applied.

##### **Navigational Methods:**

* **`getPeerConnection()`**: Navigates to the `PeerConnectionMonitor` this `MediaSourceMonitor` belongs to.
* **`getTrack()`**: Navigates to the outbound track associated with this media source monitor.


### `OutboundRtpMonitor`

The `OutboundRtpMonitor` extends the `OutboundRtpStats` collected from the `PeerConnection`. It tracks RTP-related statistics for outgoing media, such as packet and byte counts, frame encoding, retransmissions, and more. The `OutboundRtpMonitor` also provides derived fields for packet and bitrate rates, as well as methods to navigate related stats.

#### **Properties:**

Contains all the fields of the [OutboundRtpStats](https://www.w3.org/TR/webrtc-stats/#outboundrtpstats-dict*) stats, plus the following:

* **`appData?`** (`Record<string, unknown>` or `undefined`): Optional application-specific metadata associated with the outbound RTP stats. This data is included in the sample.
* **`bitrate?`** (`number` or `undefined`): Derived field representing the bitrate of the outbound RTP stream.
* **`packetRate?`** (`number` or `undefined`): Derived field representing the packet rate (packets per second) of the outbound RTP stream.

#### **Methods:**

* **`visited`** (`boolean`): A getter that returns whether the `OutboundRtpMonitor` has been visited. It is used to manage the lifecycle of stats and is reset after each access.
* **`createSample(): OutboundRtpStats`**: Creates and returns a complete `OutboundRtpStats` object, which can be used by the `ClientMonitor` to generate a `ClientSample`.
* **`accept(stats: Omit<OutboundRtpStats, 'appData'>): void`**: Accepts new `OutboundRtpStats` and updates the internal fields of the `OutboundRtpMonitor` instance, calculating derived values like packet rate.

#### **Navigational Methods:**

* **`getPeerConnection()`**: Navigates to the `PeerConnectionMonitor` this `OutboundRtpMonitor` belongs to.
* **`getRemoteInboundRtp()`**: Navigates to the corresponding inbound RTP stats for the remote peer identified by the `ssrc`.
* **`getCodec()`**: Retrieves the `CodecMonitor` associated with the current `codecId`.
* **`getMediaSource()`**: Retrieves the `MediaSourceMonitor` associated with the current `mediaSourceId`.
* **`getTrack()`**: Retrieves the media track associated with this outbound RTP, either through the `MediaSourceMonitor` or from the outbound tracks of the peer connection.


### `OutboundTrackMonitor`

The `OutboundTrackMonitor` tracks and manages statistics related to an outbound media track, including details on RTP statistics, bitrate, jitter, and packet loss. It integrates with `OutboundRtpMonitor` instances and performs calculations for a comprehensive view of the track's health and performance. The monitor also includes a `Detectors` instance to track performance trends, and a `CalculatedScore` to provide an overall score for the track based on its performance.

#### **Properties:**

* **`direction`** (`'outbound'`): The direction of the track, indicating that this is an outbound monitor.
* **`detectors`** (`Detectors`): Instance of the `Detectors` class used for performance monitoring and detecting issues on the track.
* **`mappedOutboundRtp`** (`Map<number, OutboundRtpMonitor>`): A map of `OutboundRtpMonitor` instances, keyed by the SSRC, to monitor the RTP stats associated with the track.
* **`contentType`** (`'lowmotion' | 'highmotion' | 'standard'`): The type of content being transmitted on the track, which could impact performance.
* **`calculatedScore`** (`CalculatedScore`): The calculated score for the track based on various performance metrics, including weight, value, and remarks.
* **`score`** (`number | undefined`): A derived value representing the current score for the track's performance.

#### **Methods:**

* **`getPeerConnection()`**: Retrieves the `PeerConnectionMonitor` that the track is part of.
* **`get kind()`**: Retrieves the media kind (audio, video, etc.) of the track from the associated `MediaSourceMonitor`.
* **`update()`**: Updates the performance statistics for the outbound track, recalculating bitrate, jitter, fraction lost, sending packet rate, and remote received packet rate based on the values from the associated `OutboundRtpMonitor` instances.
* **`getOutboundRtps()`**: Retrieves an array of all `OutboundRtpMonitor` instances currently mapped to the track.
* **`getHighestLayer()`**: Retrieves the `OutboundRtpMonitor` with the highest bitrate, representing the highest quality RTP stream on the track.

#### **Navigational Methods:**

* **`getMediaSource()`**: Retrieves the `MediaSourceMonitor` associated with the track identifier.

## `PeerConnectionMonitor`

The `PeerConnectionMonitor` class manages and tracks WebRTC peer connection statistics and metrics. It integrates with various other monitors, such as `OutboundRtpMonitor`, `InboundRtpMonitor`, and `DataChannelMonitor`, to collect and analyze connection data. It is responsible for detecting performance issues, calculating stability scores, and providing a comprehensive view of the peer connection's health.

### Properties:

- **`peerConnectionId`** (`string`): The unique identifier for the peer connection being monitored.
- **`detectors`** (`Detectors`): An instance of the `Detectors` class used for tracking performance trends, such as connection establishment time and congestion.
- **`mappedCodecMonitors`** (`Map<string, CodecMonitor>`): A map of `CodecMonitor` instances, keyed by codec name, to monitor the RTP codec statistics for the connection.
- **`mappedInboundRtpMonitors`** (`Map<number, InboundRtpMonitor>`): A map of `InboundRtpMonitor` instances, keyed by SSRC, to monitor incoming RTP streams for the connection.
- **`mappedRemoteOutboundRtpMonitors`** (`Map<number, RemoteOutboundRtpMonitor>`): A map of `RemoteOutboundRtpMonitor` instances to track remote outbound RTP statistics.
- **`mappedOutboundRtpMonitors`** (`Map<number, OutboundRtpMonitor>`): A map of `OutboundRtpMonitor` instances to track the outbound RTP streams.
- **`mappedDataChannelMonitors`** (`Map<string, DataChannelMonitor>`): A map of `DataChannelMonitor` instances, keyed by the data channel ID, to monitor the data channels for the connection.
- **`mappedMediaSourceMonitors`** (`Map<string, MediaSourceMonitor>`): A map of `MediaSourceMonitor` instances to monitor media sources used in the peer connection.
- **`mappedMediaPlayoutMonitors`** (`Map<string, MediaPlayoutMonitor>`): A map of `MediaPlayoutMonitor` instances to monitor the playout of media for the connection.
- **`mappedPeerConnectionTransportMonitors`** (`Map<string, PeerConnectionTransportMonitor>`): A map of `PeerConnectionTransportMonitor` instances, keyed by transport ID, to monitor transport layer statistics.
- **`mappedIceTransportMonitors`** (`Map<string, IceTransportMonitor>`): A map of `IceTransportMonitor` instances, keyed by transport ID, to monitor ICE transport statistics.
- **`mappedIceCandidateMonitors`** (`Map<string, IceCandidateMonitor>`): A map of `IceCandidateMonitor` instances to monitor ICE candidates for the connection.
- **`mappedIceCandidatePairMonitors`** (`Map<string, IceCandidatePairMonitor>`): A map of `IceCandidatePairMonitor` instances to monitor ICE candidate pairs for the connection.
- **`mappedCertificateMonitors`** (`Map<string, CertificateMonitor>`): A map of `CertificateMonitor` instances to monitor certificates used by the peer connection.

- **`closed`** (`boolean`): Indicates whether the peer connection has been closed.
- **`sendingAudioBitrate`** (`number | undefined`): The current bitrate for sending audio.
- **`sendingVideoBitrate`** (`number | undefined`): The current bitrate for sending video.
- **`sendingFractionLost`** (`number | undefined`): The fraction of packets lost when sending.
- **`receivingAudioBitrate`** (`number | undefined`): The current bitrate for receiving audio.
- **`receivingVideoBitrate`** (`number | undefined`): The current bitrate for receiving video.
- **`outboundFractionLost`** (`number`): The fraction of packets lost on outbound streams.
- **`inboundFractionalLost`** (`number`): The fraction of packets lost on inbound streams.
- **`totalInboundPacketsLost`** (`number`): Total number of inbound packets lost.
- **`totalInboundPacketsReceived`** (`number`): Total number of inbound packets received.
- **`totalOutboundPacketsSent`** (`number`): Total number of outbound packets sent.
- **`totalOutboundPacketsReceived`** (`number`): Total number of outbound packets received.
- **`totalOutboundPacketsLost`** (`number`): Total number of outbound packets lost.
- **`totalDataChannelBytesSent`** (`number`): Total number of bytes sent via data channels.
- **`totalDataChannelBytesReceived`** (`number`): Total number of bytes received via data channels.
- **`totalSentAudioBytes`** (`number`): Total number of audio bytes sent.
- **`totalSentVideoBytes`** (`number`): Total number of video bytes sent.
- **`totalReceivedAudioBytes`** (`number`): Total number of audio bytes received.
- **`totalReceivedVideoBytes`** (`number`): Total number of video bytes received.
- **`totalAvailableIncomingBitrate`** (`number | undefined`): The total available incoming bitrate.
- **`totalAvailableOutgoingBitrate`** (`number | undefined`): The total available outgoing bitrate.
- **`deltaInboundPacketsLost`** (`number | undefined`): Change in the number of inbound packets lost since the last update.
- **`deltaInboundPacketsReceived`** (`number | undefined`): Change in the number of inbound packets received since the last update.
- **`deltaOutboundPacketsSent`** (`number | undefined`): Change in the number of outbound packets sent since the last update.
- **`deltaOutboundPacketsReceived`** (`number | undefined`): Change in the number of outbound packets received since the last update.
- **`deltaOutboundPacketsLost`** (`number | undefined`): Change in the number of outbound packets lost since the last update.
- **`deltaDataChannelBytesSent`** (`number | undefined`): Change in the number of bytes sent via data channels.
- **`deltaDataChannelBytesReceived`** (`number | undefined`): Change in the number of bytes received via data channels.
- **`deltaSentAudioBytes`** (`number | undefined`): Change in the number of audio bytes sent.
- **`deltaSentVideoBytes`** (`number | undefined`): Change in the number of video bytes sent.
- **`deltaReceivedAudioBytes`** (`number | undefined`): Change in the number of audio bytes received.
- **`deltaReceivedVideoBytes`** (`number | undefined`): Change in the number of video bytes received.
- **`highestSeenSendingBitrate`** (`number | undefined`): The highest bitrate seen for sending (audio + video).
- **`highestSeenReceivingBitrate`** (`number | undefined`): The highest bitrate seen for receiving (audio + video).
- **`highestSeenAvailableOutgoingBitrate`** (`number | undefined`): The highest available outgoing bitrate seen.
- **`highestSeenAvailableIncomingBitrate`** (`number | undefined`): The highest available incoming bitrate seen.
- **`avgRttInSec`** (`number | undefined`): The average round-trip time (RTT) in seconds.
- **`ewmaRttInSec`** (`number | undefined`): The exponentially weighted moving average (EWMA) of RTT in seconds.
- **`connectingStartedAt`** (`number | undefined`): The timestamp when the connection started being established.
- **`connectedAt`** (`number | undefined`): The timestamp when the connection was established.
- **`iceState`** (`W3C.RtcIceTransportState | undefined`): The current state of the ICE transport.
- **`usingTURN`** (`boolean | undefined`): Indicates if TURN is being used for the connection.
- **`usingTCP`** (`boolean | undefined`): Indicates if TCP is being used for the connection.
- **`calculatedStabilityScore`** (`CalculatedPeerConnectionScores`): The calculated score for the connection's stability, based on various performance metrics.

- **`codecs`** (`CodecMonitor[]`): Returns an array of all `CodecMonitor` instances currently mapped to the peer connection.
- **`inboundRtps`** (`InboundRtpMonitor[]`): Returns an array of all `InboundRtpMonitor` instances currently mapped to the peer connection.
- **`remoteOutboundRtps`** (`RemoteOutboundRtpMonitor[]`): Returns an array of all `RemoteOutboundRtpMonitor` instances currently mapped to the peer connection.
- **`outboundRtps`** (`OutboundRtpMonitor[]`): Returns an array of all `OutboundRtpMonitor` instances currently mapped to the peer connection.
- **`remoteInboundRtps`** (`RemoteInboundRtpMonitor[]`): Returns an array of all `RemoteInboundRtpMonitor` instances currently mapped to the peer connection.
- **`mediaSources`** (`MediaSourceMonitor[]`): Returns an array of all `MediaSourceMonitor` instances


- **`appData`** (`Record<string, unknown> | undefined`): Custom application data associated with the peer connection.

### Methods:

 * **`getStats()`**: Retrieves and returns the statistics for the peer connection. It emits the `stats` event and updates internal performance metrics.
 * **`accept(stats: W3C.RtcStats[])`**: Accepts an array of `RtcStats` objects and updates the internal state based on the data. It recalculates various metrics like RTT, available bitrates, and packet loss.
 * **`createSample(): PeerConnectionSample`**: Creates and returns a complete `PeerConnectionSample` object, which can be used by the `ClientMonitor` to generate a `ClientSample`.


### `PeerConnectionTransportMonitor`

The `PeerConnectionTransportMonitor` class tracks transport layer statistics for a WebRTC peer connection. It collects data about transport metrics like data channels opened/closed and the associated application data. The monitor provides methods to update stats, generate samples, and navigate the peer connection.

#### **Properties:**

Contains all the fields of the [PeerConnectionTransportStats](https://www.w3.org/TR/webrtc-stats/#peerconnectiontransportstats-dict*) stats, plus the following:

- **`appData?`** (`Record<string, unknown>` or `undefined`): Optional custom application data associated with the transport stats.

#### **Methods:**

- **`visited`** (`boolean`): A getter that returns whether the `PeerConnectionTransportMonitor` has been visited. It is used to manage the lifecycle of stats and is reset after each access.
- **`accept(stats: Omit<PeerConnectionTransportStats, 'appData'>): void`**: Accepts new `PeerConnectionTransportStats` and updates the internal fields, excluding `appData`. It calculates any derived fields as necessary.
- **`createSample()`**: Creates and returns a sample of the `PeerConnectionTransportStats` with the current stats.

#### **Navigational Methods:**

- **`getPeerConnection()`**: Navigates to the `PeerConnectionMonitor` this transport monitor belongs to.


### `RemoteInboundRtpMonitor`

The `RemoteInboundRtpMonitor` class tracks the remote inbound RTP statistics for a WebRTC peer connection. It monitors packet reception, packet loss, jitter, round-trip time, and other RTP-related metrics for inbound media. The monitor integrates with the `PeerConnectionMonitor` to provide detailed insights into the performance of the inbound RTP streams from the remote peer.

#### **Properties:**

Contains all the fields of the [RemoteInboundRtpStats](https://www.w3.org/TR/webrtc-stats/#remoteinboundrtpstats-dict*) stats, plus the following:

- **`appData?`** (`Record<string, unknown>` or `undefined`): Optional custom application data associated with the remote inbound RTP stats.
- **`packetRate?`** (`number` or `undefined`): The packet rate (packets per second) for the remote inbound RTP stream.
- **`deltaPacketsLost?`** (`number` or `undefined`): The change in the number of packets lost since the last update.
- **`visited`** (`boolean`): A getter that returns whether the monitor has been visited. Initially `true`, it is reset to `false` after being accessed once.

#### **Methods:**

- **`accept(stats: Omit<RemoteInboundRtpStats, 'appData'>): void`**: Accepts a new set of `RemoteInboundRtpStats` (excluding `appData`) and updates the internal fields of the monitor. It calculates derived values such as packet rate and delta packets lost.
- **`createSample()`**: Creates and returns a sample of `RemoteInboundRtpStats` with the current statistics.

#### **Navigational Methods:**

- **`getPeerConnection()`**: Navigates to the `PeerConnectionMonitor` this `RemoteInboundRtpMonitor` belongs to.
- **`getOutboundRtp()`**: Navigates to the corresponding outbound RTP stats for the remote peer identified by the `ssrc`.
- **`getCodec()`**: Retrieves the `CodecMonitor` associated with the current `codecId`.

### `RemoteOutboundRtpMonitor`

The `RemoteOutboundRtpMonitor` tracks statistics for remote outbound RTP streams in a WebRTC peer connection. It collects information such as packets and bytes sent, round-trip time, and codec information. The monitor provides methods to update stats, generate samples, and navigate related objects.

Contains all the fields of the [RemoteOutboundRtpStats](https://www.w3.org/TR/webrtc-stats/#remoteoutboundrtpstats-dict*) stats, plus the following:

#### **Properties:**

- **`appData?`** (`Record<string, unknown>` or `undefined`): Optional custom application data associated with the outbound RTP stats.
- **`bitrate?`** (`number` or `undefined`): Derived field representing the bitrate of the remote outbound RTP stream.
- **`visited`** (`boolean`): A getter that returns whether the `RemoteOutboundRtpMonitor` has been visited. It is used to manage the lifecycle of stats and is reset after each access.

#### **Methods:**

- **`accept(stats: Omit<RemoteOutboundRtpStats, 'appData'>): void`**: Accepts new `RemoteOutboundRtpStats` and updates the internal fields, excluding `appData`. It calculates any derived fields as necessary.
- **`createSample()`**: Creates and returns a sample of the `RemoteOutboundRtpStats` with the current stats.

#### **Navigational Methods:**

- **`getPeerConnection()`**: Navigates to the `PeerConnectionMonitor` this remote outbound RTP monitor belongs to.
- **`getInboundRtp()`**: Retrieves the corresponding inbound RTP stats for the remote peer identified by the `ssrc`.
- **`getCodec()`**: Retrieves the `CodecMonitor` associated with the current `codecId`.

