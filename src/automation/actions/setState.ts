import { Action } from "~automation/Automation";
import { ISenses } from "~core/Senses";

export type SetStateActionOptions = {
    device: string | string[] | object;
    payload: object;
    id?: string;
};

export default function createSetStateAction(senses: ISenses, options: SetStateActionOptions): Action {
    let query = options.device ?? {};

    if (Array.isArray(options.device)) {
        query = { uid: { $in: options.device } };
    } else if (typeof options.device === "string") {
        query = { uid: options.device };
    }

    return function setState() {
        const payload = options.payload ?? {};

        for (const device of senses.devices.query(query)) {
            device.setState(payload);
        }
    };
}
