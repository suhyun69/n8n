import { create } from 'zustand';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import type { AnyNodeData, NodeStatus, NodeExecutionResult, ExecutionContext } from '../types';

export type FlowNode = Node<AnyNodeData>;

interface FlowState {
  nodes: FlowNode[];
  edges: Edge[];
  selectedNodeId: string | null;

  // 실행 상태
  isRunning: boolean;
  executionContext: ExecutionContext;
  nodeStatuses: Record<string, NodeStatus>;
  nodeResults: Record<string, NodeExecutionResult>;

  // 액션
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: FlowNode) => void;
  updateNodeData: (nodeId: string, data: Partial<AnyNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  setSelectedNodeId: (id: string | null) => void;

  // 실행
  setIsRunning: (v: boolean) => void;
  setNodeStatus: (nodeId: string, status: NodeStatus) => void;
  setNodeResult: (nodeId: string, result: NodeExecutionResult) => void;
  setExecutionContext: (ctx: ExecutionContext) => void;
  resetExecution: () => void;
}

const initialNodes: FlowNode[] = [
  {
    id: 'start-1',
    type: 'startNode',
    position: { x: 80, y: 200 },
    data: { label: 'Start' },
  },
];

export const useFlowStore = create<FlowState>((set) => ({
  nodes: initialNodes,
  edges: [],
  selectedNodeId: null,
  isRunning: false,
  executionContext: { vars: {}, nodes: {} },
  nodeStatuses: {},
  nodeResults: {},

  onNodesChange: (changes) =>
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) as FlowNode[] })),

  onEdgesChange: (changes) =>
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),

  onConnect: (connection) =>
    set((state) => ({ edges: addEdge({ ...connection, animated: true }, state.edges) })),

  addNode: (node) =>
    set((state) => ({ nodes: [...state.nodes, node] })),

  updateNodeData: (nodeId, data) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
    })),

  deleteNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    })),

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  setIsRunning: (v) => set({ isRunning: v }),

  setNodeStatus: (nodeId, status) =>
    set((state) => ({ nodeStatuses: { ...state.nodeStatuses, [nodeId]: status } })),

  setNodeResult: (nodeId, result) =>
    set((state) => ({ nodeResults: { ...state.nodeResults, [nodeId]: result } })),

  setExecutionContext: (ctx) => set({ executionContext: ctx }),

  resetExecution: () =>
    set({ nodeStatuses: {}, nodeResults: {}, executionContext: { vars: {}, nodes: {} } }),
}));
