import { differenceInMilliseconds } from "date-fns";
import { MqttClient } from "mqtt";
import Light, { LigthState } from "../light/Light";

const positive = (num: number) => (num >= 0 ? Number(num) : 0);
const int = (num: number) => parseInt(Number(num).toString());

export default class MqttLight extends Light {
    mqtt?: MqttClient;
    stateTopic: string;
    commandTopic: string;
    fetchStateTopic: string;

    constructor(stateTopic: string, commandTopic: string, fetchStateTopic: string) {
        super();
        this.stateTopic = stateTopic;
        this.commandTopic = commandTopic;
        this.fetchStateTopic = fetchStateTopic;
    }

    private _publish<TPayload>(topic: string, payload: TPayload) {
        if (!this.mqtt?.connected) {
            this._logger.error("Can't publish mqtt message: Mqtt connection is not established");
            return;
        }

        this.mqtt.publish(topic, JSON.stringify(payload));
    }

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

    requestState(): void {
        this._publish(this.fetchStateTopic, null);
    }

    public onMqttMessage(message: string): void {
        const payload = JSON.parse(message);

        this.state = payload.state ?? MqttLight.stateNumberToStr(payload.switch);
        this.brightness = payload.brightness;
        this.effect = int(payload.effect);
        this.colorTemp = payload.colorTemp;

        if (payload.r && payload.g && payload.b) {
            this.rgbColor = [int(payload.r), int(payload.g), int(payload.b)];
        }

        this._logger.trace("Received new state payload", payload);
        this.eventbus?.emit("device.state_update", this, this.eventbus.senses);
    }

    public get available(): boolean {
        if (this.keepalive) {
            return !!this.lastAlive && differenceInMilliseconds(new Date(), this.lastAlive) < this.timeout;
        }

        return true;
    }

    public turnOn(): boolean {
        if (this.state === "on") {
            return false;
        }

        this.setState({ state: "on" });

        return true;
    }

    public turnOff(): boolean {
        if (this.state === "off") {
            return false;
        }

        this.setState({ state: "off" });

        return true;
    }

    static stateNumberToStr(state: number): "on" | "off" | "unknown" {
        switch (state) {
            case 0:
                return "off";
            case 1:
                return "on";
            default:
                return "unknown";
        }
    }
}
