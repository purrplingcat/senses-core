import consola from "consola";
import { differenceInMilliseconds, isAfter, isDate, parseISO } from "date-fns";
import { equal } from "fast-shallow-equal";
import { ISubscriptionGrant, MqttClient, QoS } from "mqtt";
import { exec, matches, fill, clean } from "mqtt-pattern";
import EventBus from "../core/EventBus";
import Handshake from "../core/Handshake";
import { ISenses } from "../core/Senses";
import { isDefined, isEmptyObject, isIncluded, parseBoolean, pick, pure } from "~utils";
import { Payload, StringMap } from "../types/senses";
import Device from "./Device";
import { extraAttr } from "./metadata";

type OutgoingMessage = {
    topic: string;
    payload: unknown;
    qos?: QoS;
};

export type TopicRoute = {
    topic: string;
    name?: string;
    format?: string;
    contains?: string[];
    notContains?: string[];
    pick?: string[];
    qos?: QoS;
    template?: string;
};

export interface DeviceState {
    _available: boolean;
    _updatedAt: number;
}

export default abstract class BaseDevice<TState extends DeviceState = DeviceState> extends Device<TState> {
    subscribers: TopicRoute[];
    publishers: TopicRoute[];
    polls: string[];
    optimistic: boolean;
    incremental: boolean;
    @extraAttr
    platform?: "rest" | "ws-events" | "zwave" | "zwavejs" | "modbus" | "zigbee" | "ip" | "modbus-tcp";
    update = (): boolean => this._update({}, false);
    private _state: Readonly<TState>;
    protected _config: any;

    constructor(senses: ISenses, initialState: TState) {
        super(senses);
        this.subscribers = [];
        this.publishers = [];
        this.polls = [];
        this.optimistic = false;
        this.incremental = false;
        this._state = initialState;
    }

    get mqtt(): MqttClient {
        return this.senses.mqtt;
    }

    get eventbus(): EventBus {
        return this.senses.eventbus;
    }

    get lastUpdate(): Date {
        return new Date(this._state._updatedAt);
    }

    getState(): Readonly<TState> {
        return this._state;
    }

    protected _publish<TPayload>(topic: string, payload: TPayload, qos?: QoS): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.mqtt?.connected) {
                this._logger.error("Can't publish mqtt message: Mqtt connection is not established");
                return;
            }

            const message = typeof payload === "string" ? payload : JSON.stringify(payload);
            this._logger.debug(`Device ${this.uid} are publishing mqtt message on topic:`, topic);
            this.mqtt.publish(topic, message, { qos }, (err) => {
                if (err) {
                    reject(err);
                }

                this._logger.trace("Published mqtt message", this.uid, topic, payload);
                resolve();
            });
        });
    }

    requestState(): void {
        this.polls.forEach((topic) => this._publish(topic, ""));
    }

    private _parseJson(message: string): any {
        try {
            return JSON.parse(message);
        } catch (err) {
            this._logger.warn("Can't parse JSON payload:", err, message);
            return {};
        }
    }

    private _formatValue(value: unknown, publisher: TopicRoute, context: Payload): unknown {
        const renderTemplateValue = () => {
            if (!publisher.template) {
                this._logger.warn("No template specified", publisher);
                return "";
            }

            return this.senses.renderer.render(publisher.template, {
                value,
                context,
                state: this.getState(),
                device: this,
            });
        };

        switch (publisher.format) {
            case "string":
                return String(value);
            case "number":
                return Number(value);
            case "boolean":
                return Boolean(value);
            case "raw":
                return value;
            case "void":
                return "";
            case "template":
                return renderTemplateValue();
            case "template-json":
                return this._parseJson(renderTemplateValue());
            case "zwavejs":
                return { value };
            default:
                this._logger.error(`Unknown payload format '${publisher.format}'`);
        }
    }

    private _formatPayload(publisher: TopicRoute, payload: Payload): unknown {
        const name = publisher.name;
        const value = name ? payload[name] : payload;

        if (!isDefined(value)) return;

        if (!publisher.format) {
            return this._createPayload(value);
        }

        return this._formatValue(value, publisher, payload);
    }

    private _parseMessage(message: string, topicParams: StringMap, subscription: TopicRoute): Payload {
        const name: string = subscription.name || topicParams._name || "";
        const payload: Payload = { ...topicParams, _name: name };

        if (!subscription.format) {
            return Object.assign(payload, this._parseJson(message));
        }

        if (!name) this._logger.warn("Missing parameter 'name' in subscription:", payload);

        switch (subscription.format) {
            case "string":
                Reflect.set(payload, name, String(message));
                break;
            case "number":
                Reflect.set(payload, name, Number(message));
                break;
            case "boolean":
                Reflect.set(payload, name, parseBoolean(message));
                break;
            case "object":
                Reflect.set(payload, name, { ...this._parseJson(message) });
                break;
            case "list":
                Reflect.set(payload, name, Array.from(this._parseJson(message)));
                break;
            case "json-string":
                Reflect.set(payload, name, String(this._parseJson(message)));
                break;
            case "raw":
                Reflect.set(payload, name, message);
                break;
            case "void":
                break;
            case "zwavejs":
                const raw = this._parseJson(message);

                Reflect.set(payload, name, raw.value);
                Reflect.set(payload, "_updatedAt", raw.time);
                break;
            default:
                this._logger.error(`Unknown payload format '${subscription.format}'`);
        }

        return payload;
    }

    protected _parseDate(encoded: number | string | Date): Date {
        if (isDate(encoded)) {
            return <Date>encoded;
        }

        if (typeof encoded === "number") {
            return new Date(encoded);
        }

        return parseISO(<string>encoded);
    }

    public onMqttMessage(topic: string, message: string): void {
        try {
            for (const subscriber of this.subscribers) {
                // Pass next route when unmatched topic or unprocessed message
                if (matches(subscriber.topic, topic) && this._processMessage(subscriber, topic, message)) {
                    return;
                }
            }
        } catch (err) {
            this._logger.error(`${this.uid} failed during processing mqtt message:`, err);
        }
    }

    private _processMessage(subscription: TopicRoute, topic: string, message: string): boolean {
        const topicParams = exec(subscription.topic, topic) ?? {};
        const payload = this._parseMessage(message, topicParams, subscription);

        this._logger.trace("Incoming device state payload via MQTT", subscription.topic, topic, payload);

        for (const key in payload) {
            // Ignore this topic and try next when contains and notContains conditions aren't match for this payload key
            if (!isIncluded(key, subscription.contains, subscription.notContains)) {
                this._logger.trace(`Discard payload: Param ${key} is not included`);
                return false;
            }
        }

        const newState = pure(
            // Only picked fields could be set in state. If subscription.pick is not defined, all fields are picked
            this._mapState(Array.isArray(subscription.pick) ? pick(payload, subscription.pick) : payload),
        );

        if (!isEmptyObject(newState)) {
            try {
                newState._updatedAt = this._parseDate(payload._updatedAt ?? Date.now()).getTime();
            } catch (err) {
                newState._updatedAt = Date.now();
                this._logger.warn("Can't parse update date in state payload", err);
            }

            if (!this.incremental || isAfter(newState._updatedAt, this.lastUpdate)) {
                this._update(newState, false);
            }
        }

        return true;
    }

    private _setInternalState(newState: Partial<TState>, force = false): boolean {
        if (!force && isEmptyObject(newState)) return false;

        const nextState = Object.freeze({ ...this._state, ...newState });

        if (force || !equal(this._state, nextState)) {
            const prevState = this._state;

            this._state = nextState;
            this.eventbus?.emit("device.state_changed", this, nextState, prevState);

            return true;
        }

        return false;
    }

    protected abstract _mapState(payload: Payload): Partial<TState>;
    protected abstract _createPayload(state: Partial<TState>): Payload;

    private *_mapOutgoingMessages(payload: Payload): Generator<OutgoingMessage> {
        for (const publisher of this.publishers) {
            if (!publisher.topic) {
                this._logger.error("Publisher topic is not set", publisher);
                continue;
            }

            const topic = fill(publisher.topic, { ...payload, _name: publisher.name });

            if (!isIncluded(Object.keys(payload), publisher.contains, publisher.notContains)) {
                continue;
            }

            yield {
                topic,
                payload: this._formatPayload(publisher, payload),
                qos: publisher.qos,
            };
        }
    }

    setState(state: Partial<TState>): boolean | Promise<boolean> {
        const payload = pure(state);

        if (typeof payload !== "object") {
            throw new Error(`${this.uid}: Invalid type '${typeof payload}' - Outgoing payload must be an object`);
        }

        for (const message of this._mapOutgoingMessages(payload)) {
            if (!message.topic || !isDefined(message.payload)) continue;

            this._publish(message.topic, message.payload, message.qos).catch((err) =>
                this._logger.error(`${this.uid}:`, err),
            );
        }

        if (this.optimistic) {
            this._update(state, true);
        }

        return true;
    }

    public get available(): boolean {
        return this._state._available;
    }

    protected checkAvailability(): boolean {
        if (this.keepalive) {
            if (this.timeout > 0) {
                return this.lastAlive != null && differenceInMilliseconds(new Date(), this.lastAlive) < this.timeout;
            }

            return this.lastAlive != null;
        }

        return true;
    }

    protected _update(patch: Partial<TState>, force: boolean): boolean {
        const isAvailable = this.checkAvailability();

        if (this.available !== isAvailable) {
            patch._available = isAvailable;
        }

        const updated = this._setInternalState(patch, force);

        if (force || updated) {
            this.eventbus?.emit("device.updated", this, this.senses);
            return true;
        }

        return false;
    }

    subscribeTopics(): Promise<ISubscriptionGrant[]> {
        return new Promise((resolve, reject) => {
            const topics = this.subscribers.map((s) => clean(s.topic));

            this.mqtt?.subscribe(topics, (err, granted) => {
                if (err) reject(err);

                this.requestState();
                consola.trace(granted);
                resolve(granted);
            });
        });
    }

    override updateFromShake(shake: Handshake): void {
        super.updateFromShake(shake);
        this.subscribers = shake.comm?.filter((c) => c.type === "state") || [];
        this.publishers = shake.comm?.filter((c) => c.type === "set") || [];
        this.polls = shake.comm?.filter((c) => c.type === "fetch").map((c) => c.topic) || [];
        this.incremental = Boolean(shake.additional?.incremental ?? this.incremental);
        this.platform = shake.platform;
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    setupFromConfig(config: any): void {
        this._config = config;
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
