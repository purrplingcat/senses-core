import consola from "consola";
import { Action } from "~automation/Automation";
import { matches } from "~automation/triggers/scene";
import { ISenses } from "~core/Senses";
import { IScene } from "~scene";

type SceneActivateActionOptions = {
    scene: string | Partial<IScene>;
    id: string;
};

export default function createSceneTrigger(senses: ISenses, options: SceneActivateActionOptions): Action {
    return function sceneActivate(context: any) {
        const sceneToActivate = senses.scenes.scenes.find((scene) => options.scene && matches(scene, options.scene));

        if (!sceneToActivate) {
            return consola.warn(`[Action] ${context.automation.name}${options.id}: No scene activated`, options.scene);
        }

        senses.scenes.activate(sceneToActivate.uid);
    };
}
