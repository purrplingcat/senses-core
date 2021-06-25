import consola from "consola";
import EventEmitter from "events";
import { MqttClient } from "mqtt";
import Handshake from "./Handshake";

export default class Discovery extends EventEmitter {
    private _mqtt: MqttClient;
    private _handshakeFactory: () => Handshake;

    constructor(mqtt: MqttClient, handshakeFactory: () => Handshake) {
        super();
        this._mqtt = mqtt;
        this._mqtt.on("message", this._onMessage.bind(this));
        this._mqtt.on("connect", this._onConnect.bind(this));
        this._handshakeFactory = handshakeFactory;
    }

    private _onConnect() {
        this._mqtt.subscribe(["discovery/+", `discovery/+/${this.getUid()}`], (err) => {
            if (err) {
                consola.error("An error occured while subscibing discovery topic:", err);
                return;
            }

            this.handshake();
        });
    }

    private async _onMessage(topic: string, message: Buffer) {
        if (!topic.startsWith("discovery/")) {
            return;
        }

        const split = topic.split("/");
        const discoveryType = split[1];

        switch (discoveryType) {
            case "handshake":
                const shake = JSON.parse(message.toString()) as Handshake;

                if (this.getUid() === shake.uid) {
                    return;
                }

                consola.debug(`Got handshake from '${shake.uid}' (expects reply: ${!!shake._thread})`);
                this.emit("handshake", shake);

                // Reply on shake and introduce yourself if the shake has a thread
                if (shake._thread) {
                    consola.debug(`Sending handshake reply to '${shake.uid}' on topic '${shake._thread}'`);
                    await this.handshake(false, shake._thread);
                }
                break;
            default:
                break;
        }
    }

    getHandshakePacket(): Handshake {
        return this._handshakeFactory();
    }

    getUid(): string {
        return this.getHandshakePacket().uid;
    }

    handshake(expectsReply = true, topic?: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const shake = this.getHandshakePacket();

            if (!expectsReply) {
                delete shake._thread;
            }

            this._mqtt.publish(topic || "discovery/handshake", JSON.stringify(shake), (err) => {
                if (err) {
                    return reject(new Error(`Error while sending handshake: ${err.message}`));
                }

                consola.debug(`Handshake sucessfully sent`);
                return resolve();
            });
        });
    }
}
