import { Trigger } from "~automation/Automation";
import { ISenses } from "~core/Senses";
import parseDuration from "parse-duration";
import consola from "consola";
import { exec, matches } from "mqtt-pattern";

export type MqttTriggerOptions = {
    topic: string;
    payload: string;
    valueTemplate?: string;
    delay?: number | string;
};

function parseJson(s: string) {
    if (s == null) {
        return null;
    }

    try {
        return JSON.parse(s);
    } catch (e) {
        consola.warn(e);
        return null;
    }
}

export default function createSceneTrigger(senses: ISenses, options: MqttTriggerOptions): Trigger {
    const render = (template: string, value: unknown, args = {}) =>
        senses.renderer.render(template, {
            value,
            jsonValue: parseJson(<string>value),
            trigger: options,
            ...args,
        });

    return function mqtt(trap) {
        const delay = Math.abs(parseDuration(String(options.delay ?? 0)));
        const topic = render(options.topic, null);

        if (senses.mqtt.connected) senses.mqtt.subscribe(topic);

        senses.eventbus.on("mqtt.connect", () => senses.mqtt.subscribe(topic));
        senses.eventbus.on("mqtt.message", (t, msg) => {
            if (!senses.isRunning || !matches(topic, t)) return;

            const args = exec(topic, t) ?? {};
            const value = options.valueTemplate ? render(options.valueTemplate, msg, args) : msg;
            const payload = render(options.payload, value, args);

            if (value.trim() === payload.trim()) {
                setTimeout(() => trap({ pattern: topic, topic: t, message: msg, args }), delay);
            }
        });
    };
}
