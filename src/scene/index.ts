import { YAMLMap, YAMLSeq } from "yaml/types";
import Entity, { UniqueIdentity } from "~core/Entity";
import { ISenses } from "~core/Senses";

export const name = "scene";

export interface IScene extends Entity, UniqueIdentity {
    type: "scene";
    topic: string;
    icon?: string;
    room: string | null;
}

export function setup(senses: ISenses, config: YAMLSeq): void {
    const scenesConfig = config.items?.filter((d: unknown) => d instanceof YAMLMap);

    if (scenesConfig && Array.isArray(scenesConfig)) {
        for (const sceneConfig of scenesConfig) {
            if (sceneConfig instanceof YAMLMap) {
                senses.scenes.scenes.push(setupScene(senses, sceneConfig));
            }
        }
    }
}

function setupScene(senses: ISenses, config: YAMLMap): IScene {
    const room = config.get("room") || null;

    return {
        available: true,
        name: config.get("name"),
        topic: config.get("topic") || `${senses.domain}/${room ? room + "/" : ""}scene`,
        type: "scene",
        uid: config.get("uid") || `scene-${room ? room + "-" : ""}${config.get("name")}`,
        icon: config.get("icon"),
        title: config.get("title") ?? config.get("name"),
        room,
    };
}
