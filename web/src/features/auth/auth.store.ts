import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  updateProfile: (data: {
    name?: string;
    email?: string;
    phone?: string;
    comuna?: number;
    avatarUrl?: string;
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
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

      updateProfile: async (data) => {
        try {
          const res = await apiClient.patch("/users/profile", data);
          if (res.data?.data) {
            set({ user: res.data.data });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      logout: async () => {
        try {
          await apiClient.post("/auth/logout");
        } catch {
          // Ignorar error de red al salir
        }
        set({ user: null, token: null, isAuthenticated: false, error: null });
      },

      checkSession: async () => {
        const currentToken = get().token;
        if (!currentToken && !get().isAuthenticated) {
          return;
        }
        try {
          const res = await apiClient.get("/auth/me");
          if (res.data?.data) {
            set({ user: res.data.data, isAuthenticated: true });
          }
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: "eco_ruta_auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
