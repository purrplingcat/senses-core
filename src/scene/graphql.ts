import path from "path";
import { createModule } from "graphql-modules";
import { ContextSenses } from "~graphql/types";
import { loadSchema } from "~graphql/tools";

export default createModule({
    id: "scene",
    typeDefs: loadSchema(path.join(application.rootDir, "graphql/scene.gql")),
    dirname: __dirname,
    resolvers: {
        Query: {
            scenes: (_: never, args: never, context: ContextSenses) => context.senses.scenes.scenes,
        },
    },
});
