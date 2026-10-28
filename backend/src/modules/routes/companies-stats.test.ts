import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../config/prisma.js";

describe("Módulo Empresas B2B, Estadísticas y Perfil (Fase 6)", () => {
  const app = createApp();
  const createdCompanyIds: string[] = [];

  afterAll(async () => {
    if (createdCompanyIds.length > 0) {
      await prisma.company.deleteMany({
        where: { id: { in: createdCompanyIds } },
      });
    }
    await prisma.notification.deleteMany({
      where: { title: { contains: "Cooperativa Fase6" } },
    });
  });

  it("GET /api/empresas debe listar las empresas registradas con sus rutas del día", async () => {
    const res = await request(app).get("/api/empresas");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);

    const ecoAseo = res.body.data.find((c: any) => c.name.includes("EcoAseo"));
    expect(ecoAseo).toBeDefined();
    expect(ecoAseo.isVerified).toBe(true);
    expect(Array.isArray(ecoAseo.routesToday)).toBe(true);
  });

  it("GET /api/empresas?wasteType=VIDRIO debe filtrar por tipo de residuo", async () => {
    const res = await request(app).get("/api/empresas?wasteType=VIDRIO");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    for (const comp of res.body.data) {
      expect(comp.wasteTypes).toContain("VIDRIO");
    }
  });

  it("POST /api/empresas debe crear una solicitud B2B en estado PENDIENTE y rechazar NIT duplicado", async () => {
    const uniqueNit = `901.999.${Date.now().toString().slice(-3)}-8`;

    const res = await request(app).post("/api/empresas").send({
      name: "Cooperativa Fase6 Tuluá",
      nit: uniqueNit,
      phone: "315 888 9900",
      wasteTypes: ["PAPEL_CARTON", "PLASTICO"],
      coveredComunas: [1, 2, 3],
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Cooperativa Fase6 Tuluá");
    expect(res.body.data.isVerified).toBe(false);
    expect(res.body.data.status).toBe("PENDIENTE");

    createdCompanyIds.push(res.body.data.id);

    // Intentar duplicar NIT
    const dupRes = await request(app).post("/api/empresas").send({
      name: "Otra Empresa",
      nit: uniqueNit,
      phone: "300 000 0000",
    });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.code).toBe("NIT_ALREADY_EXISTS");
  });

  it("GET /api/empresas/:id y PATCH /api/empresas/:id/status deben consultar y aprobar la empresa", async () => {
    const companyId = createdCompanyIds[0];
    expect(companyId).toBeDefined();

    const detailRes = await request(app).get(`/api/empresas/${companyId}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.id).toBe(companyId);

    const approveRes = await request(app)
      .patch(`/api/empresas/${companyId}/status`)
      .send({ status: "APROBADA" });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.isVerified).toBe(true);
    expect(approveRes.body.data.status).toBe("APROBADA");
  });

  it("GET /api/estadisticas/resumen debe retornar métricas consolidadas desde PostgreSQL", async () => {
    const res = await request(app).get("/api/estadisticas/resumen");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("totalRecycledKg");
    expect(res.body.data).toHaveProperty("byWasteType");
    expect(res.body.data.points.total).toBeGreaterThanOrEqual(12);
    expect(res.body.data.routes.total).toBeGreaterThanOrEqual(5);
    expect(res.body.data.companies.total).toBeGreaterThanOrEqual(4);
  });

  it("PATCH /api/auth/profile debe actualizar y persistir los datos del usuario autenticado", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "alex@ecoruta.com",
      password: "eco123456",
    });
    const token = loginRes.body.data.token;

    const patchRes = await request(app)
      .patch("/api/auth/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Alex Ciudadano",
        phone: "+57 315 224 8899",
        comuna: 1,
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.success).toBe(true);
    expect(patchRes.body.data.name).toBe("Alex Ciudadano");
    expect(patchRes.body.data.comuna).toBe(1);
  });
});
