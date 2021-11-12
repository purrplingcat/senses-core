import { createCondition } from "~automation";
import { Condition } from "~automation/Automation";
import { ConditionConfig } from "~automation/configTypes";
import { ISenses } from "~core/Senses";
import { asArray } from "~utils";

export type AndConditionOptions = {
    condition: ConditionConfig | ConditionConfig[];
};

export default function createAndCondition(senses: ISenses, options: AndConditionOptions): Condition {
    return async function and(context) {
        const conditions = await Promise.all(
            asArray<ConditionConfig>(options.condition).map((c) => createCondition(c, senses)),
        );

        for (const condition of conditions) {
            if (!(await condition(context))) {
                return false;
            }
        }

        return true;
    };
}
