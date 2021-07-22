declare module "mqtt-pattern" {
    export function exec(pattern: string, topic: string): Record<string, string> | null;
    export function matches(pattern: string, topic: string): boolean;
}
