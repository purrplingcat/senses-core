import consola, { Consola } from "consola";
import Entity from "../core/Entity";

export default abstract class Device<TState> implements Entity {
    public title?: string;
    public name = "";
    public type = "";
    public abstract setState(state: Partial<TState>): Promise<boolean> | boolean;
    public abstract getState(): Readonly<TState>;
    public abstract get available(): boolean;

    public get entityId(): string {
        return `${this.type}.${this.name}`;
    }

    protected get _logger(): Consola {
        return consola.withScope(this.entityId);
    }

    getExtraAttrs(): Record<string, unknown> | null {
        return null;
    }
}
