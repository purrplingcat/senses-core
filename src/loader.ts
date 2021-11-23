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
    consola.info(`Loading ${components.length} components ...`);
    senses.components = components;

    const allStartTime = process.hrtime();
    for (const [key, component] of components.entries()) {
        const startTime = process.hrtime();
        await load(component, senses, config);
        const endTime = process.hrtime(startTime);
        consola.ready(
            `Loaded component [${key + 1}/${components.length}]: ${component.name} (${component.source}) in ${
                endTime[0]
            }s ${Math.round(endTime[1] / 1000000)}ms`,
        );
    }

    const allEndTime = process.hrtime(allStartTime);
    consola.success(
        `Loaded all ${senses.components.length} components in ${allEndTime[0]}s ${Math.round(
            allEndTime[1] / 1000000,
        )}ms`,
    );
}
