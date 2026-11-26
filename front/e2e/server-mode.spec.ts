import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const API = "http://127.0.0.1:8000/api/v1";

async function apiLogin(request: APIRequestContext, employeeNo: string, password = "cpip-demo") {
  const response = await request.post(`${API}/auth/login`, { data: { employee_no: employeeNo, password } });
  expect(response.status()).toBe(200);
  const body = await response.json();
  return { Authorization: `Bearer ${body.access_token}` } as Record<string, string>;
}

async function prepareWorkflow(request: APIRequestContext) {
  const clinician = await apiLogin(request, "RH0236");
  const expert = await apiLogin(request, "RH0218");
  const snapshots = await request.post(`${API}/patients/HCC-DEMO-001/snapshots`, {
    headers: clinician,
    data: {
      as_of: new Date().toISOString(),
      staging: { system: "CNLC", version: "2024", value: "Ⅰb" },
      liver_reserve: { child_pugh: "A", albi: -2.41 },
      performance_status: { ecog: 0 },
      tumor: {
        max_diameter_mm: 32,
        number: 1,
        location: "肝右叶 S6 段",
        vascular_invasion: false,
        extrahepatic_metastasis: false,
      },
      observation_refs: ["OBS-AFP-001", "OBS-INR-001", "OBS-PLT-001", "OBS-ICG-001", "OBS-MRI-001", "OBS-NRS-002"],
      missing_fields: [],
      ruleset_version: "HCC-RULES-0.6.0",
    },
  });
  expect(snapshots.status()).toBe(201);
  const snapshot = await snapshots.json();
  const evaluation = await request.post(`${API}/enrollment/evaluate`, {
    headers: clinician,
    data: { patient_id: "HCC-DEMO-001", snapshot_id: snapshot.snapshot_id, pathway_version_id: "PV-HCC-130" },
  });
  expect(evaluation.status()).toBe(200);
  const evaluationBody = await evaluation.json();
  const instance = await request.post(`${API}/instances`, {
    headers: clinician,
    data: {
      patient_id: "HCC-DEMO-001",
      pathway_version_id: "PV-HCC-130",
      enrollment_evaluation_id: evaluationBody.evaluation_id,
      doctor_confirmed: true,
    },
  });
  // A previous E2E run may have consumed this exact evaluation; find a fresh instance instead.
  if (instance.status() !== 201) {
    const overview = await request.get(`${API}/patients/overview`, { headers: clinician });
    const data = await overview.json();
    const patient = data.items.find((item: { patient_id: string }) => item.patient_id === "HCC-DEMO-001");
    return { instanceId: patient.instance_id as string };
  }
  const instanceBody = await instance.json();
  const plan = await request.post(`${API}/instances/${instanceBody.instance_id}/plans`, {
    headers: clinician,
    data: { snapshot_id: snapshot.snapshot_id, ruleset_version: "HCC-RULES-0.6.0" },
  });
  expect(plan.status()).toBe(201);
  const planBody = await plan.json();
  await request.post(`${API}/plans/${planBody.plan_id}/submit`, { headers: clinician });
  await request.post(`${API}/plans/${planBody.plan_id}/approve`, { headers: expert, data: { comment: "browser e2e" } });
  const activated = await request.post(`${API}/plans/${planBody.plan_id}/activate`, { headers: clinician });
  expect(activated.status(), await activated.text()).toBe(200);
  return { instanceId: instanceBody.instance_id as string };
}

async function loginUi(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /登录工作台/ }).click();
  await page.waitForURL("**/dashboard");
}

test("server mode login, patient, detail, pathways, tasks, planning", async ({ page, request }) => {
  const { instanceId } = await prepareWorkflow(request);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await loginUi(page);
  await page.goto("/patients");
  await expect(page.getByText("后端 API")).toBeVisible();
  await expect(page.getByText("陈志远").first()).toBeVisible();

  await page.goto("/patients/HCC-DEMO-001");
  await expect(page.getByText("BACKEND AGGREGATE")).toBeVisible();
  await expect(page.getByText("专病评估")).toBeVisible();
  await expect(page.getByText("观测记录")).toBeVisible();

  await page.goto("/pathways");
  await expect(page.getByText("FastAPI · SQLite")).toBeVisible();
  await expect(page.getByText("肝癌手术临床路径").first()).toBeVisible();
  await page.locator("tbody tr").first().click();
  await expect(page.getByText("规则绑定")).toBeVisible();

  await page.goto("/tasks");
  await expect(page.getByText("后端工作队列")).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();

  await page.goto(`/planning/${instanceId}`);
  await expect(page.getByText("后端计划视图")).toBeVisible();
  await expect(page.getByText(/ACTIVE|生效中/).first()).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test("401 clears server session and returns to login", async ({ page, request }) => {
  await prepareWorkflow(request);
  await loginUi(page);
  await page.evaluate(() => window.localStorage.setItem("hcc-cip.backend-token", "invalid-token"));
  await page.goto("/patients");
  await page.waitForURL("**/login", { timeout: 15_000 });
  await expect(page.getByRole("button", { name: /登录工作台/ })).toBeVisible();
  const token = await page.evaluate(() => window.localStorage.getItem("hcc-cip.backend-token"));
  expect(token).toBeNull();
});

test("server 403 is shown without local data fallback", async ({ page, request }) => {
  await prepareWorkflow(request);
  await loginUi(page);
  await page.goto("/patients/HCC-DEMO-INTERV-001");
  await expect(page.getByText("无法读取患者详情")).toBeVisible();
  await expect(page).toHaveURL(/\/patients\/HCC-DEMO-INTERV-001$/);
});

test("server login failure does not create a local session", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/工号/).fill("RH0236");
  await page.getByLabel(/密码/).fill("wrong-password");
  await page.getByRole("button", { name: /登录工作台/ }).click();
  await expect(page.getByText("登录失败")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  const token = await page.evaluate(() => window.localStorage.getItem("hcc-cip.backend-token"));
  expect(token).toBeNull();
});

test("server mode variations and follow-up pages show backend records", async ({ page, request }) => {
  const { instanceId } = await prepareWorkflow(request);
  const clinician = await apiLogin(request, "RH0236");
  const variation = await request.post(`${API}/variations`, {
    headers: clinician,
    data: {
      patient_id: "HCC-DEMO-001",
      instance_id: instanceId,
      type: "TIME",
      severity: "MEDIUM",
      title: "术后首次下床延迟",
      description: "浏览器 E2E 合成变异",
      affected_nodes: ["postop_mobilization"],
      source: "E2E",
    },
  });
  expect(variation.status()).toBe(201);
  const followup = await request.post(`${API}/followups`, {
    headers: clinician,
    data: {
      patient_id: "HCC-DEMO-001",
      instance_id: instanceId,
      window_start: new Date().toISOString(),
      window_end: new Date(Date.now() + 7 * 86400000).toISOString(),
      channel: "PHONE",
      consent_status: "GRANTED",
      owner: "赵倩",
      risk_level: "MEDIUM",
    },
  });
  expect(followup.status()).toBe(201);

  await loginUi(page);
  await page.goto("/variations");
  await expect(page.getByText("变异列表")).toBeVisible();
  await expect(page.getByText("术后首次下床延迟").first()).toBeVisible();
  await page.goto("/followups");
  await expect(page.getByRole("heading", { name: "随访计划" })).toBeVisible();
  await expect(page.getByText("HCC-DEMO-001").first()).toBeVisible();
});

test("server mode analytics renders backend aggregate metrics for medical affairs", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/工号/).fill("RH0102");
  await page.getByLabel(/密码/).fill("cpip-demo");
  await page.getByRole("button", { name: /登录工作台/ }).click();
  await page.waitForURL("**/dashboard");
  await page.goto("/analytics");
  await expect(page.getByText("质量与运营指标")).toBeVisible();
  await expect(page.getByText("HCC 合成患者")).toBeVisible();
  await expect(page.getByText("指标定义与分母")).toBeVisible();
});
