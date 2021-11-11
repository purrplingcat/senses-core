import { addDays, addMilliseconds, startOfDay, subDays } from "date-fns";
import path from "path";
import suncalc from "suncalc";

const byTime = (a: [string, Date], b: [string, Date]) => (a[1] === b[1] ? 0 : a[1] > b[1] ? 1 : -1);

function pick(events: string[]) {
    return ([event]: [string, Date]) => !events?.length || events.includes(event);
}

export type SunTimes = suncalc.GetTimesResult & { midnight: Date };

export async function loadFactory(p: string, factoryName: string): Promise<any> {
    if (factoryName.startsWith(".")) {
        throw Error("Illegal factory name");
    }

    return await import(path.join(p, factoryName));
}

export function getSunTimes(now: Date, lat: number, lon: number): SunTimes {
    return {
        ...suncalc.getTimes(now, lat, lon),
        midnight: startOfDay(now),
    };
}

export type SunUtils = {
    buildEventList: (now: Date, offset?: number) => [string, Date][];
    next: (now: Date, events: string[], offset?: number) => [string, Date] | null;
    prev: (now: Date, events: string[], offset?: number) => [string, Date] | null;
    isSunBetween: (
        now: Date,
        before: keyof SunTimes,
        after: keyof SunTimes,
        beforeOffset?: number,
        afterOffset?: number,
    ) => boolean;
    getSunTimes: (now: Date) => SunTimes;
};

export function sunUtilsFor(lat: number, lon: number): SunUtils {
    function buildEventList(now: Date, offset = 0): Array<[string, Date]> {
        return [
            ...Object.entries(getSunTimes(now, lat, lon)),
            ...Object.entries(getSunTimes(subDays(now, 1), lat, lon)),
            ...Object.entries(getSunTimes(addDays(now, 1), lat, lon)),
        ]
            .map(([ev, time]: [string, Date]) => [ev, addMilliseconds(time, offset)] as [string, Date])
            .sort(byTime);
    }

    function next(now: Date, events: string[], offset = 0): [string, Date] | null {
        return (
            buildEventList(now, offset)
                .filter(pick(events))
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                .find(([_, time]) => now < time) ?? null
        );
    }

    function prev(now: Date, events: string[], offset = 0): [string, Date] | null {
        return (
            buildEventList(now, offset)
                .filter(pick(events))
                .reverse()
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                .find(([_, time]) => now > time) ?? null
        );
    }

    function isSunBetween(now: Date, before: keyof SunTimes, after: keyof SunTimes, beforeOffset = 0, afterOffset = 0) {
        const [nextEv] = next(now, [before, after], beforeOffset) ?? [];
        const [prevEv] = prev(now, [before, after], afterOffset) ?? [];

        return before === nextEv && after === prevEv;
    }

    return {
        buildEventList,
        next,
        prev,
        isSunBetween,
        getSunTimes: (now: Date) => getSunTimes(now, lat, lon),
    };
}
