import { ISenses } from "~core/Senses";
import { arrayOf } from "~utils";

export function fetchUids(query: string | string[] | object | object[], senses: ISenses): string[] {
    return arrayOf(query).flatMap((q) => {
        if (typeof q === "object") {
            return senses.devices.query(q).map((d) => d.uid);
        }

        return q;
    });
}
