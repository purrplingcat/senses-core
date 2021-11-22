import consola from "consola";
import fs from "fs";
import mqtt, { IClientOptions } from "mqtt";
import yaml from "yaml";
import Component from "~core/Component";
import { Senses } from "~core/Senses";
import { loadComponents } from "~loader";
import { getIn } from "~utils";

const components = [
    new Component("~http"),
    new Component("~graphql"),
    new Component("~devices"),
    new Component("~room"),
    new Component("~exposed"),
    new Component("~scene"),
    new Component("~automation"),
];

type ISecureClientOptions = {
    caFile?: string;
    keyFile?: string;
    certFile?: string;
};

function createMqttClient(brokerUrl: string, options?: IClientOptions & ISecureClientOptions) {
    consola.info("Connecting to mqtt broker ...");

    if (options?.caFile) {
        options.ca = fs.readFileSync(options.caFile);
    }

    if (options?.keyFile) {
        options.key = fs.readFileSync(options.keyFile);
    }

    if (options?.certFile) {
        options.cert = fs.readFileSync(options.certFile);
    }

    const mqttClient = mqtt.connect(brokerUrl, options);
    mqttClient.on("connect", () => {
        mqttClient.publish("senses/presence", "online");
        consola.success("MQTT connection established");
    });

    return mqttClient;
}

export async function setupSenses(configFile: string, debug: boolean): Promise<Senses> {
    if (debug) consola.info("Running in debug mode");
    consola.info(`Parsing configuration file: ${configFile} ...`);

    const config = yaml.parseDocument(fs.readFileSync(configFile).toString()).toJSON();
    const domain = config.domain || process.env.HOSTNAME || "localhost";
    const name = config.name || process.env.SENSES_NAME || "Senses Home";
    const mqtt = createMqttClient(getIn(config, ["mqtt", "brokerUrl"], String), getIn(config, ["mqtt", "options"]));
    const senses = new Senses(mqtt, domain, name, debug);

    await loadComponents(components, senses, config);
    senses.config = config;
    senses.eventbus.emit("setup", senses);

    return senses;
}
