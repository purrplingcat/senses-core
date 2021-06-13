/* eslint-disable prettier/prettier */
import consola from "consola";
import { Application } from "express";
import { MqttClient } from "mqtt";
import Device from "../devices/Device";
import Entity from "./Entity";
import EventBus from "./EventBus";
import IService from "./Service";

export interface ISenses {
    debug: boolean;
    eventbus: EventBus;
    mqtt?: MqttClient;
    http?: Application;
    devices: Device<unknown>[];
    services: IService[];
    addDevice<TState>(device: Device<TState>): void;
    addService(service: IService): void;
    callService<TParams>(name: string, params: TParams): Promise<boolean>;
}

export class Senses implements ISenses {
    debug = false;
    eventbus: EventBus;
    mqtt?: MqttClient;
    http?: Application;
    devices: Device<unknown>[];
    services: IService[];

    constructor() {
        this.eventbus = new EventBus(this);
        this.devices = [];
        this.services = [];
    }

    addService(service: IService): void {
        if (this.services.findIndex((s) => s.name === service.name) != -1) {
            throw new Error(`Service with name '${service.name}' already exists`);
        }

        this.services.push(service);
    }

    async callService<TParams>(name: string, params: TParams): Promise<boolean> {
        const service = this.services.find((s) => s.name === name);

        if (service == null) {
            throw new Error(`Can't call unknown service '${name}'`);
        }

        return await service.call(params, this);
    }

    addDevice<TState>(device: Device<TState>): void {
        this.devices.push(device);
        this.eventbus.emit("device.add", device, this);
        consola.debug(`Added device ${device.name} type ${device.type} (${device.constructor.name})`);
    }

    getEntities(): Entity[] {
        return [
            ...this.devices,
        ];
    }

    start(): void {
        if (this.mqtt == null) {
            throw new Error("MQTT client is not configured");
        }

        this.mqtt.on("connect", () => {
            this.eventbus.emit("mqtt.connect", this.mqtt);
        });

        this.mqtt.on("message", (topic, message) => {
            this.eventbus.emit("mqtt.message", topic, message);
        });

        this.mqtt.on("error", (err) => {
            this.eventbus.emit("mqtt.error", err);
            consola.error(err);
        });

        consola.success("Senses assistant ready");
        this.eventbus.emit("start", this);
    }
}
