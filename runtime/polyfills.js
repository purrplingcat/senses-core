/* eslint-disable @typescript-eslint/no-var-requires */

if (typeof Array.prototype.query !== "function") {
    Array.prototype.query = function query(where) {
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

if (typeof Reflect.getAllMetadata !== "function") {
    Reflect.getAllMetadata = function (key, target) {
        const metadata = [];
        let proto = target;

        do {
            if (!Reflect.hasOwnMetadata(key, proto)) continue;
            metadata.push(Reflect.getOwnMetadata(key, proto));
        } while ((proto = Reflect.getPrototypeOf(proto)));

        return metadata;
    };
}

if (typeof Reflect.getConstructorOf !== "function") {
    Reflect.getConstructorOf = function (o) {
        return o?.constructor;
    };
}
