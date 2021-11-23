import { equal } from "fast-shallow-equal";
import { Condition } from "~automation/Automation";
import { ISenses } from "~core/Senses";
import { fetchUids } from "~utils/query";

export type StateConditionOptions = {
    device: string | object | string[] | object[];
    value?: unknown;
    attribute?: string;
};

export default function createStateCondition(senses: ISenses, options: StateConditionOptions): Condition {
    return function state() {
        return fetchUids(options.device, senses).every((id) => {
            if (!senses.hasDevice(id)) {
                return false;
            }

            const attribute = options.attribute || "state";
            const state: any = senses.fetchDevice(id).getState();

            return state && equal(state[attribute], options.value);
        });
    };
}
