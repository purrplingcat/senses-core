import consola from "consola";
import { Application } from "express";
import { MqttClient } from "mqtt";
import Home from "~devices/Home";
import SceneController, { ISceneController } from "~scene/SceneController";
import Device from "~devices/Device";
import { IGroup } from "~devices/Group";
import { IRoom } from "~devices/Room";
import drivers, { DriverMap } from "~drivers";
import Discovery from "./Discovery";
import Entity from "./Entity";
import EventBus from "./EventBus";
import Handshake from "./Handshake";
import Component from "./Component";
import IService from "./Service";
import StateMachine, { IStateMachine } from "./StateMachine";
import { IRenderer, Renderer } from "./template";

export interface ISenses {
    config: any;
    components: Component[];
    debug: boolean;
    eventbus: EventBus;
    mqtt: MqttClient;
    drivers: DriverMap;
    devices: Device[];
    services: IService[];
    rooms: IRoom[];
    groups: IGroup[];
    scenes: ISceneController;
    domain: string;
    name: string;
    states: IStateMachine;
    renderer: IRenderer;
    isRunning: boolean;
    hasDevice(uidOrEntityId: string): boolean;
    fetchDevice(uidOrEntityId: string): Device;
    addDevice(device: Device): void;
    addService(service: IService): void;
    addRoom(room: IRoom): void;
    callService<TParams>(name: string, params: TParams): Promise<boolean>;
    getUid(): string;
    handshake(): void;
    ready(callback?: () => void): Promise<void>;
    waitOn<T>(componentName: string): Promise<T>;
}

export class Senses implements ISenses {
    config: any;
    debug: boolean;
    eventbus: EventBus;
    mqtt: MqttClient;
    http?: Application;
    states: IStateMachine;
    drivers: DriverMap;
    devices: Device[];
    services: IService[];
    rooms: IRoom[];
    groups: IGroup[];
    components: Component[];
    scenes: ISceneController;
    domain: string;
    name: string;
    startAt: number;
    renderer: IRenderer;
    home: Home;
    private _uid: string;
    private _discovery?: Discovery;
    private _isReady = false;
    private _loopTimeout: NodeJS.Timeout | null = null;
    private _loop = () => {
        this._update();
        this._loopTimeout = setTimeout(this._loop, 1000);
    };

    constructor(mqtt: MqttClient, domain: string, name: string, debug = false) {
        this._uid = `AC-${domain}-senses-${process.env.NODE_INSTANCE_ID || 0}-${process.pid}-${Date.now()}`;
        this.eventbus = new EventBus(this);
        this.config = {};
        this.devices = [];
        this.services = [];
        this.rooms = [];
        this.groups = [];
        this.components = [];
        this.mqtt = mqtt;
        this.states = new StateMachine();
        this.startAt = 0;
        this.domain = domain;
        this.name = name;
        this.debug = debug;
        this.drivers = { ...drivers };
        this.scenes = new SceneController(this);
        this.renderer = new Renderer(this);
        this.home = new Home(this);
    }

    get isRunning(): boolean {
        return this._isReady && this.startAt != null;
    }

    ready(callback?: () => void): Promise<void> {
        return new Promise((resolve) => {
            const onStart = () => {
                callback && callback();
                return resolve();
            };

            if (this.isRunning) {
                return onStart();
            }

            this.eventbus.once("start", onStart);
        });
    }

    waitOn<T>(componentName: string): Promise<T> {
        return new Promise((resolve, reject) => {
            const component = this.components.find((c) => c.name === componentName);

            if (!component) {
                return reject(new Error(`Unknown component: ${componentName}`));
            }

            if (component.isLoaded) {
                return resolve(component.exports as unknown as T);
            }

            component.once("loaded", () => resolve(component.exports as unknown as T));
        });
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

        const result = await service.call(params, this);
        this.eventbus.emit("service.called", service, params, result);

        return result;
    }

    hasDevice(uidOrEntityId: string): boolean {
        return this.devices.find((d) => d.uid === uidOrEntityId || d.entityId === uidOrEntityId) != null;
    }

    fetchDevice(uidOrEntityId: string): Device {
        const device = this.devices.find((d) => d.uid === uidOrEntityId || d.entityId === uidOrEntityId);

        if (!device) {
            throw new Error(`Device '${uidOrEntityId}' not found`);
        }

        return device;
    }

    addDevice(device: Device): void {
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
        this.addGroup({ name: `room.${room.name}`, title: room.title, type: "room" });
        this.eventbus.emit("room.add", room, this);
        consola.debug("Registered new room:", room.name);
    }

    addGroup(group: IGroup): void {
        if (this.groups.find((g) => g.name === group.name)) {
            throw new Error(`Group with name '${group.name}' already exists`);
        }

        this.groups.push(group);
        this.eventbus.emit("group.add", group, this);
        consola.debug("Registered new group:", group.name);
    }

    getEntities(): Entity[] {
        return [this.home, ...this.devices, ...this.rooms];
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

        this.eventbus.on("device.updated", (device) => {
            this.states.updateState("device", device.uid, () => ({
                uid: device.uid,
                available: device.available,
                props: device.getState(),
            }));
        });

        if (this._loopTimeout) {
            clearTimeout(this._loopTimeout);
        }

        this._loop();
        this._isReady = true;
        this.eventbus.emit("start", this);
        consola.success("Senses assistant ready");
    }

    handshake(expectReplies = true): void {
        this._discovery?.handshake(expectReplies);
    }

    private _update() {
        if (!this.isRunning) {
            return;
        }

        for (const device of this.devices) {
            device.update();
        }

        this.eventbus.emit("update");
    }
}
