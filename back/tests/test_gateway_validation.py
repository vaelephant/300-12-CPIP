from __future__ import annotations

from app.services.pathways import validate_pathway


def _node(key: str, type_: str, **kwargs):
    return {"node_key": key, "type": type_, "name": key, "stage": "S", "required": True, "responsible_role": "DOCTOR", **kwargs}


def _rules():
    return [{"rule_id": "RULE-001", "version": "1.2.0", "binding": "ADMISSION"}]


def test_and_gateway_rejects_condition_edges():
    graph = {
        "nodes": [_node("start", "START"), _node("split", "TREATMENT", gateway_type="AND"), _node("a", "TREATMENT"), _node("b", "TREATMENT"), _node("end", "END")],
        "edges": [
            {"source": "start", "target": "split", "kind": "SEQUENCE"},
            {"source": "split", "target": "a", "kind": "PARALLEL"},
            {"source": "split", "target": "b", "kind": "CONDITIONAL", "condition": "RULE-004 = TRUE"},
            {"source": "a", "target": "end", "kind": "SEQUENCE"},
            {"source": "b", "target": "end", "kind": "SEQUENCE"},
        ],
    }
    result = validate_pathway(graph, _rules())
    assert result["passed"] is False
    assert any(error["code"] in {"AND_GATEWAY_CONDITION", "CONDITION_RULE_VERSION"} for error in result["errors"])


def test_unsupported_join_policy_is_rejected():
    graph = {
        "nodes": [_node("start", "START"), _node("join", "TREATMENT", join_policy="ANY"), _node("end", "END")],
        "edges": [
            {"source": "start", "target": "join", "kind": "SEQUENCE"},
            {"source": "join", "target": "end", "kind": "SEQUENCE"},
        ],
    }
    result = validate_pathway(graph, _rules())
    assert result["passed"] is False
    assert any(error["code"] == "UNSUPPORTED_JOIN_POLICY" for error in result["errors"])
