import express, { Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { healthRouter } from "./modules/health/health.router.js";
import { telemetryRouter } from "./modules/telemetry/telemetry.router.js";
import { pointsRouter } from "./modules/points/points.router.js";
import { authRouter, usersRouter } from "./modules/auth/auth.router.js";
import {
  routesRouter,
  collectionsRouter,
  companiesRouter,
  notificationsRouter,
} from "./modules/routes/routes.router.js";
import { reportsRouter } from "./modules/reports/reports.router.js";
import { notFoundHandler } from "./middlewares/not-found.js";
import { errorHandler } from "./middlewares/error-handler.js";

export function createApp(): Express {
  const app = express();

  // Middlewares globales
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Rutas de la API con prefijo /api
  app.use("/api", healthRouter);
  app.use("/api/telemetry", telemetryRouter);
  app.use("/api/puntos", pointsRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/rutas", routesRouter);
  app.use("/api/recolecciones", collectionsRouter);
  app.use("/api/empresas", companiesRouter);
  app.use("/api/notificaciones", notificationsRouter);
  app.use("/api/reportes", reportsRouter);

  // Manejo de rutas no encontradas y errores globales
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
