import { addDays } from "date-fns";
import parseDuration from "parse-duration";
import { Trigger } from "~automation/Automation";
import { getSunTimes, SunTimes } from "~utils/sun";
import { ISenses } from "~core/Senses";

type SunTriggerOptions = {
    event: keyof SunTimes;
    lat?: number;
    lon?: number;
    offset: number | string;
};

function calculateDelay(event: keyof SunTimes, lat: number, lon: number, offsetMs = 0): number {
    let forDay = new Date();
    let delay = 0;
    for (; delay <= 0; forDay = addDays(forDay, 1)) {
        const time = new Date(getSunTimes(forDay, lat, lon)[event]);
        delay = time.getTime() - Date.now() + offsetMs;
    }
    return delay;
}

export default function createSunTrigger(senses: ISenses, options: SunTriggerOptions): Trigger {
    return function sun(trap) {
        senses.ready(() => {
            const lat = options.lat ?? senses.config?.position?.lat ?? 0;
            const lon = options.lon ?? senses.config?.position?.long ?? 0;
            const handler = () => {
                trap({ event: options.event, time: new Date() });
                setTimeout(
                    handler,
                    calculateDelay(options.event, lat, lon, parseDuration(String(options.offset ?? 0))),
                );
            };

            setTimeout(handler, calculateDelay(options.event, lat, lon, parseDuration(String(options.offset ?? 0))));
        });
    };
}
