import { AutomationMode } from "./Automation";

export interface TriggerConfig {
    on: string;
    id?: string;
    [key: string]: number | string | boolean | null | undefined;
}

export interface ConditionConfig {
    condition: string;
    id?: string;
}

export interface ActionConfig {
    do: string;
    id?: string;
}

export interface AutomationConfig {
    name: string;
    mode?: AutomationMode;
    trigger: TriggerConfig | TriggerConfig[];
    condition: ConditionConfig | ConditionConfig[];
    action: ActionConfig | ActionConfig[];
}
