import { Router } from "express";
import { routesController } from "./routes.controller.js";

export const routesRouter = Router();
export const collectionsRouter = Router();
export const companiesRouter = Router();
export const notificationsRouter = Router();
export const statisticsRouter = Router();

// Rutas de recolección (/api/rutas)
routesRouter.get("/", (req, res, next) => routesController.getRoutes(req, res, next));
routesRouter.get("/featured", (req, res, next) => routesController.getFeaturedRoute(req, res, next));
routesRouter.get("/vehiculos", (req, res, next) => routesController.getVehicles(req, res, next));
routesRouter.get("/:id", (req, res, next) => routesController.getRouteById(req, res, next));
routesRouter.post("/", (req, res, next) => routesController.createRoute(req, res, next));
routesRouter.patch("/:id/status", (req, res, next) => routesController.updateRouteStatus(req, res, next));

// Paradas y Operación (/api/recolecciones)
collectionsRouter.patch("/:id/checkin", (req, res, next) => routesController.checkinCollection(req, res, next));
collectionsRouter.post("/:id/completar", (req, res, next) => routesController.completeCollection(req, res, next));
collectionsRouter.post("/:id/incidencia", (req, res, next) => routesController.reportIncident(req, res, next));

// Empresas gestoras (/api/empresas)
companiesRouter.get("/", (req, res, next) => routesController.getCompanies(req, res, next));
companiesRouter.get("/:id", (req, res, next) => routesController.getCompanyById(req, res, next));
companiesRouter.post("/", (req, res, next) => routesController.createCompany(req, res, next));
companiesRouter.patch("/:id/status", (req, res, next) => routesController.updateCompanyStatus(req, res, next));
companiesRouter.patch("/:id/verify", (req, res, next) => routesController.updateCompanyStatus(req, res, next));

// Notificaciones (/api/notificaciones)
notificationsRouter.get("/", (req, res, next) => routesController.getNotifications(req, res, next));
notificationsRouter.patch("/read-all", (req, res, next) => routesController.markAllNotificationsRead(req, res, next));
notificationsRouter.patch("/:id/read", (req, res, next) => routesController.markNotificationRead(req, res, next));

// Estadísticas Municipales (/api/estadisticas)
statisticsRouter.get("/resumen", (req, res, next) => routesController.getStatisticsSummary(req, res, next));
