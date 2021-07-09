export interface IGroup {
    name: string;
    title?: string;
    description?: string;
    type: "category" | "room" | "collection" | "token" | "unknown";
}
