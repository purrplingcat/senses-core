import Handshake, { DeviceType } from "../core/Handshake";
import { ISenses } from "../core/Senses";
import BaseDevice from "../devices/BaseDevice";
import senses from "./senses";

export type Driver = (senses: ISenses, type: DeviceType, shake: Handshake) => BaseDevice;
export type DriverMap = Record<string, Driver>;

const drivers: DriverMap = {
    senses,
};

export function addDriver(name: string, driver: Driver): void {
    if (Object.keys(drivers).includes(name)) {
        throw new Error(`Driver '${name}' has already added!`);
    }

    drivers[name] = driver;
}

export default drivers;
