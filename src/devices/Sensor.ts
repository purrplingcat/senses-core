import Device from "./Device";

export type SensorField = {
    name: string;
    title: string;
    unit: string;
};

export default interface ISensor extends Device<Record<string, number>> {
    fields: SensorField[];
}
