import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Manejo de errores de validación con Zod
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Error de validación en los datos enviados",
      code: "VALIDATION_ERROR",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? (statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST");
  const message = err.message || "Ha ocurrido un error inesperado en el servidor";

  // Solo exponer stack traces en modo desarrollo
  const details = process.env.NODE_ENV === "development" ? err.details ?? err.stack : undefined;

  res.status(statusCode).json({
    error: message,
    code,
    ...(details ? { details } : {}),
  });
}
