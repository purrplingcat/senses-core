/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import "reflect-metadata";
import ITurnableDevice from "../../devices/TurnableDevice";
import BaseDevice, { DeviceState } from "../../devices/BaseDevice";
import { hexToRgb, isDefined, rgbToHex } from "../../core/utils";
import { ISenses } from "../../core/Senses";
import { extraAttr } from "../../devices/metadata";

const int = (num: number) => Math.trunc(num);

export interface LigthState extends DeviceState {
    state: "on" | "off" | "unknown";
    brightness: number;
    rgbColor: string; // hex encoded rgb color like #ca3207
    colorTemp: number;
    effect: number | string;
    mode: "day" | "night" | "morning" | null;
}

export enum LightFeatures {
    SUPPORT_COLOR = "color",
    SUPPORT_BRIGHTNESS = "brightness",
    SUPPORT_COLOR_TEMP = "colorTemp",
    SUPPORT_EFFECTS = "effects",
    SUPPORT_MODE = "mode",
}

export default class Light extends BaseDevice<LigthState> implements ITurnableDevice {
    override type = "light";
    override features: LightFeatures[] = [];
    @extraAttr
    effects: Record<number | string, string>;

    constructor(senses: ISenses) {
        super(senses, {
            _available: false,
            _updatedAt: 0,
            brightness: 0,
            colorTemp: 0,
            rgbColor: "",
            effect: 0,
            state: "unknown",
            mode: null,
        });

        this.effects = {};
    }

    get state() {
        return this.getState().state ?? "unknown";
    }

    protected _createPayload(state: Partial<LigthState>): any {
        const message: Record<string, number | string | boolean | undefined> = {};

        if (state.state) {
            message.state = state.state === "on" ? 1 : 0;
        }

        message.brightness = state.brightness;
        message.colorTemp = state.colorTemp;

        if (state.rgbColor) {
            const rgb = hexToRgb(state.rgbColor);
            message.r = rgb?.r ?? 0;
            message.g = rgb?.g ?? 0;
            message.b = rgb?.b ?? 0;
        }

        return message;
    }

    turnOn(): boolean | Promise<boolean> {
        return this.setState({ state: "on" });
    }
    turnOff(): boolean | Promise<boolean> {
        return this.setState({ state: "off" });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected _mapState(payload: any): Partial<LigthState> {
        const supports = (feature: LightFeatures) => this.features.includes(feature);
        const toUpdate: Partial<LigthState> = {
            brightness: payload.brightness,
            effect: isDefined(payload.effect) ? int(payload.effect) : undefined,
        };

        if (isDefined(payload.state)) {
            toUpdate.state =
                typeof payload.state === "number" ? BaseDevice.stateNumberToStr(payload.state) : payload.state;
        }

        if (isDefined(payload.r, payload.g, payload.b) && supports(LightFeatures.SUPPORT_COLOR)) {
            toUpdate.rgbColor = rgbToHex(int(payload.r), int(payload.g), int(payload.b));
        }

        if (isDefined(payload.mode) && supports(LightFeatures.SUPPORT_MODE)) {
            toUpdate.mode = decodeMode(payload.mode);
        }

        return toUpdate;
    }
}

function decodeMode(mode: number): "day" | "night" | "morning" | null {
    switch (mode) {
        case 1:
            return "day";
        case 2:
            return "night";
        case 3:
            return "morning";
        default:
            return null;
    }
}
