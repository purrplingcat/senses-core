import parseDuration from "parse-duration";
import { equal } from "fast-shallow-equal";
import { ISenses } from "~core/Senses";
import { arrayOfOrNull } from "~core/utils";
import consola from "consola";

export type StateTriggerOptions = {
    device?: string | string[];
    from?: string | string[];
    to?: string | string[];
    attributes?: string | string[];
    for?: number | string;
};

export default function createStateTrigger(senses: ISenses, options: StateTriggerOptions) {
    return function stateTrigger(trap: () => Promise<void>): void {
        let timer: NodeJS.Timeout | null = null;
        senses.eventbus.on("device.state_changed", (device, newState, oldState) => {
            const uids = arrayOfOrNull(options.device);
            const from = arrayOfOrNull(options.from);
            const to = arrayOfOrNull(options.to);
            const forTime = parseDuration(String(options.for ?? 0));
            const keys: string[] = arrayOfOrNull(options.attributes) || [
                ...new Set([...Object.keys(newState), ...Object.keys(oldState)]),
            ];

            if (uids && !uids.includes(device.uid)) {
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
