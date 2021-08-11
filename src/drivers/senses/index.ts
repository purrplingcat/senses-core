import Handshake, { DeviceType } from "../../core/Handshake";
import BaseDevice from "../../devices/BaseDevice";
import { ISenses } from "../../core/Senses";
import Light from "./Light";
import Sensor from "./Sensor";

export default function senses(senses: ISenses, type: DeviceType, shake: Handshake): BaseDevice {
    switch (type.type) {
        case "light":
            return new Light(senses);
        case "sensor":
            const field = Reflect.get(shake.additional as Record<string, unknown>, "field") || "value";

            return new Sensor(senses, field);
        default:
            throw new Error(`Unknown device type ${type.type}`);
    }
}
