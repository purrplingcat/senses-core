import { getAllDevices, ISenses } from "~core/Senses";
import Device from "~devices/Device";
import { arrayOf } from "~utils";

export function fetchUids(query: string | string[] | object | object[], senses: ISenses): string[] {
    return arrayOf(query).flatMap((q) => {
        if (typeof q === "object") {
            return getAllDevices(senses)
                .query(q)
                .map((d) => d.entityId);
        }

        return q;
    });
}

export function byUids(uids: string[]) {
    return (device: Device): boolean => uids.some((id) => id === device.uid || id === device.entityId);
}
