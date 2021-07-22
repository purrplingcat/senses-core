import Handshake from "../core/Handshake";
import { ISenses } from "../core/Senses";
import BaseDevice, { DeviceState } from "../devices/BaseDevice";

export interface SensorState extends DeviceState {
    value: number;
}

export default class Sensor extends BaseDevice<SensorState> {
    stateField: string;

    constructor(senses: ISenses, stateTopic: string, getTopic: string, field = "value") {
        super(senses, stateTopic, "", getTopic, {
            _available: false,
            value: 0,
        });

        this.stateField = field;
        this.type = "sensor";
    }

    setState(): boolean | Promise<boolean> {
        return false;
    }

    getExtraAttrs(): Record<string, unknown> {
        return { ...super.getExtraAttrs(), stateField: this.stateField };
    }

    updateFromShake(shake: Handshake): void {
        super.updateFromShake(shake);

        this.stateField = Reflect.get(shake.additional as Record<string, unknown>, "field") || "value";
    }

    protected _mapState(payload: unknown): Partial<SensorState> {
        if (typeof payload === "string" || typeof payload === "number" || typeof payload === "boolean") {
            return { value: Number(payload) };
        } else if (typeof payload === "object" && payload != null && Reflect.has(payload, this.stateField)) {
            return { value: Number(Reflect.get(payload, this.stateField) ?? 0) };
        }

        return {};
    }
}
