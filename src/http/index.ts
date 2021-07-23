import consola from "consola";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import { ApolloServer, IResolvers, PubSub } from "apollo-server-express";
import { GraphQLJSONObject } from "graphql-type-json";
import http from "http";
import { YAMLMap } from "yaml/types";
import { ISenses } from "../core/Senses";
import GraphQLDate from "./scalars/date";
import routes from "./routes";
import typeDefs from "./schema";
import createQueryResolvers, { createMutationResolvers, deviceMapper } from "./resolvers";

export const name = "http";

function setupExpressApp(senses: ISenses): Application {
    const app = express();
    const intro = (req: Request, res: Response) =>
        res.type("text/plain").status(200).send("Senses server is running.\nREST: /api\nWS: /ws");

    app.senses = senses;
    app.use(cors());
    app.use(express.json());
    app.use("/api", routes);
    app.get("/", intro);

    return app;
}

function setupGraphQl(senses: ISenses): ApolloServer {
    const pubsub = new PubSub();

    senses.eventbus.on("device.state_update", (device) => {
        pubsub.publish("device.update", { deviceUpdated: deviceMapper.call(senses, device) });
    });

    const resolvers: IResolvers = {
        Date: GraphQLDate,
        JSON: GraphQLJSONObject,
        Query: createQueryResolvers(senses),
        Mutation: createMutationResolvers(senses),
        Subscription: {
            deviceUpdated: {
                subscribe: () => pubsub.asyncIterator(["device.update"]),
            },
        },
    };

    return new ApolloServer({ typeDefs, resolvers });
}

export function setup(senses: ISenses, config: YAMLMap): void {
    const graphQl = setupGraphQl(senses);
    const app = setupExpressApp(senses);
    const server = http.createServer(app);

    graphQl.applyMiddleware({ app });
    graphQl.installSubscriptionHandlers(server);

    senses.eventbus.on("start", () => {
        server.listen(config.get("port") ?? 8080, () =>
            consola.success("Http server listening on port http://localhost:8080"),
        );
    });
}
