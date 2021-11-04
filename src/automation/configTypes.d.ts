export interface TriggerConfig {
    on: string;
    id?: string;
    [key: string]: number | string | boolean | null;
}

export interface ConditionConfig {
    condition: string;
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
