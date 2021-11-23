import { createModule } from "graphql-modules";
import path from "path";
import { ContextSenses } from "~graphql/types";
import { IRoom } from "~devices/Room";
import { loadSchema } from "~graphql/tools";
import { isTurnableDevice } from "~devices/TurnableDevice";

export default createModule({
    id: "room",
    typeDefs: loadSchema(path.join(application.rootDir, "graphql/room.gql")),
    dirname: __dirname,
    resolvers: {
        Query: {
            rooms: (_: never, args: never, context: ContextSenses) => context.senses.rooms,
            room: (_: never, args: any, context: ContextSenses) =>
                context.senses.rooms.find((r) => r.name === args.name),
        },
        Room: {
            deviceCount: (room: IRoom) => room.devices.length,
            lightsOn: (room: IRoom) =>
                room.devices.some((d) => d.type === "light" && isTurnableDevice(d) && d.state === "on"),
        },
    },
});
