import { randomBytes, pbkdf2Sync, createHmac, timingSafeEqual } from "node:crypto";
import {
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  UserRole,
} from "./auth.schema.js";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  comuna: number;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AuthService {
  private hashPassword(password: string, salt: string): string {
    return pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  }

  public toSafeUser(u: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    comuna: number | null;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): SafeUser {
    return {
      id: u.id,
      name: u.name,
      email: u.email.toLowerCase(),
      phone: u.phone ?? undefined,
      role: u.role as UserRole,
      comuna: u.comuna ?? 1,
      avatarUrl: u.avatarUrl ?? undefined,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    };
  }

  public async register(data: RegisterInput): Promise<{ user: SafeUser; token: string }> {
    const normalizedEmail = data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw {
        statusCode: 409,
        code: "EMAIL_ALREADY_EXISTS",
        message: "Ya existe una cuenta registrada con este correo electrónico",
      };
    }

    const salt = randomBytes(16).toString("hex");
    const hash = this.hashPassword(data.password, salt);

    const created = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        passwordHash: `${salt}:${hash}`,
        phone: data.phone,
        role: data.role,
        comuna: data.comuna,
      },
    });

    const safeUser = this.toSafeUser(created);
    const token = this.generateToken(safeUser);

    return {
      user: safeUser,
      token,
    };
  }

  public async login(data: LoginInput): Promise<{ user: SafeUser; token: string }> {
    const normalizedEmail = data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw {
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
        message: "Correo electrónico o contraseña incorrectos",
      };
    }

    const parts = user.passwordHash.includes(":")
      ? user.passwordHash.split(":")
      : ["", user.passwordHash];
    const salt = parts[0];
    const storedHash = parts[1] || user.passwordHash;

    const computedHash = this.hashPassword(data.password, salt);
    if (computedHash !== storedHash) {
      throw {
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
        message: "Correo electrónico o contraseña incorrectos",
      };
    }

    const safeUser = this.toSafeUser(user);
    const token = this.generateToken(safeUser);

    return {
      user: safeUser,
      token,
    };
  }

  public async getById(id: string): Promise<SafeUser | null> {
    if (!UUID_REGEX.test(id)) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    return this.toSafeUser(user);
  }

  public async updateProfile(id: string, data: UpdateProfileInput): Promise<SafeUser | null> {
    if (!UUID_REGEX.test(id)) {
      return null;
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.comuna !== undefined && { comuna: data.comuna }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
    });

    return this.toSafeUser(updated);
  }

  public async syncFromDatabase(): Promise<void> {
    const count = await prisma.user.count();
    console.log(`👤 Conectados ${count} usuarios registrados en PostgreSQL.`);
  }

  public generateToken(user: Pick<SafeUser, "id" | "email" | "role" | "name">): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 días
    };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = createHmac("sha256", env.JWT_SECRET)
      .update(payloadB64)
      .digest("base64url");

    return `${payloadB64}.${signature}`;
  }

  public verifyToken(token: string): { sub: string; email: string; role: UserRole; name: string } | null {
    try {
      const [payloadB64, signature] = token.split(".");
      if (!payloadB64 || !signature) {
        return null;
      }

      const expectedSig = createHmac("sha256", env.JWT_SECRET)
        .update(payloadB64)
        .digest("base64url");

      const sigBuf = Buffer.from(signature);
      const expectedBuf = Buffer.from(expectedSig);
      if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
        return null;
      }

      const decoded = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }
      return decoded;
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
