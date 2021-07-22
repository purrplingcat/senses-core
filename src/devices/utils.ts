import consola from "consola";
import Handshake, { DeviceType } from "../core/Handshake";
import { ISenses } from "../core/Senses";
import Light from "../mqtt/Light";
import BaseDevice from "./BaseDevice";
import Sensor from "../mqtt/Sensor";
import Device from "./Device";

export function registerNewDevice(senses: ISenses, shake: Handshake, type: DeviceType): BaseDevice {
    const device = createDevice(senses, shake, type);
    updateDeviceInfo(device, shake);

    senses.eventbus.on("mqtt.message", device.onMqttMessage.bind(device));
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

function createDevice(senses: ISenses, shake: Handshake, type: DeviceType): BaseDevice {
    const stateTopic = shake.comm?.find((c) => c.type === "state")?.topic || `${shake.uid}/state`;
    const setTopic = shake.comm?.find((c) => c.type === "set")?.topic || `${shake.uid}/set`;
    const getTopic = shake.comm?.find((c) => c.type === "fetch")?.topic || `${shake.uid}/get`;

    switch (type.type) {
        case "light":
            return new Light(senses, stateTopic, setTopic, getTopic);
        case "sensor":
            const field = Reflect.get(shake.additional as Record<string, unknown>, "field") || "value";

            return new Sensor(senses, stateTopic, getTopic, field);
        default:
            throw new Error(`Unknown device type ${type.type}`);
    }
}

export function updateDeviceInfo(device: Device, shake: Handshake): void {
    device.updateFromShake(shake);
}
