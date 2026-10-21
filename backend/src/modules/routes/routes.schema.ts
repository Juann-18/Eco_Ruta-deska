import { z } from "zod";

export const RouteStatusSchema = z.enum([
  "PROGRAMADA",
  "EN_CAMINO",
  "FINALIZADA",
  "CANCELADA",
]);
export type RouteStatus = z.infer<typeof RouteStatusSchema>;

export const CollectionStatusSchema = z.enum([
  "PENDIENTE",
  "EN_PROCESO",
  "COMPLETADA",
  "OMITIDA",
]);
export type CollectionStatus = z.infer<typeof CollectionStatusSchema>;

export const GetRoutesQuerySchema = z.object({
  comuna: z.coerce.number().int().min(1).max(6).optional(),
  status: RouteStatusSchema.optional(),
  period: z.enum(["hoy", "manana", "semana"]).default("hoy").optional(),
});
export type GetRoutesQuery = z.infer<typeof GetRoutesQuerySchema>;

export const CreateRouteSchema = z.object({
  code: z.string().min(3).max(20),
  name: z.string().min(3).max(150),
  comuna: z.coerce.number().int().min(1).max(6),
  companyName: z.string().min(2).max(150),
  vehiclePlate: z.string().min(3).max(15),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD requerido"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm requerido"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:mm requerido"),
  maxCapacityKg: z.coerce.number().positive().default(5000),
  recyclePointCodes: z.array(z.string()).min(1),
});
export type CreateRouteInput = z.infer<typeof CreateRouteSchema>;

export const UpdateRouteStatusSchema = z.object({
  status: RouteStatusSchema,
});
export type UpdateRouteStatusInput = z.infer<typeof UpdateRouteStatusSchema>;

export const CompleteCollectionSchema = z.object({
  collectedWeightKg: z.coerce.number().nonnegative(),
  notes: z.string().max(500).optional(),
});
export type CompleteCollectionInput = z.infer<typeof CompleteCollectionSchema>;

export const RouteIncidentSchema = z.object({
  reason: z.string().min(3).max(150),
  description: z.string().max(500).optional(),
  photoUrl: z.string().url().optional(),
});
export type RouteIncidentInput = z.infer<typeof RouteIncidentSchema>;
