import { prisma } from "../../config/prisma.js";
import {
  CitizenReportReason,
  CitizenReportStatus,
  CreateReportInput,
  GetReportsQuery,
} from "./reports.schema.js";

export interface EnrichedCitizenReport {
  id: string;
  folio: string;
  userId: string;
  userName: string;
  recyclePointId: string | null;
  recyclePointCode: string | null;
  recyclePointName: string | null;
  companyName: string;
  reason: CitizenReportReason;
  description: string;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  status: CitizenReportStatus;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ReportsService {
  private mapDbReport(r: any): EnrichedCitizenReport {
    return {
      id: r.id,
      folio: r.folio,
      userId: r.userId,
      userName: r.user?.name ?? "Ciudadano",
      recyclePointId: r.recyclePointId ?? null,
      recyclePointCode: r.recyclePoint?.code ?? null,
      recyclePointName: r.recyclePoint?.name ?? null,
      companyName: r.recyclePoint?.company?.name ?? "EcoAseo Tuluá",
      reason: r.reason as CitizenReportReason,
      description: r.description,
      imageUrl: r.imageUrl ?? null,
      latitude: r.latitude !== null && r.latitude !== undefined ? Number(r.latitude) : null,
      longitude: r.longitude !== null && r.longitude !== undefined ? Number(r.longitude) : null,
      address: r.address ?? r.recyclePoint?.address ?? null,
      status: r.status as CitizenReportStatus,
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private async generateNextFolio(): Promise<string> {
    const count = await prisma.citizenReport.count();
    const nextNumber = 230 + count + 1;
    const candidate = `#RP-${String(nextNumber).padStart(4, "0")}`;
    const existing = await prisma.citizenReport.findUnique({ where: { folio: candidate } });
    if (existing) {
      return `#RP-${Date.now().toString().slice(-4)}`;
    }
    return candidate;
  }

  public async findAll(query: GetReportsQuery): Promise<EnrichedCitizenReport[]> {
    const reports = await prisma.citizenReport.findMany({
      where: {
        ...(query.status && { status: query.status }),
        ...(query.userId && UUID_REGEX.test(query.userId) && { userId: query.userId }),
        ...(query.recyclePointId &&
          UUID_REGEX.test(query.recyclePointId) && { recyclePointId: query.recyclePointId }),
        ...(query.search && {
          OR: [
            { folio: { contains: query.search, mode: "insensitive" } },
            { description: { contains: query.search, mode: "insensitive" } },
            { address: { contains: query.search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        user: true,
        recyclePoint: {
          include: { company: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return reports.map((r) => this.mapDbReport(r));
  }

  public async findByIdOrFolio(idOrFolio: string): Promise<EnrichedCitizenReport | null> {
    const isUuid = UUID_REGEX.test(idOrFolio);
    const report = isUuid
      ? await prisma.citizenReport.findUnique({
          where: { id: idOrFolio },
          include: {
            user: true,
            recyclePoint: { include: { company: true } },
          },
        })
      : await prisma.citizenReport.findFirst({
          where: { folio: { equals: idOrFolio, mode: "insensitive" } },
          include: {
            user: true,
            recyclePoint: { include: { company: true } },
          },
        });

    if (!report) return null;
    return this.mapDbReport(report);
  }

  public async create(
    userId: string | undefined,
    data: CreateReportInput
  ): Promise<EnrichedCitizenReport> {
    // Resolver usuario válido en PostgreSQL
    let resolvedUserId = userId && UUID_REGEX.test(userId) ? userId : undefined;
    if (resolvedUserId) {
      const exists = await prisma.user.findUnique({ where: { id: resolvedUserId } });
      if (!exists) resolvedUserId = undefined;
    }
    if (!resolvedUserId) {
      const defaultCitizen =
        (await prisma.user.findFirst({ where: { role: "CIUDADANO" } })) ??
        (await prisma.user.findFirst());
      if (!defaultCitizen) {
        throw {
          statusCode: 400,
          code: "USER_NOT_FOUND",
          message: "No se encontró un usuario válido para asociar el reporte",
        };
      }
      resolvedUserId = defaultCitizen.id;
    }

    // Resolver punto de reciclaje (por UUID o código #CNT-xxxx)
    let resolvedPoint: any = null;
    if (data.recyclePointId) {
      if (UUID_REGEX.test(data.recyclePointId)) {
        resolvedPoint = await prisma.recyclePoint.findUnique({
          where: { id: data.recyclePointId },
          include: { company: true },
        });
      } else {
        resolvedPoint = await prisma.recyclePoint.findFirst({
          where: { code: { equals: data.recyclePointId, mode: "insensitive" } },
          include: { company: true },
        });
      }
    }

    const folio = await this.generateNextFolio();

    const created = await prisma.citizenReport.create({
      data: {
        userId: resolvedUserId,
        recyclePointId: resolvedPoint?.id ?? null,
        folio,
        reason: data.reason,
        description: data.description.trim(),
        imageUrl: data.imageUrl ?? null,
        latitude:
          data.latitude ??
          (resolvedPoint ? Number(resolvedPoint.latitude) : null),
        longitude:
          data.longitude ??
          (resolvedPoint ? Number(resolvedPoint.longitude) : null),
        address: data.address ?? resolvedPoint?.address ?? null,
        status: "EN_REVISION",
      },
      include: {
        user: true,
        recyclePoint: { include: { company: true } },
      },
    });

    // Crear notificación en PostgreSQL para el centro de Avisos
    const pointLabel = resolvedPoint ? `${resolvedPoint.code} (${resolvedPoint.name})` : "tu sector";
    await prisma.notification
      .create({
        data: {
          userId: resolvedUserId,
          comuna: resolvedPoint?.comuna ?? 1,
          title: `Reporte ${folio} radicado`,
          message: `Tu reporte sobre ${pointLabel} está en revisión por ${resolvedPoint?.company?.name ?? "EcoAseo Tuluá"}.`,
          type: "REPORTE",
          isRead: false,
        },
      })
      .catch(() => {});

    return this.mapDbReport(created);
  }

  public async updateStatus(
    idOrFolio: string,
    status: CitizenReportStatus
  ): Promise<EnrichedCitizenReport | null> {
    const existing = await this.findByIdOrFolio(idOrFolio);
    if (!existing) return null;

    const updated = await prisma.citizenReport.update({
      where: { id: existing.id },
      data: {
        status,
        resolvedAt: status === "RESUELTO" ? new Date() : null,
      },
      include: {
        user: true,
        recyclePoint: { include: { company: true } },
      },
    });

    await prisma.notification
      .create({
        data: {
          userId: existing.userId,
          comuna: updated.recyclePoint?.comuna ?? 1,
          title: `Actualización de folio ${existing.folio}`,
          message: `El reporte ${existing.folio} cambió a estado ${status}.`,
          type: "REPORTE",
          isRead: false,
        },
      })
      .catch(() => {});

    return this.mapDbReport(updated);
  }
}

export const reportsService = new ReportsService();
