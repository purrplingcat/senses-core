import consola from "consola";
import Handshake, { DeviceType } from "../core/Handshake";
import { ISenses } from "../core/Senses";
import { DriverMap } from "../drivers";
import BaseDevice from "../devices/BaseDevice";
import Device from "../devices/Device";

export function registerNewDevice(senses: ISenses, shake: Handshake, type: DeviceType): BaseDevice {
    const device = createDevice(senses, senses.drivers, shake, type);

    if (!device) {
        throw new Error("Device factory returns null or undefined");
    }

    updateDeviceInfo(device, shake);
    senses.eventbus.on("mqtt.message", device.onMqttMessage.bind(device));
    senses.eventbus.on("mqtt.connect", (mqtt) => {
        if (mqtt.connected && !mqtt.disconnecting) {
            device.subscribeTopics().catch((err) => consola.warn(`${device.uid}:`, err));
            device.requestState();
        }
    });

    if (device.keepalive) {
        senses.eventbus.on("discovery.alive", (uid: string, stamp: Date) => {
            const tags = [...(<string[]>device.attributes.availabilityTags ?? []), device.uid];

            if (tags.includes(uid)) {
                device.lastAlive = stamp;
                consola.debug(`${device.uid} updated their last active time: ${stamp}`);
            }
        });
        senses.eventbus.on("discovery.death", (uid: string) => {
            const tags = [...(<string[]>device.attributes.availabilityTags ?? []), device.uid];

            if (tags.includes(uid) && device.lastAlive) {
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

function resolveDriver(shake: Handshake): string {
    if (shake.driver) {
        return shake.driver;
    }

    if (["ashley", "callmefoxie", "purrplingcat"].includes(shake.vendor.toLowerCase())) {
        return "senses";
    }

    if (["dummy", "fake"].includes(shake.vendor.toLowerCase())) {
        return "dummy";
    }

    return "senses";
}

function createDevice(senses: ISenses, drivers: DriverMap, shake: Handshake, type: DeviceType): BaseDevice {
    const driverName = resolveDriver(shake);
    const driver = drivers[driverName];

    if (typeof driver !== "function") {
        throw new Error("Unknown driver: " + driverName);
    }

    const device = driver(senses, type, shake);
    device.info.driver = driverName;

    return device;
}

export function updateDeviceInfo(device: Device, shake: Handshake): void {
    device.updateFromShake(shake);
}
