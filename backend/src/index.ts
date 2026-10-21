import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { pointsService } from "./modules/points/points.service.js";
import { authService } from "./modules/auth/auth.service.js";
import { routesService } from "./modules/routes/routes.service.js";

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log("🗄️ Conexión con PostgreSQL establecida vía Prisma.");
    await pointsService.syncFromDatabase();
    await authService.syncFromDatabase();
    await routesService.syncFromDatabase();
  } catch (err) {
    console.error("❌ No se pudo conectar a PostgreSQL:", err);
    process.exit(1);
  }

  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`🚀 Servidor Eco_Ruta escuchando en http://localhost:${env.PORT}`);
    console.log(`📋 Entorno: ${env.NODE_ENV}`);
    console.log(`🩺 Salud de API: http://localhost:${env.PORT}/api/health`);
    console.log(`♻️ Puntos de reciclaje: http://localhost:${env.PORT}/api/puntos`);
    console.log(`🗺️ Rutas activas: http://localhost:${env.PORT}/api/rutas`);
  });
}

bootstrap().catch((err) => {
  console.error("❌ Error fatal iniciando la aplicación:", err);
  process.exit(1);
});
