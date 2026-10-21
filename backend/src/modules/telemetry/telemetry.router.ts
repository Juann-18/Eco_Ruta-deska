import { Router } from "express";
import { TelemetryController } from "./telemetry.controller.js";

export const telemetryRouter = Router();

// Ingesta de datos de contenedor (Simulador IoT o Hardware ESP32)
telemetryRouter.post("/container", TelemetryController.postContainerTelemetry);

// Ingesta de datos de camión (GPS y telemetría de tolva)
telemetryRouter.post("/truck", TelemetryController.postTruckTelemetry);

// Snapshot en vivo para mapa y monitores
telemetryRouter.get("/live", TelemetryController.getLiveTelemetry);
