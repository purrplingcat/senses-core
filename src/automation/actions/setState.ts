import { Action } from "~automation/Automation";
import { getAllDevices, ISenses } from "~core/Senses";
import { byUids, fetchUids } from "~utils/query";

export type SetStateActionOptions = {
    device: string | string[] | object;
    payload: object;
    id?: string;
};

export default function createSetStateAction(senses: ISenses, options: SetStateActionOptions): Action {
    const uids = fetchUids(options.device ?? {}, senses);

    return function setState() {
        const payload = options.payload ?? {};

        for (const device of getAllDevices(senses).filter(byUids(uids))) {
            device.setState(payload);
        }
    };
}
