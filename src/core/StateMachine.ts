import { produce } from "immer";
import Device from "../devices/Device";

export type DeviceState = {
    uid: string;
    available: boolean;
    state?: "on" | "off" | "unknown";
    props?: Record<string, unknown>;
};

export interface IStateMachine {
    updateState(scope: "device", uid: string, reducer: (draft: DeviceState) => DeviceState): void;
    getState(scope: "device", key: string): Device | null;
    getAllStates(scope: "device"): [string, DeviceState][];
}

export default class StateMachine implements IStateMachine {
    private _state: Record<string, Map<string, unknown>>;

    constructor() {
        this._state = {
            devices: new Map(),
        };
    }

    updateState<T = unknown>(scope: string, key: string, reducer: (draft: T) => T): void {
        if (!Reflect.has(this._state, scope)) {
            this._state[scope] = new Map();
        }

        const oldState = this._state[scope].has(key) ? this._state[scope].get(key) : {};
        const newState = produce(oldState, reducer);

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
