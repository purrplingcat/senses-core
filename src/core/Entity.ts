export default interface Entity {
    name: string;
    type: string;
    available: boolean;
    title?: string;
}

export interface UniqueIdentity {
    uid: string;
}
