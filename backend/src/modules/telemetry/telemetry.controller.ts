import { Request, Response, NextFunction } from "express";
import {
  containerTelemetrySchema,
  truckTelemetrySchema,
} from "./telemetry.schema.js";
import { telemetryService } from "./telemetry.service.js";

export class TelemetryController {
  public static async postContainerTelemetry(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = containerTelemetrySchema.parse(req.body);
      const record = telemetryService.processContainerTelemetry(validated);

      res.status(200).json({
        success: true,
        message: "Telemetría de contenedor procesada correctamente",
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async postTruckTelemetry(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = truckTelemetrySchema.parse(req.body);
      const record = telemetryService.processTruckTelemetry(validated);

      res.status(200).json({
        success: true,
        message: "Telemetría de camión procesada correctamente",
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getLiveTelemetry(
    _req: Request,
    res: Response
  ): Promise<void> {
    const snapshot = telemetryService.getLiveSnapshot();
    res.status(200).json(snapshot);
  }
}
