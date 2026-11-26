from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta
from typing import Any

from app.domain.models import PathwayInstance, PathwayVersion, Plan, Task


def generate_plan_tasks(
    *,
    plan: Plan,
    instance: PathwayInstance,
    version: PathwayVersion,
    snapshot_missing_fields: list[str],
) -> list[Task]:
    graph = json.loads(version.graph_json)
    nodes = {node["node_key"]: node for node in graph.get("nodes", []) if "node_key" in node}
    incoming: dict[str, list[str]] = {key: [] for key in nodes}
    for edge in graph.get("edges", []):
        source, target = edge.get("source"), edge.get("target")
        if source in nodes and target in nodes:
            incoming.setdefault(target, []).append(source)

    included = [key for key, node in nodes.items() if node.get("type") not in {"START", "END"}]
    node_to_task: dict[str, str] = {key: f"T-{uuid.uuid4().hex[:12].upper()}" for key in included}
    tasks: list[Task] = []
    for node_key in included:
        node = nodes[node_key]
        predecessors = [p for p in incoming.get(node_key, []) if p in node_to_task]
        deps = [node_to_task[p] for p in predecessors]
        window = node.get("time_window") or {}
        earliest = None
        due = None
        if window.get("earliest_hour") is not None:
            earliest = instance.enrolled_at + timedelta(hours=float(window["earliest_hour"]))
        if window.get("latest_hour") is not None:
            due = instance.enrolled_at + timedelta(hours=float(window["latest_hour"]))
        tasks.append(
            Task(
                id=node_to_task[node_key],
                plan_id=plan.id,
                instance_id=instance.id,
                patient_id=instance.patient_id,
                node_key=node_key,
                name=node.get("name") or node_key,
                stage=node.get("stage") or "未分阶段",
                role=node.get("responsible_role") or "DOCTOR",
                required=bool(node.get("required", True)),
                depends_on_json=json.dumps(deps),
                earliest_start_at=earliest,
                due_at=due,
                status="PENDING",
                assignee=None,
                row_version=1,
            )
        )
    return tasks


def plan_summary(version: PathwayVersion, task_count: int, missing_fields: list[str]) -> str:
    base = f"基于 {version.version} 生成的个体化计划，共 {task_count} 项任务。"
    if missing_fields:
        base += f" 快照缺失字段 {len(missing_fields)} 项，按 UNKNOWN 处理。"
    return base
