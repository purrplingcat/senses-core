import consola from "consola";
import { Document } from "yaml";
import { YAMLMap } from "yaml/types";
import EventBus from "./EventBus";
import { ISenses } from "./Senses";

export type ComponentDict = { [name: string]: string };

export interface Component {
    name: string;
    platforms?: string[];
    dependencies?: string[];
    preload?(senses: ISenses): void;
    setup?(senses: ISenses, config: YAMLMap, fullConfig: Document): void | Promise<void>;
    setupPlatform?(platform: string, senses: ISenses, config: YAMLMap): void | Promise<void>;
}

const loadedComponents: Component[] = [];

function resolveDependencies(name: string, dependencies: string[], eventBus: EventBus): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            const logger = consola.withScope("loader").withTag(name);
            const loaded = loadedComponents.map((c) => c.name);
            let remaining = dependencies.filter((d) => !loaded.includes(d));

            logger.trace(`Await to load ${remaining.length}/${dependencies.length} dependencies`);

            if (!remaining.length) {
                logger.trace("All dependencies resolved");
                return resolve();
            }

            logger.trace("Awaiting resolve dependencies:", remaining);
            eventBus.on("loaded", function onLoaded(component: Component) {
                try {
                    remaining = remaining.filter((c) => c != component.name);

                    if (!remaining.length) {
                        logger.trace("All dependencies resolved");
                        eventBus.removeListener("loaded", onLoaded);
                        return resolve();
                    }
                } catch (err) {
                    reject(err);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}

function fetchPlatformConfig(config: Document, platform: string, component: Component): YAMLMap[] {
    if (!config.has(platform)) {
        return [];
    }

    return (
        config
            .get(platform)
            .items?.filter((itm: YAMLMap) => itm instanceof YAMLMap && itm.get("platform") === component.name) ?? []
    );
}

export async function loadComponent(path: string, senses: ISenses, config: Document): Promise<Component> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const component: Component = await import(path);

    if (loadedComponents.includes(component)) {
        return component;
    }

    if (!component.name) {
        throw new Error(`Component on path ${path} has invalid name.`);
    }

    // await resolveDependencies(component.name, component.dependencies || [], senses.eventbus);

    if (config.has(component.name) && component.setup) {
        // Setup component
        await component.setup(senses, config.get(component.name), config);
    }

    if (component.platforms?.length && component.setupPlatform) {
        // Setup platforms for this domain component
        (config.contents as YAMLMap).items.forEach((platform) => {
            fetchPlatformConfig(config, platform.key?.value, component).forEach((config) => {
                component.setupPlatform?.call(component, platform.key?.value, senses, config);
            });
        });
    }

    senses.components.push(component);
    senses.eventbus.emit("loaded", component);
    loadedComponents.push(component);
    consola.debug("Loaded component " + component.name);

    return component;
}

export async function loadComponents(components: string[], senses: ISenses, config: Document): Promise<void> {
    const promises: Promise<Component>[] = [];

    consola.info("Loading components ...");

    for (const component of components) {
        promises.push(loadComponent(component, senses, config));
    }

    const loaded = (await Promise.all(promises)).filter((c) => c != null);

    consola.info(`Loaded ${loaded.length} components`);
}
