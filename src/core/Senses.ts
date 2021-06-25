/* eslint-disable prettier/prettier */
import consola from "consola";
import { Application } from "express";
import { MqttClient } from "mqtt";
import Device from "../devices/Device";
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
    addDevice<TState>(device: Device<TState>): void;
    addService(service: IService): void;
    callService<TParams>(name: string, params: TParams): Promise<boolean>;
    getUid(): string;
    handshake(): void;
}

export class Senses implements ISenses {
    debug: boolean;
    eventbus: EventBus;
    mqtt?: MqttClient;
    http?: Application;
    devices: Device<unknown>[];
    services: IService[];
    domain: string;
    name: string;
    startAt: number;
    private _uid: string;

    constructor(domain: string, name: string, debug = false) {
        this._uid = `AC-${domain}-senses-${process.env.NODE_INSTANCE_ID || 0}-${process.pid}-${Date.now()}`
        this.eventbus = new EventBus(this);
        this.devices = [];
        this.services = [];
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

    getUid(): string {
        return this._uid;
    }

    getHandshakePacket(): Handshake {
        const uid = this.getUid();

        return {
            uid,
            name: "Senses Home",
            type: "application/assistant",
            available: true,
            product: "Senses",
            vendor: "PurrplingCat",
            keepalive: true,
            keepaliveInterval: 2000,
            _thread: `discovery/handshake/${uid}`,
            _version: "1.0"
        };
    }

    start(): void {
        this.startAt = Date.now();

        if (this.mqtt == null) {
            throw new Error("MQTT client is not configured");
        }

        this.mqtt.on("connect", () => {
            this.mqtt?.subscribe(["discovery/+", `discovery/+/${this.getUid()}`], (err) => {
                if (err) {
                    consola.error("An error occured while subscibing discovery topic:", err);
                    return;
                }

                this.handshake();
            });

            this.eventbus.emit("mqtt.connect", this.mqtt);
        });

        this.mqtt.on("message", (topic, message) => {
            if (topic.startsWith("discovery/")) {
                return this._handleDiscovery(topic, message.toString());
            }

            this.eventbus.emit("mqtt.message", topic, message.toString());
        });

        this.mqtt.on("error", (err) => {
            this.eventbus.emit("mqtt.error", err);
            consola.error(err);
        });

        consola.success("Senses assistant ready");
        this.eventbus.emit("start", this);
    }

    handshake(expectReplies = true): void {
        const shake = this.getHandshakePacket();

        if (!expectReplies) {
            delete shake._thread;
        }

        this.mqtt?.publish("discovery/handshake", JSON.stringify(shake), (err) => {
            if (err) {
                return consola.error(`Error while sending handshake:`, err);
            }

            consola.debug(`Handshake sucessfully sent (introduction)`);
        });
    }

    private _handleDiscovery(topic: string, message: string): void {
        const split = topic.split("/");
        const discoveryType = split[1];

        switch (discoveryType) {
            case "handshake":
                const shake = JSON.parse(message) as Handshake;

                if (this.getUid() === shake.uid) {
                    return;
                }

                consola.debug(`Got handshake from '${shake.uid}' (expects reply: ${!!shake._thread})`);
                this.eventbus.emit("discovery.handshake", shake, "mqtt");

                // Reply on shake and introduce yourself if the shake has a thread
                if (shake._thread) {
                    const replyShake = this.getHandshakePacket();
                    delete replyShake._thread;

                    this.mqtt?.publish(shake._thread, JSON.stringify(replyShake), (err) => {
                        if (err) {
                            return consola.error(`Error while replying handshake:`, err, {uid: shake.uid, topic: shake._thread});
                        }

                        consola.debug(`Handshake reply sent to '${shake.uid}' on topic '${shake._thread}'`);
                    });
                }
                break;
        
            default:
                break;
        }
    }
}
