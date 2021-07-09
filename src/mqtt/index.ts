import consola from "consola";
import mqtt from "mqtt";
import UIDGenerator from "uid-generator";
import { ISenses } from "../core/Senses";
import { YAMLMap } from "yaml/types";
import Handshake, { decodeDeviceType, DeviceType } from "../core/Handshake";
import Light from "./Light";
import MqttDevice from "./MqttDevice";
import Sensor from "./Sensor";
import { asArray } from "../core/utils";

export const name = "mqtt";
export const domain = "mqtt";
export const platforms = ["light", "sensor"];

function createMqttClient(brokerUrl: string) {
    consola.info("Connecting to mqtt broker ...");
    const mqttClient = mqtt.connect(brokerUrl);

    mqttClient.on("connect", () => {
        mqttClient.publish("senses/presence", "online");
        consola.success("MQTT connection established");
    });

    return mqttClient;
}

export function setup(senses: ISenses, config: YAMLMap): void {
    senses.mqtt = createMqttClient(config.get("brokerUrl"));
    senses.eventbus.on("discovery.handshake", (shake: Handshake) => {
        const type = decodeDeviceType(shake.type || "");

        if (!senses.mqtt) {
            throw new Error("MQTT client is not established to add device!");
        }

        if (type.kind !== "device") {
            return;
        }

        if (senses.hasDevice(shake.uid)) {
            const device = senses.fetchDevice(shake.uid);

            if (device instanceof MqttDevice) {
                updateDeviceInfo(device, shake);

                if (!device.tags.includes("discovered")) {
                    device.tags.push("discovered");
                }

                device.requestState();
                consola.info(`Updated device ${device.uid}`);
            }

            return;
        }

        try {
            const device = registerNewDevice(senses, shake, type);

            if (!device.tags.includes("discovered")) {
                device.tags.push("discovered");
            }

            device.subscribeTopics();
            consola.info(`Discovered device ${device.entityId} (${device.uid})`);
        } catch (err) {
            consola.warn(`Can't register device ${shake.uid} via discovery:`, err);
        }
    });
}

function registerNewDevice(senses: ISenses, shake: Handshake, type: DeviceType) {
    const device = createDevice(shake, type);
    updateDeviceInfo(device, shake);

    device.mqtt = senses.mqtt;
    device.eventbus = senses.eventbus;

    senses.eventbus.on("mqtt.message", (topic: string, message: string) => {
        if (topic === device.stateTopic) {
            device.onMqttMessage(message);
        }
    });

    senses.eventbus.on("mqtt.connect", (mqtt) => {
        if (mqtt.connected && !mqtt.disconnecting) {
            device.subscribeTopics();
            device.requestState();
        }
    });

    if (device.keepalive) {
        senses.eventbus.on("discovery.alive", (uid: string, stamp: Date) => {
            if (device.uid === uid) {
                device.lastAlive = stamp;
                consola.debug(`${device.uid} updated their last active time: ${stamp}`);
            }
        });
        senses.eventbus.on("discovery.death", (uid: string) => {
            if (device.uid === uid && device.lastAlive) {
                device.lastAlive = null;
                consola.debug(`${device.uid} is dead now.`);
                senses.devices
                    .filter((d) => d.via && d.via === device.uid)
                    .forEach((d) => senses.eventbus.emit("discovery.death", d.uid, new Date(), "cascade"));
            }
        });
    }

    senses.addDevice(device);

    return device;
}

function createDevice(shake: Handshake, type: DeviceType): MqttDevice {
    const stateTopic = shake.comm?.find((c) => c.type === "state")?.topic || `${shake.uid}/state`;
    const setTopic = shake.comm?.find((c) => c.type === "set")?.topic || `${shake.uid}/set`;
    const getTopic = shake.comm?.find((c) => c.type === "fetch")?.topic || `${shake.uid}/get`;

    switch (type.type) {
        case "light":
            return new Light(stateTopic, setTopic, getTopic);
        case "sensor":
            const field = Reflect.get(shake.additional as Record<string, unknown>, "field") || "value";

            return new Sensor(stateTopic, getTopic, field);
        default:
            throw new Error(`Unknown device type ${type.type}`);
    }
}

function updateDeviceInfo(device: MqttDevice, shake: Handshake) {
    device.updateFromShake(shake);
}

export function setupPlatform(platform: string, senses: ISenses, config: YAMLMap): void | Promise<void> {
    if (!platforms.includes(platform)) {
        throw new Error(`MQTT: Unsupported platform ${platform}`);
    }

    if (!config.has("name")) {
        throw new Error("Missing device name");
    }

    const type = decodeDeviceType(
        config.has("class") ? `device/${platform}, ${config.get("class")}` : `device/${platform}`,
    );
    const generator = new UIDGenerator();
    const shake: Handshake = {
        _version: "1.0",
        uid: config.get("uid") ?? `${platform}-${config.get("name")}-${generator.generateSync()}`,
        available: true,
        keepalive: false,
        keepaliveTimeout: 0,
        name: config.get("title") || config.get("name"),
        alias: config.get("name"),
        product: config.get("product") || "Senses device",
        vendor: config.get("vendor") || "Senses",
        location: config.get("room"),
        description: config.get("description"),
        stateFormat: config.get("format") || "json",
        tags: asArray<string>(config.get("tags")),
        groups: config.get("groups"),
        comm: [
            { topic: config.get("stateTopic"), type: "state" },
            { topic: config.get("setTopic"), type: "set" },
            { topic: config.get("getTopic"), type: "fetch" },
        ],
        features: asArray(config.get("features")),
        type: type.fullQualifiedType,
        additional: {
            field: config.get("field"),
        },
    };

    registerNewDevice(senses, shake, type);
}
