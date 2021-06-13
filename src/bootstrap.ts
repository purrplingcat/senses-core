import consola from "consola";
import fs from "fs";
import yaml from "yaml";
import { Senses } from "./core/Senses";
import { loadComponents } from "./core/loader";

const components = [__dirname + "/http", __dirname + "/mqtt", __dirname + "/light"];

export async function setupSenses(configFile: string, debug: boolean): Promise<Senses> {
    const senses = new Senses();

    senses.debug = debug;

    if (senses.debug) {
        consola.info("Running in debug mode");
    }

    consola.info(`Parsing configuration file: ${configFile} ...`);
    const config = yaml.parseDocument(fs.readFileSync(configFile).toString());
    //consola.debug(config);

    await loadComponents(components, senses, config);

    return senses;
}
