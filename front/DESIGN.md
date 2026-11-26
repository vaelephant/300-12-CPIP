# CPIP Frontend · Design & Build Contract (V0.5)

This document is the single source of truth for anyone building pages inside `front/`.
Read it fully before writing code. The Lead owns shared infrastructure; page owners must
stay inside their assigned write scopes.

## 1. Product context

CPIP（AI 临床路径规划平台）is a private-deployment clinical pathway platform for hospitals.
Users: 医务处, 临床专家, 临床医生, 护理人员, 质控, 院长驾驶舱.
The demo must read as a real, dense, trustworthy medical enterprise product — **not** a
marketing site and **not** a static mockup. All data is synthetic: label it honestly.

Primary loop: 路径设计 → 审核发布 → 患者入径 → 个体化规划 → 人工审核 → 任务执行 → 变异处理 → 质量评价.

## 2. Visual direction — “Clinical Ledger”

- **Ink navigation rail** (`bg-ink`), **bone-paper canvas** (`bg-background`), **white cards**,
  **hairline rules** (`border-line`), generous but disciplined whitespace.
- **Palette (HCC-CIP)**: deep navy `#263343` for the navigation rail and primary actions,
  warm paper `#f6f6f4` for the canvas, white cards and hairline borders. `accent` is a pale
  steel-blue wash. **Red (`risk`) is reserved for clinical risk / blocking events**, amber
  (`warn`) for pending / unknown, muted sage (`ok`) for completed/healthy states.
  No green brand accent remains — the identity is navy / paper / hairline, matching the
  supplied product definition and header. Product name: **肝癌全病程智能诊疗平台 / HCC-CIP**.
- Typography: Inter Variable for Latin + PingFang SC for CJK; mono (`font-mono`) for codes,
  IDs, hashes, timestamps, numeric labels. Use `.label-micro` for tiny uppercase eyebrows.
  Use `.tabular` on numbers in tables/KPIs.
- Density: table rows 44px, body text 12.5–13px, card padding 16px, page padding 24px.
  Enterprise users scan data — avoid oversized type and empty space.
- Shape: radius 6–8px, flat surfaces, 1px borders, subtle `shadow-card` only. No gradients,
  no glassmorphism, no decorative blobs, no meaningless motion. Purposeful 150–250ms
  transitions on hover/selection only.
- Charts: thin strokes, hairline grids (`--line`), teal / amber / red palette, legends with
  mono numbers, no 3D, no heavy fills.
- All UI copy in **Chinese**, concise and clinical. Never invent claims; mark synthetic data.

## 3. Shell & layout conventions

`AppShell` (sidebar + topbar + footer) is already implemented. Pages render inside it.

- Page container: `<Page>` from `@/components/app/page-header` (max-w 1560, px-6 py-5).
- Every page starts with `<PageHeader module="M04 · 患者管理" title="…" description="…"
  actions={…} meta={…} />`. Module codes: M01 组织权限, M02 知识库, M03 路径设计,
  M04 患者管理, M05 入径, M06 规划, M07 执行, M08 变异, M09 模拟, M10 分析,
  M11 AI/MWM, M12 系统审计.
- Header actions: 1 primary action (`<Button size="sm">`) + secondary outline buttons.
  Add `<SyntheticTag />` where appropriate (top-right or meta row).
- Do **not** add your own top nav / sidebar / footer.
- Routes and page files are pre-wired in `src/App.tsx`. Only page components are missing.

## 4. Component inventory (already built — reuse, do not fork)

### shadcn/ui primitives — `@/components/ui/*`
`button` (variants default/secondary/outline/ghost/destructive/destructive-outline/link;
sizes xs/sm/default/lg/icon/icon-sm), `badge`, `card` (Card/CardHeader/CardTitle/
CardDescription/CardAction/CardContent/CardFooter), `input` (Input/Textarea), `label`,
`tabs`, `table`, `dialog`, `sheet` (right drawer: SheetContent/SheetHeader/SheetBody/
SheetFooter/SheetTitle/SheetDescription), `dropdown-menu` (incl. CheckboxItem, Sub),
`select`, `tooltip` (provider already in App), `progress`, `separator`, `avatar`,
`switch`, `checkbox`, `scroll-area`, `popover`, `alert-dialog`, `skeleton`, `sonner` (`toast` from `sonner`).

### App components — `@/components/app/*`
- `page-header`: `Page`, `PageHeader`, `PageMeta`
- `section`: `SectionHead`, `Callout` (tone risk/warn/info/ok/neutral), `EmptyState`, `Field`,
  `SyntheticTag`
- `stat-card`: `StatCard` (label, value, unit, delta, trend[], hint, progress, footer, inverted)
- `status-badge`: `StatusBadge` (tone ok/warn/risk/info/neutral/ink, dot, pulse), `StatusDot`
- `toolbar`: `Toolbar`, `SearchInput`, `FilterPill`, `CountBadge`
- `patient-avatar`: `PatientAvatar` (name, id, size, risk)
- `sparkline`: `Sparkline`
- `brand-mark`: `BrandMark`

### Meta / labels — `@/lib/clinical`
`NODE_META` (16 node types: label, icon, chip/bar classes, defaultRole),
`NODE_GROUPS`, `ROLE_LABELS`, `ROLE_SYSTEM_LABELS`, status meta maps with `{label, tone}`:
`PATHWAY_STATUS_META`, `VERSION_STATUS_META`, `PATIENT_STATUS_META`,
`PATIENT_SCENARIO_META`, `INSTANCE_STATUS_META`, `TASK_STATUS_META`, `PLAN_STATUS_META`,
`VARIATION_TYPE_META`, `RISK_META`, `APPROVAL_STATUS_META`.

### Utilities — `@/lib/utils`
`cn`, `fmt`, `pct` (returns “不可计算” when denominator = 0 — use it), `fmtMoney`,
`fmtDate`, `fmtTime`, `relTime`, `initials`, `hoursBetween`, `groupBy`, `sum`.

## 5. Data (all synthetic, deterministic)

Import everything from `@/data` (barrel). Key fixtures:

- `PATIENTS` (300, distribution: 正常 152 / 病情变异 58 / 超时 30 / 不符合入径 30 /
  数据缺失 20 / 退出 10), `PATIENT_SUMMARY`, `getPatient`, `getObservations`,
  `getClinicalEvents`, `getEncounters`, `PATIENT_STATE` (rich state snapshot for demo patient).
- 单病种：全部为原发性肝癌（ICD-10 C22.0），不包含其他病种。
- Demo patients: `HCC-DEMO-001 陈志远`（肝癌手术，在径，46%，INST-HCC-001）、
  `HCC-DEMO-002 王丽华`（转化治疗后手术，需重规划，INST-HCC-002）、
  `HCC-DEMO-003 李国强`（TACE，待入径，INST-HCC-003）。
- `PATHWAYS` (6), `PATHWAY_VERSIONS`, `VERSION_DIFF`, `HCC_GRAPH` / `getGraph` (nodes+edges
  with positions, rules, time constraints), `STUDIO_VALIDATION` (1 error / 2 warnings),
  `APPROVALS`, `EVIDENCE_ITEMS`, `KNOWLEDGE_DOCS`, `CLINICAL_RULES`.
- `INSTANCES`, `PLANS` (P1 active, P2 pending), `HCC_PLAN_DRAFT`, `TASKS`, `ALL_TASKS`,
  `TASK_STATS`, `TASK_EVENTS`, `VARIATIONS`, `INSTANCE_TRANSITIONS`, `TASK_TRANSITIONS`.
- `KPIS`, `TREND_SERIES`, `LOS_SERIES`, `DEPARTMENT_METRICS`, `PATHWAY_METRICS`,
  `PATHWAY_RANKING`, `VARIATION_BY_TYPE`, `ENROLLMENT_FUNNEL`, `TASK_WORKLOAD`, `LOS_BUCKETS`,
  `AUDIT_LOGS`, `PREDICTION_RECORDS`, `ADAPTER_STATUS`, `SIMULATION_SCENARIOS`,
  `SIMULATION_RESULTS`, `NOTIFICATIONS`, `LAST_SYNC`.
- Org: `ORGANIZATION`, `DEPARTMENTS`, `USERS`, `ROLES`, `PERMISSION_GROUPS`, `DEMO_ACCOUNTS`.

### Stores
- `useSessionStore` (`@/stores/session-store`): `user`, `permissions`, `has(perm)`,
  `hasAny([...])`, `loginAs(id)`, `logout()`. Use for permission-gated actions.
- `useRuntimeStore` (`@/stores/runtime-store`): tasks with real status transitions
  (`startTask`, `completeTask`, `cancelTask`, `skipTask`), `TASK_TRANSITIONS` guard →
  illegal transition returns error; surface with `toast.error(...)`.
- `useUiStore` (`@/stores/ui-store`): `period` state for analytics.
- Page-local state/Zustand stores are fine inside your own scope.

## 6. Interaction quality bar

Every page must include the states a real operator expects:

- **Loading**: simulate async for heavy actions (validate / generate plan / run simulation)
  with 600–900ms skeleton or spinner + disabled button.
- **Empty**: `EmptyState` for filters with zero rows.
- **Error / blocked**: explicit risk callouts; blocked actions explain why (toast + inline note).
- **Working filters**: tab counts, search, select filters combine; pagination when > 20 rows.
- **Row/detail drill-down**: tables open detail drawers or navigate to detail routes.
- **Keyboard/focus visible** on interactive elements.
- **Honesty**: UNKNOWN ≠ FALSE; missing data displayed as “未知/待补充”; zero denominators show
  “不可计算”; simulation/AI outputs visibly marked `SYNTHETIC` / `clinical_use = false`.
- Responsive: primary target 1440×900; degrade cleanly at 1280 and stack on smaller widths.

## 7. Ownership & rules

Lead owns: `src/App.tsx`, `src/styles/globals.css`, `src/components/ui/**`,
`src/components/app/**`, `src/data/**`, `src/types/**`, `src/lib/**`, `src/stores/session|ui|runtime`,
`src/pages/login`, `src/pages/dashboard`, `front/package.json` and configs.

Page owners may only write inside their task's `write_scopes`. Do not edit shared files or
install packages. Do not start a dev server or run `vite build` (the Lead does final builds).
If a shared primitive is missing, build a local component inside your own folder.

Verification (from `front/`): `npx tsc --noEmit -p tsconfig.app.json`
must pass for the whole app. Fix errors in your own files; ignore errors from files owned
by others (they are in progress).

Read existing stubs before overwriting. Delete the stub content entirely.

## 8. Definition of done (per page)

1. Route renders without runtime errors, with realistic demo content.
2. All tabs/filters/actions work with local state + toasts; no dead buttons.
3. Uses shared components and semantic tokens; no hard-coded hex colors.
4. Typecheck clean. No `any` unless Third-party typing requires it.
5. Chinese copy, synthetic-data labeling, and risk language are clinically responsible.

## 9. Clinical Visualization Engine (V0.5.2)

All clinical visualizations live under `src/visualization/` and must follow the engine rules:

- **Core**: `core/theme.ts` (ECharts theme + `vizPalette()` CSS-token resolver), `core/EChart.tsx`
  (init/resize/dispose wrapper), `core/VisualFrame.tsx` (chart card), `core/registry.ts` (VIS ids).
- **Tooling split**: React Flow for pathway / process graphs; Apache ECharts for data charts
  (trend, radar, donut, Sankey, heatmap, uncertainty); SVG for the journey timeline and custom clinical shapes.
- **Color**: ECharts canvas cannot resolve CSS `var()`. Always use `vizPalette()` inside chart options.
  Recharts/SVG may use CSS variables.
- **Data honesty**: every visualization that shows synthetic or model output must carry
  `SYNTHETIC` / `clinical_use = false` labels; no fake probabilities presented as real risk.
- **Interactivity**: charts must support selection / drill-down / linked cursor where relevant;
  visualizations never mutate clinical plans or bypass review.
- **Page composition**: business pages only compose engine components + frames; do not bury large
  chart option objects in page files when a reusable component is appropriate.

Flagship visuals: `pathway/LivePathwayGraph`, `timeline/PatientJourneyTimeline`,
`patient/PatientStateRadar`, `patient/ClinicalTrendLinkage`, `simulation/TrajectorySimulator`,
`process/ProcessGraph`, `knowledge/DecisionEvidenceGraph`.
