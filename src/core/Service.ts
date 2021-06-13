import { ISenses } from "./Senses";

export default interface IService {
    name: string;
    description: string;
    call(params: unknown, senses: ISenses): boolean | Promise<boolean>;
}
