import { Document } from "yaml";
import { ISenses } from "../core/Senses";
import Room, { IRoom } from "../devices/Room";

export const name = "room";

function createRoom(senses: ISenses, dirtyRoom: IRoom): Room {
    const room = new Room(dirtyRoom.name, senses);

    return Object.assign(room, dirtyRoom);
}

export function setup(senses: ISenses, config: Document): void {
    if (!config.has("room")) return;

    const rooms: IRoom[] = <IRoom[]>config.get("room").toJSON();

    // We are loading it from config, check the type is necessary. (Don't trust user data)
    if (!Array.isArray(rooms)) {
        throw new Error("Rooms configuration must be an array of rooms");
    }

    rooms.map((r) => createRoom(senses, r)).forEach((r) => senses.addRoom(r));
}
