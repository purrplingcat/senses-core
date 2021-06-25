import consola from "consola";
import fs from "fs";
import yaml from "yaml";
import { Senses } from "./core/Senses";
import { loadComponents } from "./core/loader";

const components = [__dirname + "/http", __dirname + "/mqtt", __dirname + "/light"];

export async function setupSenses(configFile: string, debug: boolean): Promise<Senses> {
    consola.info(`Parsing configuration file: ${configFile} ...`);

    const config = yaml.parseDocument(fs.readFileSync(configFile).toString());
    const domain = config.get("domain") || process.env.HOSTNAME || "localhost";
    const name = config.get("name") || process.env.SENSES_NAME || "Senses Home";
    const senses = new Senses(domain, name, debug);

    if (senses.debug) {
        consola.info("Running in debug mode");
    }

    await loadComponents(components, senses, config);

    return senses;
}