import type { PathwayEdge, PathwayNode } from "@/types";
import type { BackendPathwayGraphPayload } from "./types";

const ROLE_FALLBACK: Record<string, string> = {
  PHARMACIST: "COORDINATOR",
};

const TYPE_FALLBACK: Record<string, string> = {
  DIAGNOSIS: "ASSESSMENT",
  PARALLEL_SPLIT: "DECISION",
  PARALLEL_JOIN: "DECISION",
  WAIT: "ASSESSMENT",
  END: "END",
};

/** Map studio canvas nodes/edges to backend PathwayGraphIn shape. */
export function studioToBackendGraph(nodes: PathwayNode[], edges: PathwayEdge[]): BackendPathwayGraphPayload {
  const idToKey = new Map(nodes.map((node) => [node.id, node.nodeKey]));
  return {
    nodes: nodes.map((node) => {
      const type = TYPE_FALLBACK[node.type] ?? node.type;
      const role = ROLE_FALLBACK[node.responsibleRole] ?? node.responsibleRole;
      const payload: Record<string, unknown> = {
        node_key: node.nodeKey,
        type,
        name: node.name,
        stage: node.stage,
        required: node.required,
        responsible_role: role,
        time_window: node.timeConstraint
          ? {
              earliest_hour: Math.max(0, node.timeConstraint.offsetHours - (node.timeConstraint.windowBeforeHours ?? 0)),
              latest_hour: node.timeConstraint.offsetHours + (node.timeConstraint.windowAfterHours ?? 24),
            }
          : null,
      };
      if (node.evidenceRefs?.length) payload.evidence_refs = node.evidenceRefs;
      return payload;
    }),
    edges: edges
      .map((edge) => {
        const source = idToKey.get(edge.source) ?? edge.source;
        const target = idToKey.get(edge.target) ?? edge.target;
        const payload: Record<string, unknown> = {
          source,
          target,
          kind: edge.type === "PARALLEL" ? "SEQUENCE" : edge.type,
        };
        if (edge.type === "CONDITIONAL") {
          payload.condition =
            typeof edge.condition === "object" && edge.condition
              ? JSON.stringify(edge.condition)
              : edge.condition ?? "RULE-004 = TRUE";
          if (edge.isDefault) payload.is_default = true;
        }
        return payload;
      })
      .filter((edge) => edge.source && edge.target),
  };
}

export function bumpPatchVersion(version: string): string {
  const parts = version.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length >= 3 && parts.every((n) => Number.isFinite(n))) {
    parts[2] += 1;
    return parts.join(".");
  }
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) {
    return `${parts[0]}.${parts[1]}.1`;
  }
  return `${version}-draft-${Date.now().toString(36).slice(-4)}`;
}
