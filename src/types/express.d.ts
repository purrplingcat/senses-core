import { ISenses } from "../core/Senses";

declare global {
    namespace Express {
        export interface Application {
            senses?: ISenses;
        }
    }
}
