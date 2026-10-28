import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { authenticate } from "./auth.middleware.js";

export const authRouter = Router();

// Rutas públicas de autenticación
authRouter.post("/register", AuthController.register);
authRouter.post("/login", AuthController.login);
authRouter.post("/logout", AuthController.logout);

// Rutas protegidas
authRouter.get("/me", authenticate, AuthController.getMe);
authRouter.patch("/profile", authenticate, AuthController.updateProfile);

// Rutas de usuario
export const usersRouter = Router();
usersRouter.patch("/profile", authenticate, AuthController.updateProfile);
