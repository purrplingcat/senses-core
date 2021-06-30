import consola from "consola";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import http from "http";
import { YAMLMap } from "yaml/types";
import { ISenses } from "../core/Senses";
import routes from "./routes";

export const name = "http";

function setupHttp(senses: ISenses): Application {
    const app = express();
    const intro = (req: Request, res: Response) =>
        res.type("text/plain").status(200).send("Senses server is running.\nREST: /api\nWS: /ws");

    app.senses = senses;
    app.use(cors());
    app.use(express.json());
    app.use("/api", routes);
    app.get("/", intro);

    return app;
}

export function setup(senses: ISenses, config: YAMLMap): void {
    senses.http = setupHttp(senses);
    senses.eventbus.on("start", () => {
        http.createServer(senses.http).listen(config.get("port") ?? 8080, () =>
            consola.success("Http server listening on port http://localhost:8080"),
        );
    });
}
