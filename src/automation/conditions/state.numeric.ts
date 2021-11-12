import { Condition } from "~automation/Automation";
import { ISenses } from "~core/Senses";
import { between } from "~utils";

export type NumericStateConditionOptions = {
    device: string;
    attribute: string;
    above?: number;
    below?: number;
};

export default function createAndCondition(senses: ISenses, options: NumericStateConditionOptions): Condition {
    return function stateNumeric() {
        if (!senses.hasDevice(options.device)) {
            return false;
        }

        const above = Number(options.above ?? Number.MIN_VALUE);
        const below = Number(options.below ?? Number.MAX_VALUE);
        const attribute = options.attribute || "state";
        const state: any = senses.fetchDevice(options.device).getState();
        const value = Number(state[attribute]);

        return between(value, above, below);
    };
}
