import { ISenses } from "../core/Senses";
import Room, { IRoom } from "../devices/Room";

export const name = "room";

function createRoom(senses: ISenses, dirtyRoom: IRoom): Room {
    const room = new Room(dirtyRoom.name, senses);

    return Object.assign(room, dirtyRoom);
}

export default function setup(senses: ISenses, config: Record<any, any>): void {
    const rooms: IRoom[] = <IRoom[]>config.room;

    // We are loading it from config, check the type is necessary. (Don't trust user data)
    if (!Array.isArray(rooms)) {
        throw new Error("Rooms configuration must be an array of rooms");
    }

    rooms.map((r) => createRoom(senses, r)).forEach((r) => senses.addRoom(r));
}
