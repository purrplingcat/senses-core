import { Condition } from "~automation/Automation";
import { ISenses } from "~core/Senses";
import { between } from "~utils";
import { fetchUids } from "~utils/query";

export type NumericStateConditionOptions = {
    device: string | object | string[] | object[];
    attribute: string;
    above?: number;
    below?: number;
};

export default function createAndCondition(senses: ISenses, options: NumericStateConditionOptions): Condition {
    return function stateNumeric() {
        return fetchUids(options.device, senses).every((id) => {
            if (!senses.hasDevice(id)) {
                return false;
            }

            const above = Number(options.above ?? Number.MIN_VALUE);
            const below = Number(options.below ?? Number.MAX_VALUE);
            const attribute = options.attribute || "state";
            const state: any = senses.fetchDevice(id).getState();
            const value = Number(state[attribute]);

            return between(value, above, below);
        });
    };
}
