import { equal } from "fast-shallow-equal";
import { Condition } from "~automation/Automation";
import { ISenses } from "~core/Senses";

export type StateConditionOptions = {
    device: string;
    value?: unknown;
    attribute?: string;
};

export default function createStateCondition(senses: ISenses, options: StateConditionOptions): Condition {
    return function state() {
        if (!senses.hasDevice(options.device)) {
            return false;
        }

        const attribute = options.attribute || "state";
        const state: any = senses.fetchDevice(options.device).getState();

        return state && equal(state[attribute], options.value);
    };
}
