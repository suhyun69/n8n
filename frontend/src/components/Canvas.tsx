import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
} from '@xyflow/react';
import { useFlowStore } from '../store/flowStore';
import StartNode from './nodes/StartNode';
import HttpRequestNode from './nodes/HttpRequestNode';
import VariableExtractNode from './nodes/VariableExtractNode';
import SetVariableNode from './nodes/SetVariableNode';

const nodeTypes: NodeTypes = {
  startNode: StartNode,
  httpRequestNode: HttpRequestNode,
  variableExtractNode: VariableExtractNode,
  setVariableNode: SetVariableNode,
};

export default function Canvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNodeId,
  } = useFlowStore();

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  return (
    <div className="flex-1 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode="Delete"
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#6366f1', strokeWidth: 2 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1f2937" />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            switch (n.type) {
              case 'startNode': return '#22c55e';
              case 'httpRequestNode': return '#3b82f6';
              case 'variableExtractNode': return '#a855f7';
              case 'setVariableNode': return '#f97316';
              default: return '#6b7280';
            }
          }}
          style={{ background: '#1f2937', border: '1px solid #374151' }}
        />
      </ReactFlow>
    </div>
  );
}
