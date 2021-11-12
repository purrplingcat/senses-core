import parseDuration from "parse-duration";
import { ISenses } from "~core/Senses";
import { arrayOfOrNull, fetchUids } from "~core/utils";
import consola from "consola";
import { Trigger } from "~automation/Automation";
import { between } from "~automation/utils";

export type NumericStateTriggerOptions = {
    device: string | string[] | object;
    attribute: string | string[];
    above?: number;
    below?: number;
    for?: number | string;
};

export default function createStateTrigger(senses: ISenses, options: NumericStateTriggerOptions): Trigger {
    return function stateNumeric(trap: () => Promise<void>): void {
        let timer: NodeJS.Timeout | null = null;

        senses.eventbus.on("device.state_changed", (device, newState, oldState) => {
            const uids = fetchUids(options.device ?? [], senses);
            const above = Number(options.above ?? Number.MIN_VALUE);
            const below = Number(options.below ?? Number.MAX_VALUE);
            const forTime = parseDuration(String(options.for ?? 0));
            const keys: string[] = arrayOfOrNull(options.attribute) || [
                ...new Set([...Object.keys(newState), ...Object.keys(oldState)]),
            ];

            if (uids.length && !uids.includes(device.uid)) {
                return;
            }

            let changed = false;
            let match = false;
            for (const key of keys) {
                const oldVal = Number(Reflect.get(oldState, key));
                const newVal = Number(Reflect.get(newState, key));
                const isOldBetween = between(oldVal, above, below);
                const isNewBetween = between(newVal, above, below);

                changed ||= isOldBetween != isNewBetween;
                match ||= isNewBetween;
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
