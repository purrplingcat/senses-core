declare module "safe-eval" {
    export default function safeEval(code: string, params: object): unknown;
}
