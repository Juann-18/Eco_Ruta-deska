import {
  PrismaClient,
  UserRole,
  WasteType,
  RouteStatus,
  CollectionStatus,
  CitizenReportReason,
  CitizenReportStatus,
  CompanyStatus,
} from "@prisma/client";
import { pbkdf2Sync, randomBytes } from "node:crypto";

const prisma = new PrismaClient();

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("🌱 Iniciando inserción de datos de desarrollo (Seeding)...");

  // 1. Limpieza ordenada preservando usuarios reales y sus reportes
  console.log("🧹 Limpiando datos previos de semilla (preservando usuarios registrados)...");
  await prisma.routeIncident.deleteMany({});
  await prisma.collection.deleteMany({});
  await prisma.routeAssignment.deleteMany({});
  await prisma.route.deleteMany({});
  await prisma.citizenReport.deleteMany({
    where: {
      folio: { in: ["#REP-2026-001", "#REP-2026-002", "#REP-2026-003"] },
    },
  });
  await prisma.notification.deleteMany({});
  await prisma.recyclePoint.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.user.deleteMany({
    where: { email: { startsWith: "maria_" } },
  });
  await prisma.company.deleteMany({});

  // 2. Empresas operadoras (Fieles a Company.png y Company___Detalle.png)
  console.log("🏢 Creando empresas de aseo y reciclaje...");
  const tuluaVerde = await prisma.company.create({
    data: {
      name: "Tuluá Verde S.A.S.",
      nit: "901.884.221-3",
      phone: "+57 (602) 225-8833",
      address: "Carrera 26 # 28-10, Tuluá, Valle",
      description: "Recolección selectiva de vidrio y envases plásticos",
      rating: 4.80,
      completedRoutes: 280,
      isVerified: true,
      status: CompanyStatus.APROBADA,
      wasteTypes: ["VIDRIO", "PLASTICO"],
      coveredComunas: [1, 2, 3],
    },
  });

  const ecoAseo = await prisma.company.create({
    data: {
      name: "EcoAseo Tuluá",
      nit: "900.123.456-7",
      phone: "+57 (602) 224-1100",
      address: "Zona Industrial Calle 40 # 20-15, Tuluá, Valle",
      description: "Aseo urbano y reciclaje",
      rating: 4.50,
      completedRoutes: 320,
      isVerified: true,
      status: CompanyStatus.APROBADA,
      wasteTypes: ["PAPEL_CARTON", "ESCOMBRO", "PLASTICO"],
      coveredComunas: [1, 2, 3, 4, 5, 6],
    },
  });

  const reciclablesValle = await prisma.company.create({
    data: {
      name: "Reciclables del Valle",
      nit: "890.987.654-1",
      phone: "+57 (602) 225-4422",
      address: "Av. Roosevelt # 12-40, Tuluá, Valle",
      description: "Aprovechamiento industrial de papel, cartón y metales",
      rating: 4.20,
      completedRoutes: 185,
      isVerified: true,
      status: CompanyStatus.APROBADA,
      wasteTypes: ["PAPEL_CARTON", "METAL"],
      coveredComunas: [2, 4],
    },
  });

  await prisma.company.create({
    data: {
      name: "Veolia",
      nit: "800.154.992-0",
      phone: "+57 (602) 226-1000",
      address: "Calle 27 # 30-18, Tuluá, Valle",
      description: "Gestión ambiental de residuos plásticos y metálicos",
      rating: 4.60,
      completedRoutes: 295,
      isVerified: true,
      status: CompanyStatus.APROBADA,
      wasteTypes: ["PLASTICO", "METAL"],
      coveredComunas: [1, 2, 3, 4, 5, 6],
    },
  });

  // 3. Flota de Vehículos
  console.log("🚛 Creando vehículos de recolección...");
  const vHino = await prisma.vehicle.create({
    data: {
      companyId: ecoAseo.id,
      plate: "TUL-482",
      model: "Chevrolet FVR Compactador",
      maxCapacityKg: 5000.0,
      isActive: true,
    },
  });

  const vHino500 = await prisma.vehicle.create({
    data: {
      companyId: tuluaVerde.id,
      plate: "TUL-105",
      model: "Hino 500 Ecológico",
      maxCapacityKg: 4000.0,
      isActive: true,
    },
  });

  const vDurastar = await prisma.vehicle.create({
    data: {
      companyId: reciclablesValle.id,
      plate: "TUL-880",
      model: "International Durastar",
      maxCapacityKg: 6000.0,
      isActive: true,
    },
  });

  // 4. Usuarios base del Sistema (Upsert para no borrar usuarios creados ni cambiar sus UUIDs)
  console.log("👤 Asegurando usuarios base del sistema (upsert)...");
  const defaultPasswordHash = hashPassword("eco123456");

  const userCiudadano = await prisma.user.upsert({
    where: { email: "alex@ecoruta.com" },
    update: {
      name: "Alex Ciudadano",
      phone: "+57 315 224 8899",
      role: UserRole.CIUDADANO,
      comuna: 1,
    },
    create: {
      email: "alex@ecoruta.com",
      passwordHash: defaultPasswordHash,
      name: "Alex Ciudadano",
      phone: "+57 315 224 8899",
      role: UserRole.CIUDADANO,
      comuna: 1,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    },
  });

  const userConductor = await prisma.user.upsert({
    where: { email: "conductor@ecoaseo.com" },
    update: {
      name: "Carlos Conductor",
      phone: "+57 312 998 7744",
      role: UserRole.RECOLECTOR,
      comuna: 1,
      companyId: ecoAseo.id,
    },
    create: {
      email: "conductor@ecoaseo.com",
      passwordHash: defaultPasswordHash,
      name: "Carlos Conductor",
      phone: "+57 312 998 7744",
      role: UserRole.RECOLECTOR,
      comuna: 1,
      companyId: ecoAseo.id,
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@tulua.gov.co" },
    update: {
      name: "Supervisor Municipal Tuluá",
      phone: "+57 602 224 5500",
      role: UserRole.ADMIN,
      comuna: 1,
    },
    create: {
      email: "admin@tulua.gov.co",
      passwordHash: defaultPasswordHash,
      name: "Supervisor Municipal Tuluá",
      phone: "+57 602 224 5500",
      role: UserRole.ADMIN,
      comuna: 1,
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    },
  });

  // 5. Puntos de Reciclaje / Contenedores Inteligentes en Tuluá (#CNT-0001 a #CNT-0018)
  console.log("♻️ Creando 18 puntos y contenedores de reciclaje...");
  const p1 = await prisma.recyclePoint.create({
    data: {
      companyId: ecoAseo.id,
      code: "#CNT-0001",
      name: "Punto Verde Plaza Cívica Boyacá",
      address: "Cra 26 con Calle 27",
      comuna: 1,
      latitude: 4.0847,
      longitude: -76.1954,
      wasteType: WasteType.PAPEL_CARTON,
      capacityKg: 150.0,
      currentFillPercentage: 45.0,
      isActive: true,
      lastEmptiedAt: null,
    },
  });

  const p2 = await prisma.recyclePoint.create({
    data: {
      companyId: ecoAseo.id,
      code: "#CNT-0002",
      name: "Punto Ecológico Parque Infantil",
      address: "Calle 28 con Cra 20",
      comuna: 1,
      latitude: 4.0862,
      longitude: -76.1915,
      wasteType: WasteType.PLASTICO,
      capacityKg: 120.0,
      currentFillPercentage: 88.5, // Crítico
      isActive: true,
      lastEmptiedAt: null,
    },
  });

  const p3 = await prisma.recyclePoint.create({
    data: {
      companyId: ecoAseo.id,
      code: "#CNT-0003",
      name: "Estación Terminal de Transportes",
      address: "Calle 25 # 20-30",
      comuna: 2,
      latitude: 4.0815,
      longitude: -76.1892,
      wasteType: WasteType.VIDRIO,
      capacityKg: 200.0,
      currentFillPercentage: 35.0,
      isActive: true,
      lastEmptiedAt: null,
    },
  });

  const p4 = await prisma.recyclePoint.create({
    data: {
      companyId: ecoAseo.id,
      code: "#CNT-0004",
      name: "Contenedor Parque Bolívar",
      address: "Calle 26 con Cra 25",
      comuna: 2,
      latitude: 4.0838,
      longitude: -76.1978,
      wasteType: WasteType.METAL,
      capacityKg: 120.0,
      currentFillPercentage: 62.0,
      isActive: true,
      lastEmptiedAt: null,
    },
  });

  const p5 = await prisma.recyclePoint.create({
    data: {
      companyId: ecoAseo.id,
      code: "#CNT-0005",
      name: "Punto Complejo Deportivo Alvernia",
      address: "Cra 38 con Calle 24",
      comuna: 3,
      latitude: 4.0792,
      longitude: -76.2045,
      wasteType: WasteType.PLASTICO,
      capacityKg: 150.0,
      currentFillPercentage: 92.0, // Crítico
      isActive: true,
      lastEmptiedAt: null,
    },
  });

  const p6 = await prisma.recyclePoint.create({
    data: {
      companyId: tuluaVerde.id,
      code: "#CNT-0006",
      name: "Centro Comercial La 14",
      address: "Calle 27 # 33-15",
      comuna: 3,
      latitude: 4.0855,
      longitude: -76.2082,
      wasteType: WasteType.PAPEL_CARTON,
      capacityKg: 200.0,
      currentFillPercentage: 20.0,
      isActive: true,
      lastEmptiedAt: null,
    },
  });

  const p7 = await prisma.recyclePoint.create({
    data: {
      companyId: ecoAseo.id,
      code: "#CNT-0007",
      name: "Punto Limpio Mercado Central",
      address: "Cra 21 # 28-50",
      comuna: 4,
      latitude: 4.0885,
      longitude: -76.1942,
      wasteType: WasteType.ORGANICO,
      capacityKg: 200.0,
      currentFillPercentage: 78.0,
      isActive: true,
      lastEmptiedAt: null,
    },
  });

  const p8 = await prisma.recyclePoint.create({
    data: {
      companyId: tuluaVerde.id,
      code: "#CNT-0008",
      name: "Punto Parque de la Guadua",
      address: "Calle 44 # 25-10",
      comuna: 4,
      latitude: 4.0921,
      longitude: -76.1985,
      wasteType: WasteType.VIDRIO,
      capacityKg: 120.0,
      currentFillPercentage: 15.0,
      isActive: true,
      lastEmptiedAt: null,
    },
  });

  const p9 = await prisma.recyclePoint.create({
    data: {
      companyId: reciclablesValle.id,
      code: "#CNT-0009",
      name: "Sector Hospital Tomás Uribe",
      address: "Calle 27 # 44-50",
      comuna: 5,
      latitude: 4.0811,
      longitude: -76.2155,
      wasteType: WasteType.ESCOMBRO,
      capacityKg: 300.0,
      currentFillPercentage: 82.0, // Crítico
      isActive: true,
      lastEmptiedAt: null,
    },
  });

  const p10 = await prisma.recyclePoint.create({
    data: {
      companyId: tuluaVerde.id,
      code: "#CNT-0010",
      name: "Plaza San Juan Bosco",
      address: "Cra 28 # 36-20",
      comuna: 5,
      latitude: 4.0754,
      longitude: -76.211,
      wasteType: WasteType.PLASTICO,
      capacityKg: 120.0,
      currentFillPercentage: 50.0,
      isActive: true,
      lastEmptiedAt: null,
    },
  });

  const p11 = await prisma.recyclePoint.create({
    data: {
      companyId: ecoAseo.id,
      code: "#CNT-0011",
      name: "Campus UCEVA",
      address: "Cra 27 A # 48-144",
      comuna: 6,
      latitude: 4.0965,
      longitude: -76.2025,
      wasteType: WasteType.PAPEL_CARTON,
      capacityKg: 180.0,
      currentFillPercentage: 30.0,
      isActive: true,
      lastEmptiedAt: null,
    },
  });

  const p12 = await prisma.recyclePoint.create({
    data: {
      companyId: reciclablesValle.id,
      code: "#CNT-0012",
      name: "Parque Lineal Juan María Céspedes",
      address: "Calle 34 # 21-15",
      comuna: 6,
      latitude: 4.091,
      longitude: -76.1905,
      wasteType: WasteType.METAL,
      capacityKg: 120.0,
      currentFillPercentage: 65.0,
      isActive: true,
      lastEmptiedAt: null,
    },
  });

  await prisma.recyclePoint.create({
    data: {
      companyId: tuluaVerde.id,
      code: "#CNT-0013",
      name: "Estación Ferrocarril Centro",
      address: "Calle 26 # 18-10",
      comuna: 1,
      latitude: 4.0832,
      longitude: -76.1938,
      wasteType: WasteType.VIDRIO,
      capacityKg: 150.0,
      currentFillPercentage: 54.0,
      isActive: true,
      lastEmptiedAt: null,
    },
  });

  await prisma.recyclePoint.create({
    data: {
      companyId: ecoAseo.id,
      code: "#CNT-0014",
      name: "Pasaje Comercial Carrera 25",
      address: "Cra 25 # 26-40",
      comuna: 1,
      latitude: 4.0853,
      longitude: -76.1965,
      wasteType: WasteType.ORGANICO,
      capacityKg: 180.0,
      currentFillPercentage: 72.0,
      isActive: true,
      lastEmptiedAt: null,
    },
  });

  await prisma.recyclePoint.create({
    data: {
      companyId: reciclablesValle.id,
      code: "#CNT-0015",
      name: "Colegio Gimnasio del Pacífico",
      address: "Calle 32 # 27-40",
      comuna: 2,
      latitude: 4.0875,
      longitude: -76.1972,
      wasteType: WasteType.PAPEL_CARTON,
      capacityKg: 150.0,
      currentFillPercentage: 38.0,
      isActive: true,
      lastEmptiedAt: null,
    },
  });

  await prisma.recyclePoint.create({
    data: {
      companyId: tuluaVerde.id,
      code: "#CNT-0016",
      name: "Barrio Victoria Zona Comercial",
      address: "Cra 34 # 26-10",
      comuna: 3,
      latitude: 4.0825,
      longitude: -76.2035,
      wasteType: WasteType.VIDRIO,
      capacityKg: 150.0,
      currentFillPercentage: 67.0,
      isActive: true,
      lastEmptiedAt: null,
    },
  });

  await prisma.recyclePoint.create({
    data: {
      companyId: ecoAseo.id,
      code: "#CNT-0017",
      name: "Parque Barrio Sajonia",
      address: "Cra 30 # 42-18",
      comuna: 4,
      latitude: 4.0912,
      longitude: -76.2010,
      wasteType: WasteType.PLASTICO,
      capacityKg: 120.0,
      currentFillPercentage: 84.0,
      isActive: true,
      lastEmptiedAt: null,
    },
  });

  await prisma.recyclePoint.create({
    data: {
      companyId: reciclablesValle.id,
      code: "#CNT-0018",
      name: "Sector Chiminangos Norte",
      address: "Transversal 12 # 20-05",
      comuna: 5,
      latitude: 4.0785,
      longitude: -76.2130,
      wasteType: WasteType.METAL,
      capacityKg: 150.0,
      currentFillPercentage: 29.0,
      isActive: true,
      lastEmptiedAt: null,
    },
  });

  // 6. Rutas de Recolección
  console.log("🗺️ Creando rutas de recolección (#RTA-0012, #RTA-0015, #RTA-0019, #RTA-0004, #RTA-0022)...");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const route1 = await prisma.route.create({
    data: {
      companyId: ecoAseo.id,
      vehicleId: vHino.id,
      code: "#RTA-0012",
      name: "Ruta Principal Sector Centro",
      comuna: 1,
      scheduledDate: today,
      startTime: "17:00",
      endTime: "19:00",
      currentLoadKg: 3600.0,
      maxCapacityKg: 5000.0,
      status: RouteStatus.EN_CAMINO,
      startedAt: new Date(Date.now() - 3600 * 1000),
    },
  });

  const route2 = await prisma.route.create({
    data: {
      companyId: tuluaVerde.id,
      vehicleId: vHino500.id,
      code: "#RTA-0015",
      name: "Ruta Reciclables Papel y Cartón",
      comuna: 1,
      scheduledDate: today,
      startTime: "19:30",
      endTime: "21:00",
      currentLoadKg: 1000.0,
      maxCapacityKg: 4000.0,
      status: RouteStatus.PROGRAMADA,
    },
  });

  const route3 = await prisma.route.create({
    data: {
      companyId: ecoAseo.id,
      vehicleId: vHino.id,
      code: "#RTA-0019",
      name: "Ruta Nocturna Comercial",
      comuna: 1,
      scheduledDate: today,
      startTime: "21:30",
      endTime: "23:00",
      currentLoadKg: 500.0,
      maxCapacityKg: 5000.0,
      status: RouteStatus.PROGRAMADA,
    },
  });

  const route4 = await prisma.route.create({
    data: {
      companyId: reciclablesValle.id,
      vehicleId: vDurastar.id,
      code: "#RTA-0004",
      name: "Ruta Matutina Vidrio y Metales",
      comuna: 2,
      scheduledDate: today,
      startTime: "08:00",
      endTime: "10:00",
      currentLoadKg: 5700.0,
      maxCapacityKg: 6000.0,
      status: RouteStatus.FINALIZADA,
      startedAt: new Date(Date.now() - 10 * 3600 * 1000),
      completedAt: new Date(Date.now() - 8 * 3600 * 1000),
    },
  });

  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
  tomorrow.setHours(0, 0, 0, 0);

  const route5 = await prisma.route.create({
    data: {
      companyId: ecoAseo.id,
      vehicleId: vHino.id,
      code: "#RTA-0022",
      name: "Ruta Matutina Reciclables Centro",
      comuna: 1,
      scheduledDate: tomorrow,
      startTime: "07:30",
      endTime: "09:30",
      currentLoadKg: 0.0,
      maxCapacityKg: 5000.0,
      status: RouteStatus.PROGRAMADA,
    },
  });

  // Asignaciones
  await prisma.routeAssignment.create({
    data: {
      routeId: route1.id,
      userId: userConductor.id,
    },
  });

  // 7. Paradas de Recolección (Collections)
  console.log("📍 Vinculando paradas de recolección en las rutas...");
  const col1 = await prisma.collection.create({
    data: {
      routeId: route1.id,
      recyclePointId: p1.id,
      order: 1,
      status: CollectionStatus.COMPLETADA,
      collectedWeightKg: 65.0,
      collectedAt: new Date(Date.now() - 2500 * 1000),
      notes: "Punto Plaza Boyacá vaciado exitosamente.",
    },
  });

  const col2 = await prisma.collection.create({
    data: {
      routeId: route1.id,
      recyclePointId: p2.id,
      order: 2,
      status: CollectionStatus.EN_PROCESO,
      collectedWeightKg: null,
      notes: "Contenedor Parque Infantil en maniobra de recolección.",
    },
  });

  await prisma.collection.create({
    data: {
      routeId: route1.id,
      recyclePointId: p5.id,
      order: 3,
      status: CollectionStatus.PENDIENTE,
    },
  });

  // Paradas ruta 4 (Finalizada)
  await prisma.collection.create({
    data: {
      routeId: route4.id,
      recyclePointId: p3.id,
      order: 1,
      status: CollectionStatus.COMPLETADA,
      collectedWeightKg: 120.0,
      collectedAt: new Date(Date.now() - 9.5 * 3600 * 1000),
      notes: "Vaciado de botellas en Terminal completado.",
    },
  });

  await prisma.collection.create({
    data: {
      routeId: route4.id,
      recyclePointId: p4.id,
      order: 2,
      status: CollectionStatus.COMPLETADA,
      collectedWeightKg: 110.0,
      collectedAt: new Date(Date.now() - 8.5 * 3600 * 1000),
      notes: "Metales Parque Bolívar recolectados.",
    },
  });

  // 8. Reportes Ciudadanos
  console.log("📢 Creando reportes ciudadanos de prueba...");
  await prisma.citizenReport.create({
    data: {
      userId: userCiudadano.id,
      recyclePointId: p2.id,
      folio: "#REP-2026-001",
      reason: CitizenReportReason.CONTENEDOR_LLENO,
      description: "El contenedor de plástico en Parque Infantil está rebasando su capacidad.",
      status: CitizenReportStatus.EN_REVISION,
      address: "Calle 28 con Cra 20",
      latitude: 4.0862,
      longitude: -76.1915,
    },
  });

  await prisma.citizenReport.create({
    data: {
      userId: userCiudadano.id,
      recyclePointId: p1.id,
      folio: "#REP-2026-002",
      reason: CitizenReportReason.DANADO,
      description: "La tapa plástica superior presenta una fractura en las bisagras.",
      status: CitizenReportStatus.PENDIENTE,
      address: "Cra 26 con Calle 27",
      latitude: 4.0847,
      longitude: -76.1954,
    },
  });

  await prisma.citizenReport.create({
    data: {
      userId: userCiudadano.id,
      recyclePointId: p3.id,
      folio: "#REP-2026-003",
      reason: CitizenReportReason.RESIDUOS_FUERA,
      description: "Habían botellas de vidrio acumuladas en el andén fuera del buzón de recepción.",
      status: CitizenReportStatus.RESUELTO,
      resolvedAt: new Date(Date.now() - 12 * 3600 * 1000),
      address: "Calle 25 Cra 21",
      latitude: 4.0815,
      longitude: -76.1992,
    },
  });

  // 9. Incidentes de Ruta
  console.log("⚠️ Creando incidentes de ruta...");
  await prisma.routeIncident.create({
    data: {
      collectionId: col1.id,
      reportedByUserId: userConductor.id,
      reason: "Vehículo mal estacionado bloqueando acceso",
      description: "Un automóvil particular impedía la maniobra del brazo basculante por 15 minutos.",
    },
  });

  // 10. Notificaciones
  console.log("🔔 Creando notificaciones para ciudadanos...");
  await prisma.notification.create({
    data: {
      userId: userCiudadano.id,
      comuna: 1,
      title: "El camión está en camino",
      message: "EcoAseo Tuluá llega a tu sector en ~25 min",
      type: "CAMION_EN_CAMINO",
      isRead: false,
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
    },
  });

  await prisma.notification.create({
    data: {
      userId: userCiudadano.id,
      comuna: 1,
      title: "Contenedor casi lleno",
      message: "#CNT-0002 en Calle 28 con Cra 20 está al 88.5%",
      type: "CONTENEDOR_LLENO",
      isRead: false,
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
    },
  });

  await prisma.notification.create({
    data: {
      userId: userCiudadano.id,
      comuna: 1,
      title: "Nueva empresa en tu comuna",
      message: "Tuluá Verde S.A.S. ya está en el directorio",
      type: "NUEVA_EMPRESA",
      isRead: true,
      createdAt: new Date(Date.now() - 24 * 3600 * 1000),
    },
  });

  await prisma.notification.create({
    data: {
      userId: userCiudadano.id,
      comuna: 1,
      title: "Recuerda separar tus residuos",
      message: "Mañana pasa la ruta de papel y cartón",
      type: "RECORDATORIO",
      isRead: true,
      createdAt: new Date(Date.now() - 28 * 3600 * 1000),
    },
  });

  console.log("✨ Seed completado con éxito. La base de datos contiene datos completos para desarrollo.");
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
