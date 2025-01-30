export type Middleware<T> = (input: T, next: (input: T) => void) => void;

export class Processor<T> {
	private middlewares: Middleware<T>[] = [];
	private _finalCallback: ((input: T) => void) | null = null;

	public addMiddleware(middleware: Middleware<T>) {
		this.middlewares.push(middleware);
	}

	public removeMiddleware(middleware: Middleware<T>) {
		const index = this.middlewares.indexOf(middleware);
		if (index < 0) return;
		this.middlewares.splice(index, 1);
	}

	public process(input: T) {
		return this._next(0, input);
	}

	public addFinalCallback(callback: (input: T) => void) {
		if (this._finalCallback !== null) {
			throw new Error('Final callback already exists');
		}

		this._finalCallback = callback;
	}

	private _next(index: number, input: T): void {
		if (this.middlewares.length <= index) {
			return this._finalCallback?.(input);
		}

		const middleware = this.middlewares[index];
		if (!middleware) {
			return this._next(index + 1, input);
		}
		return middleware(input, () => this._next(index + 1, input));
	}
}
