import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../config/prisma.js";

describe("Módulo de Reportes Ciudadanos y Avisos (Fase 5 - Backend)", () => {
  const app = createApp();
  let createdReportId = "";
  let createdFolio = "";

  afterAll(async () => {
    if (createdReportId) {
      await prisma.citizenReport.deleteMany({ where: { id: createdReportId } });
      await prisma.notification.deleteMany({
        where: { title: { contains: createdFolio } },
      });
    }
  });

  it("GET /api/reportes debe listar los reportes ciudadanos desde PostgreSQL", async () => {
    const res = await request(app).get("/api/reportes");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it("POST /api/reportes debe crear un nuevo reporte con folio #RP-XXXX y estado EN_REVISION", async () => {
    const res = await request(app)
      .post("/api/reportes")
      .send({
        recyclePointId: "#CNT-0001",
        reason: "CONTENEDOR_LLENO",
        description: "El contenedor #CNT-0001 está completamente lleno y hay bolsas alrededor.",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.folio).toMatch(/^#RP-\d{4}$/);
    expect(res.body.data.status).toBe("EN_REVISION");
    expect(res.body.data.recyclePointCode).toBe("#CNT-0001");
    expect(res.body.data.companyName).toContain("EcoAseo");

    createdReportId = res.body.data.id;
    createdFolio = res.body.data.folio;
  });

  it("GET /api/reportes/:id debe consultar un reporte por su folio", async () => {
    const encodedFolio = encodeURIComponent(createdFolio);
    const res = await request(app).get(`/api/reportes/${encodedFolio}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdReportId);
    expect(res.body.data.reason).toBe("CONTENEDOR_LLENO");
  });

  it("PATCH /api/reportes/:id/status debe actualizar el estado a RESUELTO", async () => {
    const res = await request(app)
      .patch(`/api/reportes/${createdReportId}/status`)
      .send({ status: "RESUELTO" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("RESUELTO");
    expect(res.body.data.resolvedAt).toBeDefined();
  });

  it("GET /api/notificaciones y PATCH /api/notificaciones/read-all deben gestionar avisos", async () => {
    const getRes = await request(app).get("/api/notificaciones?comuna=1");
    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body.data)).toBe(true);
    expect(getRes.body.data.length).toBeGreaterThan(0);

    const readRes = await request(app).patch("/api/notificaciones/read-all?comuna=1");
    expect(readRes.status).toBe(200);
    expect(readRes.body.success).toBe(true);
    for (const n of readRes.body.data) {
      expect(n.isRead).toBe(true);
    }
  });
});
