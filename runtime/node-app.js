/* eslint-disable @typescript-eslint/no-var-requires */
require("./polyfills");
const moduleResolve = require("./module-resolve");
const nodePath = require("path");
const scope = {
    runner: "node-app",
    runnerVersion: "1.1.0",
    browser: typeof window === "object",
    node: typeof process === "object" && typeof process.versions === "object" && process.versions.node != null,
};

global = typeof global === "object" ? global : typeof window === "object" ? window : {};
global.NODE_APP = true;
global.application = scope;

function loadAssembly(entrypoint) {
    return require(process.cwd() + "/" + entrypoint);
}

function execute(app) {
    if (typeof app.errorHandler === "function") {
        process.on("unhandledRejection", app.errorHandler);
        process.on("uncaughtException", app.errorHandler);
    }

    app.default.call(app, process.argv.slice(1), process.env);
}

function runner(manifest, entry = null) {
    if (global.application.instance) {
        throw new Error("An application is already running");
    }

    if (typeof manifest !== "object") {
        throw new Error("Invalid application manifest");
    }

    const root = manifest.root || "";
    const _entry = entry || manifest.entry || manifest.main || "app.js";
    moduleResolve.addAlias("~", root || nodePath.dirname(_entry));
    moduleResolve.addAlias("@runtime", __dirname);
    moduleResolve.addAliases(manifest.resolve || {});

    const app = loadAssembly(nodePath.join(root, _entry));

    if (typeof app.default !== "function") {
        throw new Error(`Application ${manifest.name} is not runnable`);
    }

    global.application.rootDir = root || nodePath.dirname(_entry);
    global.application.entry = _entry;
    global.application.manifest = manifest;
    global.application.instance = app;
    execute(app);
}

module.exports = runner;
