import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../config/prisma.js";

describe("Módulo de Autenticación y Usuarios (Fase 2 - Backend)", () => {
  const app = createApp();

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { startsWith: "maria_" } },
    });
  });

  describe("POST /api/auth/login", () => {
    it("debe iniciar sesión con credenciales correctas (Alex Ciudadano)", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "alex@ecoruta.com",
        password: "eco123456",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe("alex@ecoruta.com");
      expect(res.body.data.user.role).toBe("CIUDADANO");
      expect(res.body.data).toHaveProperty("token");
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("debe rechazar contraseña incorrecta con 401", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "alex@ecoruta.com",
        password: "password_incorrecta",
      });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("INVALID_CREDENTIALS");
    });

    it("debe rechazar usuario no existente con 401", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "noexiste@ecoruta.com",
        password: "eco123456",
      });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("POST /api/auth/register", () => {
    it("debe registrar exitosamente un nuevo ciudadano", async () => {
      const newUser = {
        name: "María Gómez",
        email: `maria_${Date.now()}@gmail.com`,
        password: "segura123456",
        phone: "+57 300 123 4567",
        comuna: 2,
      };

      const res = await request(app).post("/api/auth/register").send(newUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe("María Gómez");
      expect(res.body.data.user.role).toBe("CIUDADANO");
      expect(res.body.data.user).not.toHaveProperty("passwordHash");
      expect(res.body.data.user).not.toHaveProperty("salt");
    });

    it("debe rechazar registro con correo duplicado con 409", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Duplicado",
        email: "alex@ecoruta.com", // Ya existe
        password: "password123",
      });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("EMAIL_ALREADY_EXISTS");
    });
  });

  describe("GET /api/auth/me", () => {
    it("debe obtener los datos del usuario autenticado vía Bearer token", async () => {
      // 1. Iniciar sesión para obtener token
      const loginRes = await request(app).post("/api/auth/login").send({
        email: "conductor@ecoaseo.com",
        password: "eco123456",
      });

      const token = loginRes.body.data.token;

      // 2. Consultar perfil con token
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.name).toBe("Carlos Conductor");
      expect(meRes.body.data.role).toBe("RECOLECTOR");
    });

    it("debe rechazar petición sin token con 401", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("UNAUTHORIZED");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("debe limpiar sesión y retornar 200", async () => {
      const res = await request(app).post("/api/auth/logout");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
