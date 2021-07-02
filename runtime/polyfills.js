/* eslint-disable @typescript-eslint/no-var-requires */

if (typeof Array.prototype.query !== "function") {
    Array.prototype.query = function (where) {
        return require("query").query(this, where);
    };
}
