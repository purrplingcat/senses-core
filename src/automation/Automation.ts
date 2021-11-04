import consola, { Consola } from "consola";

export type Action = {
    (context: object): Promise<boolean | void> | boolean | void;
    id?: string;
};

export type Trigger = {
    (trap: (context?: object) => Promise<void>): void;
    id?: string;
};

export type Condition = (context: object) => Promise<boolean> | boolean;

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
        trigger((opts = {}) =>
            this.trap({ ...opts, source: "trigger", id: trigger.id, type: trigger.name }).catch(this._logger.error),
        );
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

    private async _play(context: object) {
        this._logger.trace(`Automation ${this.name}: Playing ${this.actions.length} actions ...`);

        for (const action of this.actions) {
            if ((await action(context)) === false) {
                this._logger.trace(`Action ${action.id} returned false, break the action sequence`);
                return;
            }
        }

        this._logger.trace("Action sequence is done!");
    }

    async trap(context: Record<string, any> = {}): Promise<void> {
        context.automation = this;
        this._logger.trace(`trap in automation ${this.name}`, context);

        for (const condition of this.conditions) {
            if (!(await condition(context))) {
                this._logger.trace("Conditions mismatch, no action triggered");
                return;
            }
        }

        this._play(context).catch(this._logger.error);
    }
}
