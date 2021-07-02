import { Router } from "express";
import Device from "../../devices/Device";
import { isTurnableDevice } from "../../devices/TurnableDevice";

const routes: Router = Router();

function deviceMapper(device: Device<unknown>) {
    return {
        uid: device.uid || null,
        entityId: device.entityId,
        name: device.name,
        type: device.type,
        title: device.title,
        available: device.available,
        lastAlive: device.lastAlive,
        keepalive: device.keepalive,
        timeout: device.timeout,
        turnable: isTurnableDevice(device),
        extraAttrs: device.getExtraAttrs(),
    };
}

routes.get("/", (req, res) => {
    const devices = req.app.senses?.devices;

    if (devices == null) {
        return res.status(500).json({
            error: true,
            message: "An error occured during fetching devices",
        });
    }

    return res.status(200).json(devices.map(deviceMapper));
});

routes.get("/:device", (req, res) => {
    const devices = req.app.senses?.devices;
    const device = devices?.find((d) => d.uid === req.params.device);

    if (device == null) {
        return res.status(404).json({
            error: true,
            message: "Device not found",
        });
    }

    return res.status(200).json(deviceMapper(device));
});

routes.get("/:device/state", (req, res) => {
    const devices = req.app.senses?.devices;
    const device = devices?.find((d) => d.uid === req.params.device);

    if (device == null) {
        return res.status(404).json({
            error: true,
            message: "Device not found",
        });
    }

    return res.status(200).json({ ...device.getState(), _deviceUid: device.uid });
});

routes.post("/:device/state", async (req, res) => {
    const devices = req.app.senses?.devices;
    const device = devices?.find((d) => d.uid === req.params.device);

    if (device == null) {
        return res.status(404).json({
            error: true,
            message: "Device not found",
        });
    }

    const success = await device.setState(req.body);

    if (success) {
        return res.status(200).json({ success: true, message: "Device state update sent" });
    }

    return res.status(200).json({ success: false, message: "Device state unchanged (nothing to update)" });
});

export default routes;
