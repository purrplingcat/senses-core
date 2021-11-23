import { ISenses } from "../core/Senses";
import Device from "~devices/Device";
import MQTTPattern from "mqtt-pattern";
import consola from "consola";
import path from "path";

export const name = "expose";
export const domain = name;

export default function setup(senses: ISenses): void {
    senses.eventbus.on("mqtt.connect", (mqtt) => {
        if (senses.mqtt == null) return;

        mqtt.subscribe(`${senses.domain}/device/+/set`);
        mqtt.subscribe(`${senses.domain}/service/+/call`);
    });

    senses.eventbus.on("mqtt.message", (topic, message) => {
        if (topic.startsWith(path.join(senses.domain, "/device/"))) handleDevice(topic, message);
        if (topic.startsWith(`${senses.domain}/service/`)) handleService(topic, message);
    });

    senses.eventbus.on("device.updated", (device: Device) => {
        if (!senses.devices.includes(device)) return;
        senses.mqtt.publish(`${senses.domain}/device/${device.uid}`, JSON.stringify(device.getState()));
    });

    function handleDevice(topic: string, message: string) {
        const devParams = MQTTPattern.exec(`${senses.domain}/device/+uid/set`, topic);

        if (devParams) {
            const uid = devParams.uid;

            try {
                senses.devices.filter((d) => d.uid === uid).forEach((d) => d.setState(JSON.parse(message)));
            } catch (err) {
                consola.withScope(domain).error(err);
            }
        }
    }

    async function handleService(topic: string, message: string) {
        const svcParams = MQTTPattern.exec(`${senses.domain}/service/+service/call`, topic);

        if (svcParams) {
            try {
                await senses.callService(svcParams.service, JSON.parse(message));
            } catch (err: any) {
                senses.mqtt?.publish(`${senses.domain}/service/${svcParams.name}/error`, err.message);
            }
        }
    }
}
