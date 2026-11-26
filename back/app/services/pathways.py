from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from typing import Any

NODE_TYPES = {
    "START",
    "END",
    "ASSESSMENT",
    "EXAMINATION",
    "LAB_TEST",
    "CONSULTATION",
    "DECISION",
    "SURGERY",
    "TREATMENT",
    "MEDICATION",
    "NURSING",
    "FOLLOW_UP",
}
ROLES = {"DOCTOR", "SURGEON", "NURSE", "ANESTHESIOLOGIST", "COORDINATOR"}
RULE_BINDINGS = {"ADMISSION", "EXCLUSION", "BRANCH", "SAFETY", "COMPLETENESS"}
SUPPORTED_RULES = {
    "RULE-001": "1.2.0",
    "RULE-002": "1.1.0",
    "RULE-003": "1.0.3",
    "RULE-004": "1.3.0",
    "RULE-005": "1.0.0",
    "RULE-008": "2.0.0",
    "RULE-009": "1.1.0",
    "RULE-010": "1.0.0",
}


def content_hash(graph: dict[str, Any], rules: list[dict[str, Any]]) -> str:
    payload = json.dumps({"graph": graph, "rules": rules}, ensure_ascii=False, sort_keys=True)
    return "sha256:" + hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _reachable(start: str, adjacency: dict[str, list[str]], nodes: set[str]) -> set[str]:
    seen: set[str] = set()
    stack = [start]
    while stack:
        current = stack.pop()
        if current in seen:
            continue
        seen.add(current)
        stack.extend(adjacency.get(current, []))
    return seen


def _has_cycle(adjacency: dict[str, list[str]], nodes: set[str]) -> bool:
    state: dict[str, int] = {}

    def visit(node: str) -> bool:
        if state.get(node) == 1:
            return True
        if state.get(node) == 2:
            return False
        state[node] = 1
        for nxt in adjacency.get(node, []):
            if nxt in nodes and visit(nxt):
                return True
        state[node] = 2
        return False

    return any(visit(node) for node in nodes if state.get(node, 0) == 0)


def validate_pathway(graph: dict[str, Any], rules: list[dict[str, Any]]) -> dict[str, Any]:
    errors: list[dict[str, str]] = []
    warnings: list[dict[str, str]] = []
    raw_nodes = graph.get("nodes") if isinstance(graph, dict) else None
    raw_edges = graph.get("edges") if isinstance(graph, dict) else None
    if not isinstance(raw_nodes, list) or not raw_nodes:
        return {"passed": False, "errors": [{"code": "EMPTY_GRAPH", "message": "路径至少需要一个节点"}], "warnings": []}
    if not isinstance(raw_edges, list):
        return {"passed": False, "errors": [{"code": "INVALID_EDGES", "message": "edges 必须为数组"}], "warnings": []}

    nodes: dict[str, dict[str, Any]] = {}
    for index, node in enumerate(raw_nodes):
        if not isinstance(node, dict):
            errors.append({"code": "INVALID_NODE", "message": f"节点 #{index} 不是对象"})
            continue
        key = node.get("node_key")
        if not key or not isinstance(key, str):
            errors.append({"code": "MISSING_NODE_KEY", "message": f"节点 #{index} 缺少 node_key"})
            continue
        if key in nodes:
            errors.append({"code": "DUPLICATE_NODE_KEY", "message": f"节点 key 重复：{key}", "node_key": key})
            continue
        if node.get("type") not in NODE_TYPES:
            errors.append({"code": "INVALID_NODE_TYPE", "message": f"节点 {key} 类型非法：{node.get('type')}", "node_key": key})
        if node.get("responsible_role") not in ROLES:
            errors.append({"code": "INVALID_ROLE", "message": f"节点 {key} 责任角色非法", "node_key": key})
        nodes[key] = node

    adjacency: dict[str, list[str]] = defaultdict(list)
    reverse: dict[str, list[str]] = defaultdict(list)
    edges_seen: set[tuple[str, str]] = set()
    for edge in raw_edges:
        if not isinstance(edge, dict):
            errors.append({"code": "INVALID_EDGE", "message": "边不是对象"})
            continue
        source, target = edge.get("source"), edge.get("target")
        if source not in nodes or target not in nodes:
            errors.append({"code": "EDGE_REFERENCE_INVALID", "message": f"边引用了不存在的节点：{source} -> {target}"})
            continue
        if source == target:
            errors.append({"code": "SELF_LOOP", "message": f"自环边：{source}", "node_key": source})
        if (source, target) in edges_seen:
            warnings.append({"code": "DUPLICATE_EDGE", "message": f"重复边：{source} -> {target}"})
        edges_seen.add((source, target))
        adjacency[source].append(target)
        reverse[target].append(source)
        if edge.get("kind") not in {"SEQUENCE", "CONDITIONAL", "PARALLEL"}:
            warnings.append({"code": "UNKNOWN_EDGE_KIND", "message": f"边 {source}->{target} 类型未知"})

    node_keys = set(nodes)
    starts = [key for key, node in nodes.items() if node.get("type") == "START"]
    ends = [key for key, node in nodes.items() if node.get("type") == "END"]
    if len(starts) != 1:
        errors.append({"code": "START_COUNT", "message": f"必须恰好有 1 个开始节点，当前 {len(starts)} 个"})
    if not ends:
        errors.append({"code": "END_MISSING", "message": "至少需要 1 个结束节点"})
    if len(starts) == 1:
        start = starts[0]
        reachable = _reachable(start, adjacency, node_keys)
        unreachable = node_keys - reachable
        if unreachable:
            errors.append({"code": "UNREACHABLE_NODES", "message": f"存在不可达节点：{', '.join(sorted(unreachable))}"})
    dead_ends = [key for key, node in nodes.items() if node.get("type") != "END" and not adjacency.get(key)]
    if dead_ends:
        errors.append({"code": "DEAD_END", "message": f"非结束节点没有出边：{', '.join(sorted(dead_ends))}"})
    for key, node in nodes.items():
        if node.get("type") == "START" and reverse.get(key):
            errors.append({"code": "START_INCOMING", "message": "开始节点不允许有入边", "node_key": key})
        if node.get("type") == "END" and adjacency.get(key):
            errors.append({"code": "END_OUTGOING", "message": "结束节点不允许有出边", "node_key": key})
        if node.get("type") != "START" and not reverse.get(key):
            warnings.append({"code": "NO_INCOMING", "message": f"节点 {key} 没有入边", "node_key": key})
    if _has_cycle(adjacency, node_keys):
        errors.append({"code": "CYCLE", "message": "路径图存在无界循环；V0.6 须显式审核循环或复评节点"})
    if not any(node.get("type") == "DECISION" for node in nodes.values()):
        warnings.append({"code": "NO_DECISION", "message": "路径未包含决策节点，请确认是否符合预期"})
    if any(node.get("type") == "DECISION" and len(adjacency.get(key, [])) < 2 for key, node in nodes.items()):
        warnings.append({"code": "DECISION_SINGLE_PATH", "message": "存在只有单一出边的决策节点"})

    if not rules:
        errors.append({"code": "NO_RULES", "message": "路径必须绑定规则"})
    for rule in rules:
        rule_id = str(rule.get("rule_id"))
        version = str(rule.get("version"))
        if rule.get("binding") not in RULE_BINDINGS:
            errors.append({"code": "INVALID_BINDING", "message": f"规则绑定非法：{rule_id}"})
        supported = SUPPORTED_RULES.get(rule_id)
        if supported is None:
            errors.append({"code": "RULE_NOT_REGISTERED", "message": f"规则未注册：{rule_id}"})
        elif supported != version:
            errors.append({"code": "RULE_VERSION_MISMATCH", "message": f"规则版本不支持：{rule_id}@{version}"})

    return {"passed": not errors, "errors": errors, "warnings": warnings, "content_hash": content_hash(graph, rules)}


def graph_from_json(raw: str) -> dict[str, Any]:
    return json.loads(raw)


def rules_from_json(raw: str) -> list[dict[str, Any]]:
    return json.loads(raw)
