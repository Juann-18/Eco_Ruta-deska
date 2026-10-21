import { Router } from "express";
import { PointsController } from "./points.controller.js";

export const pointsRouter = Router();

// Consultar puntos con filtros (comuna, wasteType, isCritical, search)
pointsRouter.get("/", PointsController.getAll);

// Detalle por ID o código de contenedor
pointsRouter.get("/:id", PointsController.getById);

// Crear nuevo punto (alta de contenedor)
pointsRouter.post("/", PointsController.create);

// Actualizar punto
pointsRouter.patch("/:id", PointsController.update);

// Desactivar punto
pointsRouter.delete("/:id", PointsController.delete);
