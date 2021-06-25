import consola from "consola";
import mqtt from "mqtt";
import UIDGenerator from "uid-generator";
import MqttLight from "./MqttLight";
import { ISenses } from "../core/Senses";
import { YAMLMap } from "yaml/types";
import Handshake, { decodeDeviceType } from "../core/Handshake";

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
        const type = decodeDeviceType(shake.type);

        if (type.mimeType !== "device/light" || senses.hasDevice(shake.uid)) {
            return;
        }

        const stateTopic = shake.comm?.find((c) => c.type === "state")?.topic || `${shake.uid}/state`;
        const setTopic = shake.comm?.find((c) => c.type === "set")?.topic || `${shake.uid}/set`;
        const light = new MqttLight(stateTopic, setTopic);

        light.uid = shake.uid;
        light.name = shake.alias || encodeEntityName(shake.name);
        light.title = shake.name;
        light.class = type.class;
        light.features = asArray(shake.features);

        senses.eventbus.on("mqtt.connect", (mqtt) => {
            light.mqtt = mqtt;
            mqtt.subscribe(light.stateTopic, (err, granted) => {
                if (!err) {
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
        consola.info(`Discovered device ${light.entityId} (${light.uid})`);
    });
}

export function setupPlatform(platform: string, senses: ISenses, config: YAMLMap): void | Promise<void> {
    if (!platforms.includes(platform)) {
        throw new Error(`MQTT lights: Unsupported platform ${platform}`);
    }

    const generator = new UIDGenerator();
    const light = new MqttLight(config.get("stateTopic"), config.get("commandTopic"));

    light.name = config.get("name");
    light.uid = `Q-${light.name}-${generator.generateSync()}}`;
    light.title = config.get("title") || light.name;
    light.class = config.get("class") || "light";
    light.features = asArray(config.get("features")?.toJSON());

    senses.eventbus.on("mqtt.connect", (mqtt) => {
        light.mqtt = mqtt;
        mqtt.subscribe(light.stateTopic, (err, granted) => {
            if (!err) {
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
