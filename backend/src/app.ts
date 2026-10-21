import express, { Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { healthRouter } from "./modules/health/health.router.js";
import { telemetryRouter } from "./modules/telemetry/telemetry.router.js";
import { pointsRouter } from "./modules/points/points.router.js";
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

  // Manejo de rutas no encontradas y errores globales
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
