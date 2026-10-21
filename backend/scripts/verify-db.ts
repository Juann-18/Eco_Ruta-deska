import { ensureDatabaseServer, stopDatabaseServer } from "../src/lib/db-server.js";
import { prisma } from "../src/config/prisma.js";

async function main() {
  await ensureDatabaseServer();
  await prisma.$connect();

  const tables: Array<{ table_name: string }> = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

  console.log("=== TABLAS FÍSICAS CREADAS EN POSTGRESQL ===");
  tables.forEach((t) => console.log(` ✔ ${t.table_name}`));

  console.log("\n=== CONTEO DE REGISTROS INSERTADOS (SEED) ===");
  console.log(" 🏢 Empresas (companies):", await prisma.company.count());
  console.log(" 🚛 Vehículos (vehicles):", await prisma.vehicle.count());
  console.log(" 👤 Usuarios (users):", await prisma.user.count());
  console.log(" ♻️ Puntos Reciclaje (recycle_points):", await prisma.recyclePoint.count());
  console.log(" 🗺️ Rutas (routes):", await prisma.route.count());
  console.log(" 📍 Paradas (collections):", await prisma.collection.count());
  console.log(" 📢 Reportes Ciudadanos (citizen_reports):", await prisma.citizenReport.count());
  console.log(" ⚠️ Incidentes (route_incidents):", await prisma.routeIncident.count());
  console.log(" 🔔 Notificaciones (notifications):", await prisma.notification.count());

  await prisma.$disconnect();
  await stopDatabaseServer();
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
