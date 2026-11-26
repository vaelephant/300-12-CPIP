import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Pathway } from "@/types";

/**
 * 路径设计器的本地演示状态。
 * 通过「路径库 → 新建/导入」创建的模板会登记在此，使设计器与版本页可以继续访问；
 * 仅用于前端演示，刷新后由 localStorage 恢复，不写入任何真实数据源。
 */
interface StudioState {
  customPathways: Pathway[];
  addPathway: (pathway: Pathway) => void;
  reset: () => void;
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set) => ({
      customPathways: [],
      addPathway: (pathway) =>
        set((state) => ({
          customPathways: [pathway, ...state.customPathways.filter((item) => item.id !== pathway.id)],
        })),
      reset: () => set({ customPathways: [] }),
    }),
    { name: "cpip.studio-demo" },
  ),
);

/** 读取本地演示新建的路径模板（无则返回 undefined）。 */
export function useCustomPathway(id: string) {
  return useStudioStore((state) => state.customPathways.find((pathway) => pathway.id === id));
}
