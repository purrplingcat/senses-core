//import "reflect-metadata";
import consola, { Consola } from "consola";
import Entity, { UniqueIdentity } from "~core/Entity";
import Handshake, { decodeDeviceType } from "~core/Handshake";
import { ISenses } from "~/core/Senses";
import { asArray, toObject } from "~utils";
import { extraAttrSymbol } from "./metadata";

export interface DeviceInfo {
    product?: string;
    productCode?: string;
    vendor?: string;
    vendorId?: string;
    model?: string;
    serialNumber?: string;
    revision?: string;
    driver?: string;
}

@Reflect.metadata(Symbol.for("device"), true)
export default abstract class Device<TState extends {} = {}> implements Entity, UniqueIdentity {
    title?: string;
    name = "";
    uid = "";
    type = "generic";
    class: string | null = null;
    info: DeviceInfo;
    lastAlive: Date | null = null;
    keepalive = false;
    timeout = 10000;
    room: string | null = null;
    groups: string[] = [];
    features: string[] = [];
    tags: string[] = [];
    via?: string;
    description?: string;
    attributes: Record<string, unknown>;
    config: any;
    readonly senses: ISenses;

    constructor(senses: ISenses) {
        this.senses = senses;
        this.attributes = {};
        this.info = {};
        this.config = null;
    }

    abstract setState(state: Partial<TState>): Promise<boolean> | boolean;
    abstract getState(): Readonly<TState>;
    abstract update(patch?: Partial<TState>): void;
    abstract get available(): boolean;
    abstract get lastUpdate(): Date;

    public get entityId(): string {
        return `${this.type}.${this.name}`;
    }

    public get deviceId(): string {
        const id = `${this.info.driver}-${this.info.vendor}-${this.info.product}-${this.info.model}`;

        return id.toLowerCase().split(" ").join("");
    }

    public get kind(): string {
        return Device.getKind(this);
    }

    protected get _logger(): Consola {
        return consola.withScope(this.entityId);
    }

    private _reflectExtraAttrs() {
        const attrs: Record<string, unknown> = {};

        for (const key of Reflect.getPropertyNames(this)) {
            const isExtraAttr: boolean = Reflect.getMetadata(extraAttrSymbol, this, key) ?? false;

            if (isExtraAttr) {
                attrs[key] = Reflect.get(this, key);
            }
        }

        return attrs;
    }

    public getExtraAttrs(): Record<string, unknown> {
        return {
            ...this.info,
            ...this.attributes,
            ...this._reflectExtraAttrs(),
            _constructor: this.constructor.name,
        };
    }

    public setup(config: unknown): void {
        this.config = config;
    }

    public updateFromShake(shake: Handshake): void {
        const type = decodeDeviceType(shake.type);

        if (type.type != this.type || type.kind != "device") {
            this._logger.warn(
                `Can't update device ${this.uid}: Type or kind mismatch. To fix this try restart the Senses process.`,
                {
                    current: `device/${this.type}${this.class ? `, ${this.class}` : ""}`,
                    changed: type.fullQualifiedType,
                },
            );
        }

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
        this.attributes = toObject(shake.additional || this.attributes);
    }

    static isDevice(obj: Entity): obj is Device {
        return Reflect.getMetadata(Symbol.for("device"), Reflect.getConstructorOf(obj));
    }

    static getKind(device: Device): string {
        return Reflect.getMetadata("kind", Reflect.getConstructorOf(device)) ?? "";
    }

    static isKind(device: Device, kind: string): boolean {
        return Device.getKind(device) === kind;
    }
}
