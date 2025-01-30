export type CalculatedScore = {
	weight: number;
	value?: number;
	appData?: Record<string, unknown>;
}

// every track calculates its own score and stores 
// the latest CalculatedScore in a score property also emits as an event 'score'
// every peer connection collects the scores and calculates its own score based on RTT, and stores it in the score property similar to track
// every client collects the scores and calculates its own score based on the peer connection scores, and stores it in the score property similar to track
// every call collects the scores and calculates its own score based on the client scores, and stores it in the score property similar to track, but
// but calls only recalculate it after a configured amount of time passed from the last recalculation, and it does not trigger automatically

/*
Recommended bpp Ranges for Good Quality

| Content Type       | H.264 (AVC) bpp Range | H.265 (HEVC) bpp Range | VP8 bpp Range | VP9 bpp Range |
|--------------------|-----------------------|-----------------------|---------------|---------------|
| Low Motion         | 0.1 - 0.2             | 0.05 - 0.15           | 0.1 - 0.2     | 0.05 - 0.15   |
| Standard Motion    | 0.15 - 0.25           | 0.1 - 0.2             | 0.15 - 0.25   | 0.1 - 0.2     |
| High Motion        | 0.25 - 0.4            | 0.15 - 0.3            | 0.25 - 0.4    | 0.15 - 0.3    |


// might be put into a detector
*/
export const BPP_RANGES = {
	'lowmotion': {
		'h264': { low: 0.1, high: 0.2 },
		'h265': { low: 0.05, high: 0.15 },
		'vp8': { low: 0.1, high: 0.2 },
		'vp9': { low: 0.05, high: 0.15 },
	},
	'standard': {
		'h264': { low: 0.15, high: 0.25 },
		'h265': { low: 0.1, high: 0.2 },
		'vp8': { low: 0.15, high: 0.25 },
		'vp9': { low: 0.1, high: 0.2 },
	},
	'highmotion': {
		'h264': { low: 0.25, high: 0.4 },
		'h265': { low: 0.15, high: 0.3 },
		'vp8': { low: 0.25, high: 0.4 },
		'vp9': { low: 0.15, high: 0.3 },
	},
};

export type BaseVideScoreContext = {
	frameHeight: number,
	frameWidth: number,
	bitrate: number,
	framesPerSecond: number,
	codec: string,
	contentType: keyof typeof BPP_RANGES,
}
export const MAX_VIDEO_SCORE = 5.0;
export const MIN_VIDEO_SCORE = 0.0;

export function calculateBaseVideoScore(context: BaseVideScoreContext): [score: number, remarks: string] {
	const { frameHeight, frameWidth, bitrate, framesPerSecond, codec, contentType } = context;

	if (!frameHeight || !frameWidth || !bitrate || !framesPerSecond) {
		return [
			MIN_VIDEO_SCORE,
			'Missing data for score calculation',
		]
	}

	if (codec !== 'vp8' && codec !== 'vp9' && codec !== 'h264' && codec !== 'h265') {
		return [
			MIN_VIDEO_SCORE,
			'Unsupported codec',
		]
	}

	const bpp = bitrate / (frameHeight * frameWidth * framesPerSecond);

	// Default to vp8 if codec is not provided
	const bppRange = BPP_RANGES[contentType]?.[codec];

	if (!bppRange) {
		return [
			MIN_VIDEO_SCORE,
			'Unsupported content type or codec',
		]
	}

	// Normalize score between 0 and 1 based on bpp range
	if (bpp < bppRange.low) {
		return [
			Math.max(MIN_VIDEO_SCORE, bpp / bppRange.low), // Scale up to the lower threshold
			`Bitrate per pixel is too low for ${contentType} content`,
		];
	} else if (bpp >= bppRange.high) {
		return [
			MAX_VIDEO_SCORE,
			`Bitrate per pixel is excellent for ${contentType} content`,
		];
	} else {
			// Logarithmic normalization
			const normalized = Math.log(bpp - bppRange.low + 1) / Math.log(bppRange.high - bppRange.low + 1);
			const scaledScore = MIN_VIDEO_SCORE + normalized * (MAX_VIDEO_SCORE - MIN_VIDEO_SCORE);

			return [
					scaledScore,
					`Bitrate per pixel is within acceptable range for ${contentType} content`,
			];
	}
}

export function calculateLatencyMOS(
	{ avgJitter, rttInMs, packetsLoss }:
	{ avgJitter: number, rttInMs: number, packetsLoss: number },
): number {
	const effectiveLatency = rttInMs + (avgJitter * 2) + 10;
	let rFactor = effectiveLatency < 160
		? 93.2 - (effectiveLatency / 40)
		: 93.2 - (effectiveLatency / 120) - 10;

	rFactor -= (packetsLoss * 2.5);
	
	return 1 + ((0.035) * rFactor) + ((0.000007) * rFactor * (rFactor - 60) * (100 - rFactor));
}

export function getRttScore(x: number): number {
	// logarithmic version: 1.0 at 150 and 0.1 at 300
	return (-1.2984 * Math.log(x)) + 7.5059;

	// exponential version: 1.0 at 150 and 0.1 at 300
	// return Math.exp(-0.01536 * x);
}