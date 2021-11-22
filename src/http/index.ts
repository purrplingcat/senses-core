import consola from "consola";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import http from "http";
import { ISenses } from "../core/Senses";

export const name = "http";
export type HttpComponent = {
    server: http.Server;
    app: express.Application;
};

function setupExpressApp(senses: ISenses): Application {
    const app = express();
    const intro = (req: Request, res: Response) => res.type("text/plain").status(200).send(`Senses server is running.`);

    app.senses = senses;
    app.use(cors());
    app.use(express.json());
    app.get("/", intro);

    return app;
}

export default function setup(senses: ISenses, config: Record<string, any>): HttpComponent {
    const app = setupExpressApp(senses);
    const server = http.createServer(app);
    const port = config.http?.port ?? 8080;

    senses.eventbus.on("start", () => {
        server.listen(port, () => consola.success(`Http server listening on http://localhost:${port}`));
    });

    return { server, app };
}
