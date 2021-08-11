import Handshake, { DeviceType } from "../../core/Handshake";
import BaseDevice from "../../devices/BaseDevice";
import { ISenses } from "../../core/Senses";
import Light from "./Light";
import Sensor, { Field } from "./Sensor";

export default function senses(senses: ISenses, type: DeviceType, shake: Handshake): BaseDevice {
    switch (type.type) {
        case "light":
            return new Light(senses);
        case "sensor":
            const fields = (shake.additional?.fields || {}) as Record<PropertyKey, Field>;

            return new Sensor(senses, fields);
        default:
            throw new Error(`Unknown device type ${type.type}`);
    }
}
