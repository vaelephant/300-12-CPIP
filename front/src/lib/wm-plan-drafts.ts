import type { Approval } from "@/types";

/** Demo：世界模型「待审计划草稿」落在 sessionStorage，审核中心读取合并。 */
export const WM_PLAN_DRAFTS_KEY = "hcc-cip-wm-plan-drafts";

export type WmPlanDraft = Approval & {
  source: "world-model";
  candidateId: "A" | "B" | "C";
  patientId?: string;
};

export function readWmPlanDrafts(): WmPlanDraft[] {
  try {
    const raw = sessionStorage.getItem(WM_PLAN_DRAFTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WmPlanDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushWmPlanDraft(draft: WmPlanDraft): void {
  const next = [draft, ...readWmPlanDrafts().filter((d) => d.id !== draft.id)];
  sessionStorage.setItem(WM_PLAN_DRAFTS_KEY, JSON.stringify(next.slice(0, 20)));
}
