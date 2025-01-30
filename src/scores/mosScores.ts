import { clamp } from "../utils/common";


export function calculateAudioMOS(
	bitrate: number,
	packetLoss: number,
	bufferDelayInMs: number,
	roundTripTimeInMs: number,
	dtxMode: boolean,
	fec: boolean
) {
	// Audio MOS calculation is based on E-Model algorithm
	// Assume 20ms packetization delay
	const delayInMs = 20 + bufferDelayInMs + roundTripTimeInMs / 2;
	const R0 = 100;
	
	// Ignore audio bitrate in dtx mode
	const equipmentImpairment = dtxMode
		? 8
		: bitrate
		? clamp(55 - 4.6 * Math.log(bitrate), 0, 30)
		: 6;
	const Bpl = fec ? 20 : 10;
	const Ipl = equipmentImpairment + (100 - equipmentImpairment) * (packetLoss / (packetLoss + Bpl));

	const delayImpairment = delayInMs * 0.03 + (delayInMs > 150 ? 0.1 * delayInMs - 150 : 0);
	const R = clamp(R0 - Ipl - delayImpairment, 0, 100);
	const MOS = 1 + 0.035 * R + (R * (R - 60) * (100 - R) * 7) / 1000000;
	
	return clamp(Math.round(MOS * 100) / 100, 1, 5);
}

export function calculateVideoMOS(
	bitrate: number,
	expectedWidth: number,
	expectedHeight: number,
	bufferDelayInMs: number,
	roundTripTimeInMs: number,
	codec: string,
	frameRate: number,
	expectedFrameRate: number,
) {
	const pixels = expectedWidth * expectedHeight;
	const codecFactor = codec === 'vp9' ? 1.2 : 1.0;
	const delayInMs = bufferDelayInMs + roundTripTimeInMs / 2;
	if (frameRate < 1) {
		return 1.0;
	}
	const bPPPF = (codecFactor * bitrate) / pixels / frameRate;
	const base = clamp(0.56 * Math.log(bPPPF) + 5.36, 1, 5);
	const MOS = base - 1.9 * Math.log(expectedFrameRate / frameRate) - delayInMs * 0.002;

	return clamp(Math.round(MOS * 100) / 100, 1, 5);
}
