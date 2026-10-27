export type CitizenReportReason =
  | "CONTENEDOR_LLENO"
  | "DANADO"
  | "MAL_OLOR"
  | "RESIDUOS_FUERA"
  | "CAMION_NO_PASO"
  | "OTRO";

export type CitizenReportStatus =
  | "PENDIENTE"
  | "EN_REVISION"
  | "RESUELTO"
  | "DESCARTADO";

export interface CitizenReportItem {
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

export interface CreateCitizenReportInput {
  recyclePointId?: string;
  reason: CitizenReportReason;
  description: string;
  imageUrl?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  comuna?: number | null;
  isRead: boolean;
  createdAt: string;
}
