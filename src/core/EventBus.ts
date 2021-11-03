import consolaGlobalInstance from "consola";
import EventEmitter from "events";
import { MqttClient } from "mqtt";
import Device from "../devices/Device";
import { ISenses } from "./Senses";
import IService from "./Service";

export type DeviceListener = (device: Device, senses: ISenses) => void;
export type SensesListener = (senses: ISenses) => void;
export type MqttConnectListener = (mqtt: MqttClient) => void;
export type ServiceCallListener = (service: IService, params: unknown, result: boolean) => void;
export type DeviceStateChangeListener<TState = {}> = (
    device: Device<TState>,
    newState: Readonly<TState>,
    oldState: Readonly<TState>,
) => void;

declare interface EventBus {
    emit(event: "setup", ...args: Parameters<SensesListener>): boolean;
    emit(event: "start", ...args: Parameters<SensesListener>): boolean;
    emit(event: "mqtt.connect", mqtt: MqttClient): boolean;
    emit(event: "mqtt.message", topic: string, message: string): boolean;
    emit(event: "device.add", ...args: Parameters<DeviceListener>): boolean;
    emit(event: "device.updated", ...args: Parameters<DeviceListener>): boolean;
    emit(event: "device.state_changed", ...args: Parameters<DeviceStateChangeListener>): boolean;
    emit(event: "service.called", ...args: Parameters<ServiceCallListener>): boolean;
    emit(event: string, ...args: any[]): boolean;

    on(event: "setup", listener: SensesListener): this;
    on(event: "start", listener: SensesListener): this;
    on(event: "mqtt.connect", listener: MqttConnectListener): this;
    on(event: "mqtt.message", listener: (topic: string, message: string) => void): this;
    on(event: "device.add", listener: DeviceListener): this;
    on(event: "device.updated", listener: DeviceListener): this;
    on(event: "device.state_changed", listener: DeviceStateChangeListener): this;
    on(event: "service.called", listener: ServiceCallListener): this;
    on(event: string, listener: (...args: any[]) => void): this;
}

class EventBus extends EventEmitter {
    senses: ISenses;

    constructor(senses: ISenses) {
        super();
        this.senses = senses;
    }

    override emit(event: string, ...args: any[]): boolean {
        consolaGlobalInstance.withScope("eventbus").trace(`Emitting event ${event}`);
        return super.emit(event, ...args);
    }
}

export default EventBus;
