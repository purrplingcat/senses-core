import consolaGlobalInstance from "consola";
import { YAMLSeq } from "yaml/types";
import { ISenses } from "~core/Senses";
import { arrayOf } from "~core/utils";
import Automation, { Action, Condition, Trigger } from "./Automation";
import { ActionConfig, AutomationConfig, ConditionConfig, TriggerConfig } from "./configTypes";
import { loadFactory } from "./utils";

const automationRegistry: Automation[] = [];
export const name = "automation";

async function createTrigger(config: TriggerConfig, senses: ISenses): Promise<Trigger> {
    const factory = await loadFactory("~automation/triggers", config.on);

    return factory.default(senses, config);
}

async function createAction(config: ActionConfig, senses: ISenses): Promise<Action> {
    const factory = await loadFactory("~automation/actions", config.do);

    return factory.default(senses, config);
}

export async function createCondition(config: ConditionConfig, senses: ISenses): Promise<Condition> {
    const factory = await loadFactory("~automation/conditions", config.condition);

    return factory.default(senses, config);
}

async function createAutomation(config: AutomationConfig, senses: ISenses): Promise<Automation> {
    const automation = new Automation(config.name);

    for (const trigger of arrayOf<TriggerConfig>(config.trigger)) {
        automation.trigger(await createTrigger(trigger, senses));
    }

    for (const condition of arrayOf<ConditionConfig>(config.condition)) {
        automation.condition(await createCondition(condition, senses));
    }

    for (const action of arrayOf<ActionConfig>(config.action)) {
        if (!action.id) {
            action.id = `action${automation.actions.length}`;
        }

        automation.action(await createAction(action, senses));
    }

    return automation;
}

export function setup(senses: ISenses, config: YAMLSeq): void {
    const automations: AutomationConfig[] = config.toJSON();

    if (!Array.isArray(automations)) {
        throw new Error(`Automations config: Expected array, but got ${typeof automations}`);
    }

    senses.eventbus.on("setup", async () => {
        for (const automation of automations) {
            if (!automation.name) {
                automation.name = `automation${automationRegistry.length}`;
            }

            automationRegistry.push(await createAutomation(automation, senses));
        }

        consolaGlobalInstance.info(`Initialized ${automationRegistry.length} automations`);
    });
}
