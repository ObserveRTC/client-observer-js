import { CustomCallEvent } from "../schema/Samples";
import { StatsStorage } from "../entries/StatsStorage";
import { listenTrackEvents } from "./utils";
import { 
    createIceGatheringStateChangedEvent, 
    createPeerConnectionClosedEvent, 
    createPeerConnectionOpenedEvent, 
    createPeerConnectionStateChangedEvent 
} from "../utils/callEvents";
import { 
    MediaosupDeviceSurrogate, 
    MediasoupConsumerSurrogate, 
    MediasoupDataConsumerSurrogate, 
    MediasoupDataProducerSurrogate, 
    MediasoupProducerSurrogate, 
    MediasoupTransportSurrogate 
} from "./MediasoupSurrogates";

export type MediasoupStatsCollectorConfig = {
    collectorId?: string,
    device: MediaosupDeviceSurrogate,
    emitCallEvent: ((event: CustomCallEvent) => void);
    storage: StatsStorage
}

export function createMediasoupStatsCollector(config: MediasoupStatsCollectorConfig) {
    const {
        collectorId = 'mediasoup',
        device,
        emitCallEvent,
        storage,
    } = config;
    
    const transports = new Map<string, MediasoupTransportSurrogate>();
    const addedOutboundTrackIds = new Set<string>();
    const producers = new Map<string, MediasoupProducerSurrogate>();
    const consumers = new Map<string, MediasoupConsumerSurrogate>();

    const getLastSndTransport = () => {
        const sndTransports = Array.from(transports.values()).filter(transport => transport.direction === 'send');
        return sndTransports.length < 1 ? undefined : sndTransports[sndTransports.length - 1];
    }

    function addTrack(event: {
        track: MediaStreamTrack,
        peerConnectionId: string,
        direction: 'outbound' | 'inbound',
        added?: number,
        sfuStreamId?: string,
        sfuSinkId?: string,
    }) {
        const {
            track,
            ...eventBase
        } = event;
        if (!track.id || addedOutboundTrackIds.has(track.id)) {
            return;
        }
        addedOutboundTrackIds.add(track.id);

        listenTrackEvents({
            ...eventBase,
            track,
            emitCallEvent,
        });
    }

    function addOutboundTrack(track: MediaStreamTrack) {
        const sndTransport = getLastSndTransport();
        if (!sndTransport) {
            return;
        }
        addTrack({
            track,
            peerConnectionId: sndTransport.id,
            direction: 'outbound',
        });
    }
    
    function createAddProducerListener(peerConnectionId: string) {
        return (producer: MediasoupProducerSurrogate) => {
            const eventBase = {
                peerConnectionId,
                mediaTrackId: producer.track?.id,
                attachments: JSON.stringify({
                    producerId: producer.id,
                    kind: producer.kind,
                })
            };
            const pauseListener = () => {
                emitCallEvent({
                    name: 'PRODUCER_PAUSED',
                    ...eventBase
                });
            }
            const resumeListener = () => {
                emitCallEvent({
                    name: 'PRODUCER_RESUMED',
                    ...eventBase
                });
            }
            producer.observer.once('close', () => {
                producer.observer.off('pause', pauseListener);
                producer.observer.off('resume', resumeListener);
                producers.delete(producer.id);
                emitCallEvent({
                    name: 'PRODUCER_REMOVED',
                    ...eventBase
                });
            });
            producer.observer.on('pause', pauseListener);
            producer.observer.on('resume', resumeListener);
            producers.set(producer.id, producer);

            emitCallEvent({
                name: 'PRODUCER_ADDED',
                ...eventBase
            });

            if (producer.track) {
                addTrack({
                    peerConnectionId,
                    direction: 'outbound',
                    track: producer.track,
                    sfuStreamId: producer.id,
                });
            }
        }
    }

    function createAddConsumerListener(peerConnectionId: string) {
        return (consumer: MediasoupConsumerSurrogate) => {
            const eventBase = {
                    peerConnectionId,
                    mediaTrackId: consumer.track.id,
                    attachments: JSON.stringify({
                        producerId: consumer.id,
                        kind: consumer.kind,
                    })
                };
            const pauseListener = () => {
                emitCallEvent({
                    name: 'CONSUMER_PAUSED',
                    ...eventBase
                });
            }
            const resumeListener = () => {
                emitCallEvent({
                    name: 'CONSUMER_RESUMED',
                    ...eventBase
                });
            }
            consumer.observer.once('close', () => {
                consumer.observer.off('pause', pauseListener);
                consumer.observer.off('resume', resumeListener);
                consumers.delete(consumer.id);
                emitCallEvent({
                    name: 'CONSUMER_REMOVED',
                    ...eventBase
                });
            });
            consumer.observer.on('pause', pauseListener);
            consumer.observer.on('resume', resumeListener);
            consumers.set(consumer.id, consumer);
            emitCallEvent({
                name: 'CONSUMER_ADDED',
                ...eventBase
            });

            addTrack({
                peerConnectionId,
                direction: 'inbound',
                track: consumer.track,
                sfuStreamId: consumer.producerId,
                sfuSinkId: consumer.id,
            });
        }
    }

    function createAddDataProducerListener(peerConnectionId: string) {
        return (dataProducer: MediasoupDataProducerSurrogate) => {
            const eventBase = {
                peerConnectionId,
                attachments: JSON.stringify({
                    dataProducerId: dataProducer.id,
                })
            };
            const closeListener = () => {
                emitCallEvent({
                    name: 'DATA_PRODUCER_CLOSED',
                    ...eventBase
                });
            }
            dataProducer.observer.once('close', closeListener);
            emitCallEvent({
                name: 'DATA_PRODUCER_OPENED',
                ...eventBase
            });
        }
    }

    function createAddDataConsumerListener(peerConnectionId: string) {
        return (dataConsumer: MediasoupDataConsumerSurrogate) => {
            const eventBase = {
                peerConnectionId,
                attachments: JSON.stringify({
                    dataProducerId: dataConsumer.dataProducerId,
                    dataConsumerId: dataConsumer.id,
                })
            };
            const closeListener = () => {
                emitCallEvent({
                    name: 'DATA_CONSUMER_CLOSED',
                    ...eventBase
                });
            }
            dataConsumer.observer.once('close', closeListener);
            emitCallEvent({
                name: 'DATA_CONSUMER_OPENED',
                ...eventBase
            });
        }
    }


    function addTransport(transport: MediasoupTransportSurrogate, timestamp?: number) {
        const eventBase = {
            peerConnectionId: transport.id,
            attachments: JSON.stringify({
                label: transport.direction,
            })
        }
        const addProducerListener = createAddProducerListener(transport.id);
        const addConsumerListener = createAddConsumerListener(transport.id);
        const addDataProducerListener = createAddDataProducerListener(transport.id);
        const addDataConsumerListener = createAddDataConsumerListener(transport.id);
        const peerConnectionStateChangeListener = (peerConnectionState: RTCPeerConnectionState) => {
            emitCallEvent(
                createPeerConnectionStateChangedEvent({
                    ...eventBase,
                    peerConnectionState
                })
            );
        };
        const iceGatheringStateChangeListener = (iceGatheringState: RTCIceGatheringState) => {
            emitCallEvent(
                createIceGatheringStateChangedEvent({
                    ...eventBase,
                    iceGatheringState
                })
            );
        };
        
        transport.observer.once('close', () => {
            transport.observer.off("newproducer", addProducerListener);
            transport.observer.off("newconsumer", addConsumerListener);
            transport.observer.off("newdataproducer", addDataProducerListener);
            transport.observer.off("newdataconsumer", addDataConsumerListener);
            transport.off('connectionstatechange', peerConnectionStateChangeListener);
            transport.off('icegatheringstatechange', iceGatheringStateChangeListener);
            transports.delete(transport.id);
            emitCallEvent(
                createPeerConnectionClosedEvent(eventBase)
            );
        });
        transport.observer.on("newproducer", addProducerListener);
        transport.observer.on("newconsumer", addConsumerListener);
        transport.observer.on("newdataproducer", addDataProducerListener);
        transport.observer.on("newdataconsumer", addDataConsumerListener);
        transport.on('connectionstatechange', peerConnectionStateChangeListener);
        transport.on('icegatheringstatechange', iceGatheringStateChangeListener);
        emitCallEvent(
            createPeerConnectionOpenedEvent({
                ...eventBase,
                timestamp
            })
        );
    }

    function adaptStorageMiddleware(storage: StatsStorage, next: (storage: StatsStorage) => void) {
        const sndTransport = getLastSndTransport();
        const peerConnectionStats = storage.getPeerConnection(sndTransport?.id ?? '');
        if (!peerConnectionStats) {
            return next(storage);
        }
        for (const producer of producers.values()) {
            if (!producer.track) {
                continue;
            }
            producer.rtpParameters.encodings?.forEach(encoding => {
                const ssrc = encoding.ssrc;
                if (!ssrc) {
                    return;
                }
                for (const outboundRtp of peerConnectionStats.outboundRtps(ssrc)) {
                    outboundRtp.sfuStreamId = producer.id;

                    const mediaSource = outboundRtp.getMediaSource();
                    if (mediaSource && producer.track) {
                        mediaSource.stats.trackIdentifier = producer.track.id;
                    }
                }
            });
            if (producer.track && !addedOutboundTrackIds.has(producer.track.id) && producer.track.readyState === 'live') {
                addTrack({
                    track: producer.track,
                    peerConnectionId: peerConnectionStats.peerConnectionId,
                    direction: 'outbound',
                });
            }
        }
        for (const consumer of consumers.values()) {
            consumer.rtpParameters.encodings?.forEach(encoding => {
                const ssrc = encoding.ssrc;
                if (!ssrc) {
                    return;
                }
                for (const inboundRtp of peerConnectionStats.inboundRtps(ssrc)) {
                    if (inboundRtp.getTrackId() !== consumer.track.id) {
                        inboundRtp.stats.trackIdentifier = consumer.track.id;
                    }
                    inboundRtp.sfuStreamId = consumer.producerId;
                    inboundRtp.sfuSinkId = consumer.id;
                }
            });
        }
        return next(storage);
    }

    let closed = false;
    function close() {
        if (closed) {
            return;
        }
        closed = true;
        transports.clear();
        producers.clear();
        consumers.clear();
        device.observer.off("newtransport", addTransport);
        storage.processor.removeMiddleware(adaptStorageMiddleware);
    }
    device.observer.on("newtransport", addTransport);
    storage.processor.addMiddleware(adaptStorageMiddleware)

    return {
        get id() {
            return collectorId;
        },
        close,
        addTransport,
        addOutboundTrack,
        get closed() {
            return closed;
        }
    }
}
