import { YAMLSeq, YAMLMap } from "yaml/types";

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
