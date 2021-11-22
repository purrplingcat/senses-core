import consola from "consola";
import Component from "~core/Component";
import { ISenses } from "~core/Senses";

export type ComponentDict = { [name: string]: string };

function load(component: Component, senses: ISenses, config: unknown) {
    return new Promise((resolve, reject) => {
        process.nextTick(() => {
            component.load(senses, config).then(resolve).catch(reject);
        });
    });
}

export async function loadComponents(components: Component[], senses: ISenses, config: unknown): Promise<void> {
    consola.info("Loading components ...");
    senses.components = components;
    await Promise.all(components.map((c) => load(c, senses, config)));
    consola.success(`Loaded ${senses.components.filter((c) => c.isLoaded).length} components`);
}
