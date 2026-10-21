import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/ecoruta?schema=public"),
  JWT_SECRET: z.string().default("eco_ruta_super_secret_jwt_key_2026"),
  REFRESH_TOKEN_SECRET: z.string().default("eco_ruta_super_secret_refresh_key_2026"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

export const env = envSchema.parse(process.env);
