import nunjucks from "nunjucks";
import { getIn } from "~utils";
import { ISenses } from "./Senses";

export interface IRenderer {
    render(template: string, args?: object): string;
    renderAsync(template: string, args?: object): Promise<string>;
}

export class Renderer implements IRenderer {
    private _senses: ISenses;
    private _nunjucks: nunjucks.Environment;

    constructor(senses: ISenses) {
        this._senses = senses;
        this._nunjucks = nunjucks.configure({ autoescape: true });
        this._configure();
    }

    private _configure() {
        this._nunjucks.addFilter("getIn", getIn);
    }

    private _putArgs(args: object): object {
        return {
            senses: this._senses,
            env: this._senses.env,
            isSet: (v: unknown): boolean => v != null,
            stateOf: (deviceUid: string, attr: string) => {
                if (!this._senses.hasDevice(deviceUid)) return;
                return (<any>this._senses.fetchDevice(deviceUid).getState())[attr];
            },
            getIn,
            ...args,
        };
    }

    render(template: string, args?: object): string {
        return this._nunjucks.renderString(template, this._putArgs(args ?? {}));
    }

    renderAsync(template: string, args?: object): Promise<string> {
        return new Promise((resolve, reject) => {
            this._nunjucks.renderString(template, this._putArgs(args ?? {}), (err, res) => {
                if (err || res == null) {
                    return reject(err ?? new Error("Failed to render template"));
                }

                return resolve(res);
            });
        });
    }
}
