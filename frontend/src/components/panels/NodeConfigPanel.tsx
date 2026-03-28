import { X, Play, Loader } from 'lucide-react';
import { useState } from 'react';
import { useFlowStore } from '../../store/flowStore';
import type { HttpRequestNodeData, VariableExtractNodeData, SetVariableNodeData } from '../../types';
import HttpRequestPanel from './HttpRequestPanel';
import VariableExtractPanel from './VariableExtractPanel';
import SetVariablePanel from './SetVariablePanel';
import ResultPanel from './ResultPanel';
import { runSingleNode } from '../../engine/ExecutionEngine';

const RUNNABLE_TYPES = ['httpRequestNode', 'variableExtractNode', 'setVariableNode'];

export default function NodeConfigPanel() {
  const {
    selectedNodeId, nodes, edges, setSelectedNodeId, nodeResults,
    executionContext, setNodeStatus, setNodeResult, setExecutionContext,
  } = useFlowStore();
  const [isRunning, setIsRunning] = useState(false);

  if (!selectedNodeId) return null;

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const result = nodeResults[selectedNodeId];
  const canRun = RUNNABLE_TYPES.includes(node.type ?? '');

  const handleRunSingle = async () => {
    if (isRunning) return;
    setIsRunning(true);
    await runSingleNode(selectedNodeId, nodes, edges, executionContext, {
      onNodeStart: (id) => {
        setNodeStatus(id, 'running');
        setNodeResult(id, { status: 'running', startedAt: Date.now() });
      },
      onNodeDone: (id, res) => {
        setNodeStatus(id, res.status);
        setNodeResult(id, res);
      },
      onContextUpdate: (ctx) => setExecutionContext(ctx),
    });
    setIsRunning(false);
  };

  const renderPanel = () => {
    switch (node.type) {
      case 'httpRequestNode':
        return <HttpRequestPanel nodeId={node.id} data={node.data as HttpRequestNodeData} />;
      case 'variableExtractNode':
        return <VariableExtractPanel nodeId={node.id} data={node.data as VariableExtractNodeData} />;
      case 'setVariableNode':
        return <SetVariablePanel nodeId={node.id} data={node.data as SetVariableNodeData} />;
      case 'startNode':
        return <div className="text-sm text-gray-400 p-2">플로우의 시작점입니다.</div>;
      default:
        return <div className="text-sm text-gray-400">설정 없음</div>;
    }
  };

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-700 flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white">노드 설정</h3>
        <div className="flex items-center gap-2">
          {canRun && (
            <button
              onClick={handleRunSingle}
              disabled={isRunning}
              title="이 노드만 실행"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                isRunning
                  ? 'bg-violet-800 text-violet-300 cursor-not-allowed'
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
              }`}
            >
              {isRunning
                ? <Loader size={11} className="animate-spin" />
                : <Play size={11} fill="currentColor" />}
              {isRunning ? '실행 중' : '단독 실행'}
            </button>
          )}
          <button onClick={() => setSelectedNodeId(null)} className="text-gray-500 hover:text-white">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 컨텍스트 힌트 */}
      {canRun && Object.keys(executionContext.vars).length > 0 && (
        <div className="px-4 py-2 border-b border-gray-700 bg-gray-800/50">
          <p className="text-xs text-gray-500">
            이전 실행의 변수 {Object.keys(executionContext.vars).length}개 재사용:{' '}
            <span className="text-orange-400">
              {Object.keys(executionContext.vars).join(', ')}
            </span>
          </p>
        </div>
      )}

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderPanel()}
        {result && <ResultPanel result={result} />}
      </div>
    </div>
  );
}
