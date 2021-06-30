/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isTurnableDevice(device: any): device is ITurnableDevice {
    return Reflect.has(device, "state") && typeof device.turnOn === "function" && typeof device.turnOff === "function";
}

export default interface ITurnableDevice {
    state: "on" | "off" | "unknown";
    turnOn(): Promise<boolean> | boolean;
    turnOff(): Promise<boolean> | boolean;
}
