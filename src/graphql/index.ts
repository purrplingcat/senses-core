import { ApolloServer, PubSub, PubSubEngine } from "apollo-server-express";
import { ISenses } from "~core/Senses";
import { HttpComponent } from "~http";
import { createApplication, Module } from "graphql-modules";
import consola from "consola";
import Component from "~core/Component";
import mainModule from "./mainModule";

export const pubsub: PubSubEngine = new PubSub();

function setupGraphQl(senses: ISenses, modules: Module[]): ApolloServer {
    const app = createApplication({ modules: [mainModule, ...modules] });
    const schema = app.createSchemaForApollo();

    return new ApolloServer({
        schema,
        context: (session) => ({ ...session, senses, pubsub }),
    });
}

async function resolveModule(
    senses: ISenses,
    module: Module | ((senses: ISenses) => Module | Promise<Module>),
): Promise<Module> {
    if (typeof module === "function") {
        return module(senses);
    }

    return module;
}

async function loadModules(components: Component[], senses: ISenses): Promise<Module[]> {
    const modules: Module[] = [];
    for (const component of components) {
        if (!component.hasOwnModule("graphql")) {
            continue;
        }

        const module = await component.import("graphql");

        if (typeof module.prepare === "function") {
            module.prepare(senses);
        }

        modules.push(await resolveModule(senses, module.default ?? module));
    }

    return modules;
}

export default async function setup(senses: ISenses): Promise<void> {
    const modules = await loadModules(senses.components, senses);

    senses.eventbus.on("setup", () => {
        const graphQl = setupGraphQl(senses, modules);

        consola.info(`Found ${modules.length} GraphQL modules`);
        senses.awaitComponent<HttpComponent>("http").then((http) => {
            graphQl.applyMiddleware({ app: http.app });
            graphQl.installSubscriptionHandlers(http.server);
            consola.info(`GraphQL endpoint is /graphql`);
        });
    });
}
