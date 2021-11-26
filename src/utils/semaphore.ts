/**
 * This is edited semaphore from https://github.com/DirtyHairy/async-mutex
 * original semaphore/mutex by DirtyHairy
 * MIT license
 *
 * My edit adds support for priorities in queue
 */

export const E_CANCELED = new Error("Request for lock canceled");

function byPriority(a: QueueEntry, b: QueueEntry) {
    if (a.priority === b.priority) {
        return 0;
    }

    return a.priority > b.priority ? 1 : -1;
}

interface QueueEntry {
    priority: number;
    resolve: (ticket: [number, Releaser]) => void;
    reject: (err: Error) => void;
}

export interface ISemaphore {
    acquire(priority: number): Promise<[number, Releaser]>;
    runExclusive<T>(callback: Worker<T>, priority?: number, ttl?: number): Promise<T>;
    isLocked(): boolean;
    cancel(): void;
}

export interface Releaser {
    (): void;
}

export interface Worker<T> {
    (value: number): Promise<T> | T;
}

export class Semaphore implements ISemaphore {
    constructor(private _maxConcurrency: number, private _cancelError: Error = E_CANCELED) {
        if (_maxConcurrency <= 0) {
            throw new Error("Semaphore must be initialized to a positive value");
        }

        this._value = _maxConcurrency;
    }

    acquire(priority = 0): Promise<[number, Releaser]> {
        const locked = this.isLocked();
        const ticketPromise = new Promise<[number, Releaser]>((resolve, reject) => {
            this._queue.push({ priority, resolve, reject });
            this._queue.sort(byPriority);
        });

        if (!locked) this._dispatch();

        return ticketPromise;
    }

    async runExclusive<T>(callback: Worker<T>, priority = 1000, ttl = 0): Promise<T> {
        const [value, release] = await this.acquire(priority);

        try {
            return await callback(value);
        } catch (err) {
            if (ttl <= 0) {
                throw err;
            }
            return this.runExclusive(callback, ++priority, --ttl);
        } finally {
            release();
        }
    }

    isLocked(): boolean {
        return this._value <= 0;
    }

    cancel(): void {
        this._queue.forEach((ticket) => ticket.reject(this._cancelError));
        this._queue = [];
    }

    private _dispatch(): void {
        const nextTicket = this._queue.shift();

        if (!nextTicket) return;

        let released = false;
        this._currentReleaser = () => {
            if (released) return;

            released = true;
            this._value++;

            this._dispatch();
        };

        nextTicket.resolve([this._value--, this._currentReleaser]);
    }

    private _queue: Array<QueueEntry> = [];
    private _currentReleaser?: Releaser;
    private _value: number;
}
