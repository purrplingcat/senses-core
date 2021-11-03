import { equal } from "fast-shallow-equal";
import { ISenses } from "~core/Senses";
import { arrayOfOrNull } from "~core/utils";

export type StateTriggerOptions = {
    device?: string | string[];
    from?: string | string[];
    to?: string | string[];
    attributes?: string | string[];
    for?: number;
};

export default function createStateTrigger(senses: ISenses, options: StateTriggerOptions) {
    return function stateTrigger(trap: () => Promise<void>): void {
        let timer: NodeJS.Timeout | null = null;
        senses.eventbus.on("device.state_changed", (device, newState, oldState) => {
            const uids = arrayOfOrNull(options.device);
            const from = arrayOfOrNull(options.from);
            const to = arrayOfOrNull(options.to);
            const forTime = options.for ?? 0;
            const keys: string[] = arrayOfOrNull(options.attributes) || [
                ...new Set([...Object.keys(newState), ...Object.keys(oldState)]),
            ];

            if (uids && !uids.includes(device.uid)) {
                return;
            }

            for (const key of keys) {
                const oldVal = Reflect.get(oldState, key);
                const newVal = Reflect.get(newState, key);
                const fromMatch = !from || from.includes(oldVal);
                const toMatch = !to || to.includes(newVal);

                if (equal(oldVal, newVal)) {
                    continue;
                }

                if (timer) {
                    clearTimeout(timer);
                }

                if (fromMatch && toMatch) {
                    timer = setTimeout(trap, forTime);
                    break;
                }
            }
        });
    };
}
