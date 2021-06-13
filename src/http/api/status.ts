import { Router } from "express";

const routes: Router = Router();

routes.get("/", (req, res) => {
    res.status(200).json({
        product: "Senses",
        description: "Home automation IoT assistant",
        vendor: "PurrplingCat",
        version: "1.0.0",
    });
});

export default routes;
