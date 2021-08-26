import { ApolloError, UserInputError } from "apollo-server-express";
import { ISenses } from "../core/Senses";
import BaseDevice from "../devices/BaseDevice";
import Device from "../devices/Device";
import { IRoom } from "../devices/Room";
import { isTurnableDevice } from "../devices/TurnableDevice";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function deviceMapper(this: ISenses, device: Device) {
    return {
        uid: device.uid,
        entityId: device.entityId,
        name: device.name,
        type: device.type,
        class: device.class,
        title: device.title,
        description: device.description,
        info: device.info,
        room: device.room,
        groups: this.groups.filter((g) => device.groups.includes(g.name)),
        available: device.available,
        lastAlive: device.lastAlive,
        keepalive: device.keepalive,
        lastUpdate: device.lastUpdate,
        timeout: device.timeout,
        turnable: isTurnableDevice(device),
        turn: isTurnableDevice(device) ? device.state : null,
        extraAttrs: device.getExtraAttrs(),
        state: device.getState(),
        features: device.features,
        tags: device.tags,
        via: device.via,
    };
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function roomMapper(room: IRoom) {
    return {
        name: room.name,
        title: room.title,
        description: room.description,
        deviceCount: room.devices.length,
        icon: room.icon,
    };
}

export function createMutationResolvers(senses: ISenses): Record<string, (parent: any, args: any) => unknown> {
    return {
        setState: async (_, { deviceUid, newState }) => {
            const device = senses.devices.find((d) => d.uid === deviceUid);

            if (!device) {
                throw new UserInputError("Device not found", { code: 404 });
            }

            return await device.setState(newState);
        },
    };
}

export default function createQueryResolvers(senses: ISenses): Record<string, (parent: any, args: any) => unknown> {
    return {
        device: (_, args) => senses.devices.find((d) => d.uid === args.uid),
        devices: (_, args) => {
            const shouldBeFiltered = Boolean(args.filter);
            let devices = senses.devices.map(deviceMapper.bind(senses));

            if (shouldBeFiltered) {
                devices = devices.query(args.filter);
            }

            return devices;
        },
        room: (_, args) => {
            const room = senses.rooms.find((r) => r.name === args.name);

            if (!room) {
                throw new UserInputError("Room not found", { code: 404 });
            }

            return room;
        },
        rooms: (_, args) => {
            const shouldBeFiltered = Boolean(args.filter);
            const rooms = senses.rooms.map(roomMapper);

            if (shouldBeFiltered) {
                return rooms.query(args.filter);
            }

            return rooms;
        },
        topics: (_, args) => {
            const device = senses.devices.find((d) => d.uid == args.deviceUid) as BaseDevice;

            if (!device) throw new ApolloError("Requested resource not found", "NOT_FOUND");

            return {
                deviceUid: device.uid,
                subscribers: device.subscribers,
                publishers: device.publishers,
                polls: device.polls,
            };
        },
        scenes: () => senses.scenes.scenes,
    };
}
