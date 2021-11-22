import consola from "consola";
import { ISenses } from "~core/Senses";
import Handshake, { decodeDeviceType } from "~core/Handshake";
import BaseDevice from "~devices/BaseDevice";
import { asArray } from "~utils";
import { registerNewDevice, updateDeviceInfo } from "~utils/devices";

export const name = "device";

export default function setup(senses: ISenses, config: Record<any, any>): void {
    config = config.device ?? {};

    if (config.discovery === true) {
        senses.eventbus.on("discovery.handshake", (shake) => setupDeviceFromMqttHandshake(senses, shake));
    }

    const devicesConf: any[] = config.devices?.filter((d: unknown) => typeof d === "object");
    if (devicesConf && Array.isArray(devicesConf)) {
        senses.eventbus.on("start", () => {
            devicesConf.forEach((dConf) => {
                setupDeviceFromConfig(senses, dConf.type, dConf);
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

function setupDeviceFromConfig(senses: ISenses, platform: string, config: Record<any, any>) {
    if (!config.name) {
        throw new Error("Missing device name");
    }

    const keepalive = config.keepalive;
    const type = decodeDeviceType(config.class ? `device/${platform}, ${config.class}` : `device/${platform}`);
    const uid = `${platform}${config.room ? `-${config.room}` : ""}-${config.name}`;
    const shake: Handshake = {
        _version: "1.0",
        uid: config.uid ?? uid,
        available: true,
        keepalive: Boolean(keepalive),
        keepaliveTimeout: keepalive?.timeout ?? 0,
        name: config.title || config.name,
        alias: config.name,
        product: config.product ?? "",
        vendor: config.vendor ?? "",
        location: config.room,
        description: config.description,
        stateFormat: config.format || "json",
        platform: config.platform,
        tags: asArray<string>(config.tags),
        via: config.via,
        groups: config.groups,
        comm: [
            { topic: config.stateTopic, type: "state" },
            { topic: config.setTopic, type: "set" },
            { topic: config.getTopic, type: "fetch" },
        ],
        features: asArray(config.features),
        type: type.fullQualifiedType,
        additional: {
            fields: config.fields,
            mainField: config.mainField,
            incremental: config.incremental,
            schema: config.schema || "",
            availabilityTags: asArray(keepalive?.tags),
        },
    };

    const device = registerNewDevice(senses, shake, type);

    device.subscribers = config.subscriber || [];
    device.publishers = config.publisher || [];
    device.polls = config.poll || [];

    if (senses.mqtt.connected) {
        device.subscribeTopics().catch((err) => consola.warn(`${device.uid}:`, err));
        device.requestState();
    }

    consola.info(`Added device ${device.uid} from configuration`);
}
