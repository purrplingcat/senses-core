import Handshake from "../../core/Handshake";
import { ISenses } from "../../core/Senses";
import BaseDevice, { DeviceState } from "../../devices/BaseDevice";

export interface SensorState extends DeviceState {
    value: number;
}

export default class Sensor extends BaseDevice<SensorState> {
    stateField: string;
    unit?: string;

    constructor(senses: ISenses, field = "value") {
        super(senses, {
            _available: false,
            _updatedAt: 0,
            value: 0,
        });

        this.stateField = field;
        this.type = "sensor";
    }

    setState(): boolean {
        return false;
    }

    getExtraAttrs(): Record<string, unknown> {
        return { ...super.getExtraAttrs(), stateField: this.stateField };
    }

    updateFromShake(shake: Handshake): void {
        super.updateFromShake(shake);

        this.stateField = Reflect.get(shake.additional as Record<string, unknown>, "field") || "value";
        this.unit = <string>shake.additional?.unit;
    }

    protected _mapState(payload: unknown): Partial<SensorState> {
        if (typeof payload === "string" || typeof payload === "number" || typeof payload === "boolean") {
            return { value: Number(payload) };
        } else if (typeof payload === "object" && payload != null && Reflect.has(payload, this.stateField)) {
            return { value: Number(Reflect.get(payload, this.stateField) ?? 0) };
        }

        return {};
    }

    protected _createPayload(): any {
        return null;
    }
}
