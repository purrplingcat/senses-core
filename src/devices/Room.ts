import Entity from "../core/Entity";
import { ISenses } from "../core/Senses";
import Device from "./Device";

export interface IRoom extends Entity {
    description?: string;
    icon?: string;
    devices: Device[];
}

export interface IClimate {
    temperature: number | null;
    heat: "heating" | "standby" | "off" | null;
    targetTemperature: number | null;
}

@Reflect.metadata("kind", "room")
export default class Room extends Device implements IRoom {
    icon?: string;
    available: boolean;

    constructor(name: string, senses: ISenses) {
        super(senses);

        this.name = name;
        this.type = "room";
        this.available = true;
        this.uid = `${this.type}-${this.name}`;
    }

    get devices(): Device[] {
        return this.senses.devices.filter((d) => d.room === this.name);
    }

    get climate(): IClimate {
        const config = this.config?.climate ?? {};

        return {
            temperature: config.temperature ? Number(this._renderTemplate(config.temperature)) : null,
            heat: config.heat ? <any>this._renderTemplate(config.heat) : null,
            targetTemperature: config.targetTemperature ? Number(this._renderTemplate(config.targetTemperature)) : null,
        };
    }

    private _renderTemplate(template: string): string {
        return this.senses.renderer.render(template, {
            room: this,
        });
    }

    override setup(config: IRoom): void {
        super.setup(config);

        this.name = config.name;
        this.title = config.title;
        this.description = config.description;
        this.icon = config.icon;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setState(state: Partial<{}>): boolean | Promise<boolean> {
        return false;
    }

    getState(): Readonly<{}> {
        return {};
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(patch?: Partial<{}>): void {
        // do nothing
    }

    get lastUpdate(): Date {
        return new Date();
    }
}
