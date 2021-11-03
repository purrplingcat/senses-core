/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const scope = {
    runner: "node-app",
    runnerVersion: "1.1.0",
    browser: typeof window === "object",
    node: typeof process === "object" && typeof process.versions === "object" && process.versions.node != null,
};

global.NODE_APP = true;
global.application = scope;

require("./polyfills");

function loadAssembly(entrypoint) {
    return require(path.join(process.cwd(), entrypoint));
}

function execute(app) {
    if (typeof app.errorHandler === "function") {
        process.on("unhandledRejection", app.errorHandler);
        process.on("uncaughtException", app.errorHandler);
    }

    app.default.call(app, process.argv.slice(1), process.env);
}

function runtime(manifest, entry = null) {
    if (typeof manifest !== "object") {
        throw new Error("Invalid application manifest");
    }

    if (scope.instance) {
        throw new Error("An application is already running");
    }

    const root = manifest.root || "";
    const entryFile = entry || manifest.entry || manifest.main || "app.js";
    const moduleResolve = require("./module-resolve");
    moduleResolve.addAlias("~~", process.cwd());
    moduleResolve.addAlias("~", root || path.dirname(entryFile));
    moduleResolve.addAlias("@runtime", __dirname);
    moduleResolve.addAliases(manifest.resolve || {});

    const app = loadAssembly(path.join(root, entryFile));

    if (typeof app.default !== "function") {
        throw new Error(`Application ${manifest.name} is not runnable`);
    }

    scope.rootDir = root || path.dirname(entryFile);
    scope.entry = entryFile;
    scope.manifest = manifest;
    scope.instance = app;

    execute(app);
}

module.exports = runtime;
