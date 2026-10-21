import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { telemetryService } from "./telemetry.service.js";

describe("Módulo de Telemetría IoT (Fase 1)", () => {
  const app = createApp();

  beforeEach(() => {
    telemetryService.clear();
  });

  describe("POST /api/telemetry/container", () => {
    it("debe procesar telemetría válida de un contenedor con estado normal", async () => {
      const payload = {
        container_code: "#CNT-0001",
        fill_percentage: 42.5,
        weight_kg: 51.0,
        battery_percentage: 95.0,
        temperature_celsius: 24.0,
        location: {
          latitude: 4.0847,
          longitude: -76.1954,
        },
      };

      const res = await request(app)
        .post("/api/telemetry/container")
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.container_code).toBe("#CNT-0001");
      expect(res.body.data.fill_percentage).toBe(42.5);
      expect(res.body.data.is_critical).toBe(false);
      expect(res.body.data.fire_hazard).toBe(false);
    });

    it("debe marcar is_critical = true cuando el llenado supera el 80%", async () => {
      const payload = {
        container_code: "#CNT-0002",
        fill_percentage: 86.0,
        weight_kg: 103.2,
        battery_percentage: 88.0,
        temperature_celsius: 25.5,
        location: {
          latitude: 4.085,
          longitude: -76.196,
        },
      };

      const res = await request(app)
        .post("/api/telemetry/container")
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.data.is_critical).toBe(true);

      // Verificar que se haya emitido una alerta
      const live = await request(app).get("/api/telemetry/live");
      expect(live.body.active_alerts.length).toBeGreaterThanOrEqual(1);
      expect(live.body.active_alerts[0].type).toBe("CRITICAL_FILL");
    });

    it("debe marcar fire_hazard = true cuando la temperatura supera 55°C", async () => {
      const payload = {
        container_code: "#CNT-0003",
        fill_percentage: 50.0,
        temperature_celsius: 65.0,
        location: { latitude: 4.08, longitude: -76.19 },
      };

      const res = await request(app)
        .post("/api/telemetry/container")
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.data.fire_hazard).toBe(true);
    });

    it("debe rechazar con 400 si el payload es inválido (porcentaje > 100)", async () => {
      const payload = {
        container_code: "#CNT-0004",
        fill_percentage: 150.0, // Inválido
        location: { latitude: 4.08, longitude: -76.19 },
      };

      const res = await request(app)
        .post("/api/telemetry/container")
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.details).toHaveProperty("fill_percentage");
    });
  });

  describe("POST /api/telemetry/truck", () => {
    it("debe procesar telemetría de camión y calcular % de carga", async () => {
      const payload = {
        truck_id: "TRUCK-01",
        plate: "TUL-482",
        status: "EN_CAMINO",
        current_load_kg: 2500.0,
        max_capacity_kg: 5000.0,
        speed_kmh: 35.0,
        fuel_percentage: 85.0,
        location: {
          latitude: 4.084,
          longitude: -76.195,
        },
      };

      const res = await request(app).post("/api/telemetry/truck").send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plate).toBe("TUL-482");
      expect(res.body.data.load_percentage).toBe(50.0);
      expect(res.body.data.is_near_capacity).toBe(false);
    });

    it("debe detectar is_near_capacity = true cuando la carga supera el 90%", async () => {
      const payload = {
        truck_id: "TRUCK-02",
        plate: "TUL-719",
        status: "EN_CAMINO",
        current_load_kg: 4600.0,
        max_capacity_kg: 5000.0,
        location: { latitude: 4.084, longitude: -76.195 },
      };

      const res = await request(app).post("/api/telemetry/truck").send(payload);

      expect(res.status).toBe(200);
      expect(res.body.data.load_percentage).toBe(92.0);
      expect(res.body.data.is_near_capacity).toBe(true);

      const live = await request(app).get("/api/telemetry/live");
      const overloadAlert = live.body.active_alerts.find(
        (a: any) => a.type === "TRUCK_OVERLOAD"
      );
      expect(overloadAlert).toBeDefined();
    });

    it("debe rechazar con 400 si el camión tiene carga negativa", async () => {
      const payload = {
        truck_id: "TRUCK-03",
        plate: "TUL-903",
        status: "IDLE",
        current_load_kg: -100.0, // Inválido
        location: { latitude: 4.084, longitude: -76.195 },
      };

      const res = await request(app).post("/api/telemetry/truck").send(payload);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(res.body.details).toHaveProperty("current_load_kg");
    });
  });

  describe("GET /api/telemetry/live", () => {
    it("debe retornar el estado en vivo de contenedores y camiones registrados", async () => {
      // Registrar 1 contenedor y 1 camión
      await request(app).post("/api/telemetry/container").send({
        container_code: "#CNT-0010",
        fill_percentage: 30.0,
        location: { latitude: 4.084, longitude: -76.195 },
      });

      await request(app).post("/api/telemetry/truck").send({
        truck_id: "TRUCK-01",
        plate: "TUL-482",
        status: "RECOLECTANDO",
        current_load_kg: 1000.0,
        location: { latitude: 4.084, longitude: -76.195 },
      });

      const res = await request(app).get("/api/telemetry/live");

      expect(res.status).toBe(200);
      expect(res.body.containers_count).toBe(1);
      expect(res.body.trucks_count).toBe(1);
      expect(res.body.containers[0].container_code).toBe("#CNT-0010");
      expect(res.body.trucks[0].plate).toBe("TUL-482");
    });
  });
});
