import { Router } from "express";
import { ReportsController } from "./reports.controller.js";

export const reportsRouter = Router();

reportsRouter.get("/", ReportsController.getAll);
reportsRouter.get("/:id", ReportsController.getById);
reportsRouter.post("/", ReportsController.create);
reportsRouter.patch("/:id/status", ReportsController.updateStatus);
