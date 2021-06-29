import consola, { Consola } from "consola";
import Entity from "../core/Entity";

export default abstract class Device<TState> implements Entity {
    title?: string;
    uid?: string;
    name = "";
    type = "";
    lastAlive?: Date;
    keepalive = false;
    timeout = 10000;
    class: string | null = null;
    features: string[] = [];
    product?: string;
    vendor?: string;
    model?: string;
    serialNumber?: string;
    revision?: string;

    abstract setState(state: Partial<TState>): Promise<boolean> | boolean;
    abstract getState(): Readonly<TState>;
    abstract get available(): boolean;

    public get entityId(): string {
        return `${this.type}.${this.name}`;
    }

    protected get _logger(): Consola {
        return consola.withScope(this.entityId);
    }

    public getExtraAttrs(): Record<string, unknown> {
        return {
            class: this.class || null,
            features: this.features,
            product: this.product,
            vendor: this.vendor,
            serialNumber: this.serialNumber,
            model: this.model,
            revision: this.revision,
        };
    }
}
