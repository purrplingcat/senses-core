import { YAMLSeq, YAMLMap } from "yaml/types";

export function pure<T extends Record<string | number | symbol, unknown>>(obj: T): T {
    Object.keys(obj).forEach((key) => (obj[key] === undefined ? delete obj[key] : {}));

    return obj;
}

export function isEmptyObject(obj: object): boolean {
    return obj && obj.constructor === Object && Object.keys(obj).length === 0;
}

export function asArray<T>(val: unknown): T[] {
    if (!val) {
        return [];
    }

    if (val instanceof YAMLSeq || val instanceof YAMLMap) {
        val = val.toJSON();
    }

    if (typeof val === "object") {
        return Object.values(val || {});
    }

    return Array.from(val as T[]);
}

export function toObject<T extends { [k: string]: unknown }>(val: unknown): T {
    return Object.fromEntries(Object.entries(<Record<string, unknown>>val)) as T;
}

export function componentToHex(c: number): string {
    const hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

export function rgbToHex(r: number, g: number, b: number): string {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : null;
}

export function isIncluded(name: string, includes?: string[], excludes?: string[]): boolean {
    const included = !Array.isArray(includes) || !includes.length || includes.includes(name);
    const excluded = Array.isArray(excludes) && excludes.length && excludes.includes(name);

    return !excluded && included;
}

export function isDefined(val: unknown): boolean {
    return val !== undefined;
}

export function pick<T extends object, K extends keyof T>(obj: T, toPick: K[]): Pick<T, K> {
    const picked: Record<PropertyKey, unknown> = {};

    for (const key of toPick) {
        if (obj.hasOwnProperty(key)) {
            picked[key] = obj[key];
        }
    }

    return picked as Pick<T, K>;
}
