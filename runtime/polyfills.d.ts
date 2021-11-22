/* eslint-disable @typescript-eslint/no-unused-vars */

interface Array<T> {
    query(where: unknown): this;
}

namespace Reflect {
    function getPropertyNames(o: unknown): string[];
}

declare module "*.gql" {
    import { DocumentNode } from "graphql";
    const Schema: DocumentNode;

    export = Schema;
}
