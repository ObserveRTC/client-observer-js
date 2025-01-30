import UAParser from "ua-parser-js";
import { createLogger } from "../utils/logger";

const logger = createLogger('FetchNavigatorData');

export function fetchUserAgentData(): ReturnType<typeof UAParser.prototype.getResult> | undefined {
	try {
		let outerNavigator: typeof navigator | undefined = undefined;
		if (navigator !== undefined) outerNavigator = navigator;
		else if (window !== undefined && window.navigator !== undefined) outerNavigator = window.navigator;
		else return logger.error('Cannot integrate navigator.mediaDevices, because navigator is not available');
		
		const parser = new UAParser(outerNavigator.userAgent);
		return parser.getResult();
		
	} catch (err) {
		logger.warn('Cannot collect Navigator data', err);
	}
}