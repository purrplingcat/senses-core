import { ISenses } from "../core/Senses";
import Device from "../devices/Device";
import MQTTPattern from "mqtt-pattern";
import consola from "consola";
import { YAMLMap } from "yaml/types";

export const name = "expose";
export const domain = name;

export function setup(senses: ISenses): void {
    senses.eventbus.on("mqtt.connect", (mqtt) => {
        if (senses.mqtt == null) return;

        mqtt.subscribe(`${senses.domain}/$senses/device/+/set`);
        mqtt.subscribe(`${senses.domain}/$senses/device/+/+/set`);
        mqtt.subscribe(`${senses.domain}/$senses/service/+/call`);
    });

    senses.eventbus.on("mqtt.message", (topic, message) => {
        if (topic.startsWith(`${senses.domain}/$senses/device/`)) handleDevice(topic, message);
        if (topic.startsWith(`${senses.domain}/$senses/service/`)) handleService(topic, message);
    });

    senses.eventbus.on("device.state_update", (device: Device) => {
        senses.mqtt.publish(`${senses.domain}/$senses/device/${device.uid}`, JSON.stringify(device.getState()));
    });

    function handleDevice(topic: string, message: string) {
        const devParams = MQTTPattern.exec(`${senses.domain}/$senses/device/+uid/set`, topic);

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
        const svcParams = MQTTPattern.exec(`service/${senses.domain}/+service/call`, topic);

        if (svcParams) {
            try {
                await senses.callService(svcParams.service, JSON.parse(message));
            } catch (err: any) {
                senses.mqtt?.publish(`service/${senses.domain}/${svcParams.name}/error`, err.message);
            }
        }
    }
}
