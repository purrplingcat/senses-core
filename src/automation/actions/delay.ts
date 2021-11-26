import parseDuration from "parse-duration";
import { Action } from "~automation/Automation";
import { ISenses } from "~core/Senses";

type DelayActionOptions = {
    delay: number | string;
};

export default function createSceneTrigger(senses: ISenses, options: DelayActionOptions): Action {
    return function delay(context, cancelToken) {
        return new Promise((resolve) => {
            let timeout: NodeJS.Timeout | null = null;
            const dirtyDelay = senses.renderer.render(String(options.delay ?? 0));
            const delay = Math.abs(parseDuration(dirtyDelay));
            const next = () => {
                cancelToken.unsubscribe(next);
                timeout && clearTimeout(timeout);
                resolve();
            };

            cancelToken.subscribe(next);
            timeout = setTimeout(resolve, delay);
        });
    };
}
