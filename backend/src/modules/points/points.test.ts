import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";

describe("Módulo de Puntos de Reciclaje (Fase 3 - Backend)", () => {
  const app = createApp();

  describe("GET /api/puntos", () => {
    it("debe retornar la lista de puntos de reciclaje de Tuluá", async () => {
      const res = await request(app).get("/api/puntos");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data)).toBe(true);

      const first = res.body.data[0];
      expect(first).toHaveProperty("code");
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("comuna");
      expect(first).toHaveProperty("wasteType");
      expect(first).toHaveProperty("currentFillPercentage");
    });

    it("debe filtrar correctamente por comuna (ej. Comuna 1)", async () => {
      const res = await request(app).get("/api/puntos?comuna=1");

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const pt of res.body.data) {
        expect(pt.comuna).toBe(1);
      }
    });

    it("debe filtrar correctamente por tipo de residuo (ej. PLASTICO)", async () => {
      const res = await request(app).get("/api/puntos?wasteType=PLASTICO");

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const pt of res.body.data) {
        expect(pt.wasteType).toBe("PLASTICO");
      }
    });

    it("debe filtrar por estado crítico (isCritical=true)", async () => {
      const res = await request(app).get("/api/puntos?isCritical=true");

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const pt of res.body.data) {
        expect(pt.isCritical).toBe(true);
        expect(pt.currentFillPercentage).toBeGreaterThanOrEqual(80.0);
      }
    });

    it("debe filtrar por término de búsqueda (ej. 'Terminal')", async () => {
      const res = await request(app).get("/api/puntos?search=Terminal");

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toContain("Terminal");
    });
  });

  describe("GET /api/puntos/:id", () => {
    it("debe retornar el detalle por código de contenedor (ej. #CNT-0001)", async () => {
      const res = await request(app).get("/api/puntos/%23CNT-0001");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe("#CNT-0001");
      expect(res.body.data.name).toContain("Plaza Cívica");
    });

    it("debe responder 404 si el contenedor no existe", async () => {
      const res = await request(app).get("/api/puntos/INEXISTENTE-999");

      expect(res.status).toBe(404);
      expect(res.body.code).toBe("POINT_NOT_FOUND");
    });
  });

  describe("POST /api/puntos", () => {
    it("debe crear un nuevo punto de reciclaje con datos válidos", async () => {
      const newPoint = {
        code: "#CNT-0099",
        name: "Nuevo Punto Parque Bolívar Sector Norte",
        address: "Calle 27 con Cra 24",
        comuna: 2,
        latitude: 4.0845,
        longitude: -76.196,
        wasteType: "VIDRIO",
        capacityKg: 150.0,
      };

      const res = await request(app).post("/api/puntos").send(newPoint);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe("#CNT-0099");
      expect(res.body.data.currentFillPercentage).toBe(0.0);

      // Verificar que se pueda consultar de inmediato
      const check = await request(app).get("/api/puntos/%23CNT-0099");
      expect(check.status).toBe(200);
      expect(check.body.data.name).toBe(newPoint.name);
    });

    it("debe responder 400 si los datos son inválidos (comuna fuera de rango 1-6)", async () => {
      const invalidPoint = {
        code: "#CNT-9999",
        name: "Punto Inválido",
        address: "Calle Falsa 123",
        comuna: 99, // Inválido en Tuluá
        latitude: 4.08,
        longitude: -76.19,
        wasteType: "PLASTICO",
      };

      const res = await request(app).post("/api/puntos").send(invalidPoint);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Reflejo Dinámico de Telemetría IoT en Puntos", () => {
    it("debe reflejar inmediatamente la telemetría enviada por el simulador o sensor", async () => {
      // 1. Enviar telemetría al contenedor #CNT-0001 forzándolo a 94.5%
      await request(app).post("/api/telemetry/container").send({
        container_code: "#CNT-0001",
        fill_percentage: 94.5,
        weight_kg: 141.7,
        battery_percentage: 91.0,
        temperature_celsius: 27.5,
        location: { latitude: 4.0847, longitude: -76.1954 },
      });

      // 2. Consultar el punto de reciclaje en /api/puntos
      const res = await request(app).get("/api/puntos/%23CNT-0001");

      expect(res.status).toBe(200);
      expect(res.body.data.currentFillPercentage).toBe(94.5);
      expect(res.body.data.isCritical).toBe(true);
      expect(res.body.data.hasLiveTelemetry).toBe(true);
      expect(res.body.data.temperatureCelsius).toBe(27.5);
    });
  });
});
