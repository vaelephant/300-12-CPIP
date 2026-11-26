from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace

from app.services.graph_execution import select_execution
from app.services.rules import RuleContext

NOW = datetime(2026, 11, 26, 4, 0, tzinfo=UTC)


def _node(key: str, type_: str = "TREATMENT") -> dict:
    return {"node_key": key, "type": type_, "name": key, "stage": "S", "required": True}


def _context(icg: float | None, unit: str | None = "%") -> RuleContext:
    observations = {}
    if icg is not None:
        observations["ICG_R15"] = SimpleNamespace(
            id="OBS-ICG", value_status="KNOWN", value_num=icg, unit=unit, occurred_at=NOW, recorded_at=NOW
        )
    return RuleContext(
        patient=SimpleNamespace(diagnosis_code="C22.0"),
        snapshot={
            "as_of": NOW.isoformat(),
            "missing_fields": [],
            "tumor": {"max_diameter_mm": 20, "number": 1, "vascular_invasion": False, "extrahepatic_metastasis": False},
            "liver_reserve": {"child_pugh": "A"},
            "performance_status": {"ecog": 0},
        },
        observations=observations,
        as_of=NOW,
        observation_refs=set(),
        ruleset_version="HCC-RULES-0.6.0",
    )


def _branch_graph() -> dict:
    return {
        "nodes": [_node("start", "START"), _node("decision", "DECISION"), _node("surgery"), _node("conversion"), _node("end", "END")],
        "edges": [
            {"edge_id": "e1", "source": "start", "target": "decision", "kind": "SEQUENCE"},
            {"edge_id": "e2", "source": "decision", "target": "surgery", "kind": "CONDITIONAL", "condition": {"rule_id": "RULE-004", "version": "1.3.0", "expected_result": "TRUE"}},
            {"edge_id": "e3", "source": "decision", "target": "conversion", "kind": "CONDITIONAL", "condition": {"rule_id": "RULE-004", "version": "1.3.0", "expected_result": "FALSE"}},
            {"edge_id": "e4", "source": "surgery", "target": "end", "kind": "SEQUENCE"},
            {"edge_id": "e5", "source": "conversion", "target": "end", "kind": "SEQUENCE"},
        ],
    }


def test_conditional_branch_true_and_false():
    graph = _branch_graph()
    true_result = select_execution(graph, _context(12.4))
    assert true_result.blocked is False
    assert "surgery" in true_result.selected_nodes
    assert "conversion" not in true_result.selected_nodes
    false_result = select_execution(graph, _context(20.0))
    assert false_result.blocked is False
    assert "conversion" in false_result.selected_nodes
    assert "surgery" not in false_result.selected_nodes


def test_unknown_condition_blocks_downstream():
    graph = _branch_graph()
    result = select_execution(graph, _context(12.4, unit="mg"))
    assert result.blocked is True
    assert "decision" in result.selected_nodes
    assert "surgery" not in result.selected_nodes
    assert "conversion" not in result.selected_nodes
    assert any(entry["result"] == "UNKNOWN" for entry in result.trace["edges"])


def test_default_branch_is_used_only_when_no_condition_matches():
    graph = {
        "nodes": [_node("start", "START"), _node("decision", "DECISION"), _node("a"), _node("b"), _node("end", "END")],
        "edges": [
            {"edge_id": "1", "source": "start", "target": "decision", "kind": "SEQUENCE"},
            {"edge_id": "2", "source": "decision", "target": "a", "kind": "CONDITIONAL", "condition": {"rule_id": "RULE-004", "version": "1.3.0", "expected_result": "TRUE"}},
            {"edge_id": "3", "source": "decision", "target": "b", "kind": "SEQUENCE", "is_default": True},
            {"edge_id": "4", "source": "a", "target": "end", "kind": "SEQUENCE"},
            {"edge_id": "5", "source": "b", "target": "end", "kind": "SEQUENCE"},
        ],
    }
    result = select_execution(graph, _context(20.0))
    assert result.blocked is False
    assert "b" in result.selected_nodes
    assert "a" not in result.selected_nodes


def test_parallel_fanout_selects_both_paths():
    graph = {
        "nodes": [
            _node("start", "START"),
            {**_node("split"), "gateway_type": "AND"},
            _node("a"),
            _node("b"),
            {**_node("join"), "join_policy": "ALL_ACTIVE"},
            _node("end", "END"),
        ],
        "edges": [
            {"edge_id": "1", "source": "start", "target": "split", "kind": "SEQUENCE"},
            {"edge_id": "2", "source": "split", "target": "a", "kind": "PARALLEL"},
            {"edge_id": "3", "source": "split", "target": "b", "kind": "PARALLEL"},
            {"edge_id": "4", "source": "a", "target": "join", "kind": "SEQUENCE"},
            {"edge_id": "5", "source": "b", "target": "join", "kind": "SEQUENCE"},
            {"edge_id": "6", "source": "join", "target": "end", "kind": "SEQUENCE"},
        ],
    }
    result = select_execution(graph, _context(12.4))
    assert result.blocked is False
    assert {"a", "b", "join"} <= result.selected_nodes
