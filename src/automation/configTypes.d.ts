export interface TriggerConfig {
    on: string;
    [key: string]: number | string | boolean | null;
}

export interface ConditionConfig {
    check: string;
}

export interface ActionConfig {
    do: string;
}

export interface AutomationConfig {
    name: string;
    trigger: TriggerConfig | TriggerConfig[];
    condition: ConditionConfig | ConditionConfig[];
    action: ActionConfig | ActionConfig[];
}
