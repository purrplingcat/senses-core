import { ISenses } from "~core/Senses";
import { IScene } from "~scene";

export interface ISceneController {
    scenes: IScene[];
    activate(sceneName: string): void;
}

export default class SceneController implements ISceneController {
    scenes: IScene[];
    private _senses: ISenses;

    constructor(senses: ISenses) {
        this.scenes = [];
        this._senses = senses;
    }

    activate(sceneName: string): void {
        const scene = this.scenes.find((s) => s.uid === sceneName);

        if (!scene) {
            throw new Error(`Unknown scene '${sceneName}'`);
        }

        this._senses.eventbus.emit("scene.activate", scene);
        this._senses.mqtt.publish(scene.topic, scene.name);
    }
}
