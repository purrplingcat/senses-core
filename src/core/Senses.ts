import consola from "consola";
import { Application } from "express";
import { MqttClient } from "mqtt";
import Device from "../devices/Device";
import { IRoom } from "../devices/Room";
import Discovery from "./Discovery";
import Entity from "./Entity";
import EventBus from "./EventBus";
import Handshake from "./Handshake";
import IService from "./Service";

export interface ISenses {
    debug: boolean;
    eventbus: EventBus;
    mqtt?: MqttClient;
    http?: Application;
    devices: Device<unknown>[];
    services: IService[];
    rooms: IRoom[];
    domain: string;
    name: string;
    states: Record<string, boolean>;
    hasDevice(uidOrEntityId: string): boolean;
    fetchDevice(uidOrEntityId: string): Device<unknown>;
    addDevice<TState>(device: Device<TState>): void;
    addService(service: IService): void;
    addRoom(room: IRoom): void;
    callService<TParams>(name: string, params: TParams): Promise<boolean>;
    getUid(): string;
    handshake(): void;
}

export class Senses implements ISenses {
    debug: boolean;
    eventbus: EventBus;
    mqtt?: MqttClient;
    http?: Application;
    states: Record<string, boolean>;
    devices: Device<unknown>[];
    services: IService[];
    rooms: IRoom[];
    domain: string;
    name: string;
    startAt: number;
    private _uid: string;
    private _discovery?: Discovery;

    constructor(domain: string, name: string, debug = false) {
        this._uid = `AC-${domain}-senses-${process.env.NODE_INSTANCE_ID || 0}-${process.pid}-${Date.now()}`;
        this.eventbus = new EventBus(this);
        this.devices = [];
        this.services = [];
        this.rooms = [];
        this.states = {};
        this.startAt = 0;
        this.domain = domain;
        this.name = name;
        this.debug = debug;
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

    hasDevice(uidOrEntityId: string): boolean {
        return !!this.devices.find((d) => d.uid === uidOrEntityId || d.entityId === uidOrEntityId);
    }

    fetchDevice(uidOrEntityId: string): Device<unknown> {
        const device = this.devices.find((d) => d.uid === uidOrEntityId || d.entityId === uidOrEntityId);

        if (!device) {
            throw new Error(`Device '${uidOrEntityId}' not found`);
        }

        return device;
    }

    addDevice<TState>(device: Device<TState>): void {
        if (device.uid && this.devices.find((d) => d.uid === device.uid)) {
            throw new Error(`Device with uid ${device.uid} already exists`);
        }

        this.devices.push(device);
        this.eventbus.emit("device.add", device, this);
        consola.debug(`Added device ${device.name} type ${device.type} (${device.constructor.name})`);
    }

    addRoom(room: IRoom): void {
        if (this.rooms.find((r) => r.name === room.name)) {
            throw new Error(`Room with name '${room.name}' already exists`);
        }

        this.rooms.push(room);
        this.eventbus.emit("room.add", room, this);
        consola.debug("Registered new room:", room.name);
    }

    getEntities(): Entity[] {
        return [...this.devices, ...this.rooms];
    }

    getUid(): string {
        return this._uid;
    }

    getHandshakePacket(): Handshake {
        const uid = this.getUid();

        return {
            uid,
            alias: `assistant.${this.domain}-senses`,
            name: this.name,
            type: "application/assistant",
            available: true,
            product: "Senses",
            vendor: "PurrplingCat",
            keepalive: true,
            keepaliveTimeout: 2000,
            _version: "1.0",
        };
    }

    start(): void {
        if (this.startAt > 0) {
            throw new Error("Senses already started!");
        }

        this.startAt = Date.now();

        if (this.mqtt == null) {
            throw new Error("MQTT client is not configured");
        }

        this._discovery = new Discovery(this.mqtt, () => this.getHandshakePacket());
        this._discovery.on("alive", (uid, stamp) => this.eventbus.emit("discovery.alive", uid, stamp, "mqtt"));
        this._discovery.on("death", (uid, stamp) => {
            this.eventbus.emit("discovery.death", uid, stamp, "mqtt");
            this.devices
                .filter((d) => d.via && d.via === uid && d.available)
                .forEach((d) => this.eventbus.emit("discovery.death", d.uid, new Date(), "cascade"));
        });
        this._discovery.on("handshake", (shake, stamp) =>
            this.eventbus.emit("discovery.handshake", shake, stamp, "mqtt"),
        );

        this.mqtt.on("connect", () => {
            this.eventbus.emit("mqtt.connect", this.mqtt);
        });

        this.mqtt.on("message", (topic, message) => {
            this.eventbus.emit("mqtt.message", topic, message.toString());
        });

        this.mqtt.on("error", (err) => {
            this.eventbus.emit("mqtt.error", err);
            consola.error(err);
        });

        this.eventbus.on("device.state_update", (device) => {
            this.states[device.uid] = device.available;
        });

        consola.success("Senses assistant ready");
        this.eventbus.emit("start", this);
    }

    handshake(expectReplies = true): void {
        this._discovery?.handshake(expectReplies);
    }
}
