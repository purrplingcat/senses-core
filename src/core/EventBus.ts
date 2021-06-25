import EventEmitter from "events";
import { MqttClient } from "mqtt";
import Device from "../devices/Device";
import { ISenses } from "./Senses";

export type DeviceListener = (device: Device<unknown>, sense: ISenses) => void;
export type SensesListener = (senses: ISenses) => void;
export type MqttConnectListener = (mqtt: MqttClient) => void;

declare interface EventBus {
    emit(event: "start", senses: ISenses): boolean;
    emit(event: "mqtt.connect", mqtt: MqttClient): boolean;
    emit(event: "mqtt.message", topic: string, message: string): boolean;
    emit(event: "device.add", ...args: Parameters<DeviceListener>): boolean;
    emit(event: "device.state_update", ...args: Parameters<DeviceListener>): boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emit(event: string, ...args: any[]): boolean;

    on(event: "start", listener: SensesListener): this;
    on(event: "mqtt.connect", listener: MqttConnectListener): this;
    on(event: "mqtt.message", listener: (topic: string, message: string) => void): this;
    on(event: "device.add", listener: DeviceListener): this;
    on(event: "device.state_update", listener: DeviceListener): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, listener: (...args: any[]) => void): this;
}

class EventBus extends EventEmitter {
    senses: ISenses;

    constructor(senses: ISenses) {
        super();
        this.senses = senses;
    }
}

export default EventBus;
