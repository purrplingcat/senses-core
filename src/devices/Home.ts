import { equal } from "fast-shallow-equal";
import { ISenses, Senses } from "~core/Senses";
import { asArray, isEmptyObject } from "~utils";
import Device from "./Device";

export type HomeFeatures = keyof HomeState;
export interface HomeState {
    mode: "morning" | "day" | "evening" | "night";
    presence: "home" | "away" | "vacation" | "unknown";
    security: "on" | "off" | "locked";
}

export const getHome = (senses: ISenses): Home => (<Senses>senses).home;

export default class Home extends Device<HomeState> {
    private _state: Readonly<HomeState>;
    private _lastUpdate: Date;
    private _needsFlush = false;
    override features: HomeFeatures[];

    constructor(senses: ISenses) {
        super(senses);
        this.uid = "home";
        this.features = [];
        this._lastUpdate = new Date();
        this._state = Object.freeze({
            mode: "day",
            presence: "unknown",
            security: "off",
        });

        senses.eventbus.on("setup", this._setup.bind(this));
        senses.eventbus.on("update", this.update.bind(this));
    }

    get available(): boolean {
        return true;
    }

    get lastUpdate(): Date {
        return this._lastUpdate;
    }

    private _setup() {
        this.name = this.senses.config?.domain || "home";
        this.features = asArray(this.senses.config?.home?.features);
    }

    private _setInternalState(newState: Partial<HomeState>, force = false): boolean {
        if (!force && isEmptyObject(newState)) return false;

        const nextState = Object.freeze({ ...this._state, ...newState });

        if (force || !equal(this._state, nextState)) {
            const prevState = this._state;

            this._state = nextState;
            this.senses.eventbus?.emit("device.state_changed", this, nextState, prevState);

            return true;
        }

        return false;
    }

    setState(state: Partial<HomeState>): boolean {
        if (this._setInternalState(state)) {
            this._needsFlush = true;
            return true;
        }

        return false;
    }

    getState(): Readonly<HomeState> {
        return this._state;
    }

    update(): void {
        if (this._needsFlush) {
            // flush
        }

        this._needsFlush = false;
    }
}
