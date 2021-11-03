import consola, { Consola } from "consola";

export type Action = () => Promise<void> | void;
export type Trigger = (trap: () => Promise<void>) => void;
export type Condition = () => Promise<boolean> | boolean;

export default class Automation {
    name: string;
    actions: Action[];
    triggers: Trigger[];
    conditions: Condition[];
    private _logger: Consola;

    constructor(name: string) {
        this.actions = [];
        this.triggers = [];
        this.conditions = [];
        this.name = name;
        this._logger = consola.withScope("automation").withTag(name);
    }

    trigger(trigger: Trigger): this {
        trigger(this.trap.bind(this));
        this.triggers.push(trigger);

        return this;
    }

    action(action: Action): this {
        this.actions.push(action);

        return this;
    }

    condition(condition: Condition): this {
        this.conditions.push(condition);

        return this;
    }

    async trap(): Promise<void> {
        this._logger.trace(`trap in automation ${this.name}`);
        for (const condition of this.conditions) {
            if ((await condition()) === false) {
                return;
            }
        }

        await Promise.all(this.actions.map((action) => action()));
    }
}
