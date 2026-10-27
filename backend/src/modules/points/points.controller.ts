import { Request, Response, NextFunction } from "express";
import {
  createPointSchema,
  getPointsQuerySchema,
  updatePointSchema,
} from "./points.schema.js";
import { pointsService } from "./points.service.js";

export class PointsController {
  public static async getAll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = getPointsQuerySchema.parse(req.query);
      const points = await pointsService.findAll(query);

      res.status(200).json({
        success: true,
        count: points.length,
        data: points,
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
      const point = await pointsService.findById(id);

      if (!point) {
        res.status(404).json({
          error: `No se encontró el punto de reciclaje con ID o código: ${id}`,
          code: "POINT_NOT_FOUND",
          details: {},
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: point,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = createPointSchema.parse(req.body);
      const created = await pointsService.create(validated);

      res.status(201).json({
        success: true,
        message: "Punto de reciclaje creado exitosamente",
        data: created,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const validated = updatePointSchema.parse(req.body);
      const updated = await pointsService.update(id, validated);

      if (!updated) {
        res.status(404).json({
          error: `No se encontró el punto de reciclaje con ID: ${id}`,
          code: "POINT_NOT_FOUND",
          details: {},
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Punto de reciclaje actualizado",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async delete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await pointsService.delete(id);

      if (!deleted) {
        res.status(404).json({
          error: `No se encontró el punto de reciclaje con ID: ${id}`,
          code: "POINT_NOT_FOUND",
          details: {},
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Punto de reciclaje desactivado correctamente",
      });
    } catch (error) {
      next(error);
    }
  }
}
