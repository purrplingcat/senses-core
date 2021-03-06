import consola, { LogLevel } from "consola";
import { setupSenses } from "~bootstrap";

export function errorHandler(err: Error): void {
    consola.fatal(err);
    process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async function run(argv: string[], env: NodeJS.ProcessEnv): Promise<void> {
    const debug = env.NODE_ENV === "development";
    consola.info(
        `Senses home assistant ${application.manifest.version} at ${application.runner} ${application.runnerVersion}, node ${process.version}+${process.platform}-${process.arch}`,
    );
    consola.level = debug ? LogLevel.Debug : LogLevel.Info;
    consola.level = env.LOG_LEVEL ? Number(env.LOG_LEVEL) : consola.level;

    const configFile = argv[1] || env.CONFIG_FILE || process.cwd() + "/config/config.yaml";
    const senses = await setupSenses(configFile, debug);

    /*if (senses.http == null) {
        throw new Error("Http server is not configured.");
    }*/

    if (senses.mqtt == null) {
        throw new Error("MQTT broker is not configured.");
    }

    senses.start();
}
