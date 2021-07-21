import { produce } from "immer";

export type State = {
    [prop: string]: number | string | boolean;
};

export type DeviceState = State & {
    uid: string;
    available: boolean;
    state?: "on" | "off" | "unknown";
};

export interface IStateMachine {
    updateState(scope: "device", uid: string, value: DeviceState): void;
    updateState<T = unknown>(scope: string, key: string, value: Partial<T>): void;
    getState<T = unknown>(scope: string, key: string): T | null;
    getAllStates(scope: "device"): [string, DeviceState][];
    getAllStates<T = unknown>(scope: string): [string, T][];
}

export default class StateMachine implements IStateMachine {
    private _state: Record<string, Map<string, unknown>>;

    constructor() {
        this._state = {
            devices: new Map(),
        };
    }

    updateState<T = unknown>(scope: string, key: string, value: Partial<T>): void {
        if (!Reflect.has(this._state, scope)) {
            this._state[scope] = new Map();
        }

        if (typeof value !== "object") {
            this._state[scope].set(key, value);
        }

        const oldState = this._state[scope].has(key) ? this._state[scope].get(key) : {};
        const newState = produce(oldState, (draft) => Object.assign(draft, value));

        this._state[scope].set(key, newState);
    }

    getState<T = unknown>(scope: string, key: string): T | null {
        if (!Reflect.has(this._state, scope) || !this._state[scope].has(key)) {
            return null;
        }

        return this._state[scope].get(key) as T;
    }

    getAllStates<T = unknown>(scope: string): [string, T][] {
        if (!Reflect.has(this._state, scope)) {
            return [];
        }

        return Array.from(this._state[scope].entries()) as [string, T][];
    }
}
