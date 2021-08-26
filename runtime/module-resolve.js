/* eslint-disable @typescript-eslint/no-var-requires */
"use strict";

const BuiltinModule = require("module");
const nodePath = require("path");
const aliases = {};

// Guard against poorly mocked module constructors
const Module = module.constructor.length > 1 ? module.constructor : BuiltinModule;

var oldResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parentModule, isMain, options) {
    for (const alias of Object.keys(aliases)) {
        if (request.startsWith(alias) && aliases.hasOwnProperty(alias)) {
            request = nodePath.join(nodePath.resolve(aliases[alias]), request.substr(alias.length));
            break;
        }
    }

    return oldResolveFilename.call(this, request, parentModule, isMain, options);
};

exports.addAlias = function (alias, path) {
    aliases[alias] = path;
};

exports.addAliases = function (aliasesToAdd) {
    Object.assign(aliases, aliasesToAdd);
};
