import { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service.js";
import { UserRole } from "./auth.schema.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
  };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    res.status(401).json({
      error: "Acceso no autorizado: Token de autenticación requerido",
      code: "UNAUTHORIZED",
      details: {},
    });
    return;
  }

  const payload = authService.verifyToken(token);
  if (!payload) {
    res.status(401).json({
      error: "Sesión inválida o expirada. Por favor inicie sesión nuevamente.",
      code: "INVALID_TOKEN",
      details: {},
    });
    return;
  }

  req.user = {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    name: payload.name,
  };

  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: "Acceso no autorizado",
        code: "UNAUTHORIZED",
        details: {},
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Acceso denegado: Se requiere rol ${allowedRoles.join(" o ")}`,
        code: "FORBIDDEN",
        details: { userRole: req.user.role, requiredRoles: allowedRoles },
      });
      return;
    }

    next();
  };
}
