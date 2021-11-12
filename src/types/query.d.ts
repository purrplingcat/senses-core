declare module "query" {
    function query<T>(source: T[], where: unknown): T[];
}
