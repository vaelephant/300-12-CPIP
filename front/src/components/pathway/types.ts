import type { Edge, Node } from "@xyflow/react";
import type { PathwayEdge, PathwayNode, ValidationIssue } from "@/types";

/**
 * 路径设计器画布节点。
 * React Flow 的 node.data 中携带临床路径节点本体与该校验问题，
 * 便于自定义节点卡片直接呈现必做标记、时间约束与校验告警。
 */
export type StudioNodeData = {
  node: PathwayNode;
  issues: ValidationIssue[];
};

export type StudioNode = Node<StudioNodeData, "clinical">;

export type StudioEdgeData = {
  edge: PathwayEdge;
};

export type StudioEdge = Edge<StudioEdgeData>;

/** 路径图 fixture 中节点 ID 固定为 `node-${nodeKey}`。 */
const NODE_ID_PREFIX = "node-";

export function nodeRfId(nodeKey: string) {
  return `${NODE_ID_PREFIX}${nodeKey}`;
}

export function nodeKeyOf(rfId: string) {
  return rfId.startsWith(NODE_ID_PREFIX) ? rfId.slice(NODE_ID_PREFIX.length) : rfId;
}

export function makeStudioNode(node: PathwayNode, issues: ValidationIssue[] = []): StudioNode {
  return {
    id: node.id,
    type: "clinical",
    position: { ...node.position },
    data: { node, issues },
  };
}
