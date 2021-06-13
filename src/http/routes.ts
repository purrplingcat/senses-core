import { Router } from "express";
import statusRoutes from "./api/status";
import deviceRoutes from "./api/device";
import serviceRoutes from "./api/service";

const routes: Router = Router();

routes.use("/status", statusRoutes);
routes.use("/device", deviceRoutes);
routes.use("/service", serviceRoutes);

export default routes;
