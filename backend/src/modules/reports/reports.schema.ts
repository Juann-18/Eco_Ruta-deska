import { z } from "zod";

export const CitizenReportReasonEnum = z.enum([
  "CONTENEDOR_LLENO",
  "DANADO",
  "MAL_OLOR",
  "RESIDUOS_FUERA",
  "CAMION_NO_PASO",
  "OTRO",
]);

export type CitizenReportReason = z.infer<typeof CitizenReportReasonEnum>;

export const CitizenReportStatusEnum = z.enum([
  "PENDIENTE",
  "EN_REVISION",
  "RESUELTO",
  "DESCARTADO",
]);

export type CitizenReportStatus = z.infer<typeof CitizenReportStatusEnum>;

export const createReportSchema = z.object({
  recyclePointId: z.string().optional(),
  reason: CitizenReportReasonEnum,
  description: z
    .string()
    .min(3, "La descripción debe tener al menos 3 caracteres")
    .max(1000, "La descripción no puede exceder 1000 caracteres"),
  imageUrl: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  address: z.string().optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

export const getReportsQuerySchema = z.object({
  status: CitizenReportStatusEnum.optional(),
  userId: z.string().optional(),
  recyclePointId: z.string().optional(),
  search: z.string().optional(),
});

export type GetReportsQuery = z.infer<typeof getReportsQuerySchema>;

export const updateReportStatusSchema = z.object({
  status: CitizenReportStatusEnum,
});

export type UpdateReportStatusInput = z.infer<typeof updateReportStatusSchema>;
