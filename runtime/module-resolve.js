/* eslint-disable @typescript-eslint/no-var-requires */
"use strict";

const BuiltinModule = require("module");
const nodePath = require("path");
const aliases = {};
let root = process.cwd();

// Guard against poorly mocked module constructors
const Module = module.constructor.length > 1 ? module.constructor : BuiltinModule;

const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parentModule, isMain, options) {
    for (const alias of Object.keys(aliases)) {
        if (!request.startsWith(alias) || !aliases.hasOwnProperty(alias)) continue;
        for (const p of aliases[alias]) {
            try {
                const r = nodePath.join(nodePath.resolve(root, p), request.substr(alias.length));
                return resolveFilename.call(this, r, parentModule, isMain, options);
            } catch (err) {
                if (err.code === "MODULE_NOT_FOUND") continue;
                throw err;
            }
        }
    }

    return resolveFilename.call(this, request, parentModule, isMain, options);
};

exports.root = function (dir) {
    if (dir != null) {
        root = dir;
    }

    return root;
};

exports.addAlias = function (alias, path) {
    aliases[alias] = !Array.isArray(path) ? [path] : path;
};

exports.addAliases = function (aliasesToAdd) {
    Object.keys(aliasesToAdd).forEach(
        (k) => (aliasesToAdd[k] = !Array.isArray(aliasesToAdd[k]) ? [aliasesToAdd[k]] : aliasesToAdd[k]),
    );
    Object.assign(aliases, aliasesToAdd);
};
