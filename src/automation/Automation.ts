import consola, { Consola } from "consola";
import EventEmmiter from "events";
import { CancellableSignal, createCancellableSignal } from "~utils/cancellation";
import { ISemaphore, Semaphore } from "~utils/semaphore";

export type Action = {
    (context: object, signal: CancellableSignal): Promise<void> | void;
    id?: string;
};

export type Trigger = {
    (trap: (context?: object) => Promise<void>): void;
    id?: string;
};

export type Condition = {
    (context: object): Promise<boolean> | boolean;
    id?: string;
};

export type AutomationMode = "single" | "queued" | "parallel" | "restart";

export default class Automation {
    name: string;
    actions: Action[];
    triggers: Trigger[];
    conditions: Condition[];
    public mode: AutomationMode;
    private _logger: Consola;
    private _events = new EventEmmiter();
    private _queue: ISemaphore;
    lastExecutionError: unknown;

    constructor(name: string, mode: AutomationMode, maxConcurency = 10) {
        this.actions = [];
        this.triggers = [];
        this.conditions = [];
        this.name = name;
        this.mode = mode;
        this._logger = consola.withScope("automation").withTag(name);
        this._queue = new Semaphore(["single", "restart"].includes(mode) ? 1 : maxConcurency);
        this._onExecutionDone = this._onExecutionDone.bind(this);
        this._onExecutionError = this._onExecutionError.bind(this);
    }

    get running(): boolean {
        return !this._queue.isFree();
    }

    trigger(trigger: Trigger): this {
        trigger((opts = {}) => {
            const context = { ...opts, source: "trigger", id: trigger.id, type: trigger.name };

            this._logger.debug(`Trigger fired: ${this.name}.${trigger.id}<${trigger.name}>`);
            this._logger.trace(`Trigger ${this.name}.${trigger.id}<${trigger.name}> context:`, context);

            return this.play(context).catch(this._logger.error);
        });

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

    cancel(): void {
        this._queue.cancel();
        this._events.emit("cancel", "Automation execution cancelled");
        this._logger.info(`Automation ${this.name}: Execution was cancelled`);
    }

    private async _play(context: object) {
        this._logger.debug(`Automation ${this.name}: Playing ${this.actions.length} actions ...`);
        const signal = createCancellableSignal(`Automation ${this.name}`, this._logger.debug);
        const cancel = (reason: unknown) => signal.cancel(reason);

        this._events.once("cancel", cancel);

        try {
            for (const action of this.actions) {
                if (signal.isCancelled) break;

                this._logger.debug(`Execute action ${this.name}.${action.id}<${action.name}>`);
                this._logger.trace(`Action ${this.name}.${action.id}<${action.name}> context:`, context);

                await action(context, signal);
            }
            this._logger.trace("Action sequence is done!");
        } finally {
            this._events.off("cancel", cancel);
        }
    }

    async play(context: Record<string, any> = {}): Promise<void> {
        context.automation = this;
        this._logger.trace(`trap in automation ${this.name}`, context);

        for (const condition of this.conditions) {
            if (!(await condition(context))) {
                this._logger.debug(
                    `Condition ${this.name}.${condition.id}<${condition.name}> mismatch, no action triggered`,
                );
                return;
            }
        }

        if (["single", "parallel"].includes(this.mode) && this._queue.isLocked()) {
            return this._logger.warn(
                `Automation ${this.name}: Execution limit (${this._queue.maxConcurency}) exceeded in ${this.mode} mode.`,
            );
        }

        if (this.mode === "restart" && this._queue.isLocked()) {
            this.cancel();
        }

        this._queue
            .runExclusive(() => this._play(context))
            .then(this._onExecutionDone)
            .catch(this._onExecutionError);
        this._logger.debug(`Automation ${this.name}: Enqueued new automation execution`);
    }

    private _onExecutionDone() {
        this.lastExecutionError = null;
        this._logger.info(`Automation '${this.name}' executed SUCCESSFULLY`);
    }

    private _onExecutionError(err: unknown) {
        this.lastExecutionError = err;
        this._logger.error(`Error while executing automation '${this.name}':`, err);
    }
}
