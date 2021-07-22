import consola from "consola";
import UIDGenerator from "uid-generator";
import { ISenses } from "../core/Senses";
import { YAMLMap } from "yaml/types";
import Handshake, { decodeDeviceType } from "../core/Handshake";
import BaseDevice from "../devices/BaseDevice";
import { asArray } from "../core/utils";
import { registerNewDevice, updateDeviceInfo } from "../devices/utils";

export const name = "device";

export function setup(senses: ISenses, config: YAMLMap): void {
    if (config.get("discovery") === true) {
        senses.eventbus.on("discovery.handshake", (shake) => setupDeviceFromMqttHandshake(senses, shake));
    }

    const devicesConf: YAMLMap[] = config.get("devices")?.items?.filter((d: unknown) => d instanceof YAMLMap);
    if (devicesConf && Array.isArray(devicesConf)) {
        senses.eventbus.on("start", () => {
            devicesConf.forEach((dConf) => {
                setupDeviceFromConfig(senses, dConf.get("type"), dConf);
            });
        });
    }
}

function setupDeviceFromMqttHandshake(senses: ISenses, shake: Handshake): void {
    const type = decodeDeviceType(shake.type || "");

    if (!senses.mqtt) {
        throw new Error("MQTT client is not established to add device!");
    }

    if (type.kind !== "device") {
        return;
    }

    if (senses.hasDevice(shake.uid)) {
        const device = senses.fetchDevice(shake.uid);

        if (device instanceof BaseDevice) {
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
}

function setupDeviceFromConfig(senses: ISenses, platform: string, config: YAMLMap) {
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

    const device = registerNewDevice(senses, shake, type);

    if (senses.mqtt.connected) {
        device.subscribeTopics();
        device.requestState();
    }

    consola.info(`Added device ${device.uid} from configuration`);
}