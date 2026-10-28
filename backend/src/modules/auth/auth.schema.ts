import { z } from "zod";

export const UserRoleEnum = z.enum(["CIUDADANO", "RECOLECTOR", "ADMIN"]);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const registerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Formato de correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  phone: z.string().optional(),
  role: UserRoleEnum.default("CIUDADANO"),
  comuna: z.number().int().min(1).max(6).default(1),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Formato de correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email("Formato de correo electrónico inválido").optional(),
  phone: z.string().optional(),
  comuna: z.coerce.number().int().min(1).max(6).optional(),
  avatarUrl: z.string().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
