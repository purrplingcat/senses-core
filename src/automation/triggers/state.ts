import consola from "consola";
import parseDuration from "parse-duration";
import { equal } from "fast-shallow-equal";
import { Trigger } from "~automation/Automation";
import { ISenses } from "~core/Senses";
import { arrayOfOrNull } from "~utils";
import { fetchUids } from "~utils/query";

export type StateTriggerOptions = {
    device?: string | string[] | object;
    from?: string | string[];
    to?: string | string[];
    attribute?: string | string[];
    for?: number | string;
};

export default function createStateTrigger(senses: ISenses, options: StateTriggerOptions): Trigger {
    return function state(trap: () => Promise<void>): void {
        let timer: NodeJS.Timeout | null = null;

        senses.eventbus.on("device.state_changed", (device, newState, oldState) => {
            const uids = fetchUids(options.device ?? [], senses);
            const from = arrayOfOrNull(options.from);
            const to = arrayOfOrNull(options.to);
            const forTime = parseDuration(String(options.for ?? 0));
            const keys: string[] = arrayOfOrNull(options.attribute) || [
                ...new Set([...Object.keys(newState), ...Object.keys(oldState)]),
            ];

            if (uids.length && !uids.some((id) => id === device.entityId || id === device.uid)) {
                return;
            }

            let changed = false;
            let match = false;
            for (const key of keys) {
                const oldVal = Reflect.get(oldState, key);
                const newVal = Reflect.get(newState, key);
                const fromMatch = !from || from.includes(oldVal);
                const toMatch = !to || to.includes(newVal);

                changed ||= !equal(oldVal, newVal);
                match ||= fromMatch && toMatch;
            }

            consola.trace(`[State trigger] Changed: ${changed}, Match: ${match}`);

            if (changed && timer) {
                consola.trace(`Cancelled timer ${timer}`);
                clearTimeout(timer);
                timer = null;
            }

            if (changed && match) {
                timer = setTimeout(trap, forTime);
                consola.trace(`Scheduled fire trap in ${forTime} ms`);
            }
        });
    };
}
