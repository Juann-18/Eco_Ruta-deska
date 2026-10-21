import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

describe("Módulo de Salud del Sistema (Health)", () => {
  const app = createApp();

  it("GET /api/health debe responder 200 con el estado del servicio", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("service", "eco-ruta-backend");
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body).toHaveProperty("uptime");
    expect(typeof res.body.uptime).toBe("number");
  });

  it("GET /api/ruta-inexistente debe responder 404 con formato de error estandarizado", async () => {
    const res = await request(app).get("/api/ruta-inexistente");

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
    expect(res.body).toHaveProperty("code", "NOT_FOUND");
  });
});
