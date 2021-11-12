import parseDuration from "parse-duration";
import { Condition } from "~automation/Automation";
import { SunTimes, sunUtilsFor } from "~utils/sun";
import { ISenses } from "~core/Senses";

export type SunConditionOptions = {
    before?: keyof SunTimes;
    after?: keyof SunTimes;
    lat?: number;
    lon?: number;
    beforeOffset?: number | string;
    afterOffset?: number | string;
};

export default function createSunCondition(senses: ISenses, options: SunConditionOptions): Condition {
    if (!options.before && !options.after) {
        throw new Error("Before or After or both of them must be defined");
    }

    return function sun() {
        const before = options.before || "midnight";
        const after = options.after || "midnight";
        const beforeOffset = parseDuration(String(options.beforeOffset ?? 0));
        const afterOffset = parseDuration(String(options.afterOffset ?? 0));
        const lat = options.lat ?? senses.config?.position?.lat ?? 0;
        const lon = options.lon ?? senses.config?.position?.long ?? 0;

        return sunUtilsFor(lat, lon).isSunBetween(new Date(), before, after, beforeOffset, afterOffset);
    };
}
