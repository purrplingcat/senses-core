import scheduler from "node-schedule";
import { Trigger } from "~automation/Automation";
import { ISenses } from "~core/Senses";

type ScheduleTriggerOptions = {
    cron?: string | scheduler.RecurrenceSpecDateRange;
    date?: scheduler.RecurrenceSegment;
    dayOfWeek?: scheduler.RecurrenceSegment;
    hour?: scheduler.RecurrenceSegment;
    minute?: scheduler.RecurrenceSegment;
    month?: scheduler.RecurrenceSegment;
    second?: scheduler.RecurrenceSegment;
    year?: scheduler.RecurrenceSegment;
    tz?: scheduler.Timezone;
};
type Rule = string | scheduler.RecurrenceRule | scheduler.RecurrenceSpecDateRange | undefined;

export const jobs: scheduler.Job[] = [];

export default function createStateTrigger(senses: ISenses, options: ScheduleTriggerOptions): Trigger {
    return function schedule(trap) {
        let rule: Rule = options.cron;

        if (!rule) {
            rule = new scheduler.RecurrenceRule();
        }

        senses.ready(() => {
            if (rule != null) {
                jobs.push(scheduler.scheduleJob(rule, (fireDate) => trap({ fireDate })));
            }
        });
    };
}
