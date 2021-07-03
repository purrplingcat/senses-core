import Entity from "../core/Entity";
import { ISenses } from "../core/Senses";
import Device from "./Device";

export interface IRoom extends Entity {
    description?: string;
    icon?: string;
    devices: Device<unknown>[];
}

export default class Room implements IRoom {
    icon?: string;
    name: string;
    type: string;
    available: boolean;
    title?: string;
    description?: string;
    senses: ISenses;

    constructor(name: string, senses: ISenses) {
        this.name = name;
        this.senses = senses;
        this.type = "room";
        this.available = true;
    }

    get devices(): Device<unknown>[] {
        return this.senses.devices.filter((d) => d.room === this.name);
    }
}
