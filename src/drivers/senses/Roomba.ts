import ITurnableDevice from "~devices/TurnableDevice";
import BaseDevice, { DeviceState } from "~devices/BaseDevice";
import { ISenses } from "~core/Senses";
import { Payload } from "~types/senses";

export enum MissionStatus {
    idle = "idle",
    docked = "docked",
    paused = "paused",
    cleaning = "cleaning",
    returning = "returning",
    error = "error",
    unknown = "unknown",
}

export interface RoombaState extends DeviceState {
    status: MissionStatus;
    battery: number;
    bin: "present" | "full" | "removed" | "unknown";
    error: number;
    errorMessage: string | null;
    cleaningTime: number;
}

export interface RoombaCommands {
    command?: string;
    state?: "on" | "off";
}

export default class Roomba extends BaseDevice<RoombaState> implements ITurnableDevice {
    get state(): "on" | "off" | "unknown" {
        const missionStatus = this.getState().status;

        if ([MissionStatus.docked, MissionStatus.idle, MissionStatus.paused].includes(missionStatus)) {
            return "off";
        }

        if ([MissionStatus.cleaning, MissionStatus.returning].includes(missionStatus)) {
            return "on";
        }

        return "unknown";
    }

    constructor(senses: ISenses) {
        super(senses, {
            _available: true,
            _updatedAt: 0,
            status: MissionStatus.unknown,
            battery: 0,
            bin: "unknown",
            cleaningTime: 0,
            error: 0,
            errorMessage: null,
        });

        this.type = "vacuum";
    }

    turnOn(): boolean | Promise<boolean> {
        return this.setState({ state: "on" });
    }

    turnOff(): boolean | Promise<boolean> {
        return this.setState({ state: "off" });
    }

    override setState(state: Partial<RoombaState> & RoombaCommands): boolean | Promise<boolean> {
        if (state.state === "on" || state.command === "clean") {
            state.command = this.getState().status === MissionStatus.paused ? "resume" : "clean";
        }

        if (state.state === "off") {
            state.command = "pause";
            Reflect.deleteProperty(state, "state");
        }

        Reflect.deleteProperty(state, "state");

        return super.setState(state);
    }

    protected _mapState(payload: Payload): Partial<RoombaState> {
        return {
            status: payload.status,
            battery: payload.battery,
            bin: payload.bin,
            cleaningTime: payload.cleaningTime,
            error: payload.error,
            errorMessage: payload.errorMessage,
        };
    }

    protected _createPayload(state: Partial<RoombaState>): Payload {
        throw new Error("Method not implemented.");
    }
}
