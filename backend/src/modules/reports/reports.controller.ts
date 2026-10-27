import { Request, Response, NextFunction } from "express";
import {
  createReportSchema,
  getReportsQuerySchema,
  updateReportStatusSchema,
} from "./reports.schema.js";
import { reportsService } from "./reports.service.js";
import { AuthenticatedRequest } from "../auth/auth.middleware.js";

export class ReportsController {
  public static async getAll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = getReportsQuerySchema.parse(req.query);
      const reports = await reportsService.findAll(query);

      res.status(200).json({
        success: true,
        count: reports.length,
        data: reports,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const report = await reportsService.findByIdOrFolio(id);

      if (!report) {
        res.status(404).json({
          error: `No se encontró el reporte con ID o folio: ${id}`,
          code: "REPORT_NOT_FOUND",
          details: {},
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async create(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = createReportSchema.parse(req.body);
      const userId = req.user?.id;
      const created = await reportsService.create(userId, validated);

      res.status(201).json({
        success: true,
        message: "Reporte ciudadano enviado exitosamente",
        data: created,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const validated = updateReportStatusSchema.parse(req.body);
      const updated = await reportsService.updateStatus(id, validated.status);

      if (!updated) {
        res.status(404).json({
          error: `No se encontró el reporte con ID o folio: ${id}`,
          code: "REPORT_NOT_FOUND",
          details: {},
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Estado del reporte actualizado correctamente",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}
