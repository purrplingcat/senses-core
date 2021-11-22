import { createModule } from "graphql-modules";
import typeDefs from "./schema";
import { ContextSenses } from "~graphql/types";
import { IRoom } from "~devices/Room";

export default createModule({
    id: "room",
    typeDefs,
    dirname: __dirname,
    resolvers: {
        Query: {
            rooms: (_: never, args: never, context: ContextSenses) => context.senses.rooms,
            room: (_: never, args: any, context: ContextSenses) =>
                context.senses.rooms.find((r) => r.name === args.name),
        },
        Room: {
            deviceCount: (room: IRoom) => room.devices.length,
        },
    },
});
