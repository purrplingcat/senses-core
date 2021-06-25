import consola from "consola";
import { Document } from "yaml";
import { YAMLMap } from "yaml/types";
import { ISenses } from "./Senses";

export type ComponentDict = { [name: string]: string };

export interface Component {
    name: string;
    domain: string;
    platforms?: string[];
    setup?(senses: ISenses, config: YAMLMap): void | Promise<void>;
    setupPlatform?(platform: string, senses: ISenses, config: YAMLMap): void | Promise<void>;
}

const loadedComponents: Component[] = [];

function fetchPlatformConfig(config: Document, platform: string, component: Component): YAMLMap[] {
    if (!config.has(platform)) {
        return [];
    }

    return (
        config
            .get(platform)
            .items?.filter((itm: YAMLMap) => itm instanceof YAMLMap && itm.get("platform") === component.domain) ?? []
    );
}

export async function loadComponent(path: string, senses: ISenses, config: Document): Promise<Component | null> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const component = require(path) as Component;

    if (loadedComponents.includes(component)) {
        return component;
    }

    if (!component.name) {
        throw new Error(`Component on path ${path} has invalid name ${component.name}`);
    }

    if (component.domain == null) {
        component.domain = component.name;
    }

    if (!config.has(component.domain)) {
        consola.debug(`Skip load component ${component.name}: Config for domain ${component.domain} is not declared`);
        return null;
    }

    if (component.setup) {
        // Setup component
        await component.setup(senses, config.get(component.domain) as YAMLMap);
    }

    if (component.platforms?.length && component.setupPlatform) {
        // Setup platforms for this domain component
        (config.contents as YAMLMap).items.forEach((platform) => {
            fetchPlatformConfig(config, platform.key?.value, component).forEach((config) => {
                component.setupPlatform?.call(component, platform.key?.value, senses, config);
            });
        });
    }

    loadedComponents.push(component);
    consola.debug("Loaded component " + component.name);

    return component;
}

export async function loadComponents(components: string[], senses: ISenses, config: Document): Promise<void> {
    const promises: Promise<Component | null>[] = [];

    for (const component of components) {
        promises.push(loadComponent(component, senses, config));
    }

    const loaded = (await Promise.all(promises)).filter((c) => c != null);
    consola.info(`Loaded ${loaded.length} components`);
}
