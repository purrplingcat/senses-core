import "reflect-metadata";

export const extraAttrSymbol = Symbol.for("extraAttr");

export const extraAttr = Reflect.metadata(extraAttrSymbol, true);
