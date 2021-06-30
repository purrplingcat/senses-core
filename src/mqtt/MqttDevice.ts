import { differenceInMilliseconds } from "date-fns";
import { MqttClient } from "mqtt";
import EventBus from "../core/EventBus";
import Device from "../devices/Device";

export default abstract class MqttDevice extends Device<unknown> {
    mqtt?: MqttClient;
    eventbus?: EventBus;
    stateTopic: string;
    commandTopic: string;
    fetchStateTopic: string;

    constructor(stateTopic: string, commandTopic: string, fetchStateTopic: string) {
        super();
        this.stateTopic = stateTopic;
        this.commandTopic = commandTopic;
        this.fetchStateTopic = fetchStateTopic;
    }

    protected _publish<TPayload>(topic: string, payload: TPayload): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.mqtt?.connected) {
                this._logger.error("Can't publish mqtt message: Mqtt connection is not established");
                return;
            }

            this.mqtt.publish(topic, JSON.stringify(payload), (err) => {
                if (err) {
                    reject(err);
                }

                this._logger.trace("Published mqtt message", topic, payload);
                resolve();
            });
        });
    }

    requestState(): void {
        this._publish(this.fetchStateTopic, null);
    }

    public onMqttMessage(message: string): void {
        const payload = JSON.parse(message);

        this._retrieveState(payload);
        this._logger.trace("Received new state payload", payload);
        this.eventbus?.emit("device.state_update", this, this.eventbus.senses);
    }

    protected abstract _retrieveState(payload: unknown): void;

    public get available(): boolean {
        if (this.keepalive) {
            return !!this.lastAlive && differenceInMilliseconds(new Date(), this.lastAlive) < this.timeout;
        }

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
