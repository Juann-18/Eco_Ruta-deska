import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "./config/prisma.js";

describe("Base de Datos PostgreSQL - EcoRuta Prisma ORM", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("debe conectar exitosamente a PostgreSQL", async () => {
    const result = await prisma.$queryRaw<Array<{ current_database: string }>>`SELECT current_database();`;
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].current_database).toBe("ecoruta");
  });

  it("debe contener las empresas operadoras de aseo (Companies)", async () => {
    const count = await prisma.company.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const ecoAseo = await prisma.company.findFirst({
      where: { name: { contains: "EcoAseo" } },
      include: { vehicles: true, routes: true, recyclePoints: true },
    });
    expect(ecoAseo).not.toBeNull();
    expect(ecoAseo?.isVerified).toBe(true);
    expect(ecoAseo?.vehicles.length).toBeGreaterThan(0);
    expect(ecoAseo?.routes.length).toBeGreaterThan(0);
  });

  it("debe contener los usuarios de prueba con sus roles", async () => {
    const users = await prisma.user.findMany();
    expect(users.length).toBeGreaterThanOrEqual(3);

    const roles = users.map((u) => u.role);
    expect(roles).toContain("CIUDADANO");
    expect(roles).toContain("RECOLECTOR");
    expect(roles).toContain("ADMIN");

    const ciudadano = users.find((u) => u.email === "alex@ecoruta.com");
    expect(ciudadano?.name).toBe("Alex Ciudadano");
    expect(ciudadano?.comuna).toBe(1);
  });

  it("debe contener los 12 puntos de reciclaje en Tuluá con geolocalización", async () => {
    const count = await prisma.recyclePoint.count();
    expect(count).toBe(12);

    const point1 = await prisma.recyclePoint.findUnique({
      where: { code: "#CNT-0001" },
    });
    expect(point1).not.toBeNull();
    expect(point1?.name).toBe("Punto Verde Plaza Cívica Boyacá");
    expect(Number(point1?.latitude)).toBeCloseTo(4.0847, 4);
    expect(Number(point1?.longitude)).toBeCloseTo(-76.1954, 4);

    const criticalPoints = await prisma.recyclePoint.findMany({
      where: { currentFillPercentage: { gte: 80.0 } },
    });
    expect(criticalPoints.length).toBeGreaterThan(0);
  });

  it("debe contener las rutas y sus paradas de recolección vinculadas", async () => {
    const routes = await prisma.route.findMany({
      include: {
        collections: {
          include: { recyclePoint: true },
        },
        vehicle: true,
      },
    });
    expect(routes.length).toBeGreaterThanOrEqual(5);

    const activeRoute = routes.find((r) => r.code === "#RTA-0012");
    expect(activeRoute).toBeDefined();
    expect(activeRoute?.status).toBe("EN_CAMINO");
    expect(activeRoute?.collections.length).toBeGreaterThanOrEqual(3);
    expect(activeRoute?.vehicle?.plate).toBe("TUL-482");
  });

  it("debe contener reportes ciudadanos, incidentes y notificaciones", async () => {
    const reportsCount = await prisma.citizenReport.count();
    expect(reportsCount).toBeGreaterThanOrEqual(3);

    const incidentsCount = await prisma.routeIncident.count();
    expect(incidentsCount).toBeGreaterThanOrEqual(1);

    const notifCount = await prisma.notification.count();
    expect(notifCount).toBeGreaterThanOrEqual(2);
  });
});
