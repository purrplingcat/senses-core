import Entity, { UniqueIdentity } from "~core/Entity";
import { ISenses } from "~core/Senses";

export const name = "scene";

export interface IScene extends Entity, UniqueIdentity {
    type: "scene";
    topic: string;
    icon?: string;
    room: string | null;
}

export default function setup(senses: ISenses, config: Record<any, any>): void {
    const scenesConfig = config.scene;

    if (scenesConfig && Array.isArray(scenesConfig)) {
        for (const sceneConfig of scenesConfig) {
            senses.scenes.scenes.push(setupScene(senses, sceneConfig));
        }
    }

    senses.addService({
        name: "scene.activate",
        description: "Activate scene",
        call(params: { scene: string }) {
            if (!params.scene) {
                throw new Error("Empty scene name is not allowed!");
            }

            senses.scenes.activate(params.scene);
            return true;
        },
    });
}

function setupScene(senses: ISenses, config: Record<string, string | number | boolean>): IScene {
    const room = <string>config.room || null;

    return {
        available: true,
        name: <string>config.name,
        topic: <string>config.topic || `${senses.domain}/scene${room ? "/" + room : ""}`,
        type: "scene",
        uid: <string>config.uid || `scene-${room ? room + "-" : ""}${config.name}`,
        icon: <string>config.icon,
        title: <string>config.title ?? <string>config.name,
        room,
    };
}
