import Entity from "../core/Entity";
import { ISenses } from "../core/Senses";
import Device from "./Device";

export interface IRoom extends Entity {
    description?: string;
    icon?: string;
    devices: Device[];
}

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
