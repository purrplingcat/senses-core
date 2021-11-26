import consola from "consola";
import { ISenses } from "~core/Senses";
import { arrayOf } from "~utils";
import Automation, { Action, Condition, Trigger } from "./Automation";
import { ActionConfig, AutomationConfig, ConditionConfig, TriggerConfig } from "./configTypes";
import { loadFactory } from "./utils";

const automationRegistry: Automation[] = [];
export const name = "automation";

async function createTrigger(config: TriggerConfig, senses: ISenses): Promise<Trigger> {
    const factory = await loadFactory("~automation/triggers", config.on);
    const trigger: Trigger = factory.default(senses, config);

    trigger.id = config.id;

    return trigger;
}

async function createAction(config: ActionConfig, senses: ISenses): Promise<Action> {
    const factory = await loadFactory("~automation/actions", config.do);
    const action: Action = factory.default(senses, config);

    action.id = config.id;

    return action;
}

export async function createCondition(config: ConditionConfig, senses: ISenses): Promise<Condition> {
    const factory = await loadFactory("~automation/conditions", config.condition);
    const condition: Condition = factory.default(senses, config);

    return condition;
}

const checkMode: (mode: string) => boolean = (mode) => ["single", "queued", "parallel", "restart"].includes(mode);

async function createAutomation(config: AutomationConfig, senses: ISenses): Promise<Automation> {
    if (config.mode && !checkMode(config.mode)) throw new Error(`Invalid automation mode: ${config.mode}`);
    const automation = new Automation(config.name, config.mode || "single");

    for (const trigger of arrayOf<TriggerConfig>(config.trigger)) {
        trigger.id = trigger.id || `trigger${automation.triggers.length}`;
        automation.trigger(await createTrigger(trigger, senses));
    }

    for (const condition of arrayOf<ConditionConfig>(config.condition)) {
        condition.id = condition.id || `condition${automation.conditions.length}`;
        automation.condition(await createCondition(condition, senses));
    }

    for (const action of arrayOf<ActionConfig>(config.action)) {
        action.id = action.id || `action${automation.actions.length}`;
        automation.action(await createAction(action, senses));
    }

    return automation;
}

export default function setup(senses: ISenses, config: Record<string, any>): void {
    const automations: AutomationConfig[] = config.automation;

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

        consola.info(`Initialized ${automationRegistry.length} automations`);
    });
}
