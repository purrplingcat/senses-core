import consolaGlobalInstance from "consola";
import { Router } from "express";

const routes: Router = Router();

routes.get("/", (req, res) => {
    const services = req.app.senses?.services;

    if (services == null) {
        res.status(500).json({
            error: true,
            message: "An error occured during fetching services",
        });
        return;
    }

    res.status(200).json(services);
});

routes.post("/:serviceName", async (req, res) => {
    try {
        const result = await req.app.senses?.callService(req.params.serviceName, req.body);
        res.status(200).json({
            message: "Service called",
            service: req.params.serviceName,
            result,
        });
    } catch (err: any) {
        res.status(500).json({ error: true, message: err.message });
        consolaGlobalInstance.error(err);
    }
});

export default routes;
