import { ClientMonitor } from "../ClientMonitor";
import { createLogger } from "../utils/logger";
import { ClientMetaTypes } from "../schema/ClientMetaTypes";

const logger = createLogger('utils');

export function watchMediaDevices(monitor: ClientMonitor) {

	/* eslint-disable @typescript-eslint/no-explicit-any */
	let outerNavigator: typeof navigator | undefined = undefined;
	if (navigator !== undefined) outerNavigator = navigator;
	else if (window !== undefined && window.navigator !== undefined) outerNavigator = window.navigator;
	else return logger.error('Cannot integrate navigator.mediaDevices, because navigator is not available');

	const browsermediaDevice = outerNavigator.mediaDevices;

	if (!browsermediaDevice) {
			return logger.error('Cannot integrate navigator.mediaDevices, because navigator.mediaDevices is not available');
	}

	if (browsermediaDevice.getUserMedia === undefined || typeof browsermediaDevice.getUserMedia !== 'function') {
			return logger.error('Cannot integrate navigator.mediaDevices.getUserMedia, because getUserMedia is not a function');
	}
		
		const mediaDevices = browsermediaDevice as MediaDevices;
		const originalGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);
		
		mediaDevices.getUserMedia = async (constraints?: MediaStreamConstraints): Promise<MediaStream> => {
				try {
						const result = await originalGetUserMedia(constraints);

						return result;
				} catch (err) {
					monitor.addIssue({
						type: ClientMetaTypes.USER_MEDIA_ERROR,
						payload: {
								error: `${err}`,
						}
					})
					throw err;
				}
		};

		try {
				const supportedConstraints = mediaDevices.getSupportedConstraints();

				monitor.addMetaData({
						type: ClientMetaTypes.MEDIA_DEVICES_SUPPORTED_CONSTRAINTS,
						payload: {
								...supportedConstraints
						}
				})
		} catch (err) {
				logger.warn('Cannot get supported constraints', err);
		}
		
		const reportedDeviceIds = new Set<string>();
		const onDeviceChange = async () => {
				try {
						const enumeratedMediaDevices = await mediaDevices.enumerateDevices();

						for (const mediaDevice of enumeratedMediaDevices) {
								const deviceId = `${mediaDevice.groupId}-${mediaDevice.deviceId}-${mediaDevice.kind}-${mediaDevice.label}`;
								if (reportedDeviceIds.has(deviceId)) continue;
								
								monitor.addMetaData({
										type: ClientMetaTypes.MEDIA_DEVICE,
										payload: mediaDevice.toJSON()
								});

								reportedDeviceIds.add(deviceId);
						}
				} catch (err) {
						logger.error('Cannot enumerate media devices', err);
				}
		};
		
		monitor.once('close', () => {
				mediaDevices.getUserMedia = originalGetUserMedia;
				mediaDevices.removeEventListener('devicechange', onDeviceChange);
		});
		mediaDevices.addEventListener('devicechange', onDeviceChange);

		onDeviceChange().catch((err) => {
				logger.warn('Cannot enumerate media devices', err);
		});
}