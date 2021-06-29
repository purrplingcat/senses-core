import consola from "consola";
import mqtt from "mqtt";
import UIDGenerator from "uid-generator";
import MqttLight from "./MqttLight";
import { ISenses } from "../core/Senses";
import { YAMLMap } from "yaml/types";
import Handshake, { decodeDeviceType, DeviceType } from "../core/Handshake";
import Device from "../devices/Device";
import Light from "../light/Light";

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

        if (type.mimeType !== "device/light") {
            return;
        }

        if (senses.hasDevice(shake.uid)) {
            const device = senses.fetchDevice(shake.uid) as MqttLight;

            updateDeviceInfo(device, shake, type);
            consola.info(`Updated device ${device.uid}`);

            return device.requestState();
        }

        const light = registerNewDevice(senses, shake, type);
        consola.info(`Discovered device ${light.entityId} (${light.uid})`);
    });
}

function registerNewDevice(senses: ISenses, shake: Handshake, type: DeviceType) {
    if (!senses.mqtt) {
        throw new Error("MQTT client is not established to add device!");
    }

    const light = createDevice(senses, shake) as MqttLight;
    updateDeviceInfo(light, shake, type);

    light.mqtt = senses.mqtt;
    light.mqtt.subscribe(light.stateTopic, (err, granted) => {
        if (!err) {
            light.requestState();
            consola.trace(granted);
        }
    });

    senses.eventbus.on("mqtt.message", (topic: string, message: string) => {
        if (topic === light.stateTopic) {
            light.onMqttMessage(message);
        }
    });

    if (light.keepalive) {
        senses.eventbus.on("discovery.alive", (uid: string, stamp: Date) => {
            if (light.uid === uid) {
                light.lastAlive = stamp;
                consola.debug(`${light.uid} updated their last active time`);
            }
        });
        senses.eventbus.on("discovery.death", (uid: string) => {
            if (light.uid === uid) {
                light.lastAlive = undefined;
                console.log(light.lastAlive);
                consola.debug(`${light.uid} is dead now`);
            }
        });
    }

    senses.addDevice(light);

    return light;
}

function createDevice(senses: ISenses, shake: Handshake): Device<unknown> {
    const stateTopic = shake.comm?.find((c) => c.type === "state")?.topic || `${shake.uid}/state`;
    const setTopic = shake.comm?.find((c) => c.type === "set")?.topic || `${shake.uid}/set`;
    const getTopic = shake.comm?.find((c) => c.type === "fetch")?.topic || `${shake.uid}/get`;

    return new MqttLight(stateTopic, setTopic, getTopic);
}

function updateDeviceInfo(light: MqttLight, shake: Handshake, type: DeviceType) {
    const stateTopic = shake.comm?.find((c) => c.type === "state")?.topic || `${shake.uid}/state`;
    const setTopic = shake.comm?.find((c) => c.type === "set")?.topic || `${shake.uid}/set`;
    const getTopic = shake.comm?.find((c) => c.type === "fetch")?.topic || `${shake.uid}/get`;

    light.uid = shake.uid;
    light.name = shake.alias || encodeEntityName(shake.name);
    light.title = shake.name;
    light.class = type.class;
    light.features = asArray(shake.features);
    light.keepalive = shake.keepalive;
    light.timeout = shake.keepaliveTimeout;
    light.stateTopic = stateTopic;
    light.commandTopic = setTopic;
    light.fetchStateTopic = getTopic;
}

export function setupPlatform(platform: string, senses: ISenses, config: YAMLMap): void | Promise<void> {
    if (!platforms.includes(platform)) {
        throw new Error(`MQTT lights: Unsupported platform ${platform}`);
    }

    const generator = new UIDGenerator();
    const light = new MqttLight(config.get("stateTopic"), config.get("commandTopic"), config.get("fetchStateTopic"));

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
