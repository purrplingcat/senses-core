import { Trigger } from "~automation/Automation";
import { ISenses } from "~core/Senses";
import { arrayOf } from "~core/utils";
import { IScene } from "~scene";

export type SceneTriggerOptions = {
    scene: string | string[] | Partial<IScene> | Partial<IScene>[];
};

export function matches(scene: IScene, toMatch: string | Partial<IScene>): boolean {
    if (typeof toMatch === "string") {
        return scene.uid === toMatch;
    }

    for (const key of Object.keys(toMatch)) {
        if ((<any>scene)[key] !== (<any>toMatch)[key]) {
            return false;
        }
    }

    return true;
}

export default function createSceneTrigger(senses: ISenses, options: SceneTriggerOptions): Trigger {
    return function scene(trap) {
        senses.eventbus.on("scene.activate", (scene: IScene) => {
            const scenes = arrayOf(options.scene);

            for (const sceneToMatch in scenes) {
                if (matches(scene, sceneToMatch)) {
                    return trap({ scene });
                }
            }
        });
    };
}
