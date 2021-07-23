import consola, { Consola } from "consola";
import EventEmitter from "events";
import { MqttClient } from "mqtt";
import Handshake from "./Handshake";

declare interface Discovery {
    on(event: "handshake", listener: (shake: Handshake, timestamp: Date) => void): this;
    on(event: "alive", listener: (uid: string, timestamp: Date) => void): this;
    on(event: "death", listener: (uid: string, timestamp: Date) => void): this;
    on(event: "subscribed", listener: () => void): this;
    on(event: "handshakeSent", listener: (shake: Handshake, timestamp: Date) => void): this;
}

class Discovery extends EventEmitter {
    private _mqtt: MqttClient;
    private _handshakeFactory: () => Handshake;
    private _logger: Consola;
    logPinging = false;

    constructor(mqtt: MqttClient, handshakeFactory: () => Handshake) {
        super();
        this._mqtt = mqtt;
        this._mqtt.on("message", this._onMessage.bind(this));
        this._mqtt.on("connect", this._onConnect.bind(this));
        this._handshakeFactory = handshakeFactory;
        this._logger = consola.withScope("discovery");
    }

    private _onConnect() {
        this._mqtt.subscribe(["discovery/+", `discovery/+/${this.getUid()}`], (err) => {
            if (err) {
                this._logger.error("An error occured while subscibing discovery topic:", err);
                return;
            }

            this.emit("subscribed");
            this.handshake();
        });
    }

    private async _onMessage(topic: string, message: Buffer) {
        if (!topic.startsWith("discovery/")) {
            return;
        }

        const timestamp = new Date();
        const split = topic.split("/");
        const discoveryType = split[1];

        switch (discoveryType) {
            case "alive":
                if (this.logPinging) this._logger.trace(`Got keep-alive packet from '${message}'`);
                this.emit("alive", message.toString(), timestamp);
                break;
            case "death":
                if (this.logPinging) this._logger.trace(`Got death packet from '${message}'`);
                this.emit("death", message.toString(), timestamp);
                break;
            case "handshake":
                const shake = JSON.parse(message.toString()) as Handshake;

                if (this.getUid() === shake.uid) {
                    return;
                }

                this._logger.debug(`Got handshake from '${shake.uid}' (expects reply: ${Boolean(shake._thread)})`);
                this.emit("handshake", shake, timestamp);

                if (shake.available) {
                    this.emit("alive", shake.uid, timestamp);
                } else {
                    this.emit("death", shake.uid, timestamp);
                }

                // Reply on shake and introduce yourself if the shake has a thread
                if (shake._thread) {
                    this._logger.debug(`Sending handshake reply to '${shake.uid}' on topic '${shake._thread}'`);
                    await this.handshake(false, shake._thread);
                }
                break;
            default:
                this._logger.debug("Unknown discovery packet:", discoveryType);
        }
    }

    getHandshakePacket(): Handshake {
        const shakePacket = this._handshakeFactory();
        delete shakePacket._thread;

        return shakePacket;
    }

    getUid(): string {
        return this.getHandshakePacket().uid;
    }

    handshake(expectsReply = true, topic?: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const shake = this.getHandshakePacket();

            if (expectsReply) {
                shake._thread = `discovery/handshake/${shake.uid}`;
            }

            this._mqtt.publish(topic || "discovery/handshake", JSON.stringify(shake), (err) => {
                if (err) {
                    return reject(new Error(`Error while sending handshake: ${err.message}`));
                }

                this._logger.debug(`Handshake sucessfully sent (${this.getUid()})`);
                this.emit("handshakeSent", shake, new Date());
                return resolve();
            });
        });
    }
}

export default Discovery;
