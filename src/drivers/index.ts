import Handshake, { DeviceType } from "../core/Handshake";
import { ISenses } from "../core/Senses";
import BaseDevice from "../devices/BaseDevice";
import senses from "./senses";

export type Driver = (senses: ISenses, type: DeviceType, shake: Handshake) => BaseDevice;
export type DriverMap = Record<string, Driver>;

const drivers: DriverMap = {
    senses,
};

export default drivers;
