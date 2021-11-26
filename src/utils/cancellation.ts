import EventEmmiter from "events";

const typeSymbol = Symbol("type:CancellableSignal");

export type CancellableSignal = {
    name?: string;
    isCancelled: boolean;
    subscribe(listener: (reason?: any) => void): void;
    unsubscribe(listener: (reason?: any) => void): void;
    cancel(reason?: any): void;
    release(): void;
};

export function isCancellableSignal(o: unknown): o is CancellableSignal {
    return Reflect.get(<object>o, typeSymbol) === true;
}

export function createCancellableSignal(name?: string, logger?: Function): CancellableSignal {
    const events = new EventEmmiter();
    const log = (msg: unknown, tag: string) => {
        typeof logger === "function" && logger(`${tag}:`, msg);
    };
    const signal: CancellableSignal = {
        name,
        isCancelled: false,
        subscribe: (listener) => events.once("cancel", listener),
        unsubscribe: (listener) => events.off("cancel", listener),
        cancel(reason) {
            if (this.isCancelled) return;

            this.isCancelled = true;
            events.emit("cancel", reason ?? new Error("Operation cancelled"));
            log(reason, this.name ?? "CancellableSignal");
        },
        release() {
            this.isCancelled = true;
            events.removeAllListeners();
        },
    };

    Reflect.defineProperty(signal, typeSymbol, {
        configurable: false,
        writable: false,
        value: true,
    });

    return signal;
}
