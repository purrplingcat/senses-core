import consola from "consola";
import EventEmitter from "events";
import fs from "fs";
import path from "path";
import { ISenses } from "./Senses";

export default class Component extends EventEmitter {
    name: string;
    source: string;
    exports: object | null;
    private _loaded = false;

    constructor(source: string, name?: string) {
        super();
        this.source = source;
        this.name = name || source;
        this.exports = null;
    }

    get isLoaded(): boolean {
        return this._loaded;
    }

    hasOwnModule(subModulePath: string): boolean {
        try {
            require.resolve(path.join(this.source, subModulePath));
            return true;
        } catch (err: any) {
            if (err.code === "MODULE_NOT_FOUND") {
                return false;
            }

            throw err;
        }
    }

    import(subModulePath?: string): Promise<any> {
        return import(path.join(this.source, subModulePath ?? ""));
    }

    async load(senses: ISenses, config: unknown): Promise<unknown> {
        consola.trace(`Start loading component ${this.name}`);
        if (this.isLoaded) {
            throw new Error(`Component '${this.name}' (${this.source}) is already loaded.`);
        }

        const module = await this.import();
        consola.trace(`Import module ${this.source} of ${this.name} done`);
        const setup: (senses: ISenses, config: unknown) => unknown =
            typeof module.default === "function" ? module.default : module;

        if (typeof setup !== "function") {
            throw new Error(`Failed to load component ${this.name} (${this.source}): No setup function`);
        }

        this.exports = await this._resolveExports(setup(senses, config));
        this._loaded = true;
        consola.debug(`Component ${this.name} loaded`);

        this.emit("loaded", this);
        return this.exports;
    }

    private async _resolveExports(exports: unknown): Promise<object | null> {
        if (typeof exports === "function") {
            exports = new Promise(
                exports as (resolve: (value: unknown) => void, reject: (reason?: any) => void) => void,
            );
        }

        const result = (await exports) ?? null;
        if (result !== null && typeof result !== "object") {
            throw new Error(`Component ${this.name}: Result type ${typeof result} is invalid`);
        }

        return result;
    }

    static resolve(source: string): Component {
        const manifestPath = require.resolve(path.join(source, "manifest.json"));
        const manifest = JSON.parse(fs.readFileSync(manifestPath).toString());

        return new Component(source, manifest.name);
    }
}
