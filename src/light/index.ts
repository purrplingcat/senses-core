import { ISenses } from "../core/Senses";
import Light, { LigthState } from "./Light";

export const name = "light";
export const domain = "light";

function handleLight(senses: ISenses, handler: (light: Light, payload?: unknown) => Promise<boolean> | boolean) {
    return async function (params: { entity: string; params?: unknown }): Promise<boolean> {
        const light = senses.devices.find((d) => d.entityId === params.entity && d.type === "light") as Light;

        if (params.entity == null) {
            throw new Error("Missing light entity name");
        }

        if (light == null) {
            throw new Error(`Can't find light entity '${params.entity}'`);
        }

        return await handler(light, params.params);
    };
}

export function setup(senses: ISenses): void {
    senses.addService({
        name: "light.turn_on",
        description: "Turn on the light",
        call: handleLight(senses, async (l) => await l.turnOn()),
    });
    senses.addService({
        name: "light.turn_off",
        description: "Turn off the light",
        call: handleLight(senses, async (l) => await l.turnOff()),
    });
    senses.addService({
        name: "light.set_state",
        description: "Change light state",
        call: handleLight(senses, async (l, p) => await l.push(p as Partial<LigthState>)),
    });
}
