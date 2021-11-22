import { ApolloServer, IResolvers, PubSub } from "apollo-server-express";
import { ISenses } from "~core/Senses";
import { HttpComponent } from "~http";
import { GraphQLJSONObject } from "graphql-type-json";
import { createApplication, createModule, Module } from "graphql-modules";
import GraphQLDate from "./scalars/date";
import typeDefs from "./schema";
import { deviceMapper } from "./resolvers";
import consola from "consola";
import Component from "~core/Component";
import path from "path";

function setupGraphQl(senses: ISenses, modules: Module[]): ApolloServer {
    const pubsub = new PubSub();
    const resolvers: IResolvers = {
        Date: GraphQLDate,
        JSON: GraphQLJSONObject,
    };

    const mainModule = createModule({ id: "main", typeDefs, resolvers });
    const app = createApplication({ modules: [mainModule, ...modules] });
    const schema = app.createSchemaForApollo();

    senses.eventbus.on("device.updated", (device) => {
        pubsub.publish("device.update", { deviceUpdated: deviceMapper.call(senses, device) });
    });

    return new ApolloServer({ schema });
}

async function loadModules(components: Component[]): Promise<Module[]> {
    const modules: Module[] = [];
    for (const component of components) {
        try {
            const p = require.resolve(path.join(component.source, "graphql"));
            const module = await import(p);
            modules.push(module.default ?? module);
        } catch {
            continue;
        }
    }

    return modules;
}

export default async function setup(senses: ISenses): Promise<void> {
    const modules = await loadModules(senses.components);
    console.log(modules);
    senses.eventbus.on("setup", () => {
        const graphQl = setupGraphQl(senses, modules);

        consola.info(`Found ${modules.length} GraphQL modules`);
        senses.waitOn<HttpComponent>("~http").then((http) => {
            graphQl.applyMiddleware({ app: http.app });
            graphQl.installSubscriptionHandlers(http.server);
            consola.info(`GraphQL endpoint is /graphql`);
        });
    });
}
