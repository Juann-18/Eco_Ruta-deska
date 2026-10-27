import { Request, Response, NextFunction } from "express";
import { loginSchema, registerSchema, updateProfileSchema } from "./auth.schema.js";
import { authService } from "./auth.service.js";
import { AuthenticatedRequest } from "./auth.middleware.js";

export class AuthController {
  public static async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await authService.register(validated);

      res.cookie("access_token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        success: true,
        message: "Usuario registrado exitosamente",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await authService.login(validated);

      res.cookie("access_token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        message: "Inicio de sesión exitoso",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async logout(
    _req: Request,
    res: Response
  ): Promise<void> {
    res.clearCookie("access_token");
    res.status(200).json({
      success: true,
      message: "Sesión cerrada exitosamente",
    });
  }

  public static async getMe(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autenticado",
          code: "UNAUTHORIZED",
        });
        return;
      }

      const user = await authService.getById(req.user.id);
      if (!user) {
        res.status(404).json({
          error: "Usuario no encontrado",
          code: "USER_NOT_FOUND",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateProfile(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: "No autenticado",
          code: "UNAUTHORIZED",
        });
        return;
      }

      const validated = updateProfileSchema.parse(req.body);
      const updated = await authService.updateProfile(req.user.id, validated);

      if (!updated) {
        res.status(404).json({
          error: "Usuario no encontrado",
          code: "USER_NOT_FOUND",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Perfil actualizado correctamente",
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}
