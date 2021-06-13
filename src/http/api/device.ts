import { Router } from "express";
import Device from "../../devices/Device";

const routes: Router = Router();

function deviceMapper(device: Device<unknown>) {
    return {
        entityId: device.entityId,
        name: device.name,
        type: device.type,
        title: device.title,
        available: device.available,
        state: device.getState(),
        extraAttrs: device.getExtraAttrs(),
    };
}

routes.get("/", (req, res) => {
    const devices = req.app.senses?.devices;

    if (devices == null) {
        res.status(500).json({
            error: true,
            message: "An error occured during fetching devices",
        });
        return;
    }

    res.status(200).json(devices.map(deviceMapper));
});

export default routes;
