import nunjucks from "nunjucks";
import { ISenses } from "./Senses";

nunjucks.configure({ autoescape: true });

export interface IRenderer {
    render(template: string, args: object): string;
    renderAsync(template: string, args: object): Promise<string>;
}

export class Renderer implements IRenderer {
    private _senses: ISenses;

    constructor(senses: ISenses) {
        this._senses = senses;
    }

    private _putArgs(args: object): object {
        return {
            senses: this._senses,
            ...args,
        };
    }

    render(template: string, args: object): string {
        return nunjucks.renderString(template, this._putArgs(args));
    }

    renderAsync(template: string, args: object): Promise<string> {
        return new Promise((resolve, reject) => {
            nunjucks.renderString(template, this._putArgs(args), (err, res) => {
                if (err || res == null) {
                    return reject(err ?? new Error("Failed to render template"));
                }

                return resolve(res);
            });
        });
    }
}
