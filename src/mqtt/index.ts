import consola from "consola";
import mqtt from "mqtt";
import MqttLight from "./MqttLight";
import { ISenses } from "../core/Senses";
import { YAMLMap } from "yaml/types";

export const name = "MqttLight";
export const domain = "mqtt";
export const platforms = ["light"];

function asArray<T>(val: unknown): T[] {
    if (!val) {
        return [];
    }

    return Array.from(val as T[]);
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
}

export function setupPlatform(platform: string, senses: ISenses, config: YAMLMap): void | Promise<void> {
    if (!platforms.includes(platform)) {
        throw new Error(`MQTT lights: Unsupported platform ${platform}`);
    }

    const light = new MqttLight(config.get("stateTopic"), config.get("commandTopic"));

    light.name = config.get("name");
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
