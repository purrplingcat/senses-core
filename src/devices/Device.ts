import consola, { Consola } from "consola";
import Entity, { UniqueIdentity } from "../core/Entity";
import Handshake, { decodeDeviceType } from "../core/Handshake";
import { ISenses } from "../core/Senses";
import { asArray, toObject } from "../core/utils";

export interface DeviceInfo {
    product?: string;
    vendor?: string;
    model?: string;
    serialNumber?: string;
    revision?: string;
}

export default abstract class Device<TState extends {} = {}> implements Entity, UniqueIdentity {
    title?: string;
    name = "";
    uid = "";
    type = "generic";
    class: string | null = null;
    info: DeviceInfo;
    lastAlive: Date | null = null;
    lastUpdate: Date | null = null;
    keepalive = false;
    timeout = 10000;
    room: string | null = null;
    groups: string[] = [];
    features: string[] = [];
    tags: string[] = [];
    via?: string;
    description?: string;
    attributes: Record<string, unknown>;
    readonly senses: ISenses;

    constructor(senses: ISenses) {
        this.senses = senses;
        this.attributes = {};
        this.info = {};
    }

    abstract setState(state: Partial<TState>): Promise<boolean> | boolean;
    abstract getState(): Readonly<TState>;
    abstract update(patch?: Partial<TState>): void;
    abstract get available(): boolean;

    public get entityId(): string {
        return `${this.type}.${this.name}`;
    }

    protected get _logger(): Consola {
        return consola.withScope(this.entityId);
    }

    public getExtraAttrs(): Record<string, unknown> {
        return { ...this.info, ...this.attributes };
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
        this.info.product = shake.product;
        this.info.vendor = shake.vendor;
        this.info.serialNumber = shake.serialNo;
        this.info.model = shake.model;
        this.description = shake.description;
        this.tags = shake.tags || [];
        this.via = shake.via;
        this.attributes = toObject(shake.additional || {});
    }
}
