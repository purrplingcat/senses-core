/* eslint-disable @typescript-eslint/no-explicit-any */
declare const NODE_APP: boolean;
declare const application: NodeApplication.Application;

declare namespace NodeApplication {
    export interface Application {
        manifest: AppManifest;
        instance: any;
        runner: string;
        runnerVersion: string;
        entry: string;
        rootDir: string;
        node: string;
        resolve: {
            root(dir?: string): string;
            addAlias(name: string, dirs: string | string[]);
            addAliases(aliases: Record<string, string | string[]>);
        };
    }

    export interface AppManifest {
        name: string;
        version: string;
        author: string;
    }
}
