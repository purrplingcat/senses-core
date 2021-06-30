declare module "mqtt-pattern" {
    export function exec(pattern: string, topic: string): Record<string, string>;
}
