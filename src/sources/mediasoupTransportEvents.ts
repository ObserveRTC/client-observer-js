import * as mediasoup from 'mediasoup-client';
import { PeerConnectionMonitor } from '../monitors/PeerConnectionMonitor';
import { ClientEventTypes } from '../schema/ClientEventTypes';
import { listenMediaStreamTrackEvents } from './rtcEventers';

export type MediasoupTransportListenerContext = {
	transport:  mediasoup.types.Transport;
	monitor: PeerConnectionMonitor;
	attachments?: Record<string, unknown>;
}


export function listenMediasoupTransport(context: MediasoupTransportListenerContext) {
	const {
		transport,
		monitor: pcMonitor,
		attachments,
	} = context;
	const clientMonitor = pcMonitor.parent;
	// const producers = new Map<string, mediasoup.types.Producer>();
	// const consumers = new Map<string, mediasoup.types.Consumer>();

	const newConsumerListener = (consumer: mediasoup.types.Consumer) => {
		listenConsumer(pcMonitor, consumer);
	};
	const newDataConsumerListener = (dataConsumer: mediasoup.types.DataConsumer) => {
		listenDataConsumer(pcMonitor, dataConsumer);
	};
	const newProducerListener = (producer: mediasoup.types.Producer) => {
		listenMediasoupProducer(pcMonitor, producer);
	};

	const newDataProducerListener = (dataProducer: mediasoup.types.DataProducer) => {
		listenDataProducer(pcMonitor, dataProducer);
	};

	const connectionChangeListener = (...args: mediasoup.types.TransportEvents['connectionstatechange']) => {
		pcMonitor.connectionState = args[0];

		clientMonitor.addEvent({
			type: ClientEventTypes.PEER_CONNECTION_STATE_CHANGED,
			payload: {
				peerConnectionId: pcMonitor.peerConnectionId,
				connectionState: args[0],
				...(attachments ?? {}),
			}
		});
	}
	const iceGatheringStateChangeListener = (...args: mediasoup.types.TransportEvents['icegatheringstatechange']) => {
		clientMonitor.addEvent({
			type: ClientEventTypes.ICE_GATHERING_STATE_CHANGE,
			payload: {
				peerConnectionId: pcMonitor.peerConnectionId,
				iceGatheringState: args[0],
				...(attachments ?? {}),
			}
		});
	};

	transport.observer.once('close', () => {
		transport.observer.off('newconsumer', newConsumerListener);
		transport.observer.off('newdataproducer', newDataProducerListener);
		transport.observer.off('newproducer', newProducerListener);
		transport.observer.off('newdataconsumer', newDataConsumerListener);
		transport.off('connectionstatechange', connectionChangeListener);
		transport.off('icegatheringstatechange', iceGatheringStateChangeListener);
		
		pcMonitor.close();
	});

	transport.observer.on('newconsumer', newConsumerListener);
	transport.observer.on('newdataproducer', newDataProducerListener);
	transport.observer.on('newproducer', newProducerListener);
	transport.observer.on('newdataconsumer', newDataConsumerListener);
	transport.on('connectionstatechange', connectionChangeListener);
	transport.on('icegatheringstatechange', iceGatheringStateChangeListener);

	pcMonitor.once('close', () => {
		clientMonitor.addEvent({
			type: ClientEventTypes.PEER_CONNECTION_CLOSED,
			payload: {
				peerConnectionId: pcMonitor.peerConnectionId,
				...(attachments ?? {}),
			}
		});
	});

	clientMonitor.addEvent({
		type: ClientEventTypes.PEER_CONNECTION_OPENED,
		payload: {
			peerConnectionId: pcMonitor.peerConnectionId,
			...(attachments ?? {}),
		}
	});

	
}

function listenMediasoupProducer(pcMonitor: PeerConnectionMonitor, producer: mediasoup.types.Producer) {
	const clientMonitor = pcMonitor.parent;
	const pauseListener = () => {
		clientMonitor.addEvent({
			type: ClientEventTypes.PRODUCER_PAUSED,
			payload: {
				peerConnectionId: pcMonitor.peerConnectionId,
				trackId: producer.track?.id,
				producerId: producer.id,
			}
		});
	}
	const resumeListener = () => {
		clientMonitor.addEvent({
			type: ClientEventTypes.PRODUCER_RESUMED,
			payload: {
				peerConnectionId: pcMonitor.peerConnectionId,
				trackId: producer.track?.id,
				producerId: producer.id,
			}
		});
	}

	producer.observer.once('close', () => {
		producer.observer.off('pause', pauseListener);
		producer.observer.off('resume', resumeListener);

		clientMonitor.addEvent({
			type: ClientEventTypes.PRODUCER_REMOVED,
			payload: {
				peerConnectionId: pcMonitor.peerConnectionId,
				producerId: producer.id,
				trackId: producer.track?.id,
			}
		});
	});

	producer.observer.on('pause', pauseListener);
	producer.observer.on('resume', resumeListener);

	clientMonitor.addEvent({
		type: ClientEventTypes.PRODUCER_ADDED,
		payload: {
			peerConnectionId: pcMonitor.peerConnectionId,
			producerId: producer.id,
			trackId: producer.track?.id,
		}
	});

	if (producer.track) {
		listenMediaStreamTrackEvents(pcMonitor, producer.track, {
			producerId: producer.id,
		});
	}
}

function listenDataProducer(pcMonitor: PeerConnectionMonitor, dataProducer: mediasoup.types.DataProducer) {
	const clientMonitor = pcMonitor.parent;

	dataProducer.observer.once('close', () => {
		clientMonitor.addEvent({
			type: ClientEventTypes.DATA_PRODUCER_CLOSED,
			payload: {
				peerConnectionId: pcMonitor.peerConnectionId,
				dataProducerId: dataProducer.id,
			}
		});
	});

	clientMonitor.addEvent({
		type: ClientEventTypes.DATA_PRODUCER_CREATED,
		payload: {
			peerConnectionId: pcMonitor.peerConnectionId,
			dataProducerId: dataProducer.id,
		}
	});
}

function listenConsumer(pcMonitor: PeerConnectionMonitor, consumer: mediasoup.types.Consumer) {
	const clientMonitor = pcMonitor.parent;
	const pauseListener = () => {
		clientMonitor.addEvent({
			type: ClientEventTypes.MEDIA_TRACK_MUTED,
			payload: {
				peerConnectionId: pcMonitor.peerConnectionId,
				trackId: consumer.track.id,
				consumerId: consumer.id,
			}
		});
	}
	const resumeListener = () => {
		clientMonitor.addEvent({
			type: ClientEventTypes.MEDIA_TRACK_UNMUTED,
			payload: {
				peerConnectionId: pcMonitor.peerConnectionId,
				trackId: consumer.track.id,
				consumerId: consumer.id,
			}
		});
	}


	consumer.observer.once('close', () => {
		consumer.observer.off('pause', pauseListener);
		consumer.observer.off('resume', resumeListener);

		clientMonitor.addEvent({
			type: ClientEventTypes.CONSUMER_REMOVED,
			payload: {
				peerConnectionId: pcMonitor.peerConnectionId,
				trackId: consumer.track.id,
				consumerId: consumer.id,
			}
		});
	});

	consumer.observer.on('pause', pauseListener);
	consumer.observer.on('resume', resumeListener);

	clientMonitor.addEvent({
		type: ClientEventTypes.CONSUMER_ADDED,
		payload: {
			peerConnectionId: pcMonitor.peerConnectionId,
			consumerId: consumer.id,
			trackId: consumer.track.id,
		}
	});

	listenMediaStreamTrackEvents(pcMonitor, consumer.track);
}

function listenDataConsumer(pcMonitor: PeerConnectionMonitor, dataConsumer: mediasoup.types.DataConsumer, attachments?: Record<string, unknown>) {
	const clientMonitor = pcMonitor.parent;

	dataConsumer.observer.once('close', () => {
		clientMonitor.addEvent({
			type: ClientEventTypes.DATA_CONSUMER_CLOSED,
			payload: {
				peerConnectionId: pcMonitor.peerConnectionId,
				dataConsumerId: dataConsumer.id,
				...(attachments ?? {}),
			}
		});
	});

	clientMonitor.addEvent({
		type: ClientEventTypes.DATA_CONSUMER_CREATED,
		payload: {
			peerConnectionId: pcMonitor.peerConnectionId,
			dataConsumerId: dataConsumer.id,
			dataConsumerAppData: dataConsumer.appData,
			...(attachments ?? {}),
		}
	});
}