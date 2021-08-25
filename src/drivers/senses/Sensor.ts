import Handshake from "../../core/Handshake";
import { ISenses } from "../../core/Senses";
import BaseDevice, { DeviceState } from "../../devices/BaseDevice";
import { extraAttr } from "../../devices/metadata";
import { Payload } from "../../types/senses";

export interface SensorState extends DeviceState {
    [key: string]: number | boolean | string;
}

export type Field = {
    name?: string;
    title: string;
    type: string;
    unit?: string;
};

function isValidValue(value: unknown): value is number | boolean | string {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function getDefaults(fields: string[]) {
    const acc: Record<string, number> = {};

    fields.forEach((f) => (acc[f] = 0));

    return acc;
}

export default class Sensor extends BaseDevice<SensorState> {
    @extraAttr
    fields: Record<string, Field>;

    constructor(senses: ISenses, fields: Record<string, Field>) {
        super(senses, {
            _available: false,
            _updatedAt: 0,
            ...getDefaults(Object.keys(fields)),
        });

        this.fields = fields;
        this.type = "sensor";
    }

    setState(): boolean {
        return false;
    }

    updateFromShake(shake: Handshake): void {
        super.updateFromShake(shake);

        this.fields = (shake.additional?.fields || {}) as Record<PropertyKey, Field>;
    }

    protected _mapState(payload: Payload): Partial<SensorState> {
        const state: Partial<SensorState> = {};

        for (const [key, field] of Object.entries(this.fields)) {
            const value = payload[field.name || key];

            if (payload.hasOwnProperty(key) && isValidValue(value)) {
                state[key] = value;
            }
        }

        return state;
    }

    protected _createPayload(): Payload {
        throw new Error("Method not implemented.");
    }
}
