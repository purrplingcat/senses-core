/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const scope = {
    runner: "node-app",
    runnerVersion: "1.2.0",
    browser: typeof window === "object",
    node: typeof process === "object" && process.versions?.node,
    instance: null,
    rootDir: "",
    entry: null,
    manifest: {},
    resolve: null,
};

if (!scope.node) throw new Error("This application can be run only under NodeJS");

global.NODE_APP = true;
global.application = scope;

function execute(app) {
    if (typeof app.errorHandler === "function") {
        process.on("unhandledRejection", app.errorHandler);
        process.on("uncaughtException", app.errorHandler);
    }

    app.default.call(app, process.argv.slice(1), process.env);
}

function requirePolyfill(p, root) {
    return require(p.startsWith("./") || p.startsWith("../") ? path.resolve(root, p) : p);
}

/**
 * Creates application runtime and executes their main function
 * @param {string} manifestFile Path to application manifest
 * @param {string|null} entry Path to applicaton entry file with the main function
 */
function runtime(manifestFile, entry = null) {
    if (scope.instance) {
        throw new Error("An application is already running");
    }

    manifestFile = require.resolve(manifestFile);
    const manifest = require(manifestFile);
    const root = path.dirname(path.resolve(manifestFile));
    const entryFile = entry || manifest.entry || manifest.main || "app.js";

    const moduleResolve = require("./module-resolve");
    moduleResolve.root(root);
    moduleResolve.addAliases(manifest.resolve || {});

    const polyfills = manifest.polyfills || [];
    polyfills.forEach((p) => requirePolyfill(p, root));

    const app = require(path.resolve(root, entryFile));
    if (typeof app.default !== "function") {
        throw new Error(`Application '${manifest.name}' (${entryFile}) is not executable`);
    }

    scope.resolve = moduleResolve;
    scope.rootDir = root;
    scope.entry = entryFile;
    scope.manifest = manifest;
    scope.instance = app;

    execute(app);
}

if (require.main === module) {
    const argv = [...process.argv];
    process.argv = [argv[0], argv[1], ...argv.slice(4)];

    runtime(path.resolve(argv[2]), argv[3] !== "-" && argv[3]);
}

module.exports = runtime;
