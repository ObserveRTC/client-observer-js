export interface Logger {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  trace(...args: any[]): void;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  debug(...args: any[]): void;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  info(...args: any[]): void;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  warn(...args: any[]): void;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  error(...args: any[]): void;
}

let logger: Logger = new class implements Logger {
  trace = () => void 0; 
  debug = () => void 0;
  info = () => void 0;
  // debug = (...args: any[]) => console.debug(...args); 
  // info = (...args: any[]) => console.info(...args);
  warn = (...args: any[]) => console.warn(...args);
  error = (...args: any[]) => console.error(...args);
};

export function setLogger(newLogger: Logger): void {
  logger = newLogger;
}

export function createLogger(module: string): Logger {
  return {
    trace: (...args: any[]) => logger.trace(module, ...args),
    debug: (...args: any[]) => logger.debug(module, ...args),
    info: (...args: any[]) => logger.info(module, ...args),
    warn: (...args: any[]) => logger.warn(module, ...args),
    error: (...args: any[]) => logger.error(module, ...args),
  }
}

