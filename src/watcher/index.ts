import consola from "consola";
import { Document } from "yaml";
import { ISenses } from "../core/Senses";

export const name = "watcher";
export const domain = name;

function watch(senses: ISenses, interval: number) {
    for (const device of senses.devices) {
        device.update();
    }

    setTimeout(() => watch(senses, interval), interval);
}

export function setup(senses: ISenses, config: Document): void {
    const interval: number = config.getIn(["watcher", "interval"]) ?? 1000;

    if (interval < 0) return;

    consola.info("Watcher update interval:", interval);
    senses.eventbus.on("start", () => watch(senses, interval));
}
