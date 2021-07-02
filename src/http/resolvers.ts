import { ISenses } from "../core/Senses";
import Device from "../devices/Device";
import { isTurnableDevice } from "../devices/TurnableDevice";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function deviceMapper(device: Device<unknown>) {
    return {
        uid: device.uid,
        entityId: device.entityId,
        name: device.name,
        type: device.type,
        class: device.class,
        title: device.title,
        description: device.description,
        room: device.room,
        available: device.available,
        lastAlive: device.lastAlive,
        keepalive: device.keepalive,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function createQueryResolvers(senses: ISenses): Record<string, (parent: any, args: any) => unknown> {
    return {
        devices: (_, args) => {
            const shouldBeFiltered = !!args.filter;
            let devices = senses.devices.map(deviceMapper);

            if (shouldBeFiltered) {
                devices = devices.query(args.filter);
            }

            return devices;
        },
        device: (_, args) => senses.devices.find((d) => d.uid === args.uid),
    };
}
