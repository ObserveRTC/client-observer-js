## 3.11.0

* Added `durationOfCollectingStatsInMs` to the `stats-collected` event.
* Set the default sensitivity for `CongestionDetector` to `medium`.
* Changed the default value for `fractionalCorrectionAlertOnThreshold` to 0.3 in `AudioDesyncDetector`.
* Changed the default value for `fractionalCorrectionAlertOffThreshold` to 0.15 in `AudioDesyncDetector`.
* Added `FpsVolatilityModule` to the CPU Performance Detector.
* Added `StatsCollectingSkewModule` to the CPU Performance Detector.
* Made Mediasoup stats collector compatible with version 3.7.16.
* Renamed `Mediasoup[*]Surrogate` interfaces to `MediasoupStatsCollector[*]Interface`.
* Exposed the `MediasoupStatsCollectorDeviceInterface` interface.
* Fixed `ewmaRttInS` calculation in `PeerConnectionStatsCollector`.
* Added `LayersChangedDetector` for experimental purposes.
* Added `pcConnectionState` to the `PEER_CONNECTION_STATE_CHANGED` event.
* Added `fpsVolatility` as a property to `inboundRtpEntry`.

## 3.0.0

### Conceptual changes

Rewritten ClientMonitor extends EventEmitter.

## 2.3.0
 * refactored collectors and sampler
 * `clientMontior.os` is moved to `clientMonitor.meta.operationSystem`
 * `clientMontior.engine` is moved to `clientMonitor.meta.engine`
 * `clientMontior.browser` is moved to `clientMonitor.meta.browser`
 * `clientMontior.audioInputs` is moved to `clientMonitor.meta.audioInputs`
 * `clientMontior.audioOutputs` is moved to `clientMonitor.meta.audioOutputs`
 * `clientMontior.videoInputs` is moved to `clientMonitor.meta.videoInputs`
 * `clientMonitor.alerts` is removed, `clientMonitor.audioDesyncDetector`, `clientMonitor.cpuPerformanceDetector`, and `clientMonitor.congestionDetector`
 * all `updates` fields in storage entries are moved to the entries of the `storage`
 * `metrics` field is removed `elapsedSinceLastCollectInMs` and `elapsedSinceLastSampleInMs` is added to the `stats-collected`, and `sample-created` events
 * refactored mediasoup-collector
 * add events are collected automatically 
 * simplified configuration, and detectors configurations are moved to create detectors




## 2.1.0
 * Remove dependency @observertc/samples-schema
 * Add Samples and W3cStats to the source under the `./src/schema` library

## 2.0.0

### Conceptual changes

 * The ClientMonitor is no longer responsible for WebSocket connections, signaling, and transports.
 * The ClientMonitor has become responsible for the following event emissions:
	- PEER_CONNECTION_OPENED, PEER_CONNECTION_CLOSED
	- MEDIA_TRACK_ADDED, MEDIA_TRACK_REMOVED
	- ICE_CONNECTION_STATE_CHANGED
 * Specific collectors can add additional call events. For example, mediasoup adds PRODUCER_PAUSED, PRODUCER_RESUMED, CONSUMER_PAUSED, CONSUMER_RESUMED events.
 * ClientMonitor calculate derived metrics such as sending, and receiving bitrates, total sent and received packets.
 

### Major Code changes

 * Removed Sender component and corresponding configuration from ClientMonitor.
 * Removed Transport component, as sending and transporting no longer fall under the responsibility of the ClientMonitor.
 * Storage StatsEntries `id` is renamed to `statsId`.
 * PeerConnectionEntry `collectorId` is renamed to `id`, and `collectorLabel` to `label`.
 * Removed `setUserId`, `setCallId`, `setClientId`, `setRoomId`, and `marker` from ClientMonitor, as this information should be used for context creation on the server side, which falls under the responsibility of signaling.
 * Removed `events` field from ClientMonitor, as events have become part of the ClientMonitor itself, and ClientMonitor now provides `on`, `off`, `once` interfaces for events.

### Functionality changes

 * Stats are removed based on visited ids in getStats. If a stat is no longer present in the getStats extracted result, it is removed from the Storage.

### Configuration changes

 * Sampler configuration is reduced.
 * Sender configuration is removed.
 * `statsExpirationTimeInMs` is removed.
 * `createCallEvents` is added.




## 1.3.2
 * Change hash function to makeStamp and stop using sha256 as it turned out to be performance intensive

## 1.3.1
 * Change visibility of MediasoupStatsCollector `addTransport` method to be public
 * make imported schema version to be 2.2.0 instead of the last snapshot

## 1.3.0
 * Change the concept of add and removing stats collectors responsible from the clientMonitor to the Collectors
 * Make warn log instead of throwing exception In case a provided callId is invalid 
 * Make callId to be set only once per session
 * Add mediasoup integration
 * Add setter for clientId, and roomId
 * Move addStatsCollector to a new objects called Collectors
 * Add MediasoupStatsCollector, PeerConnectionStatsCollector
 * bugfix timer
 * add event dispatched when client is connected to an observer
 * Add rawstats emitted for onStatsSamples event
 * Add last stats change timestamp to metrics
 * Add Mediasoup hack for trackIdentifier for firefox

## 1.2.0
 * Make timer tick based instead of calculated next delays
 * Be able to collect samples if sender is not available
 * add maxSamples config option to accumulator

## 1.1.0
 * Fix continous media source meta sending due to constantly changing `audioLevel`
 * add ice-candidate-pairs according to schema changes in 2.1.0^
 * align peer-connection-transport changes according to schema changes in 2.1.0^
 * make id navigational alterations in PeerConnectionImpl related to the webrtc schema changes
 * run prettier

## 1.0.1

 * Add validation for extension stats to check if the given payload is a valid json string or not.

## 1.0.0

Init
