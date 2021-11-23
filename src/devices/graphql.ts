import { createModule } from "graphql-modules";
import path from "path";
import Device from "./Device";
import ITurnableDevice, { isTurnableDevice } from "./TurnableDevice";
import { ContextSenses } from "~graphql/types";
import { ISenses } from "~core/Senses";
import { pubsub } from "~graphql";
import { UserInputError } from "apollo-server-express";
import { loadSchema } from "~graphql/tools";

export function prepare(senses: ISenses): void {
    senses.eventbus.on("device.updated", (device) => {
        pubsub.publish("device.update", { deviceUpdated: device });
    });
}

export default createModule({
    id: "device",
    typeDefs: loadSchema(path.join(application.rootDir, "graphql/device.gql")),
    dirname: __dirname,
    resolvers: {
        Query: {
            device: (_: never, args: any, context: ContextSenses) => context.senses.fetchDevice(args.uid),
            devices: (_: never, args: any, context: any) => {
                const shouldBeFiltered = Boolean(args.filter);
                let devices = context.senses.devices;

                if (shouldBeFiltered) {
                    devices = devices.query(args.filter);
                }

                return devices;
            },
        },
        Device: {
            state: (device: Device) => device.getState(),
            turnable: (device: Device) => isTurnableDevice(device),
            turn: (device: ITurnableDevice) => device.state,
            extraAttrs: (device: Device) => device.getExtraAttrs(),
            groups: (device: Device, args: never, { senses }: ContextSenses) =>
                senses.groups.filter((g) => device.groups.includes(g.name)),
        },
        Mutation: {
            setState: async (_: never, { deviceUid, newState }: any, context: ContextSenses) => {
                const device = context.senses.devices.find((d) => d.uid === deviceUid);

                if (!device) {
                    throw new UserInputError("Device not found", { code: 404 });
                }

                return await device.setState(newState);
            },
        },
        Subscription: {
            deviceUpdated: {
                subscribe: (_: never, args: never, context: ContextSenses) =>
                    context.pubsub.asyncIterator(["device.update"]),
            },
        },
    },
});
