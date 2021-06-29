import consola from "consola";
import mqtt from "mqtt";
import UIDGenerator from "uid-generator";
import { ISenses } from "../core/Senses";
import { YAMLMap } from "yaml/types";
import Handshake, { decodeDeviceType, DeviceType } from "../core/Handshake";
import Light from "../light/Light";
import MqttDevice from "./MqttDevice";

export const name = "mqtt";
export const domain = "mqtt";
export const platforms = ["light"];

function asArray<T>(val: unknown): T[] {
    if (!val) {
        return [];
    }

    return Array.from(val as T[]);
}

function encodeEntityName(name: string): string {
    return encodeURIComponent(name.toLowerCase().replace(" ", "_"));
}

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

        if (type.kind !== "device") {
            return;
        }

        if (senses.hasDevice(shake.uid)) {
            const device = senses.fetchDevice(shake.uid);

            if (device instanceof MqttDevice) {
                updateDeviceInfo(device, shake, type);
                device.requestState();
                consola.info(`Updated device ${device.uid}`);
            }

            return;
        }

        const light = registerNewDevice(senses, shake, type);
        consola.info(`Discovered device ${light.entityId} (${light.uid})`);
    });
}

function registerNewDevice(senses: ISenses, shake: Handshake, type: DeviceType) {
    if (!senses.mqtt) {
        throw new Error("MQTT client is not established to add device!");
    }

    const device = createDevice(shake, type);
    updateDeviceInfo(device, shake, type);

    device.mqtt = senses.mqtt;
    device.mqtt.subscribe(device.stateTopic, (err, granted) => {
        if (!err) {
            device.requestState();
            consola.trace(granted);
        }
    });

    senses.eventbus.on("mqtt.message", (topic: string, message: string) => {
        if (topic === device.stateTopic) {
            device.onMqttMessage(message);
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
            if (device.uid === uid) {
                device.lastAlive = undefined;
                consola.debug(`${device.uid} is dead now`);
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
        default:
            const generic = new Light(stateTopic, setTopic, getTopic);
            generic.type = "generic";
            consola.info(`Unknown device type ${type.type}: Fallback to generic device`);

            return generic;
    }
}

function updateDeviceInfo(device: MqttDevice, shake: Handshake, type: DeviceType) {
    const stateTopic = shake.comm?.find((c) => c.type === "state")?.topic || `${shake.uid}/state`;
    const setTopic = shake.comm?.find((c) => c.type === "set")?.topic || `${shake.uid}/set`;
    const getTopic = shake.comm?.find((c) => c.type === "fetch")?.topic || `${shake.uid}/get`;

    device.uid = shake.uid;
    device.name = shake.alias || encodeEntityName(shake.name);
    device.title = shake.name;
    device.class = type.class;
    device.features = asArray(shake.features);
    device.keepalive = shake.keepalive;
    device.timeout = shake.keepaliveTimeout;
    device.stateTopic = stateTopic;
    device.commandTopic = setTopic;
    device.fetchStateTopic = getTopic;
    device.product = shake.product;
    device.vendor = shake.vendor;
    device.serialNumber = shake.serialNo;
    device.model = shake.model;
}

export function setupPlatform(platform: string, senses: ISenses, config: YAMLMap): void | Promise<void> {
    if (!platforms.includes(platform)) {
        throw new Error(`MQTT lights: Unsupported platform ${platform}`);
    }

    const generator = new UIDGenerator();
    const light = new Light(config.get("stateTopic"), config.get("commandTopic"), config.get("fetchStateTopic"));

    light.name = config.get("name");
    light.uid = `Q-${light.name}-${generator.generateSync()}}`;
    light.title = config.get("title") || light.name;
    light.class = config.get("class") || "light";
    light.features = asArray(config.get("features")?.toJSON());

    senses.eventbus.on("mqtt.connect", (mqtt) => {
        light.mqtt = mqtt;
        mqtt.subscribe(light.stateTopic, (err, granted) => {
            if (!err) {
                light.requestState();
                consola.trace(granted);
            }
        });
    });
    senses.eventbus.on("mqtt.message", (topic: string, message: string) => {
        if (topic === light.stateTopic) {
            light.onMqttMessage(message);
        }
    });

    senses.addDevice(light);
}
