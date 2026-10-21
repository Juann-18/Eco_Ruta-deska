import { z } from "zod";

export const WasteTypeEnum = z.enum([
  "PAPEL_CARTON",
  "VIDRIO",
  "PLASTICO",
  "METAL",
  "ESCOMBRO",
  "ORGANICO",
]);
export type WasteType = z.infer<typeof WasteTypeEnum>;

export const getPointsQuerySchema = z.object({
  comuna: z.coerce.number().int().min(1).max(6).optional(),
  wasteType: WasteTypeEnum.optional(),
  isCritical: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  search: z.string().optional(),
});
export type GetPointsQuery = z.infer<typeof getPointsQuerySchema>;

export const createPointSchema = z.object({
  code: z.string().min(3).max(20),
  name: z.string().min(3).max(150),
  address: z.string().min(5).max(255),
  comuna: z.number().int().min(1).max(6),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  wasteType: WasteTypeEnum,
  capacityKg: z.number().positive().default(120.0),
});
export type CreatePointInput = z.infer<typeof createPointSchema>;

export const updatePointSchema = createPointSchema.partial();
export type UpdatePointInput = z.infer<typeof updatePointSchema>;
