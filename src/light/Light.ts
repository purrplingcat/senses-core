/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import ITurnableDevice from "../devices/TurnableDevice";
import MqttDevice from "../mqtt/MqttDevice";

const positive = (num: number) => (num >= 0 ? Number(num) : 0);
const int = (num: number) => parseInt(Number(num).toString());

export interface LigthState {
    state: "on" | "off" | "unknown";
    brightness: number;
    rgbColor: [number, number, number]; // rgb
    colorTemp: number;
    effect: number;
}

export enum LightFeatures {
    SUPPORT_COLOR = "color",
    SUPPORT_BRIGHTNESS = "brightness",
    SUPPORT_COLOR_TEMP = "colorTemp",
    SUPPORT_EFFECTS = "effects",
}

export default class Light extends MqttDevice implements LigthState, ITurnableDevice {
    type = "light";
    state: "on" | "off" | "unknown" = "unknown";
    brightness = 0;
    colorTemp = 0;
    effect = 0;
    rgbColor: [number, number, number] = [0, 0, 0];
    features: LightFeatures[] = [];

    async setState(state: Partial<LigthState>): Promise<boolean> {
        const message: Record<string, number | string | boolean> = {};

        if (state.state) {
            message.switch = state.state === "on" ? 1 : 0;
        }

        if (state.brightness) {
            message.brightness = state.brightness;
        }

        if (state.colorTemp) {
            message.colorTemp = state.colorTemp;
        }

        if (state.rgbColor) {
            message.r = positive(state.rgbColor[0] || 0);
            message.g = positive(state.rgbColor[1] || 0);
            message.b = positive(state.rgbColor[2] || 0);
        }

        this._publish(this.commandTopic, message);

        return true;
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

    turnOn(): boolean | Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    turnOff(): boolean | Promise<boolean> {
        throw new Error("Method not implemented.");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected _retrieveState(payload: any): void {
        this.state = payload.state ?? MqttDevice.stateNumberToStr(payload.switch);
        this.brightness = payload.brightness;
        this.effect = int(payload.effect);
        this.colorTemp = payload.colorTemp;

        if (payload.r && payload.g && payload.b) {
            this.rgbColor = [int(payload.r), int(payload.g), int(payload.b)];
        }
    }
}
