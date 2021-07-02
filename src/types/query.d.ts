declare module "query" {
    function query<T>(source: T[], where: unknown): T[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Array<T> {
    query(where: unknown): this;
}
