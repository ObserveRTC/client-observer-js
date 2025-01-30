## Javascript library to monitor WebRTC applications

@observertc/client-monitor-js is a client side library to monitor [WebRTCStats](https://www.w3.org/TR/webrtc-stats/) and to integrate your app to observertc components.

Table of Contents:

-   [Quick Start](#quick-start)
-   [User Manual](#developer-manual)
-   [API Manual](#api-manual)
<!-- 
-   [Collected Metrics](#collected-metrics)
    -   [Calculated updates](#calculated-updates)
    -   [PeerConnection Entry](#peerconnection-entry)
    -   [MediaStreamTrack Entry](#mediastreamtrack-entry)
    -   [InboundRTP Entry](#inboundrtp-entry)
    -   [OutboundRTP Entry](#outboundrtp-entry)
-   [Detectors](#detectors)
    -   [Congestion Detector](#congestion-detector)
    -   [Audio Desync Detector](#audio-desync-detector)
    -   [CPU Performance Detector](#cpu-performance-detector)
    -   [Video Freeze Detector](#video-freeze-detector)
    -   [Stucked Inbound Track Detector](#stucked-inbound-track-detector)
-   [Issues](#issues)

-   [Events](#events)
    -   [CLIENT_JOINED Event](#client_joined-event)
    -   [CLIENT_LEFT Event](#client_left-event)
    -   [Custom Call Event](#custom-call-event)
    -   [Extension Stats Event](#extension-stats-event)
-   [Sampling](#sampling) -->
-   [NPM package](#npm-package)
-   [Getting Involved](#getting-involved)
-   [License](#license)

## Quick Start

Install it from [npm](https://www.npmjs.com/package/@observertc/client-monitor-js) package repository.

```
npm i @observertc/client-monitor-js
```

or

```
yarn add @observertc/client-monitor-js
```

Add `@observertc/client-monitor-js` to your WebRTC app.

```javascript
import { createClientMonitor } from "@observertc/client-monitor-js";
const monitor = createClientMonitor();
monitor.sources.addRTCPeerConnection(peerConnection);

monitor.on("stats-collected", () => {
    console.log(`Sending audio bitrate: ${monitor.sendingAudioBitrate}`);
    console.log(`Sending video bitrate: ${monitor.sendingVideoBitrate}`);
    console.log(`Receiving audio bitrate: ${monitor.receivingAudioBitrate}`);
    console.log(`Receiving video bitrate: ${monitor.receivingVideoBitrate}`);
});

monitor.on('freezed-video-track', (trackMonitor) => {
    
});
```

The above example do as follows:

1. Create a client monitor, which collect stats every (by default in every 2s)
2. Setup a source collect stats from a peer connection
3. Register an event handler called after stats are collected and metrics are updated
4. Register an event handler called if a receiving video track has freezed

**NOTE**: `createClientMonitor()` method creates a monitor instance with default configurations.
You can pass a configuration object to the `createClientMonitor(config: ClientMonitorConfig)` method to customize the monitor instance.
See the full list of configurations [here](#configurations).

## Integrations

### Mediasoup

```javascript
import { createClientMonitor } from "@observertc/client-monitor-js";
import mediasoup from "mediaousp-client";

const mediasoupDevice = new mediasoup.Device();
const monitor = createClientMonitor();
const collector = monitor.sources.addMediasoupDevice(mediasoupDevice);
```

**Important Note**: The created collector is hooked to the device's 'newtransport' event and can automatically detect transports created **after** the device has been added. If you create transports before adding the device to the monitor, those previously created transports will not be monitored automatically. You will need to manually add them to the stats collector like this:

```javascript
const myTransport = monitor.sources.addMediasoupTransport(myTransport); // your transport created before the device is added to the monitor
```

## User Manual

For detailed description of configuration and client monitor usage check out the user manual.





## Collected Metrics

Collecting WebRTC Metrics is either done periodically according to the `collectingPeriodInMs` configuration or manually by calling the `monitor.collect()` method. The collected metrics are stored in the `ClientMonitor` instance and assigned to Entries.
Each entry in clientMonitor represents a WebRTC component such as `RTCPeerConnection`, `MediaStreamTrack`, etc. Entries can relate to each other and from one entry you can navigate to a correspondent entry. For example, from an `InboundRTP` entry you can navigate to the correspondent `RemoteOutboundRtp` entry, and reverse. Additionally entries are exposing basic derivatives calculated from the collected metrics.

### Calculated Updates

Calculated updates allow you to observe metrics derived from polled WebRTC stats captured by the library. These calculated updates provide a richer, more nuanced understanding of your application's client-side behavior, offering valuable insights beyond what raw stats metrics can provide.

For example by accessing `storage` you can get the following calculated updates:

```javascript
monitor.on("stats-collected", () => {
    const {
        totalInboundPacketsLost,
        totalInboundPacketsReceived,
        totalOutboundPacketsLost,
        totalOutboundPacketsReceived,
        totalOutboundPacketsSent,
        totalSentAudioBytes,
        totalSentVideoBytes,
        totalReceivedAudioBytes,
        totalReceivedVideoBytes,
        totalDataChannelBytesSent,
        totalDataChannelBytesReceived,

        deltaInboundPacketsLost,
        deltaInboundPacketsReceived,
        deltaOutboundPacketsLost,
        deltaOutboundPacketsReceived,
        deltaOutboundPacketsSent,
        deltaSentAudioBytes,
        deltaSentVideoBytes,
        deltaReceivedAudioBytes,
        deltaReceivedVideoBytes,
        deltaDataChannelBytesSent,
        deltaDataChannelBytesReceived,

        avgRttInS,
        sendingAudioBitrate,
        sendingVideoBitrate,
        receivingAudioBitrate,
        receivingVideoBitrate,

        highestSeenSendingBitrate,
        highestSeenReceivingBitrate,
        highestSeenAvailableOutgoingBitrate,
        highestSeenAvailableIncomingBitrate,
    } = monitor.storage;

    console.log(`Total inbound packets lost: ${totalInboundPacketsLost}`);
    console.log(`Total inbound packets received: ${totalInboundPacketsReceived}`);
    console.log(`Total outbound packets lost: ${totalOutboundPacketsLost}`);
    console.log(`Total outbound packets received: ${totalOutboundPacketsReceived}`);
    console.log(`Total outbound packets sent: ${totalOutboundPacketsSent}`);
    console.log(`Total sent audio bytes: ${totalSentAudioBytes}`);
    console.log(`Total sent video bytes: ${totalSentVideoBytes}`);
    console.log(`Total received audio bytes: ${totalReceivedAudioBytes}`);
    console.log(`Total received video bytes: ${totalReceivedVideoBytes}`);
    console.log(`Total data channel bytes sent: ${totalDataChannelBytesSent}`);
    console.log(`Total data channel bytes received: ${totalDataChannelBytesReceived}`);

    console.log(`Lost Inbound packets since last collecting: ${deltaInboundPacketsLost}`);
    console.log(`Received Inbound packets since last collecting: ${deltaInboundPacketsReceived}`);
    console.log(`Lost Outbound packets since last collecting: ${deltaOutboundPacketsLost}`);
    console.log(`Received Outbound packets since last collecting: ${deltaOutboundPacketsReceived}`);
    console.log(`Sent Outbound packets since last collecting: ${deltaOutboundPacketsSent}`);
    console.log(`Sent audio bytes since last collecting: ${deltaSentAudioBytes}`);
    console.log(`Sent video bytes since last collecting: ${deltaSentVideoBytes}`);
    console.log(`Received audio bytes since last collecting: ${deltaReceivedAudioBytes}`);
    console.log(`Received video bytes since last collecting: ${deltaReceivedVideoBytes}`);
    console.log(`Data channel bytes sent since last collecting: ${deltaDataChannelBytesSent}`);
    console.log(`Data channel bytes received since last collecting: ${deltaDataChannelBytesReceived}`);

    console.log(`Average RTT: ${avgRttInS}`);
    console.log(`Sending audio bitrate: ${sendingAudioBitrate}`);
    console.log(`Sending video bitrate: ${sendingVideoBitrate}`);
    console.log(`Receiving audio bitrate: ${receivingAudioBitrate}`);
    console.log(`Receiving video bitrate: ${receivingVideoBitrate}`);

    console.log(`Highest seen sending bitrate: ${highestSeenSendingBitrate}`);
    console.log(`Highest seen receiving bitrate: ${highestSeenReceivingBitrate}`);
    console.log(`Highest seen available outgoing bitrate: ${highestSeenAvailableOutgoingBitrate}`);
    console.log(`Highest seen available incoming bitrate: ${highestSeenAvailableIncomingBitrate}`);
});
```

As mentioned above, the `ClientMonitor` instance stores entries, and each entry has a `stats` property that contains the raw stats collected from the WebRTC API. The `ClientMonitor` also stores calculated updates for each entry, which are derived from the raw stats. These calculated updates are accessible from the `ClientMonitor` instance and are updated every time the `stats-collected` event is emitted.

### PeerConnection Entry

**Accessing Stats**:

```javascript
// from monitor
monitor.peerConnections.forEach((pc) => console.log(`PeerConnection: ${pc.statsId}`, pc.stats));

// or from storage
[...monitor.storage.peerConnections()].forEach((pc) => console.log(`PeerConnection: ${pc.statsId}`, pc.stats));
```

**Accessing Calculated Updates**:

```javascript
monitor.on("stats-collected", () => {
    for (const pc of monitor.peerConnections) {
        console.log(
            `Between this and last collecting, the following stats were calculated for PeerConnection`,
            [
                `Received bytes through data channel ${pc.deltaDataChannelBytesReceived}`,
                `Sent bytes through data channel ${pc.deltaDataChannelBytesSent}`,
                `Received bytes through inbound rtps ${pc.deltaInboundPacketsReceived}`,
                `Sent bytes through outbound rtps ${pc.deltaOutboundPacketsSent}`,
                `Lost packets on inbound rtps ${pc.deltaInboundPacketsReceived}`,
                `Lost packets on outbound rtps ${pc.deltaOutboundPacketsSent}`,
                `Outbound audio bitrate${pc.sendingAudioBitrate}`,
                `Outbound video bitrate${pc.sendingVideoBitrate}`,
                `Inbound audio bitrate${pc.receivingAudioBitrate}`,
                `Inbound video bitrate${pc.receivingVideoBitrate}`,
                `Received bytes on all audio tracks ${pc.deltaReceivedAudioBytes}`,
                `Received bytes on all video tracks ${pc.deltaReceivedVideoBytes}`,
                `Sent bytes on all audio tracks ${pc.deltaSentAudioBytes}`,
                `Sent bytes on all video tracks ${pc.deltaSentVideoBytes}`,
            ].join("\n")
        );
    }
});
```

**Accessing related entries**:

```javascript
const pc = monitor.getPeerConnectionStats(peerConnectionId);
if (pc) {
    [...pc.inboundRtps()].forEach((inboundRtp) => void 0);
    [...pc.outboundRtps()].forEach((outboundRtp) => void 0);

    [...pc.localCandidates()].forEach((localICECandidate) => void 0);
    [...pc.remoteCandidates()].forEach((remoteICECandidate) => void 0);
    [...pc.iceCandidatePairs()].forEach((iceCandidatePair) => void 0);

    [...pc.sctpTransports()].forEach((sctpTransport) => void 0);
    [...pc.transceivers()].forEach((transceiver) => void 0);
    [...pc.senders()].forEach((sender) => void 0);
    [...pc.receivers()].forEach((receiver) => void 0);
    [...pc.transports()].forEach((transport) => void 0);
    [...pc.certificates()].forEach((certificate) => void 0);
    [...pc.iceServers()].forEach((iceServer) => void 0);
}
```

### MediaStreamTrack Entry

**Collected tracks**:

```javascript
monitor.on("stats-collected", () => {
    for (const track of monitor.tracks) {
        console.log(`Track ${track.trackId} is ${track.kind}`);
    }
});
```

**Accessing Calculated Updates**:

```javascript
monitor.on("stats-collected", () => {
    for (const track of monitor.tracks) {
        if (track?.direction === "outbound") {
            console.log(`Stats belongs to Track ${track.trackId} `);
            console.log(`Lost packets reported by remote endpoint: ${track.remoteLostPackets}`);
            console.log(`Received packets reported by remote endpoint: ${track.remoteReceivedPackets}`);
            console.log(`Sent packets reported by local endpoint: ${track.sentPackets}`);
            console.log(`Sending bitrate ${track.sendingBitrate}`);
            console.log(`Associated sfu stream id: ${track.sfuStreamId}`);
        }

        if (trackStats?.direction === "inbound") {
            console.log(`Stats belongs to Track ${track.trackId} `);
            console.log(`Lost packets reported by local endpoint: ${track.lostPackets}`);
            console.log(`Received packets reported by local endpoint: ${track.receivedPackets}`);
            console.log(`Received bitrate ${track.receivingBitrate}`);
            console.log(`Associated sfu stream id: ${track.sfuStreamId}`);
            console.log(`Associated sfu sink id: ${track.sfuSinkId}`);
        }
    }
});
```

**Accessing related entries**

```javascript
monitor.on("stats-collected", () => {
    for (const track of monitor.tracks) {
        console.log(`Track ${track.trackId} is ${track.kind}`);
        if (track.direction === "outbound") {
            [...track.outboundRtps()].forEach((outboundRtp) => {
                console.log(`Outbound RTP ${outboundRtp.getSsrc()} has ${outboundRtp.sentPackets} sent packets`);
            });
        }

        if (track.direction === "inbound") {
            [...track.inboundRtps()].forEach((inboundRtp) => {
                console.log(`Inbound RTP ${inboundRtp.getSsrc()} has ${inboundRtp.receivedPackets} received packets`);
            });
        }
    }
});
```

### InboundRTP Entry

**Accessing Stats**:

```javascript
monitor.on("stats-collected", () => {
    for (const inboundRtp of monitor.inboundRtps) {
        console.log(`InboundRtp ${inboundRtp.statsId} collected stats`, inboundRtp.stats);
    }
});
```

**Accessing Calculated Updates**:

```javascript
monitor.on("stats-collected", () => {
    for (const inboundRtp of monitor.inboundRtps) {
        console.log(`InboundRtp ${inboundRtp.getSsrc()} `);
        console.log(`Received packets since last collecting: ${inboundRtp.receivedBytes}`);
        console.log(`Received bitrate since last collecting: ${inboundRtp.receivingBitrate}`);
        console.log(`Received packets since last collecting: ${inboundRtp.receivedPackets}`);
        console.log(`Received frames since last collecting: ${inboundRtp.receivedFrames}`);
        console.log(`Lost packets since last collecting: ${inboundRtp.lostPackets}`);
        console.log(`Average jitter buffer delay since last collecting: ${inboundRtp.avgJitterBufferDelayInMs}`);
        console.log(`Average RTT since last collecting: ${inboundRtp.avgRttInS}s`);

        console.log(`Associated sfu stream id: ${inboundRtp.sfuStreamId}`);
        console.log(`Associated sfu sink id: ${inboundRtp.sfuSinkId}`);
    }
});
```

**Accessing related entries**:

```javascript
monitor.on("stats-collected", () => {
    for (const inboundRtp of monitor.inboundRtps) {
        console.log(
            `inbound RTP associated with SSRC ${inboundRtp.getSsrc()} uses codec ${
                inboundRtp.getCodec()?.stats.mimeType
            }`
        );
        console.log(
            `inbound RTP associated with SSRC ${inboundRtp.getSsrc()} remote endpoint sent ${
                inboundRtp.getRemoteOutboundRtp()?.stats.packetsSent
            } packets`
        );

        inboundRtp.kind === "audio" &&
            console.log(
                `inbound RTP associated with SSRC ${inboundRtp.getSsrc()} has played out ${
                    inboundRtp.getAudioPlayout()?.stats.totalSamplesCount
                } audio samples`
            );

        const audioPlayout = inboundRtp.getAudioPlayout(); // The AudioPlayoutEntry associated with the inboundRtp
        const peerConnection = inboundRtp.getPeerConnection(); // The PeerConnectionEntry associated with the inboundRtp
        const trackId = inboundRtp.getTrackId(); // The trackId associated with the inboundRtp
    }
});
```

### OutboundRTP Entry

**Accessing Stats**:

```javascript
monitor.on("stats-collected", () => {
    for (const outboundRtp of monitor.outboundRtps) {
        console.log(`OutboundRtp ${outboundRtp.statsId} collected stats`, outboundRtp.stats);
    }
});
```

**Accessing Calculated Updates**:

```javascript
monitor.on("stats-collected", () => {
    for (const outboundRtp of monitor.outboundRtps) {
        console.log(`OutboundRtp ${outboundRtp.getSsrc()} `);
        console.log(`Sent packets since last collecting: ${outboundRtp.sentPackets}`);
        console.log(`Sending bitrate since last collecting: ${outboundRtp.sendingBitrate}`);
        console.log(`Sent bytes since last collecting: ${outboundRtp.sentBytes}`);
        console.log(`Associated sfu stream id: ${outboundRtp.sfuStreamId}`);
    }
});
```

**Accessing related entries**:

```javascript
monitor.on("stats-collected", () => {
    for (const outboundRtp of monitor.outboundRtps) {
        console.log(
            `outbound RTP associated with SSRC ${outboundRtp.getSsrc()} uses codec ${
                outboundRtp.getCodec()?.stats.mimeType
            }`
        );
        console.log(
            `outbound RTP associated with SSRC ${outboundRtp.getSsrc()} remote endpoint received ${
                outboundRtp.getRemoteInboundRtp()?.stats.packetsReceived
            } packets`
        );

        const remoteInboundRtp = outboundRtp.getRemoteInboundRtp(); // The RemoteInboundRtpEntry associated with the outboundRtp
        const peerConnection = outboundRtp.getPeerConnection(); // The PeerConnectionEntry associated with the outboundRtp
        const trackId = outboundRtp.getTrackId(); // The trackId associated with the outboundRtp
    }
});
```

## Detectors

ClientMonitor can create detectors to detect various issues and anomalies in the collected stats. These detectors are updated when stats are polled, monitoring the stats and setting an alert if certain thresholds are hit. You can create detectors and subscribe to alerts using an instantiated client-monitor-js.

Currently, the following detectors are available in ClientMonitor:

### Congestion Detector

The Congestion Detector identifies congestion issues in media streaming. When congestion is detected, it triggers an event providing insights into the available incoming and outgoing bitrates before and after congestion.

```javascript
const detector = monitor.createCongestionDetector();

detector.on("congestion", (event) => {
    console.log("congestion detected on media streaming");
    console.log("Available incoming bitrate before congestion", event.incomingBitrateBeforeCongestion);
    console.log("Available outgoing bitrate before congestion", event.outgoingBitrateBeforeCongestion);
    console.log("Available incoming bitrate after congestion", event.incomingBitrateAfterCongestion);
    console.log("Available outgoing bitrate after congestion", event.outgoingBitrateAfterCongestion);
});
```

### Audio Desync Detector

```javascript
const detector = monitor.createAudioDesyncDetector();

detector.on("statechanged", (event) => {
    console.log(`Audio is ${event.state} for track ${event.trackId}`);
});
```

#### Audio Desync Detector Configuration

```javascript
const detector = monitor.createAudioDesyncDetector({
    // Indicate if we want to create an issue automatically upon detection.
    // Issues created by the monitor can be caught by monitor.on('issue', (issue) => {}), and
    // automatically added to the sample.
    createIssueOnDetection: {
        severity: "major",
        attachments: {
            // various custom data
        },
    },
    /**
     * The fractional threshold used to determine if the audio desynchronization
     * correction is considered significant or not.
     * It represents the minimum required ratio of corrected samples to total samples.
     * For example, a value of 0.1 means that if the corrected samples ratio
     * exceeds 0.1, it will be considered a significant audio desynchronization issue.
     */
    fractionalCorrectionAlertOnThreshold: 0.1,
    /**
     * The fractional threshold used to determine if the audio desynchronization
     * correction is considered negligible and the alert should be turned off.
     * It represents the maximum allowed ratio of corrected samples to total samples.
     * For example, a value of 0.05 means that if the corrected samples ratio
     * falls below 0.05, the audio desynchronization alert will be turned off.
     */
    fractionalCorrectionAlertOffThreshold: 0.05,
});
```

### CPU Performance Detector

The CPU Performance Detector is designed to monitor and detect issues related to CPU performance that may impact the functionality and efficiency of your application.

```javascript
const detector = monitor.createCpuPerformanceIssueDetector();

detector.on("statechanged", (state) => {
    console.log("CPU limitation state changed", state);
});
```

#### CPU Performance Detector Configuration

```javascript
const detector = monitor.createCpuPerformanceIssueDetector({
    // Indicate if we want to create an issue automatically upon detection.
    // Issues created by the monitor can be caught by monitor.on('issue', (issue) => {}), and
    // automatically added to the sample.
    createIssueOnDetection: {
        severity: "major",
        attachments: {
            // various custom data
        },
    },
});
```

### Video Freeze Detector

```javascript
const detector = monitor.createVideoFreezesDetector();

detector.on("freezedVideoStarted", (event) => {
    console.log("Freezed video started");
    console.log("TrackId", event.trackId);
    console.log("PeerConnectionId", event.peerConnectionId);
    console.log("SSRC:", event.ssrc);
});

detector.on("freezedVideoEnded", (event) => {
    console.log("Freezed video ended");
    console.log("TrackId", event.trackId);
    console.log("Freeze duration in Seconds", event.durationInS);
    console.log("PeerConnectionId", event.peerConnectionId);
    console.log("SSRC:", event.ssrc);
});
```

#### Video Freeze Detector Configuration

```javascript
const detector = monitor.createVideoFreezesDetector({
    // Indicate if we want to create an issue automatically upon detection.
    // Issues created by the monitor can be caught by monitor.on('issue', (issue) => {}), and
    // automatically added to the sample.
    createIssueOnDetection: {
        severity: "major",
        attachments: {
            // various custom data
        },
    },
});
```

### Stucked Inbound Track Detector

The Stucked Inbound Track Detector is designed to identify tracks that are experiencing a complete lack of traffic since their creation. These tracks, termed "stucked inbound tracks," are characterized by the absence of any packet reception from the moment of their creation. In essence, stucked inbound tracks refer to tracks that have not received any data packets since their inception.

```javascript
const detector = monitor.createStuckedInboundTrackDetector();

detector.on("stuckedtrack", (event) => {
    console.log("Stucked inbound track detected");
    console.log("TrackId", event.trackId);
    console.log("PeerConnectionId", event.peerConnectionId);
    console.log("SSRC:", event.ssrc);
});
```

If an inbound track is paused by remote (the outbound track is muted or the it is known that the SFU does not forward traffic),
you can add the trackId to the ignoredTrackIds of this detector to avoid false positive detections.

```javascript
detector.ignoredTrackIds.add(trackId);
```

#### Stucked Inbound Track Detector Configuration

```javascript
const detector = monitor.createStuckedInboundTrackDetector({
    // Indicate if we want to create an issue automatically upon detection.
    // Issues created by the monitor can be caught by monitor.on('issue', (issue) => {}), and
    // automatically added to the sample.
    createIssueOnDetection: {
        severity: "major",
        attachments: {
            // various custom data
        },
    },
    // Minimum duration in milliseconds for a track to be considered stuck
    minStuckedDurationInMs: 5000,
});
```

### Long Peer Connection Establishment Detector

The Long Peer Connection Establishment Detector is designed to identify peer connections that take an unusually long time to establish. This detector is particularly useful for detecting peer connections that are stuck in the process of establishing a connection.

```javascript
const detector = monitor.createLongPeerConnectionEstablishmentDetector();

detector.on("too-long-connection-establishment", (event) => {
    console.log("Long peer connection establishment detected");
    console.log("PeerConnectionId", event.peerConnectionId);
});
```

#### Long Peer Connection Establishment Detector Configuration

```javascript
const detector = monitor.createLongPeerConnectionEstablishmentDetector({
    // Indicate if we want to create an issue automatically upon detection.
    // Issues created by the monitor can be caught by monitor.on('issue', (issue) => {}), and
    // automatically added to the sample.
    createIssueOnDetection: {
        severity: "major",
        attachments: {
            // various custom data
        },
    },
    // Minimum duration in milliseconds for a peer connection to be considered stuck
    thresholdInMs: 5000,
});
```

### Issues

Issues encountered during monitoring sessions are categorized by severity, which can be one of the following values: critical, major, or minor.

When a detector is configured to create an issue upon detection, it automatically adds the issue to the monitor instance once the specified condition is met.

Issues can be added to the monitor instance using the addIssue method. For instance:

```javascript
monitor.addIssue({
    severity: "critical",
    description: "Media device is crashed",
    timestamp: Date.now(),
    attachments: {
        clientId,
        reason,
    },
});
```

Furthermore, events related to issues are dispatched through the monitor. For example:

```javascript
monitor.on("issue", (issue) => {
    console.log("An issue is detected", issue);
});
```

Each issue detected is included in the subsequent sample created by the monitor, provided that `samplingTick > 0` in the monitor configuration.

Additionally, each detector can be configured to automatically create an issue upon detection. For instance:

```javascript
const detector = monitor.createCongestionDetector({
    createIssueOnDetection: {
        severity: "major",
        attachments: {
            // various custom data
        },
    },
});
```

## Configurations

```javascript
const config = {
    /**
     * By setting it, the monitor calls the added statsCollectors periodically
     * and pulls the stats.
     *
     * DEFAULT: 2000
     */
    collectingPeriodInMs: 2000,

    /**
     * By setting this, the monitor makes samples after n number or collected stats.
     *
     * For example if the value is 10, the observer makes a sample after 10 collected stats (in every 10 collectingPeriodInMs).
     * if the value is less or equal than 0
     *
     * DEFAULT: 3
     */
    samplingTick: 3,

    /**
     * By setting this to true monitor will
     *
     * DEFAULT: 0
     */
    integrateNavigatorMediaDevices: true,
    /**
     * If true, the monitor creates a CLIENT_JOINED event when the monitor is created.
     *
     * additionally you can add attachments to the join event by setting it to:
     * {
     *   attachments: {
     *     my_custom_id: 'customId',
     *   }
     * }
     *
     * DEFAULT: true
     */
    createClientJoinedEvent: true
    /**
     * Configuration for detecting issues.
     *
     * By default, all detectors are enabled.
     */
    detectIssues: {
        /**
         * Configuration for detecting congestion issues.
         *
         * DEFAULT: 'major'
         */
        congestion: 'major',

        /**
         * Configuration for detecting audio desynchronization issues.
         */
        audioDesync: 'minor',

        /**
         * Configuration for detecting frozen video issues.
         */
        freezedVideo: 'minor',

        /**
         * Configuration for detecting CPU limitation issues.
         */
        cpuLimitation: 'major',

        /**
         * Configuration for detecting stucked inbound track issues.
         */
        stuckedInboundTrack: 'major',

        /**
         * Configuration for detecting long peer connection establishment issues.
         */
        longPcConnectionEstablishment: 'major',
    }
};
```

## Events

In the context of our monitoring library, events play a crucial role in enabling real-time insights and interactions. These events are emitted by the monitor to signal various occurrences, such as the creation of a peer connection, media track, or ICE connections. Below, we detail the events detected by the monitor.

-   `CLIENT_JOINED`: A client has joined
-   `CLIENT_LEFT`: A client has left
-   `PEER_CONNECTION_OPENED`: A peer connection is opened
-   `PEER_CONNECTION_CLOSED`: A peer connection is closed
-   `MEDIA_TRACK_ADDED`: A media track is added
-   `MEDIA_TRACK_REMOVED`: A media track is removed
-   `MEDIA_TRACK_MUTED`: A media track is muted
-   `MEDIA_TRACK_UNMUTED`: A media track is unmuted
-   `ICE_GATHERING_STATE_CHANGED`: The ICE gathering state has changed
-   `PEER_CONNECTION_STATE_CHANGED`: The peer connection state has changed
-   `ICE_CONNECTION_STATE_CHANGED`: The ICE connection state has changed
-   `DATA_CHANNEL_OPEN`: A data channel is opened
-   `DATA_CHANNEL_CLOSED`: A data channel is closed
-   `DATA_CHANNEL_ERROR`: A data channel error occurred

For Mediasoup integration the following events are detected:

-   `PRODUCER_ADDED`: A producer is added
-   `PRODUCER_REMOVED`: A producer is removed
-   `PRODUCER_PAUSED`: A producer is paused
-   `PRODUCER_RESUMED`: A producer is resumed
-   `CONSUMER_ADDED`: A consumer is added
-   `CONSUMER_REMOVED`: A consumer is removed
-   `CONSUMER_PAUSED`: A consumer is paused
-   `CONSUMER_RESUMED`: A consumer is resumed
-   `DATA_PRODUCER_ADDED`: A data producer is added
-   `DATA_PRODUCER_REMOVED`: A data producer is removed
-   `DATA_CONSUMER_ADDED`: A data consumer is added
-   `DATA_CONSUMER_REMOVED`: A data consumer is removed

### CLIENT_JOINED Event

A client event is automatically generated when the first sample is created, and
the joined timestamp is set to the time of the monitor creation. However, you can
manually set the event by calling the `monitor.join()` method.

**Important Note**: The `monitor.join()` method is called only once, and in case of manual setup it should be called before the first sample is created.

```javascript
monitor.join({
    timestamp: Date.now(),
});
```

### CLIENT_LEFT Event

A client event is automatically generated when the monitor is closed, and the left timestamp is set to the time of the monitor closing. However, you can manually set the event by calling the `monitor.leave()` method.

**Important Note**: The `monitor.leave()` method is called only once, and in case of manual setup it should be called before the monitor is closed.

```javascript
monitor.leave({
    timestamp: Date.now(),
});
```

### Custom Call Event

You can create a custom event by calling the `monitor.addCustomCallEvent()` method. The method takes an object with the following properties:

```javascript
monitor.addCustomCallEvent({
    name: "MY CUSTOM EVENT", // mandatory

    message: "my custom message", // optional;
    attachments: JSON.stringify({
        value: "my custom value",
    }), // optional
    timestamp: Date.now(), // optional
    value: `simple string value`, // optional
    peerConnectionId: "peer-connection-id", // optional;
    mediaTrackId: "media-track-id", // optional;
});
```

### Extension Stats Event

You can create an extension state event by calling the `monitor.addExtensionStats()` method. The method takes an object with the following properties:

```javascript
monitor.addExtensionStats({
    type: "CLIENT_CPU_STATS",
    payload: {
        cpuUsage: 0.5,
        memoryUsage: 0.3,
    },
});
```

As a rule of thumb for when to use `addCustomCallEvent` and `addExtensionStateEvent`:

-   Use `addCustomCallEvent` for events that are related to the call itself, such as user clicked a button.
-   Use `addExtensionStats` for events that are related to the client's environment, such as CPU usage and collected periodically.

## Sampling

The monitor generates samples by invoking the `monitor.sample()` method. The monitor will automatically call the `sample()` method unless `samplingTick` is set to a value less than or equal to 0. The ClientMonitor creates a `ClientSample`, a compound object that contains all observed stats and created events. The ClientSample object is emitted, and an event listener can listen to it by subscribing to the `sample-created` event:

```javascript
monitor.on("sample-created", ({ clientSample, elapsedSinceLastSampleInMs }) => {
    console.log("The created client sample is:", clientSample);
    console.log("Elapsed time in milliseconds since the last sample was created:", elapsedSinceLastSampleInMs);
});
```

The ClientSample can be forwarded to a backend service, where the samples can be further processed (e.g., saved into a database or used for anomaly detection). To facilitate this, we have developed the [observer-js](https://github.com/ObserveRTC/observer-js) library, which you can use to process the samples.

## NPM package

https://www.npmjs.com/package/@observertc/client-monitor-js

## API docs

https://observertc.org/docs/api/client-monitor-js-v2/

## Schemas

https://github.com/observertc/schemas

## Getting Involved

Client-monitor is made with the intention to provide an open-source monitoring solution for
WebRTC developers. If you are interested in getting involved
please read our [contribution](CONTRIBUTING.md) guideline.

## License

Apache-2.0
