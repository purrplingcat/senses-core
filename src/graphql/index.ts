import { ApolloServer, IResolvers, PubSub, PubSubEngine } from "apollo-server-express";
import { ISenses } from "~core/Senses";
import { HttpComponent } from "~http";
import { GraphQLJSONObject } from "graphql-type-json";
import { createApplication, createModule, Module } from "graphql-modules";
import GraphQLDate from "./scalars/date";
import typeDefs from "./schema";
import consola from "consola";
import Component from "~core/Component";
import path from "path";

export const pubsub: PubSubEngine = new PubSub();

function setupGraphQl(senses: ISenses, modules: Module[]): ApolloServer {
    const resolvers: IResolvers = {
        Date: GraphQLDate,
        JSON: GraphQLJSONObject,
        Query: {
            name: () => senses.name,
            version: () => application.manifest.version,
        },
    };

    const mainModule = createModule({ id: "main", typeDefs, resolvers });
    const app = createApplication({ modules: [mainModule, ...modules] });
    const schema = app.createSchemaForApollo();

    return new ApolloServer({
        schema,
        context: (session) => ({ ...session, senses, pubsub }),
    });
}

async function loadModules(components: Component[], senses: ISenses): Promise<Module[]> {
    const modules: Module[] = [];
    for (const component of components) {
        try {
            const p = require.resolve(path.join(component.source, "graphql"));
            const module = await import(p);

            if (typeof module.prepare === "function") {
                module.prepare(senses);
            }

            modules.push(module.default ?? module);
        } catch (err: any) {
            if (err.code === "MODULE_NOT_FOUND") {
                continue;
            }

            throw err;
        }
    }

    return modules;
}

export default async function setup(senses: ISenses): Promise<void> {
    const modules = await loadModules(senses.components, senses);

    senses.eventbus.on("setup", () => {
        const graphQl = setupGraphQl(senses, modules);

        consola.info(`Found ${modules.length} GraphQL modules`);
        senses.waitOn<HttpComponent>("http").then((http) => {
            graphQl.applyMiddleware({ app: http.app });
            graphQl.installSubscriptionHandlers(http.server);
            consola.info(`GraphQL endpoint is /graphql`);
        });
    });
}
