import { create } from "zustand";

interface UiState {
  sidebarCollapsed: boolean;
  commandOpen: boolean;
  toggleSidebar: () => void;
  setCommandOpen: (open: boolean) => void;
  period: string;
  setPeriod: (period: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  commandOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setCommandOpen: (open) => set({ commandOpen: open }),
  period: "近 30 天",
  setPeriod: (period) => set({ period }),
}));
