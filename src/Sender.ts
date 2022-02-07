import { Samples } from "./schemas/Samples";
import { Codec, CodecConfig, createCodec } from "./codecs/Codec";
import { createTransport, Transport, TransportConfig } from "./transports/Transport"
import { logger } from "./utils/logger";

export type SenderConfig = {
    codec?: CodecConfig;
    debounceTimeInMs?: number;
}

type SenderConstructConfig = SenderConfig & {
    transport: TransportConfig,
}

const defaultConfig: SenderConstructConfig = {
    transport: {}
}

export class Sender {
    public static create(config?: SenderConfig) {
        const appliedConfig = Object.assign(defaultConfig, config);
        return new Sender(appliedConfig);;
    }
    private _closed: boolean = false;
    private _config: SenderConstructConfig;
    private _codec: Codec<Samples, Uint8Array>;
    private _transport: Transport
    private constructor(config: SenderConstructConfig) {
        this._config = config;
        this._codec = createCodec<Samples>(this._config.codec);
        this._transport = createTransport(this._config.transport);
    }
    
    public async close(): Promise<void> {
        if (this._closed) {
            logger.warn(`Attempted to close the Sender twice`);
            return Promise.resolve();
        }
        this._closed = true;
    }

    public async send(samples: Samples): Promise<void> {
        if (this._closed) {
            throw new Error(`Cannot use an already closed Sender`);
        }
        const message = this._codec.encode(samples);
        await this._transport.send(message);
    }
}