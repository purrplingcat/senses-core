import { ISenses } from "../core/Senses";
import Device from "../devices/Device";
import MQTTPattern from "mqtt-pattern";
import consola from "consola";
import { YAMLMap } from "yaml/types";

export const name = "expose";
export const domain = name;

export function setup(senses: ISenses, config: YAMLMap): void {
    const scope = config.get("scope") || "senses";

    senses.eventbus.on("mqtt.connect", (mqtt) => {
        if (senses.mqtt == null) return;

        mqtt.subscribe(`${senses.domain}/${scope}/device/+/+/set`);
        mqtt.subscribe(`${senses.domain}/${scope}/service/+/call`);
    });

    senses.eventbus.on("mqtt.message", (topic, message) => {
        if (topic.startsWith(`${senses.domain}/${scope}/device/`)) handleDevice(topic, message);
        if (topic.startsWith(`${senses.domain}/${scope}/service/`)) handleService(topic, message);
    });

    senses.eventbus.on("device.state_update", (device: Device) => {
        if (senses.mqtt?.connected) {
            const room = device.room || "-";

            senses.mqtt.publish(
                `${senses.domain}/${scope}/device/${room}/${device.name}`,
                JSON.stringify(device.getState()),
            );
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
