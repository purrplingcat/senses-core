import { ISenses } from "../core/Senses";
import Device from "../devices/Device";
import MQTTPattern from "mqtt-pattern";
import consola from "consola";

export const name = "expose";
export const domain = name;

export function setup(senses: ISenses): void {
    senses.eventbus.on("mqtt.connect", () => {
        senses.mqtt?.subscribe(`${senses.domain}/+/+/set`);
    });

    senses.eventbus.on("mqtt.message", (topic, message) => {
        const params = MQTTPattern.exec(`${senses.domain}/+room/+device/set`, topic);

        if (params) {
            const deviceName = params.name;
            const deviceRoom = params.room === "none" ? null : params.room;

            try {
                senses.devices
                    .filter((d) => d.room === deviceRoom && d.name === deviceName)
                    .forEach((d) => d.setState(JSON.parse(message)));
            } catch (err) {
                consola.withScope(domain).error(err);
            }
        }
    });

    senses.eventbus.on("device.state_update", (device: Device<unknown>) => {
        if (senses.mqtt?.connected) {
            const room = device.room || "none";

            senses.mqtt.publish(`${senses.domain}/${room}/${device.name}`, JSON.stringify(device.getState()));
        }
    });
}
