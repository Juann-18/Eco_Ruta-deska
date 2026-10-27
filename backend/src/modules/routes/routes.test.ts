import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { pointsService } from "../points/points.service.js";
import { prisma } from "../../config/prisma.js";

describe("Módulo de Rutas, Flota y Recolecciones (Fase 4)", () => {
  const app = createApp();

  beforeAll(async () => {
    await prisma.route.updateMany({
      where: { code: "#RTA-0012" },
      data: { currentLoadKg: 3600, status: "EN_CAMINO" },
    });
    await prisma.route.updateMany({
      where: { code: "#RTA-0015" },
      data: { status: "PROGRAMADA", startedAt: null },
    });
    await prisma.recyclePoint.updateMany({
      where: { code: "#CNT-0002" },
      data: { currentFillPercentage: 88.5 },
    });
  });

  it("GET /api/rutas debe retornar la lista de rutas ordenadas", async () => {
    const res = await request(app).get("/api/rutas");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);

    const codes = res.body.data.map((r: any) => r.code);
    expect(codes).toContain("#RTA-0012");
    expect(codes).toContain("#RTA-0015");
  });

  it("GET /api/rutas?comuna=1 debe filtrar por comuna", async () => {
    const res = await request(app).get("/api/rutas?comuna=1");
    expect(res.status).toBe(200);
    for (const r of res.body.data) {
      expect(r.comuna).toBe(1);
    }
  });

  it("GET /api/rutas/featured debe retornar la ruta destacada en camino para Comuna 1", async () => {
    const res = await request(app).get("/api/rutas/featured?comuna=1");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.code).toBe("#RTA-0012");
    expect(res.body.data.status).toBe("EN_CAMINO");
    expect(res.body.data.vehiclePlate).toBe("TUL-482");
    expect(res.body.data.currentLoadKg).toBe(3600);
  });

  it("GET /api/rutas/:id debe retornar detalle con paradas y vehículo", async () => {
    const res = await request(app).get("/api/rutas/rta-0012-uuid");
    expect(res.status).toBe(200);
    expect(res.body.data.code).toBe("#RTA-0012");
    expect(res.body.data.collections).toBeInstanceOf(Array);
    expect(res.body.data.collections.length).toBe(3);
    expect(res.body.data.vehicle).toBeDefined();
    expect(res.body.data.vehicle.plate).toBe("TUL-482");
  });

  it("PATCH /api/rutas/:id/status debe actualizar el estado de la ruta", async () => {
    const res = await request(app)
      .patch("/api/rutas/rta-0015-uuid/status")
      .send({ status: "EN_CAMINO" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("EN_CAMINO");
    expect(res.body.data.startedAt).toBeDefined();
  });

  it("PATCH /api/recolecciones/:id/checkin debe marcar la parada en proceso", async () => {
    const res = await request(app).patch("/api/recolecciones/col-003/checkin");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("EN_PROCESO");
  });

  it("POST /api/recolecciones/:id/completar debe vaciar contenedor y sumar peso al camión", async () => {
    // Verificamos antes el contenedor #CNT-0002
    const beforePoints = await pointsService.findAll({});
    const beforePoint = beforePoints.find((p) => p.code === "#CNT-0002");
    expect(beforePoint).toBeDefined();

    const res = await request(app)
      .post("/api/recolecciones/col-002/completar")
      .send({
        collectedWeightKg: 85.5,
        notes: "Contenedor vaciado completamente sin novedades",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.collection.status).toBe("COMPLETADA");
    expect(res.body.data.collection.collectedWeightKg).toBe(85.5);

    // Verificamos que el contenedor fue vaciado a 0% en pointsService
    const afterPoints = await pointsService.findAll({});
    const afterPoint = afterPoints.find((p) => p.code === "#CNT-0002");
    expect(afterPoint?.currentFillPercentage).toBe(0);

    // Verificamos que la ruta incrementó su carga
    expect(res.body.data.route.currentLoadKg).toBeGreaterThanOrEqual(3685.5);
  });

  it("POST /api/recolecciones/:id/incidencia debe marcar parada omitida", async () => {
    const res = await request(app)
      .post("/api/recolecciones/col-003/incidencia")
      .send({
        reason: "Acceso vehicular bloqueado por obras en vía",
        description: "Se intentó ingreso por carrera 22 pero hay excavación",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.reason).toBe("Acceso vehicular bloqueado por obras en vía");
  });

  it("GET /api/rutas/vehiculos debe listar camiones de la flota", async () => {
    const res = await request(app).get("/api/rutas/vehiculos");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    const plates = res.body.data.map((v: any) => v.plate);
    expect(plates).toContain("TUL-482");
    expect(plates).toContain("TUL-105");
  });
});
