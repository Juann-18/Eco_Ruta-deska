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
      const routes = await routesService.findAll(query);
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
      const featured = await routesService.findFeatured(comuna);
      res.json({ data: featured });
    } catch (err) {
      NextFunction(err);
    }
  }

  public async getRouteById(req: Request, res: Response, NextFunction: NextFunction) {
    try {
      const { id } = req.params;
      const route = await routesService.findById(id);

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
      const newRoute = await routesService.create(input);
      res.status(201).json({ data: newRoute });
    } catch (err) {
      NextFunction(err);
    }
  }

  public async updateRouteStatus(req: Request, res: Response, NextFunction: NextFunction) {
    try {
      const { id } = req.params;
      const input = UpdateRouteStatusSchema.parse(req.body);
      const updated = await routesService.updateStatus(id, input.status);

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
      const col = await routesService.checkinCollection(id);

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
      const result = await routesService.completeCollection(
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
      const reporterId = (req as any).user?.id || "";
      const incident = await routesService.reportIncident(id, reporterId, input);

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
      const vehicles = await routesService.getVehicles();
      res.json({ data: vehicles });
    } catch (err) {
      NextFunction(err);
    }
  }

  public async getCompanies(req: Request, res: Response, NextFunction: NextFunction) {
    try {
      const wasteType = req.query.wasteType ? String(req.query.wasteType) : undefined;
      const comuna = req.query.comuna ? Number(req.query.comuna) : undefined;
      const isVerified =
        req.query.isVerified !== undefined
          ? req.query.isVerified === "true"
          : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;

      const companies = await routesService.getCompanies({
        wasteType,
        comuna,
        isVerified,
        search,
      });
      res.json({ data: companies });
    } catch (err) {
      NextFunction(err);
    }
  }

  public async getCompanyById(req: Request, res: Response, NextFunction: NextFunction) {
    try {
      const { id } = req.params;
      const company = await routesService.getCompanyById(id);
      if (!company) {
        res.status(404).json({
          error: "Empresa no encontrada",
          code: "COMPANY_NOT_FOUND",
        });
        return;
      }
      res.json({ success: true, data: company });
    } catch (err) {
      NextFunction(err);
    }
  }

  public async createCompany(req: Request, res: Response, NextFunction: NextFunction) {
    try {
      const { name, nit, phone, wasteTypes, coveredComunas, address, description } = req.body ?? {};
      if (!name || !nit || !phone) {
        res.status(400).json({
          error: "Nombre, NIT y teléfono son obligatorios",
          code: "VALIDATION_ERROR",
        });
        return;
      }
      const created = await routesService.createCompany({
        name: String(name),
        nit: String(nit),
        phone: String(phone),
        wasteTypes: Array.isArray(wasteTypes) && wasteTypes.length > 0 ? wasteTypes : ["PAPEL_CARTON"],
        coveredComunas: Array.isArray(coveredComunas) && coveredComunas.length > 0 ? coveredComunas.map(Number) : [1],
        address,
        description,
      });
      res.status(201).json({
        success: true,
        message: "Solicitud de registro de empresa enviada correctamente",
        data: created,
      });
    } catch (err) {
      NextFunction(err);
    }
  }

  public async updateCompanyStatus(req: Request, res: Response, NextFunction: NextFunction) {
    try {
      const { id } = req.params;
      const rawStatus = req.body?.status
        ? String(req.body.status).toUpperCase()
        : req.body?.isVerified === false
        ? "RECHAZADA"
        : "APROBADA";

      if (!["APROBADA", "RECHAZADA", "PENDIENTE"].includes(rawStatus)) {
        res.status(400).json({
          error: "Estado de empresa inválido (APROBADA, RECHAZADA, PENDIENTE)",
          code: "VALIDATION_ERROR",
        });
        return;
      }

      const updated = await routesService.updateCompanyStatus(
        id,
        rawStatus as "APROBADA" | "RECHAZADA" | "PENDIENTE"
      );

      if (!updated) {
        res.status(404).json({
          error: "Empresa no encontrada",
          code: "COMPANY_NOT_FOUND",
        });
        return;
      }

      res.json({
        success: true,
        message: `Estado de empresa actualizado a ${rawStatus}`,
        data: updated,
      });
    } catch (err) {
      NextFunction(err);
    }
  }

  public async getStatisticsSummary(_req: Request, res: Response, NextFunction: NextFunction) {
    try {
      const summary = await routesService.getStatisticsSummary();
      res.json({
        success: true,
        data: summary,
      });
    } catch (err) {
      NextFunction(err);
    }
  }

  public async getNotifications(req: Request, res: Response, NextFunction: NextFunction) {
    try {
      const comuna = req.query.comuna ? Number(req.query.comuna) : undefined;
      const notifications = await routesService.getNotifications(comuna);
      res.json({ data: notifications });
    } catch (err) {
      NextFunction(err);
    }
  }

  public async markAllNotificationsRead(req: Request, res: Response, NextFunction: NextFunction) {
    try {
      const comuna = req.query.comuna ? Number(req.query.comuna) : undefined;
      const notifications = await routesService.markAllNotificationsRead(comuna);
      res.json({
        success: true,
        message: "Todas las notificaciones fueron marcadas como leídas",
        data: notifications,
      });
    } catch (err) {
      NextFunction(err);
    }
  }

  public async markNotificationRead(req: Request, res: Response, NextFunction: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await routesService.markNotificationRead(id);
      if (!updated) {
        res.status(404).json({
          error: "Notificación no encontrada",
          code: "NOTIFICATION_NOT_FOUND",
        });
        return;
      }
      res.json({ success: true, data: updated });
    } catch (err) {
      NextFunction(err);
    }
  }
}

export const routesController = new RoutesController();
