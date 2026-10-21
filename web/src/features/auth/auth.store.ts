import { create } from "zustand";
import { apiClient } from "../../common/config/axios";

export type UserRole = "CIUDADANO" | "RECOLECTOR" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  comuna: number;
  phone?: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  quickLoginAs: (role: UserRole) => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Usuario por defecto inicializado como Alex Ciudadano para experiencia fluida
  user: {
    id: "usr-alex-001",
    name: "Alex Ciudadano",
    email: "alex@ecoruta.com",
    role: "CIUDADANO",
    comuna: 1,
    phone: "+57 315 224 8899",
  },
  token: "demo-token-alex",
  isAuthenticated: true,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post("/auth/login", { email, password });
      const { user, token } = res.data.data;
      set({ user, token, isAuthenticated: true, isLoading: false });
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.error || "Error al iniciar sesión";
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  register: async (name, email, password, phone) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post("/auth/register", {
        name,
        email,
        password,
        phone,
        role: "CIUDADANO",
        comuna: 1,
      });
      const { user, token } = res.data.data;
      set({ user, token, isAuthenticated: true, isLoading: false });
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.error || "Error al registrarse";
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Ignorar error de red al salir
    }
    set({ user: null, token: null, isAuthenticated: false });
  },

  quickLoginAs: async (role: UserRole) => {
    let email = "alex@ecoruta.com";
    if (role === "RECOLECTOR") email = "conductor@ecoaseo.com";
    if (role === "ADMIN") email = "admin@tulua.gov.co";

    await get().login(email, "eco123456");
  },

  checkSession: async () => {
    try {
      const res = await apiClient.get("/auth/me");
      if (res.data.data) {
        set({ user: res.data.data, isAuthenticated: true });
      }
    } catch {
      // Mantener sesión demo local
    }
  },
}));
