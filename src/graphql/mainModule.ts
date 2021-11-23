import { createModule } from "graphql-modules";
import { GraphQLJSONObject } from "graphql-type-json";
import { loadSchema } from "./tools";
import { ContextSenses } from "./types";
import GraphQLDate from "./scalars/date";
import path from "path";

export default createModule({
    id: "main",
    typeDefs: loadSchema(path.join(application.rootDir, "graphql/schema.gql")),
    resolvers: {
        Date: GraphQLDate,
        JSON: GraphQLJSONObject,
        Query: {
            name: (_: never, args: never, context: ContextSenses) => context.senses.name,
            version: () => application.manifest.version,
            services: (_: never, args: never, context: ContextSenses) => context.senses.services,
        },
        Mutation: {
            callService: (_: never, args: any, context: ContextSenses) =>
                context.senses.callService(args.name, args.params),
        },
    },
});
