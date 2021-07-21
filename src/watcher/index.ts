import consola from "consola";
import { YAMLMap } from "yaml/types";
import { ISenses } from "../core/Senses";
import { DeviceState } from "../core/StateMachine";

export const name = "watcher";
export const domain = name;

function watch(senses: ISenses, interval: number) {
    for (const device of senses.devices) {
        if (senses.states.getState<DeviceState>("device", device.uid)?.available !== device.available) {
            senses.eventbus.emit("device.state_update", device, senses);
        }
    }

    setTimeout(() => watch(senses, interval), interval);
}

export function setup(senses: ISenses, config: YAMLMap): void {
    const interval: number = config.get("interval") ?? 1000;

    consola.info("Watcher update interval:", interval);
    senses.eventbus.on("start", () => watch(senses, interval));
}
