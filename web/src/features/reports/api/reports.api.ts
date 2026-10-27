import { apiClient } from "../../../common/config/axios";
import type {
  CitizenReportItem,
  CitizenReportStatus,
  CreateCitizenReportInput,
  NotificationItem,
} from "../types/reports.types";

export async function getReports(params?: {
  status?: CitizenReportStatus;
  search?: string;
}): Promise<CitizenReportItem[]> {
  const res = await apiClient.get<{ data: CitizenReportItem[] }>("/reportes", {
    params,
  });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function createReport(
  payload: CreateCitizenReportInput
): Promise<CitizenReportItem> {
  const res = await apiClient.post<{ data: CitizenReportItem }>(
    "/reportes",
    payload
  );
  return res.data.data;
}

export async function updateReportStatus(
  idOrFolio: string,
  status: CitizenReportStatus
): Promise<CitizenReportItem> {
  const res = await apiClient.patch<{ data: CitizenReportItem }>(
    `/reportes/${encodeURIComponent(idOrFolio)}/status`,
    { status }
  );
  return res.data.data;
}

export async function getNotifications(
  comuna?: number
): Promise<NotificationItem[]> {
  const res = await apiClient.get<{ data: NotificationItem[] }>(
    "/notificaciones",
    { params: comuna ? { comuna } : undefined }
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function markAllNotificationsRead(
  comuna?: number
): Promise<NotificationItem[]> {
  const res = await apiClient.patch<{ data: NotificationItem[] }>(
    "/notificaciones/read-all",
    {},
    { params: comuna ? { comuna } : undefined }
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function markNotificationRead(
  id: string
): Promise<NotificationItem> {
  const res = await apiClient.patch<{ data: NotificationItem }>(
    `/notificaciones/${id}/read`
  );
  return res.data.data;
}
