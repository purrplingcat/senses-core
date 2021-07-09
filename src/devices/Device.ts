import consola, { Consola } from "consola";
import Entity, { UniqueIdentity } from "../core/Entity";
import Handshake, { decodeDeviceType } from "../core/Handshake";
import { asArray, toObject } from "../core/utils";

export default abstract class Device<TState> implements Entity, UniqueIdentity {
    title?: string;
    uid = "";
    name = "";
    type = "generic";
    lastAlive: Date | null = null;
    lastUpdate: Date | null = null;
    keepalive = false;
    timeout = 10000;
    class: string | null = null;
    room: string | null = null;
    groups: string[] = [];
    features: string[] = [];
    product?: string;
    vendor?: string;
    model?: string;
    serialNumber?: string;
    revision?: string;
    description?: string;
    tags: string[] = [];
    via?: string;
    attributes: Record<string, unknown> = {};

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
            features: this.features,
            product: this.product,
            vendor: this.vendor,
            serialNumber: this.serialNumber,
            model: this.model,
            revision: this.revision,
        };
    }

    public updateFromShake(shake: Handshake): void {
        const type = decodeDeviceType(shake.type);

        this.uid = shake.uid;
        this.name = shake.alias || shake.uid;
        this.title = shake.name;
        this.class = type.class;
        this.room = shake.location || null;
        this.features = asArray(shake.features);
        this.groups = asArray(shake.groups);
        this.keepalive = shake.keepalive;
        this.timeout = shake.keepaliveTimeout;
        this.product = shake.product;
        this.vendor = shake.vendor;
        this.serialNumber = shake.serialNo;
        this.model = shake.model;
        this.description = shake.description;
        this.tags = shake.tags || [];
        this.via = shake.via;
        this.attributes = toObject(shake.additional || {});
    }
}
