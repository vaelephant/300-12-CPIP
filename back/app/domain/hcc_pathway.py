"""Seed content for the first V0.6 HCC surgery pathway.

This is development seed data, not a clinically approved pathway.
"""

HCC_SURGERY_GRAPH = {
    "nodes": [
        {"node_key": "start", "type": "START", "name": "开始", "stage": "术前评估", "required": True, "responsible_role": "COORDINATOR", "time_window": None},
        {"node_key": "admission", "type": "ASSESSMENT", "name": "入院评估与病史采集", "stage": "术前评估", "required": True, "responsible_role": "DOCTOR", "time_window": {"earliest_hour": 0, "latest_hour": 4}},
        {"node_key": "imaging", "type": "EXAMINATION", "name": "上腹部增强 MRI", "stage": "术前检查", "required": True, "responsible_role": "DOCTOR", "time_window": {"earliest_hour": 4, "latest_hour": 24}, "evidence_refs": ["EV-001"]},
        {"node_key": "icg", "type": "LAB_TEST", "name": "ICG 清除试验", "stage": "术前检查", "required": True, "responsible_role": "DOCTOR", "time_window": {"earliest_hour": 12, "latest_hour": 36}},
        {"node_key": "mdt", "type": "CONSULTATION", "name": "MDT 讨论", "stage": "治疗方案确认", "required": True, "responsible_role": "DOCTOR", "time_window": {"earliest_hour": 24, "latest_hour": 48}, "evidence_refs": ["EV-007"]},
        {"node_key": "decision", "type": "DECISION", "name": "手术指征判断", "stage": "治疗方案确认", "required": True, "responsible_role": "SURGEON", "time_window": None},
        {"node_key": "surgery", "type": "SURGERY", "name": "肝段切除术", "stage": "手术及术后", "required": True, "responsible_role": "SURGEON", "time_window": {"earliest_hour": 48, "latest_hour": 96}, "evidence_refs": ["EV-002"]},
        {"node_key": "discharge", "type": "ASSESSMENT", "name": "出院标准评估", "stage": "出院与随访", "required": True, "responsible_role": "DOCTOR", "time_window": None},
        {"node_key": "end", "type": "END", "name": "结束", "stage": "出院与随访", "required": True, "responsible_role": "COORDINATOR", "time_window": None},
    ],
    "edges": [
        {"source": "start", "target": "admission", "kind": "SEQUENCE"},
        {"source": "admission", "target": "imaging", "kind": "SEQUENCE"},
        {"source": "admission", "target": "icg", "kind": "SEQUENCE"},
        {"source": "imaging", "target": "mdt", "kind": "SEQUENCE"},
        {"source": "icg", "target": "mdt", "kind": "SEQUENCE"},
        {"source": "mdt", "target": "decision", "kind": "SEQUENCE"},
        {"source": "decision", "target": "surgery", "kind": "CONDITIONAL", "condition": "RULE-004 = TRUE"},
        {"source": "surgery", "target": "discharge", "kind": "SEQUENCE"},
        {"source": "discharge", "target": "end", "kind": "SEQUENCE"},
    ],
}

HCC_SURGERY_RULES = [
    {"rule_id": "RULE-001", "version": "1.2.0", "binding": "ADMISSION"},
    {"rule_id": "RULE-002", "version": "1.1.0", "binding": "EXCLUSION"},
    {"rule_id": "RULE-003", "version": "1.0.3", "binding": "COMPLETENESS"},
    {"rule_id": "RULE-005", "version": "1.0.0", "binding": "SAFETY"},
]
