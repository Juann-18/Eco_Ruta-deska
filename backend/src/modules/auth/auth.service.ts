import { randomBytes, pbkdf2Sync, randomUUID } from "node:crypto";
import {
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  UserRole,
} from "./auth.schema.js";
import { prisma } from "../../config/prisma.js";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  phone?: string;
  role: UserRole;
  comuna: number;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type SafeUser = Omit<UserRecord, "passwordHash" | "salt">;

export class AuthService {
  private users: Map<string, UserRecord> = new Map();

  constructor() {
    this.seedDefaultUsers();
  }

  private hashPassword(password: string, salt: string): string {
    return pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  }

  private seedDefaultUsers() {
    // 1. Ciudadano (Alex, de las capturas de Home.png)
    this.createUserInternal({
      name: "Alex Ciudadano",
      email: "alex@ecoruta.com",
      password: "eco123456",
      phone: "+57 315 224 8899",
      role: "CIUDADANO",
      comuna: 1,
    }, false);

    // 2. Conductor / Recolector de EcoAseo
    this.createUserInternal({
      name: "Carlos Conductor",
      email: "conductor@ecoaseo.com",
      password: "eco123456",
      phone: "+57 312 998 7744",
      role: "RECOLECTOR",
      comuna: 1,
    }, false);

    // 3. Administrador Municipal
    this.createUserInternal({
      name: "Supervisor Municipal Tuluá",
      email: "admin@tulua.gov.co",
      password: "eco123456",
      phone: "+57 602 224 5500",
      role: "ADMIN",
      comuna: 1,
    }, false);
  }

  private createUserInternal(data: RegisterInput, persistToDb = true): UserRecord {
    const id = randomUUID();
    const salt = randomBytes(16).toString("hex");
    const passwordHash = this.hashPassword(data.password, salt);
    const now = new Date().toISOString();

    const user: UserRecord = {
      id,
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      salt,
      phone: data.phone,
      role: data.role,
      comuna: data.comuna,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(user.email, user);

    // Guardar en la base de datos de manera no bloqueante si se solicita
    if (persistToDb) {
      prisma.user
        .create({
          data: {
            id,
            name: user.name,
            email: user.email,
            passwordHash: `${salt}:${passwordHash}`,
            phone: user.phone,
            role: user.role,
            comuna: user.comuna,
          },
        })
        .catch(() => {});
    }

    return user;
  }

  public toSafeUser(user: UserRecord): SafeUser {
    const { passwordHash, salt, ...safe } = user;
    return safe;
  }

  public register(data: RegisterInput): { user: SafeUser; token: string } {
    const existing = this.users.get(data.email.toLowerCase());
    if (existing) {
      throw {
        statusCode: 409,
        code: "EMAIL_ALREADY_EXISTS",
        message: "Ya existe una cuenta registrada con este correo electrónico",
      };
    }

    const created = this.createUserInternal(data);
    const token = this.generateToken(created);

    return {
      user: this.toSafeUser(created),
      token,
    };
  }

  public login(data: LoginInput): { user: SafeUser; token: string } {
    const user = this.users.get(data.email.toLowerCase());
    if (!user) {
      throw {
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
        message: "Correo electrónico o contraseña incorrectos",
      };
    }

    const computedHash = this.hashPassword(data.password, user.salt);
    if (computedHash !== user.passwordHash) {
      throw {
        statusCode: 401,
        code: "INVALID_CREDENTIALS",
        message: "Correo electrónico o contraseña incorrectos",
      };
    }

    const token = this.generateToken(user);
    return {
      user: this.toSafeUser(user),
      token,
    };
  }

  public getById(id: string): SafeUser | null {
    for (const u of this.users.values()) {
      if (u.id === id) {
        return this.toSafeUser(u);
      }
    }
    return null;
  }

  public updateProfile(id: string, data: UpdateProfileInput): SafeUser | null {
    for (const u of this.users.values()) {
      if (u.id === id) {
        if (data.name) u.name = data.name;
        if (data.phone) u.phone = data.phone;
        if (data.comuna) u.comuna = data.comuna;
        if (data.avatarUrl) u.avatarUrl = data.avatarUrl;
        u.updatedAt = new Date().toISOString();

        prisma.user
          .update({
            where: { id },
            data: {
              ...(data.name && { name: data.name }),
              ...(data.phone && { phone: data.phone }),
              ...(data.comuna !== undefined && { comuna: data.comuna }),
              ...(data.avatarUrl && { avatarUrl: data.avatarUrl }),
            },
          })
          .catch(() => {});

        return this.toSafeUser(u);
      }
    }
    return null;
  }

  public async syncFromDatabase(): Promise<void> {
    try {
      const dbUsers = await prisma.user.findMany();
      if (dbUsers.length > 0) {
        for (const u of dbUsers) {
          const parts = u.passwordHash.includes(":")
            ? u.passwordHash.split(":")
            : ["", u.passwordHash];
          const salt = parts[0];
          const hash = parts[1] || u.passwordHash;
          this.users.set(u.email.toLowerCase(), {
            id: u.id,
            name: u.name,
            email: u.email.toLowerCase(),
            passwordHash: hash,
            salt,
            phone: u.phone ?? undefined,
            role: u.role as UserRole,
            comuna: u.comuna ?? 1,
            avatarUrl: u.avatarUrl ?? undefined,
            createdAt: u.createdAt.toISOString(),
            updatedAt: u.updatedAt.toISOString(),
          });
        }
        console.log(`👤 Sincronizados ${dbUsers.length} usuarios desde PostgreSQL.`);
      }
    } catch {
      // Si la base de datos no está disponible, continúa con datos en memoria
    }
  }

  public generateToken(user: UserRecord): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 días
    };
    return Buffer.from(JSON.stringify(payload)).toString("base64url");
  }

  public verifyToken(token: string): { sub: string; email: string; role: UserRole; name: string } | null {
    try {
      const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf-8"));
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
