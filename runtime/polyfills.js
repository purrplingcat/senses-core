/* eslint-disable @typescript-eslint/no-var-requires */

if (typeof Array.prototype.query !== "function") {
    Array.prototype.query = function (where) {
        return require("query").query(this, where);
    };
}

Reflect = typeof Reflect === "object" ? Reflect : {};

if (typeof Reflect.getPropertyNames !== "function") {
    Reflect.getPropertyNames = function (o) {
        const props = [];
        let obj = o;

        do {
            props.push(...Object.getOwnPropertyNames(obj));
        } while ((obj = Object.getPrototypeOf(obj)));

        return Array.from(new Set(props)).sort();
    };
}
