import consola from "consola";
import { differenceInMilliseconds, parseISO } from "date-fns";
import { equal } from "fast-shallow-equal";
import { ISubscriptionGrant, MqttClient } from "mqtt";
import { exec, matches } from "mqtt-pattern";
import EventBus from "../core/EventBus";
import Handshake from "../core/Handshake";
import { ISenses } from "../core/Senses";
import { isEmptyObject, pure } from "../core/utils";
import Device from "./Device";

export interface DeviceState {
    _available: boolean;
}

export default abstract class BaseDevice<TState extends DeviceState = DeviceState> extends Device<TState> {
    stateTopic: string;
    commandTopic: string;
    fetchStateTopic: string;
    payloadFormat: "json" | "string" | "number" | "boolean";
    optimistic: boolean;
    update = (): boolean => this._update({});
    private _state: Readonly<TState>;

    constructor(
        senses: ISenses,
        stateTopic: string,
        commandTopic: string,
        fetchStateTopic: string,
        initialState: TState,
    ) {
        super(senses);
        this.stateTopic = stateTopic;
        this.commandTopic = commandTopic;
        this.fetchStateTopic = fetchStateTopic;
        this.payloadFormat = "json";
        this.optimistic = false;
        this._state = initialState;
    }

    get mqtt(): MqttClient {
        return this.senses.mqtt;
    }

    get eventbus(): EventBus {
        return this.senses.eventbus;
    }

    getState(): Readonly<TState> {
        return this._state;
    }

    protected _publish<TPayload>(topic: string, payload: TPayload): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.mqtt?.connected) {
                this._logger.error("Can't publish mqtt message: Mqtt connection is not established");
                return;
            }

            this._logger.debug(`Device ${this.uid} are publishing mqtt message on topic:`, topic);
            this.mqtt.publish(topic, JSON.stringify(payload), (err) => {
                if (err) {
                    reject(err);
                }

                this._logger.trace("Published mqtt message", this.uid, topic, payload);
                resolve();
            });
        });
    }

    requestState(): void {
        if (this.fetchStateTopic) {
            this._publish(this.fetchStateTopic, null);
        }
    }

    private _parseMessage(message: string): any {
        switch (this.payloadFormat) {
            case "boolean":
                return ["true", "yes", "1", "ok", "valid", "on", "available"].includes(message);
            case "number":
                return Number(message);
            case "string":
                return String(message);
            case "json":
                try {
                    return JSON.parse(message);
                } catch (err) {
                    this._logger.warn("Can't parse JSON payload:", err);
                    return message;
                }
            default:
                throw new Error(`Invalid payload format: ${this.payloadFormat}`);
        }
    }

    private _parseDate(encoded: number | string) {
        if (typeof encoded === "number") {
            return new Date(encoded);
        }

        return parseISO(encoded);
    }

    public onMqttMessage(topic: string, message: string): void {
        if (!matches(this.stateTopic, topic)) return;

        const payload = this._parseMessage(message);
        const topicParams = exec(this.stateTopic, topic) ?? {};
        const newState = pure(this._mapState({ ...payload, ...topicParams }));

        this._logger.trace("Incoming device state payload via MQTT", payload);

        try {
            this.lastUpdate = payload._updatedAt ? this._parseDate(payload._updatedAt) : new Date();
        } catch (err) {
            this.lastUpdate = new Date();
            this._logger.warn("Can't parse update date in state payload", err);
        }

        this._update(newState);
    }

    private _setInternalState(newState: Partial<TState>, force = false): boolean {
        if (!force && isEmptyObject(newState)) return false;

        const nextState = Object.assign({}, this._state, newState ?? {});

        if (force || !equal(this._state, nextState)) {
            this._state = Object.freeze(nextState);
            this.eventbus?.emit("device.state_update", this, this.senses);

            return true;
        }

        return false;
    }

    protected abstract _mapState(payload: unknown): Partial<TState>;

    public get available(): boolean {
        if (this.keepalive) {
            return this.lastAlive != null && differenceInMilliseconds(new Date(), this.lastAlive) < this.timeout;
        }

        return true;
    }

    protected _update(patch: Partial<TState>): boolean {
        const snapshot = this.getState();

        if (snapshot && snapshot._available !== this.available) {
            patch._available = this.available;
        }

        return this._setInternalState(patch);
    }

    subscribeTopics(): Promise<ISubscriptionGrant[]> {
        return new Promise((resolve, reject) => {
            this.mqtt?.subscribe(this.stateTopic, (err, granted) => {
                if (err) reject(err);

                this.requestState();
                consola.trace(granted);
                resolve(granted);
            });
        });
    }

    updateFromShake(shake: Handshake): void {
        const stateTopic = shake.comm?.find((c) => c.type === "state")?.topic || `${shake.uid}/state`;
        const setTopic = shake.comm?.find((c) => c.type === "set")?.topic || `${shake.uid}/set`;
        const getTopic = shake.comm?.find((c) => c.type === "fetch")?.topic || `${shake.uid}/get`;

        super.updateFromShake(shake);
        this.payloadFormat = shake.stateFormat || "json";
        this.stateTopic = stateTopic;
        this.commandTopic = setTopic;
        this.fetchStateTopic = getTopic;
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
