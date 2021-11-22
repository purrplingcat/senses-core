import { PubSub } from "apollo-server-express";
import { ISenses } from "~core/Senses";

export interface ContextSenses {
    senses: ISenses;
    pubsub: PubSub;
}
