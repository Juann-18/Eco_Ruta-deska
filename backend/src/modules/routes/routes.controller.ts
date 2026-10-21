import { Request, Response, NextFunction } from "express";
import {
  CreateRouteSchema,
  GetRoutesQuerySchema,
  UpdateRouteStatusSchema,
  CompleteCollectionSchema,
  RouteIncidentSchema,
} from "./routes.schema.js";
import { routesService } from "./routes.service.js";

export class RoutesController {
  public async getRoutes(req: Request, res: Response, NextFunction: NextFunction) {
    try {
      const query = GetRoutesQuerySchema.parse(req.query);
      const routes = routesService.findAll(query);
      res.json({
        data: routes,
        meta: {
          total: routes.length,
          comuna: query.comuna || "todas",
          period: query.period || "hoy",
        },
      });
    } catch (err) {
      NextFunction(err);
    }
  }

  public async getFeaturedRoute(req: Request, res: Response, NextFunction: NextFunction) {
    try {
      const comuna = req.query.comuna ? Number(req.query.comuna) : 1;
      const featured = routesService.findFeatured(comuna);
      res.json({ data: featured });
    } catch (err) {
      NextFunction(err);
    }
  }

  public async getRouteById(req: Request, res: Response, NextFunction: NextFunction) {
    try {
      const { id } = req.params;
      const route = routesService.findById(id);

      if (!route) {
        res.status(404).json({
          error: "Ruta no encontrada",
          code: "ROUTE_NOT_FOUND",
        });
        return;
      }

      res.json({ data: route });
    } catch (err) {
      NextFunction(err);
    }
  }

  public async createRoute(req: Request, res: Response, NextFunction: NextFunction) {
    try {
      const input = CreateRouteSchema.parse(req.body);
      const newRoute = routesService.create(input);
      res.status(201).json({ data: newRoute });
    } catch (err) {
      NextFunction(err);
    }
  }

  public async updateRouteStatus(req: Request, res: Response, NextFunction: NextFunction) {
    try {
      const { id } = req.params;
      const input = UpdateRouteStatusSchema.parse(req.body);
      const updated = routesService.updateStatus(id, input.status);

      if (!updated) {
        res.status(404).json({
          error: "Ruta no encontrada",
          code: "ROUTE_NOT_FOUND",
        });
        return;
      }

      res.json({ data: updated });
    } catch (err) {
      NextFunction(err);
    }
  }

  public async checkinCollection(req: Request, res: Response, NextFunction: NextFunction) {
    try {
      const { id } = req.params;
      const col = routesService.checkinCollection(id);

      if (!col) {
        res.status(404).json({
          error: "Parada de recolección no encontrada",
          code: "COLLECTION_NOT_FOUND",
        });
        return;
      }

      res.json({ data: col });
    } catch (err) {
      NextFunction(err);
    }
  }

  public async completeCollection(req: Request, res: Response, NextFunction: NextFunction) {
    try {
      const { id } = req.params;
      const input = CompleteCollectionSchema.parse(req.body);
      const result = routesService.completeCollection(
        id,
        input.collectedWeightKg,
        input.notes
      );

      if (!result) {
        res.status(404).json({
          error: "Parada de recolección no encontrada",
          code: "COLLECTION_NOT_FOUND",
        });
        return;
      }

      res.json({
        data: result,
        message: "Recolección completada y contenedor vaciado con éxito",
      });
    } catch (err) {
      NextFunction(err);
    }
  }

  public async reportIncident(req: Request, res: Response, NextFunction: NextFunction) {
    try {
      const { id } = req.params;
      const input = RouteIncidentSchema.parse(req.body);
      const reporterId = (req as any).user?.id || "usr-recolector-default";
      const incident = routesService.reportIncident(id, reporterId, input);

      if (!incident) {
        res.status(404).json({
          error: "Parada de recolección no encontrada",
          code: "COLLECTION_NOT_FOUND",
        });
        return;
      }

      res.status(201).json({
        data: incident,
        message: "Incidencia registrada y parada omitida",
      });
    } catch (err) {
      NextFunction(err);
    }
  }

  public async getVehicles(_req: Request, res: Response, NextFunction: NextFunction) {
    try {
      const vehicles = routesService.getVehicles();
      res.json({ data: vehicles });
    } catch (err) {
      NextFunction(err);
    }
  }
}

export const routesController = new RoutesController();
