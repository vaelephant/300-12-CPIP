import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RoleKey, User } from "@/types";
import { DEMO_ACCOUNTS, USERS } from "@/data/org";
import { ROLES } from "@/data/org";
import { ROLE_SYSTEM_LABELS } from "@/lib/clinical";
import { clearBackendToken } from "@/services/http";

interface SessionState {
  user: User | null;
  permissions: string[];
  loginAs: (userId: string) => void;
  logout: () => void;
  has: (permission: string) => boolean;
  hasAny: (permissions: string[]) => boolean;
}

function resolveUser(userId: string) {
  return USERS.find((u) => u.id === userId) ?? DEMO_ACCOUNTS[0].user;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      user: null,
      permissions: [],
      loginAs: (userId) => {
        const user = resolveUser(userId);
        const role = ROLES.find((r) => r.key === user.role);
        set({ user, permissions: role?.permissions ?? [] });
      },
      logout: () => {
        clearBackendToken();
        set({ user: null, permissions: [] });
      },
      has: (permission) => get().permissions.includes(permission),
      hasAny: (permissions) => permissions.some((p) => get().permissions.includes(p)),
    }),
    { name: "cpip.session" },
  ),
);

export function useCurrentRoleLabel(): string {
  const role = useSessionStore((s) => s.user?.role);
  return role ? ROLE_SYSTEM_LABELS[role] : "未登录";
}

export function useRoleKey(): RoleKey | null {
  return useSessionStore((s) => s.user?.role ?? null);
}
