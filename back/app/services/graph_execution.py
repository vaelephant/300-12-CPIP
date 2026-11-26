from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

from app.services.rules import RuleContext, Tri, evaluate_rule

_CONDITION_RE = re.compile(r"^\s*([A-Za-z0-9_-]+)\s*=\s*(TRUE|FALSE|UNKNOWN)\s*$")


@dataclass
class PathSelection:
    selected_nodes: set[str] = field(default_factory=set)
    selected_edges: list[dict[str, Any]] = field(default_factory=list)
    trace: dict[str, Any] = field(default_factory=dict)
    blocked: bool = False
    block_reason: str | None = None


def _edge_id(index: int, edge: dict[str, Any]) -> str:
    return str(edge.get("edge_id") or f"E{index + 1:03d}-{edge.get('source')}-{edge.get('target')}")


def parse_condition(edge: dict[str, Any]) -> tuple[str, str, str] | None:
    raw = edge.get("condition")
    if isinstance(raw, dict):
        rule_id = str(raw.get("rule_id") or "")
        version = str(raw.get("version") or "")
        expected = str(raw.get("expected_result") or "").upper()
        if rule_id and version and expected in {"TRUE", "FALSE", "UNKNOWN"}:
            return rule_id, version, expected
        return None
    if isinstance(raw, str):
        match = _CONDITION_RE.match(raw)
        if not match:
            return None
        from app.services.rules import SUPPORTED_RULES

        rule_id, expected = match.group(1), match.group(2)
        version = SUPPORTED_RULES.get(rule_id, "")
        return rule_id, version, expected
    return None


def _evaluate(edge: dict[str, Any], ctx: RuleContext) -> tuple[Tri, str]:
    parsed = parse_condition(edge)
    if parsed is None:
        return Tri.FALSE, "条件表达式无效"
    rule_id, version, expected = parsed
    outcome = evaluate_rule(ctx, rule_id, version)
    if outcome.result == Tri.UNKNOWN:
        return Tri.UNKNOWN, f"{rule_id}@{version} = UNKNOWN，期望 {expected}"
    matched = outcome.result.value == expected
    return (Tri.TRUE if matched else Tri.FALSE), f"{rule_id}@{version} = {outcome.result.value}，期望 {expected}"


def select_execution(graph: dict[str, Any], ctx: RuleContext) -> PathSelection:
    """Select the executable DAG slice for a frozen snapshot/rule context.

    V0.6.1 scope: DAG only. AND fan-out is represented by multiple selected
    outgoing edges; joins wait only on selected predecessors. Unknown conditions
    block the gateway and all downstream nodes instead of defaulting to FALSE.
    """
    nodes = {node.get("node_key"): node for node in graph.get("nodes", []) if node.get("node_key")}
    edges = list(graph.get("edges", []))
    outgoing: dict[str, list[tuple[int, dict[str, Any]]]] = {}
    for index, edge in enumerate(edges):
        outgoing.setdefault(str(edge.get("source")), []).append((index, edge))
    starts = [key for key, node in nodes.items() if node.get("type") == "START"]
    selection = PathSelection(
        trace={
            "graph_hash": None,
            "rule_version": ctx.ruleset_version,
            "snapshot_as_of": ctx.as_of.isoformat() if ctx.as_of else None,
            "nodes": [],
            "edges": [],
            "blocked": False,
            "block_reason": None,
        }
    )
    if len(starts) != 1:
        selection.blocked = True
        selection.block_reason = "路径必须恰好有一个开始节点"
        selection.trace["blocked"] = True
        selection.trace["block_reason"] = selection.block_reason
        return selection
    queue = [starts[0]]
    visited: set[str] = set()
    while queue:
        node_key = queue.pop(0)
        if node_key in visited:
            continue
        visited.add(node_key)
        selection.selected_nodes.add(node_key)
        selection.trace["nodes"].append(node_key)
        node = nodes.get(node_key) or {}
        gateway = node.get("gateway_type")
        if gateway is None and node.get("type") == "DECISION":
            gateway = "XOR"
        candidates = outgoing.get(node_key, [])
        if gateway == "AND":
            if any(edge.get("condition") is not None for _, edge in candidates):
                selection.blocked = True
                selection.block_reason = f"AND 网关 {node_key} 不允许条件边"
                continue
            chosen_and = [(idx, edge, "AND 并行") for idx, edge in candidates]
            for index, edge, reason in chosen_and:
                target = str(edge.get("target"))
                selection.selected_edges.append(edge)
                selection.trace["edges"].append({"edge_id": _edge_id(index, edge), "source": edge.get("source"), "target": target, "result": "TRUE", "reason": reason})
                if target in nodes and target not in visited:
                    queue.append(target)
            continue
        if not candidates:
            if node.get("type") != "END":
                selection.blocked = True
                selection.block_reason = f"节点 {node_key} 没有可用出边"
            continue
        conditional: list[tuple[int, dict[str, Any], Tri, str]] = []
        unconditional: list[tuple[int, dict[str, Any]]] = []
        defaults: list[tuple[int, dict[str, Any]]] = []
        for index, edge in candidates:
            if edge.get("condition") is None:
                if edge.get("is_default") is True:
                    defaults.append((index, edge))
                else:
                    unconditional.append((index, edge))
            else:
                result, reason = _evaluate(edge, ctx)
                conditional.append((index, edge, result, reason))
        chosen: list[tuple[int, dict[str, Any], str]] = []
        if conditional:
            unknown = [(idx, edge, reason) for idx, edge, result, reason in conditional if result == Tri.UNKNOWN]
            true_edges = [(idx, edge, reason) for idx, edge, result, reason in conditional if result == Tri.TRUE]
            if unknown:
                selection.blocked = True
                selection.block_reason = "条件规则为 UNKNOWN，禁止下游执行"
                selection.trace["edges"].extend(
                    {
                        "edge_id": _edge_id(idx, edge),
                        "source": edge.get("source"),
                        "target": edge.get("target"),
                        "result": "UNKNOWN",
                        "reason": reason,
                    }
                    for idx, edge, reason in unknown
                )
                continue
            if len(true_edges) > 1:
                selection.blocked = True
                selection.block_reason = "XOR 网关出现多个 TRUE 分支，配置冲突"
                continue
            if true_edges:
                chosen.extend(true_edges)
            elif defaults:
                chosen.extend((idx, edge, "默认分支") for idx, edge in defaults)
            else:
                selection.blocked = True
                selection.block_reason = "条件无匹配分支且无显式默认边"
                continue
            # Non-default unconditional edges are true concurrency/parallel paths.
            chosen.extend((idx, edge, "无条件边") for idx, edge in unconditional)
        else:
            chosen = [(idx, edge, "无条件边") for idx, edge in unconditional + defaults]
        if not chosen:
            selection.blocked = True
            selection.block_reason = f"节点 {node_key} 无匹配出边"
            continue
        for index, edge, reason in chosen:
            target = str(edge.get("target"))
            selection.selected_edges.append(edge)
            selection.trace["edges"].append(
                {
                    "edge_id": _edge_id(index, edge),
                    "source": edge.get("source"),
                    "target": target,
                    "result": "TRUE",
                    "reason": reason,
                }
            )
            if target in nodes and target not in visited:
                queue.append(target)
    selection.trace["blocked"] = selection.blocked
    selection.trace["block_reason"] = selection.block_reason
    return selection
