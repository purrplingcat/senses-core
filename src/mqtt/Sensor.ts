import Handshake from "../core/Handshake";
import { ISenses } from "../core/Senses";
import MqttDevice from "./MqttDevice";

export default class Sensor extends MqttDevice {
    stateField: string;
    value: number;

    constructor(senses: ISenses, stateTopic: string, getTopic: string, field = "value") {
        super(senses, stateTopic, "", getTopic);
        this.value = 0;
        this.stateField = field;
        this.type = "sensor";
    }

    getState(): { value: number } {
        return { value: this.value };
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

    protected _retrieveState(payload: unknown): void {
        if (typeof payload === "string" || typeof payload === "number" || typeof payload === "boolean") {
            this.value = Number(payload);
        } else if (typeof payload === "object" && payload != null && Reflect.has(payload, this.stateField)) {
            this.value = Number(Reflect.get(payload, this.stateField) ?? 0);
        }
    }
}
