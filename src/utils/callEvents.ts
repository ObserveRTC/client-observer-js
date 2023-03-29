export enum CallEventType {
    PEER_CONNECTION_OPENED = 'PEER_CONNECTION_OPENED',
    PEER_CONNECTION_CLOSED = 'PEER_CONNECTION_CLOSED',
    MEDIA_TRACK_ADDED = 'MEDIA_TRACK_ADDED',
	MEDIA_TRACK_REMOVED = 'MEDIA_TRACK_REMOVED',
	ICE_CONNECTION_STATE_CHANGED = 'ICE_CONNECTION_STATE_CHANGED',
	
	PRODUCER_PAUSED = 'PRODUCER_PAUSED',
	PRODUCER_RESUMED = 'PRODUCER_RESUMED',
	CONSUMER_PAUSED = 'CONSUMER_PAUSED',
	CONSUMER_RESUMED = 'CONSUMER_RESUMED',
}