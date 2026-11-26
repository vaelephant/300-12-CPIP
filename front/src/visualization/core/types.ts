// ---------------------------------------------------------------------------
// Clinical Visualization Engine · 公共类型
// ---------------------------------------------------------------------------

export type TimeScale = "day" | "week" | "month" | "year";

export type PathwayNodeVisualState =
  | "completed"
  | "active"
  | "variant"
  | "pending"
  | "blocked"
  | "unknown"
  | "not_selected";

export type EventLane = "assess" | "exam" | "lab" | "surgery" | "medication" | "nursing" | "followup";

export type ClinicalEventCategory =
  | "ADMISSION"
  | "EXAM"
  | "LAB"
  | "SURGERY"
  | "MEDICATION"
  | "NURSING"
  | "ASSESSMENT"
  | "CONSULT"
  | "DECISION";

export interface JourneyEvent {
  id: string;
  day: number;
  at: string;
  lane: EventLane;
  category: ClinicalEventCategory;
  title: string;
  description: string;
  source: string;
  severity?: "INFO" | "WARN" | "RISK";
  evidenceRef?: string;
}

export interface ReplayDecision {
  id: string;
  day: number;
  at: string;
  title: string;
  detail: string;
  actor: string;
  evidenceRefs: string[];
}

export interface StateDimension {
  key: string;
  label: string;
  value: number;
}

export interface ReplaySnapshot {
  day: number;
  label: string;
  date: string;
  stage: string;
  stageIndex: number;
  state: StateDimension[];
  labs: { afp: number; alt: number; alb: number; tbil: number; crp: number };
  nodeStates: Record<string, PathwayNodeVisualState>;
  eventIds: string[];
  decisionIds: string[];
  prediction: { burden: number; low: number; high: number };
}

export interface PatientStateRadarData {
  dimension: string;
  admission: number;
  current: number;
  reference: number;
}

export interface MultimodalMetric {
  key: string;
  label: string;
  unit: string;
  color: string;
  refLow: number;
  refHigh: number;
  values: number[];
}

export interface MultimodalEventMarker {
  index: number;
  label: string;
  kind: "surgery" | "medication" | "imaging" | "consult" | "discharge";
}

export interface TrajectoryPoint {
  day: number;
  value: number;
  low: number;
  high: number;
}

export interface TrajectoryPath {
  key: "A" | "B" | "C";
  label: string;
  description: string;
  color: string;
  points: TrajectoryPoint[];
}

export interface TrajectoryDataset {
  horizon: 30 | 90 | 180;
  paths: TrajectoryPath[];
  actual: { day: number; value: number }[];
  interventions: { day: number; label: string; kind: "surgery" | "discharge" | "followup" }[];
  model: {
    id: string;
    version: string;
    provider: string;
    applicability: string;
    clinicalUse: false;
    trainedOn: string;
    note: string;
  };
}

export interface ProcessNode {
  id: string;
  label: string;
  type: "start" | "activity" | "decision" | "end" | "deviation";
  count: number;
  avgWaitMin: number;
  deviationRate: number;
  x: number;
  y: number;
}

export interface ProcessEdge {
  id: string;
  source: string;
  target: string;
  count: number;
  conformance: "COMPLIANT" | "DEVIATION";
  waitMin: number;
}

export interface VisualizationMeta {
  id: string;
  name: string;
  en: string;
  phase: 1 | 2 | 3;
  status: "ready" | "planned" | "prototype";
  description: string;
  href?: string;
}
