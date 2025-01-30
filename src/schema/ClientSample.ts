
export const schemaVersion = "3.0.0";

/**
* The WebRTC app provided custom stats payload
*/
export type ExtensionStat = {
	/**
	* The type of the extension stats the custom app provides
	*/
	type: string;

	/**
	* The payload of the extension stats the custom app provides
	*/
	payload?: string;

}

/**
* A list of additional client events.
*/
export type ClientMetaData = {
	/**
	* The name of the event used as an identifier (e.g., MEDIA_TRACK_MUTED, USER_REJOINED, etc.).
	*/
	type: string;

	/**
	* The value associated with the event, if applicable.
	*/
	payload?: string;

	/**
	* The unique identifier of the peer connection for which the event was generated.
	*/
	peerConnectionId?: string;

	/**
	* The identifier of the media track related to the event, if applicable.
	*/
	trackId?: string;

	/**
	* The SSRC (Synchronization Source) identifier associated with the event, if applicable.
	*/
	ssrc?: number;

	/**
	* The timestamp in epoch format when the event was generated.
	*/
	timestamp?: number;

}

/**
* A list of client issues.
*/
export type ClientIssue = {
	/**
	* The name of the issue
	*/
	type: string;

	/**
	* The value associated with the event, if applicable.
	*/
	payload?: string;

	/**
	* The timestamp in epoch format when the event was generated.
	*/
	timestamp?: number;

}

/**
* A list of client events.
*/
export type ClientEvent = {
	/**
	* The name of the event used as an identifier (e.g., MEDIA_TRACK_MUTED, USER_REJOINED, etc.).
	*/
	type: string;

	/**
	* The value associated with the event, if applicable.
	*/
	payload?: string;

	/**
	* The timestamp in epoch format when the event was generated.
	*/
	timestamp?: number;

}

/**
* Certificates
*/
export type CertificateStats = {
	/**
	* The timestamp of the stat.
	*/
	timestamp: number;

	/**
	* A unique identifier for the stat.
	*/
	id: string;

	/**
	* The fingerprint of the certificate.
	*/
	fingerprint?: string;

	/**
	* The algorithm used for the fingerprint (e.g., 'SHA-256').
	*/
	fingerprintAlgorithm?: string;

	/**
	* The certificate encoded in base64 format.
	*/
	base64Certificate?: string;

	/**
	* The certificate ID of the issuer (nullable).
	*/
	issuerCertificateId?: string;

	/**
	* Additional information attached to this stats
	*/
	attachments?: Record<string, unknown>;

}

/**
* ICE Candidate Pair Stats
*/
export type IceCandidatePairStats = {
	/**
	* The unique identifier for this RTCStats object.
	*/
	id: string;

	/**
	* The timestamp of when the stats were recorded, in seconds.
	*/
	timestamp: number;

	/**
	* The transport id of the connection this candidate pair belongs to.
	*/
	transportId?: string;

	/**
	* The ID of the local ICE candidate in this pair.
	*/
	localCandidateId?: string;

	/**
	* The ID of the remote ICE candidate in this pair.
	*/
	remoteCandidateId?: string;

	state?: "new" | "inProgress" | "failed" | "succeeded";
	/**
	* Whether this candidate pair has been nominated.
	*/
	nominated?: boolean;

	/**
	* The number of packets sent using this candidate pair.
	*/
	packetsSent?: number;

	/**
	* The number of packets received using this candidate pair.
	*/
	packetsReceived?: number;

	/**
	* The total number of bytes sent using this candidate pair.
	*/
	bytesSent?: number;

	/**
	* The total number of bytes received using this candidate pair.
	*/
	bytesReceived?: number;

	/**
	* The timestamp of the last packet sent using this candidate pair.
	*/
	lastPacketSentTimestamp?: number;

	/**
	* The timestamp of the last packet received using this candidate pair.
	*/
	lastPacketReceivedTimestamp?: number;

	/**
	* The total round trip time (RTT) for this candidate pair in seconds.
	*/
	totalRoundTripTime?: number;

	/**
	* The current round trip time (RTT) for this candidate pair in seconds.
	*/
	currentRoundTripTime?: number;

	/**
	* The available outgoing bitrate (in bits per second) for this candidate pair.
	*/
	availableOutgoingBitrate?: number;

	/**
	* The available incoming bitrate (in bits per second) for this candidate pair.
	*/
	availableIncomingBitrate?: number;

	/**
	* The number of ICE connection requests received by this candidate pair.
	*/
	requestsReceived?: number;

	/**
	* The number of ICE connection requests sent by this candidate pair.
	*/
	requestsSent?: number;

	/**
	* The number of ICE connection responses received by this candidate pair.
	*/
	responsesReceived?: number;

	/**
	* The number of ICE connection responses sent by this candidate pair.
	*/
	responsesSent?: number;

	/**
	* The number of ICE connection consent requests sent by this candidate pair.
	*/
	consentRequestsSent?: number;

	/**
	* The number of packets discarded while attempting to send via this candidate pair.
	*/
	packetsDiscardedOnSend?: number;

	/**
	* The total number of bytes discarded while attempting to send via this candidate pair.
	*/
	bytesDiscardedOnSend?: number;

	/**
	* Additional information attached to this stats
	*/
	attachments?: Record<string, unknown>;

}

/**
* ICE Candidate Stats
*/
export type IceCandidateStats = {
	/**
	* The timestamp of the stat.
	*/
	timestamp: number;

	/**
	* A unique identifier for the stat.
	*/
	id: string;

	/**
	* The transport ID associated with the ICE candidate.
	*/
	transportId?: string;

	/**
	* The IP address of the ICE candidate (nullable).
	*/
	address?: string;

	/**
	* The port number of the ICE candidate.
	*/
	port?: number;

	/**
	* The transport protocol used by the candidate (e.g., 'udp', 'tcp').
	*/
	protocol?: string;

	/**
	* The type of the ICE candidate (e.g., 'host', 'srflx', 'relay').
	*/
	candidateType?: string;

	/**
	* The priority of the ICE candidate.
	*/
	priority?: number;

	/**
	* The URL of the ICE candidate.
	*/
	url?: string;

	/**
	* The protocol used for the relay (e.g., 'tcp', 'udp').
	*/
	relayProtocol?: string;

	/**
	* A string representing the foundation for the ICE candidate.
	*/
	foundation?: string;

	/**
	* The related address for the ICE candidate (if any).
	*/
	relatedAddress?: string;

	/**
	* The related port for the ICE candidate (if any).
	*/
	relatedPort?: number;

	/**
	* The username fragment for the ICE candidate.
	*/
	usernameFragment?: string;

	/**
	* The TCP type of the ICE candidate (e.g., 'active', 'passive').
	*/
	tcpType?: string;

	/**
	* Additional information attached to this stats
	*/
	attachments?: Record<string, unknown>;

}

/**
* ICE Transport Stats
*/
export type IceTransportStats = {
	/**
	* The timestamp of the stat.
	*/
	timestamp: number;

	/**
	* A unique identifier for the stat.
	*/
	id: string;

	/**
	* The number of packets sent.
	*/
	packetsSent?: number;

	/**
	* The number of packets received.
	*/
	packetsReceived?: number;

	/**
	* The number of bytes sent.
	*/
	bytesSent?: number;

	/**
	* The number of bytes received.
	*/
	bytesReceived?: number;

	/**
	* The ICE role (e.g., 'controlling', 'controlled').
	*/
	iceRole?: string;

	/**
	* The local username fragment for ICE.
	*/
	iceLocalUsernameFragment?: string;

	/**
	* The DTLS transport state (e.g., 'new', 'connecting', 'connected').
	*/
	dtlsState?: string;

	/**
	* The ICE transport state (e.g., 'new', 'checking', 'connected').
	*/
	iceState?: string;

	/**
	* The ID of the selected ICE candidate pair.
	*/
	selectedCandidatePairId?: string;

	/**
	* The ID of the local certificate.
	*/
	localCertificateId?: string;

	/**
	* The ID of the remote certificate.
	*/
	remoteCertificateId?: string;

	/**
	* The TLS version used for encryption.
	*/
	tlsVersion?: string;

	/**
	* The DTLS cipher suite used.
	*/
	dtlsCipher?: string;

	/**
	* The role in the DTLS handshake (e.g., 'client', 'server').
	*/
	dtlsRole?: string;

	/**
	* The SRTP cipher used for encryption.
	*/
	srtpCipher?: string;

	/**
	* The number of changes to the selected ICE candidate pair.
	*/
	selectedCandidatePairChanges?: number;

	/**
	* Additional information attached to this stats
	*/
	attachments?: Record<string, unknown>;

}

/**
* Data Channels Stats
*/
export type DataChannelStats = {
	/**
	* The timestamp of the stat.
	*/
	timestamp: number;

	/**
	* A unique identifier for the stat.
	*/
	id: string;

	/**
	* The label of the data channel.
	*/
	label?: string;

	/**
	* The protocol of the data channel.
	*/
	protocol?: string;

	/**
	* The identifier for the data channel.
	*/
	dataChannelIdentifier?: number;

	/**
	* The state of the data channel (e.g., 'open', 'closed').
	*/
	state?: string;

	/**
	* The number of messages sent on the data channel.
	*/
	messagesSent?: number;

	/**
	* The number of bytes sent on the data channel.
	*/
	bytesSent?: number;

	/**
	* The number of messages received on the data channel.
	*/
	messagesReceived?: number;

	/**
	* The number of bytes received on the data channel.
	*/
	bytesReceived?: number;

	/**
	* Additional information attached to this stats
	*/
	attachments?: Record<string, unknown>;

}

/**
* PeerConnection Transport Stats
*/
export type PeerConnectionTransportStats = {
	/**
	* The timestamp of the stat.
	*/
	timestamp: number;

	/**
	* A unique identifier for the stat.
	*/
	id: string;

	/**
	* The number of data channels opened.
	*/
	dataChannelsOpened?: number;

	/**
	* The number of data channels closed.
	*/
	dataChannelsClosed?: number;

	/**
	* Additional information attached to this stats
	*/
	attachments?: Record<string, unknown>;

}

/**
* Media Playout Stats
*/
export type MediaPlayoutStats = {
	/**
	* The timestamp of the stat.
	*/
	timestamp: number;

	/**
	* A unique identifier for the stat.
	*/
	id: string;

	/**
	* The kind of media (audio/video).
	*/
	kind: string;

	/**
	* The duration of synthesized audio samples.
	*/
	synthesizedSamplesDuration?: number;

	/**
	* The number of synthesized audio samples events.
	*/
	synthesizedSamplesEvents?: number;

	/**
	* The total duration of all audio samples.
	*/
	totalSamplesDuration?: number;

	/**
	* The total delay experienced during audio playout.
	*/
	totalPlayoutDelay?: number;

	/**
	* The total count of audio samples.
	*/
	totalSamplesCount?: number;

	/**
	* Additional information attached to this stats
	*/
	attachments?: Record<string, unknown>;

}

/**
* Audio Source Stats
*/
export type MediaSourceStats = {
	/**
	* The timestamp of the stat.
	*/
	timestamp: number;

	/**
	* A unique identifier for the stat.
	*/
	id: string;

	/**
	* The type of media ('audio' or 'video').
	*/
	kind: string;

	/**
	* The identifier of the media track.
	*/
	trackIdentifier?: string;

	/**
	* The current audio level.
	*/
	audioLevel?: number;

	/**
	* The total audio energy.
	*/
	totalAudioEnergy?: number;

	/**
	* The total duration of audio samples.
	*/
	totalSamplesDuration?: number;

	/**
	* The echo return loss.
	*/
	echoReturnLoss?: number;

	/**
	* The enhancement of echo return loss.
	*/
	echoReturnLossEnhancement?: number;

	/**
	* The width of the video.
	*/
	width?: number;

	/**
	* The height of the video.
	*/
	height?: number;

	/**
	* The total number of frames.
	*/
	frames?: number;

	/**
	* The frames per second of the video.
	*/
	framesPerSecond?: number;

	/**
	* Additional information attached to this stats
	*/
	attachments?: Record<string, unknown>;

}

/**
* Remote Outbound RTPs
*/
export type RemoteOutboundRtpStats = {
	/**
	* The timestamp for this stats object in DOMHighResTimeStamp format.
	*/
	timestamp: number;

	/**
	* The unique identifier for this stats object.
	*/
	id: string;

	/**
	* The SSRC identifier of the RTP stream.
	*/
	ssrc: number;

	/**
	* The type of media ('audio' or 'video').
	*/
	kind: string;

	/**
	* The ID of the transport used for this stream.
	*/
	transportId?: string;

	/**
	* The ID of the codec used for this stream.
	*/
	codecId?: string;

	/**
	* The total number of packets sent on this stream.
	*/
	packetsSent?: number;

	/**
	* The total number of bytes sent on this stream.
	*/
	bytesSent?: number;

	/**
	* The ID of the local object corresponding to this stream.
	*/
	localId?: string;

	/**
	* The remote timestamp for this stats object in DOMHighResTimeStamp format.
	*/
	remoteTimestamp?: number;

	/**
	* The total number of reports sent on this stream.
	*/
	reportsSent?: number;

	/**
	* The current estimated round-trip time for this stream in seconds.
	*/
	roundTripTime?: number;

	/**
	* The total round-trip time for this stream in seconds.
	*/
	totalRoundTripTime?: number;

	/**
	* The total number of round-trip time measurements for this stream.
	*/
	roundTripTimeMeasurements?: number;

	/**
	* Additional information attached to this stats
	*/
	attachments?: Record<string, unknown>;

}

/**
* The duration of quality limitation reasons categorized by type.
*/
export type QualityLimitationDurations = {
	/**
	* Duration of no quality limitation in seconds.
	*/
	none: number;

	/**
	* Duration of CPU-based quality limitation in seconds.
	*/
	cpu: number;

	/**
	* Duration of bandwidth-based quality limitation in seconds.
	*/
	bandwidth: number;

	/**
	* Duration of other quality limitation reasons in seconds.
	*/
	other: number;

}

/**
* Outbound RTPs
*/
export type OutboundRtpStats = {
	/**
	* The timestamp for this stats object in DOMHighResTimeStamp format.
	*/
	timestamp: number;

	/**
	* The unique identifier for this stats object.
	*/
	id: string;

	/**
	* The SSRC identifier of the RTP stream.
	*/
	ssrc: number;

	/**
	* The type of media ('audio' or 'video').
	*/
	kind: string;

	/**
	* The ID of the transport used for this stream.
	*/
	transportId?: string;

	/**
	* The ID of the codec used for this stream.
	*/
	codecId?: string;

	/**
	* The total number of packets sent on this stream.
	*/
	packetsSent?: number;

	/**
	* The total number of bytes sent on this stream.
	*/
	bytesSent?: number;

	/**
	* The media ID associated with this RTP stream.
	*/
	mid?: string;

	/**
	* The ID of the media source associated with this stream.
	*/
	mediaSourceId?: string;

	/**
	* The ID of the remote object corresponding to this stream.
	*/
	remoteId?: string;

	/**
	* The RID value of the RTP stream.
	*/
	rid?: string;

	/**
	* The total number of header bytes sent on this stream.
	*/
	headerBytesSent?: number;

	/**
	* The number of retransmitted packets sent on this stream.
	*/
	retransmittedPacketsSent?: number;

	/**
	* The number of retransmitted bytes sent on this stream.
	*/
	retransmittedBytesSent?: number;

	/**
	* The SSRC for the RTX stream, if applicable.
	*/
	rtxSsrc?: number;

	/**
	* The target bitrate for this RTP stream in bits per second.
	*/
	targetBitrate?: number;

	/**
	* The total target encoded bytes for this stream.
	*/
	totalEncodedBytesTarget?: number;

	/**
	* The width of the frames sent in pixels.
	*/
	frameWidth?: number;

	/**
	* The height of the frames sent in pixels.
	*/
	frameHeight?: number;

	/**
	* The number of frames sent per second.
	*/
	framesPerSecond?: number;

	/**
	* The total number of frames sent on this stream.
	*/
	framesSent?: number;

	/**
	* The total number of huge frames sent on this stream.
	*/
	hugeFramesSent?: number;

	/**
	* The total number of frames encoded on this stream.
	*/
	framesEncoded?: number;

	/**
	* The total number of key frames encoded on this stream.
	*/
	keyFramesEncoded?: number;

	/**
	* The sum of QP values for all frames encoded on this stream.
	*/
	qpSum?: number;

	/**
	* The total time spent encoding frames on this stream in seconds.
	*/
	totalEncodeTime?: number;

	/**
	* The total delay for packets sent on this stream in seconds.
	*/
	totalPacketSendDelay?: number;

	/**
	* The reason for any quality limitation on this stream.
	*/
	qualityLimitationReason?: string;

	/**
	* The number of resolution changes due to quality limitations.
	*/
	qualityLimitationResolutionChanges?: number;

	/**
	* The total number of NACK packets sent on this stream.
	*/
	nackCount?: number;

	/**
	* The total number of FIR packets sent on this stream.
	*/
	firCount?: number;

	/**
	* The total number of PLI packets sent on this stream.
	*/
	pliCount?: number;

	/**
	* The implementation of the encoder used for this stream.
	*/
	encoderImplementation?: string;

	/**
	* Indicates whether the encoder is power efficient.
	*/
	powerEfficientEncoder?: boolean;

	/**
	* Indicates whether this stream is actively sending data.
	*/
	active?: boolean;

	/**
	* The scalability mode of the encoder used for this stream.
	*/
	scalabilityMode?: string;

	/**
	* The duration of quality limitation reasons categorized by type.
	*/
	qualityLimitationDurations?: QualityLimitationDurations;

	/**
	* Additional information attached to this stats.
	*/
	attachments?: Record<string, unknown>;

}

/**
* Remote Inbound RTPs
*/
export type RemoteInboundRtpStats = {
	/**
	* The timestamp for this stats object in DOMHighResTimeStamp format.
	*/
	timestamp: number;

	/**
	* The unique identifier for this stats object.
	*/
	id: string;

	/**
	* The SSRC identifier of the RTP stream.
	*/
	ssrc: number;

	/**
	* The type of media ('audio' or 'video').
	*/
	kind: string;

	/**
	* The ID of the transport used for this stream.
	*/
	transportId?: string;

	/**
	* The ID of the codec used for this stream.
	*/
	codecId?: string;

	/**
	* The total number of packets received on this stream.
	*/
	packetsReceived?: number;

	/**
	* The total number of packets lost on this stream.
	*/
	packetsLost?: number;

	/**
	* The jitter value for this stream in seconds.
	*/
	jitter?: number;

	/**
	* The ID of the local object corresponding to this remote stream.
	*/
	localId?: string;

	/**
	* The most recent RTT measurement for this stream in seconds.
	*/
	roundTripTime?: number;

	/**
	* The cumulative RTT for all packets on this stream in seconds.
	*/
	totalRoundTripTime?: number;

	/**
	* The fraction of packets lost on this stream, calculated over a time interval.
	*/
	fractionLost?: number;

	/**
	* The total number of RTT measurements for this stream.
	*/
	roundTripTimeMeasurements?: number;

	/**
	* Additional information attached to this stats
	*/
	attachments?: Record<string, unknown>;

}

/**
* Inbound RTPs
*/
export type InboundRtpStats = {
	/**
	* The time the stats were collected, in high-resolution time.
	*/
	timestamp: number;

	/**
	* Unique identifier of the stats object.
	*/
	id: string;

	/**
	* Synchronization source identifier of the RTP stream.
	*/
	ssrc: number;

	/**
	* Kind of the media (e.g., 'audio' or 'video').
	*/
	kind: string;

	/**
	* Identifier for the media track associated with the RTP stream.
	*/
	trackIdentifier: string;

	/**
	* ID of the transport associated with the RTP stream.
	*/
	transportId?: string;

	/**
	* ID of the codec used for the RTP stream.
	*/
	codecId?: string;

	/**
	* Number of packets received on the RTP stream.
	*/
	packetsReceived?: number;

	/**
	* Number of packets lost on the RTP stream.
	*/
	packetsLost?: number;

	/**
	* Jitter of the RTP stream in seconds.
	*/
	jitter?: number;

	/**
	* The MediaStream ID of the RTP stream.
	*/
	mid?: string;

	/**
	* Remote stats object ID associated with the RTP stream.
	*/
	remoteId?: string;

	/**
	* Number of frames decoded.
	*/
	framesDecoded?: number;

	/**
	* Number of keyframes decoded.
	*/
	keyFramesDecoded?: number;

	/**
	* Number of frames rendered.
	*/
	framesRendered?: number;

	/**
	* Number of frames dropped.
	*/
	framesDropped?: number;

	/**
	* Width of the decoded video frames.
	*/
	frameWidth?: number;

	/**
	* Height of the decoded video frames.
	*/
	frameHeight?: number;

	/**
	* Frame rate in frames per second.
	*/
	framesPerSecond?: number;

	/**
	* Sum of the Quantization Parameter values for decoded frames.
	*/
	qpSum?: number;

	/**
	* Total time spent decoding in seconds.
	*/
	totalDecodeTime?: number;

	/**
	* Sum of inter-frame delays in seconds.
	*/
	totalInterFrameDelay?: number;

	/**
	* Sum of squared inter-frame delays in seconds.
	*/
	totalSquaredInterFrameDelay?: number;

	/**
	* Number of times playback was paused.
	*/
	pauseCount?: number;

	/**
	* Total duration of pauses in seconds.
	*/
	totalPausesDuration?: number;

	/**
	* Number of times playback was frozen.
	*/
	freezeCount?: number;

	/**
	* Total duration of freezes in seconds.
	*/
	totalFreezesDuration?: number;

	/**
	* Timestamp of the last packet received.
	*/
	lastPacketReceivedTimestamp?: number;

	/**
	* Total header bytes received.
	*/
	headerBytesReceived?: number;

	/**
	* Total packets discarded.
	*/
	packetsDiscarded?: number;

	/**
	* Total bytes received from FEC.
	*/
	fecBytesReceived?: number;

	/**
	* Total packets received from FEC.
	*/
	fecPacketsReceived?: number;

	/**
	* Total FEC packets discarded.
	*/
	fecPacketsDiscarded?: number;

	/**
	* Total bytes received on the RTP stream.
	*/
	bytesReceived?: number;

	/**
	* Number of NACKs sent.
	*/
	nackCount?: number;

	/**
	* Number of Full Intra Requests sent.
	*/
	firCount?: number;

	/**
	* Number of Picture Loss Indications sent.
	*/
	pliCount?: number;

	/**
	* Total processing delay in seconds.
	*/
	totalProcessingDelay?: number;

	/**
	* Estimated timestamp of playout.
	*/
	estimatedPlayoutTimestamp?: number;

	/**
	* Total jitter buffer delay in seconds.
	*/
	jitterBufferDelay?: number;

	/**
	* Target delay for the jitter buffer in seconds.
	*/
	jitterBufferTargetDelay?: number;

	/**
	* Number of packets emitted from the jitter buffer.
	*/
	jitterBufferEmittedCount?: number;

	/**
	* Minimum delay of the jitter buffer in seconds.
	*/
	jitterBufferMinimumDelay?: number;

	/**
	* Total audio samples received.
	*/
	totalSamplesReceived?: number;

	/**
	* Number of concealed audio samples.
	*/
	concealedSamples?: number;

	/**
	* Number of silent audio samples concealed.
	*/
	silentConcealedSamples?: number;

	/**
	* Number of audio concealment events.
	*/
	concealmentEvents?: number;

	/**
	* Number of audio samples inserted for deceleration.
	*/
	insertedSamplesForDeceleration?: number;

	/**
	* Number of audio samples removed for acceleration.
	*/
	removedSamplesForAcceleration?: number;

	/**
	* Audio level in the range [0.0, 1.0].
	*/
	audioLevel?: number;

	/**
	* Total audio energy in the stream.
	*/
	totalAudioEnergy?: number;

	/**
	* Total duration of all received audio samples in seconds.
	*/
	totalSamplesDuration?: number;

	/**
	* Total number of frames received.
	*/
	framesReceived?: number;

	/**
	* Decoder implementation used for decoding frames.
	*/
	decoderImplementation?: string;

	/**
	* Playout identifier for the RTP stream.
	*/
	playoutId?: string;

	/**
	* Indicates if the decoder is power-efficient.
	*/
	powerEfficientDecoder?: boolean;

	/**
	* Number of frames assembled from multiple packets.
	*/
	framesAssembledFromMultiplePackets?: number;

	/**
	* Total assembly time for frames in seconds.
	*/
	totalAssemblyTime?: number;

	/**
	* Number of retransmitted packets received.
	*/
	retransmittedPacketsReceived?: number;

	/**
	* Number of retransmitted bytes received.
	*/
	retransmittedBytesReceived?: number;

	/**
	* SSRC of the retransmission stream.
	*/
	rtxSsrc?: number;

	/**
	* SSRC of the FEC stream.
	*/
	fecSsrc?: number;

	/**
	* Total corruption probability of packets.
	*/
	totalCorruptionProbability?: number;

	/**
	* Total squared corruption probability of packets.
	*/
	totalSquaredCorruptionProbability?: number;

	/**
	* Number of corruption measurements.
	*/
	corruptionMeasurements?: number;

	/**
	* Additional information attached to this stats
	*/
	attachments?: Record<string, unknown>;

}

/**
* Codec items
*/
export type CodecStats = {
	/**
	* The timestamp when the stats were generated.
	*/
	timestamp: number;

	/**
	* The unique identifier for the stats object.
	*/
	id: string;

	/**
	* The MIME type of the codec.
	*/
	mimeType: string;

	/**
	* The payload type of the codec.
	*/
	payloadType?: number;

	/**
	* The identifier of the transport associated with the codec.
	*/
	transportId?: string;

	/**
	* The clock rate of the codec in Hz.
	*/
	clockRate?: number;

	/**
	* The number of audio channels for the codec, if applicable.
	*/
	channels?: number;

	/**
	* The SDP format-specific parameters line for the codec.
	*/
	sdpFmtpLine?: string;

	/**
	* Additional information attached to this stats
	*/
	attachments?: Record<string, unknown>;

}

/**
* Outbound Track Stats items
*/
export type OutboundTrackSample = {
	/**
	* The timestamp when the stats were generated.
	*/
	timestamp: number;

	/**
	* The unique identifier for the stats object.
	*/
	id: string;

	/**
	* Kind of the media (e.g., 'audio' or 'video').
	*/
	kind: string;

	/**
	* Calculated score for track (details should be added to attachments)
	*/
	score?: number;

	/**
	* Additional information attached to this stats
	*/
	attachments?: Record<string, unknown>;

}

/**
* Inbound Track Stats items
*/
export type InboundTrackSample = {
	/**
	* The timestamp when the stats were generated.
	*/
	timestamp: number;

	/**
	* The unique identifier for the stats object.
	*/
	id: string;

	/**
	* Kind of the media (e.g., 'audio' or 'video').
	*/
	kind: string;

	/**
	* Calculated score for track (details should be added to attachments)
	*/
	score?: number;

	/**
	* Additional information attached to this stats
	*/
	attachments?: Record<string, unknown>;

}

/**
* docs
*/
export type PeerConnectionSample = {
	/**
	* Unique identifier of the stats object.
	*/
	peerConnectionId: string;

	/**
	* Additional information attached to this sample
	*/
	attachments?: Record<string, unknown>;

	/**
	* Calculated score for peer connection (details should be added to attachments)
	*/
	score?: number;

	/**
	* Inbound Track Stats items
	*/
	inboundTracks?: InboundTrackSample[];

	/**
	* Outbound Track Stats items
	*/
	outboundTracks?: OutboundTrackSample[];

	/**
	* Codec items
	*/
	codecs?: CodecStats[];

	/**
	* Inbound RTPs
	*/
	inboundRtps?: InboundRtpStats[];

	/**
	* Remote Inbound RTPs
	*/
	remoteInboundRtps?: RemoteInboundRtpStats[];

	/**
	* Outbound RTPs
	*/
	outboundRtps?: OutboundRtpStats[];

	/**
	* Remote Outbound RTPs
	*/
	remoteOutboundRtps?: RemoteOutboundRtpStats[];

	/**
	* Audio Source Stats
	*/
	mediaSources?: MediaSourceStats[];

	/**
	* Media Playout Stats
	*/
	mediaPlayouts?: MediaPlayoutStats[];

	/**
	* PeerConnection Transport Stats
	*/
	peerConnectionTransports?: PeerConnectionTransportStats[];

	/**
	* Data Channels Stats
	*/
	dataChannels?: DataChannelStats[];

	/**
	* ICE Transport Stats
	*/
	iceTransports?: IceTransportStats[];

	/**
	* ICE Candidate Stats
	*/
	iceCandidates?: IceCandidateStats[];

	/**
	* ICE Candidate Pair Stats
	*/
	iceCandidatePairs?: IceCandidatePairStats[];

	/**
	* Certificates
	*/
	certificates?: CertificateStats[];

}

/**
* docs
*/
export type ClientSample = {
	/**
	* The timestamp the sample is created in GMT
	*/
	timestamp: number;

	/**
	* the unique identifier of the call or session
	*/
	callId?: string;

	/**
	* Unique id of the client providing samples.
	*/
	clientId?: string;

	/**
	* Additional information attached to this sample (e.g.: roomId, userId, displayName, etc...)
	*/
	attachments?: Record<string, unknown>;

	/**
	* Calculated score for client (details should be added to attachments)
	*/
	score?: number;

	/**
	* Samples taken PeerConnections
	*/
	peerConnections?: PeerConnectionSample[];

	/**
	* A list of client events.
	*/
	clientEvents?: ClientEvent[];

	/**
	* A list of client issues.
	*/
	clientIssues?: ClientIssue[];

	/**
	* A list of additional client events.
	*/
	clientMetaItems?: ClientMetaData[];

	/**
	* The WebRTC app provided custom stats payload
	*/
	extensionStats?: ExtensionStat[];

}
