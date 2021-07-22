import { ISenses } from "../core/Senses";
import Device from "../devices/Device";
import MQTTPattern from "mqtt-pattern";
import consola from "consola";

export const name = "expose";
export const domain = name;

export function setup(senses: ISenses): void {
    senses.eventbus.on("mqtt.connect", (mqtt) => {
        if (senses.mqtt == null) return;

        mqtt.subscribe(`device/${senses.domain}/+/+/set`);
        mqtt.subscribe(`device/${senses.domain}/+/call`);
    });

    senses.eventbus.on("mqtt.message", (topic, message) => {
        if (topic.startsWith("device/")) handleDevice(topic, message);
        if (topic.startsWith("service/")) handleService(topic, message);
    });

    senses.eventbus.on("device.state_update", (device: Device) => {
        if (senses.mqtt?.connected) {
            const room = device.room || "none";

            senses.mqtt.publish(`${senses.domain}/${room}/${device.name}`, JSON.stringify(device.getState()));
        }
    });

    function handleDevice(topic: string, message: string) {
        const devParams = MQTTPattern.exec(`device/${senses.domain}/+room/+device/set`, topic);

        if (devParams) {
            const deviceName = devParams.name;
            const deviceRoom = devParams.room === "none" ? null : devParams.room;

            try {
                senses.devices
                    .filter((d) => d.room === deviceRoom && d.name === deviceName)
                    .forEach((d) => d.setState(JSON.parse(message)));
            } catch (err) {
                consola.withScope(domain).error(err);
            }
        }
    }

    async function handleService(topic: string, message: string) {
        const svcParams = MQTTPattern.exec(`service/${senses.domain}/+service/call`, topic);

        if (svcParams) {
            try {
                await senses.callService(svcParams.service, JSON.parse(message));
            } catch (err) {
                senses.mqtt?.publish(`service/${senses.domain}/${svcParams.name}/error`, err.message);
            }
        }
    }
}
