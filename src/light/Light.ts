import EventBus from "../core/EventBus";
import TurnableDevice from "../devices/TurnableDevice";

export interface LigthState {
    state: "on" | "off" | "unknown";
    brightness?: number;
    rgbColor?: [number, number, number]; // rgb
    colorTemp?: number;
    effect?: number;
}

export enum LightFeatures {
    SUPPORT_COLOR = "color",
    SUPPORT_BRIGHTNESS = "brightness",
    SUPPORT_COLOR_TEMP = "colorTemp",
}

export default abstract class Light extends TurnableDevice<LigthState> implements LigthState {
    public class?: string;
    public eventbus?: EventBus;
    type = "light";
    state: "on" | "off" | "unknown" = "unknown";
    brightness?: number;
    rgbColor?: [number, number, number];
    colorTemp?: number;
    effect?: number;
    features: LightFeatures[] = [];

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public setState(state: Partial<LigthState>): boolean | Promise<boolean> {
        return false;
    }

    public getExtraAttrs(): Record<string, unknown> {
        return {
            class: this.class || null,
            features: this.features,
        };
    }

    public getState(): Readonly<LigthState> {
        return Object.freeze<LigthState>({
            state: this.state,
            brightness: this.brightness,
            colorTemp: this.colorTemp,
            rgbColor: this.rgbColor,
            effect: this.effect,
        });
    }

    public turnOn(): Promise<boolean> | boolean {
        return false;
    }

    public turnOff(): Promise<boolean> | boolean {
        return false;
    }

    public async push(params: Partial<LigthState>): Promise<boolean> {
        if (!params) {
            throw new Error("Missing parameters");
        }

        delete params.state;

        if (!Object.keys(params).length) {
            return false;
        }

        await this.setState(params);

        return true;
    }

    protected _pushToPhysicalLight?(params: Partial<LigthState>): Promise<void>;
}
