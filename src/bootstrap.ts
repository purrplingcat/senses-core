import consola from "consola";
import fs from "fs";
import mqtt from "mqtt";
import yaml from "yaml";
import { Senses } from "./core/Senses";
import { loadComponents } from "./core/loader";

const components = ["http", "mqtt", "room", "exposed", "watcher"].map((c) => __dirname + "/" + c);

function createMqttClient(brokerUrl: string) {
    consola.info("Connecting to mqtt broker ...");
    const mqttClient = mqtt.connect(brokerUrl);

    mqttClient.on("connect", () => {
        mqttClient.publish("senses/presence", "online");
        consola.success("MQTT connection established");
    });

    return mqttClient;
}

export async function setupSenses(configFile: string, debug: boolean): Promise<Senses> {
    if (debug) consola.info("Running in debug mode");
    consola.info(`Parsing configuration file: ${configFile} ...`);

    const config = yaml.parseDocument(fs.readFileSync(configFile).toString());
    const domain = config.get("domain") || process.env.HOSTNAME || "localhost";
    const name = config.get("name") || process.env.SENSES_NAME || "Senses Home";
    const mqtt = createMqttClient(config.getIn(["mqtt", "brokerUrl"]));
    const senses = new Senses(mqtt, domain, name, debug);

    await loadComponents(components, senses, config);

    return senses;
}
