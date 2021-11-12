export const extraAttrSymbol = Symbol.for("extraAttr");

export const extraAttr = Reflect.metadata(extraAttrSymbol, true);
