/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import ITurnableDevice from "../devices/TurnableDevice";
import BaseDevice, { DeviceState } from "../devices/BaseDevice";
import { hexToRgb, pure, rgbToHex } from "../core/utils";
import { ISenses } from "../core/Senses";

const int = (num: number) => Math.trunc(num);

export interface LigthState extends DeviceState {
    state: "on" | "off" | "unknown";
    brightness: number;
    rgbColor: string; // hex encoded rgb color like #ca3207
    colorTemp: number;
    effect: number;
}

export enum LightFeatures {
    SUPPORT_COLOR = "color",
    SUPPORT_BRIGHTNESS = "brightness",
    SUPPORT_COLOR_TEMP = "colorTemp",
    SUPPORT_EFFECTS = "effects",
}

export default class Light extends BaseDevice<LigthState> implements ITurnableDevice {
    type = "light";
    features: LightFeatures[] = [];

    constructor(senses: ISenses, stateTopic: string, commandTopic: string, fetchTopic: string) {
        super(senses, stateTopic, commandTopic, fetchTopic, {
            _available: false,
            brightness: 0,
            colorTemp: 0,
            rgbColor: "",
            effect: 0,
            state: "unknown",
        });
    }

    get state() {
        return this.getState().state ?? "unknown";
    }

    async setState(state: Partial<LigthState>): Promise<boolean> {
        const message: Record<string, number | string | boolean | undefined> = {};

        if (state.state) {
            message.switch = state.state === "on" ? 1 : 0;
        }

        message.brightness = state.brightness;
        message.colorTemp = state.colorTemp;

        if (state.rgbColor) {
            const rgb = hexToRgb(state.rgbColor);
            message.r = rgb?.r ?? 0;
            message.g = rgb?.g ?? 0;
            message.b = rgb?.b ?? 0;
        }

        this._publish(this.commandTopic, pure(message));

        if (this.optimistic) {
            this.lastUpdate = new Date();
            this._update(state, false);
        }

        return true;
    }

    turnOn(): boolean | Promise<boolean> {
        return this.setState({ state: "on" });
    }
    turnOff(): boolean | Promise<boolean> {
        return this.setState({ state: "off" });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected _mapState(payload: any): Partial<LigthState> {
        const snapshot = this.getState();
        const toUpdate: Partial<LigthState> = {
            state: payload.state ?? BaseDevice.stateNumberToStr(payload.switch),
            brightness: payload.brightness,
            effect: int(payload.effect ?? snapshot.effect),
        };

        if (payload.r && payload.g && payload.b) {
            toUpdate.rgbColor = rgbToHex(int(payload.r), int(payload.g), int(payload.b));
        }

        return toUpdate;
    }
}
