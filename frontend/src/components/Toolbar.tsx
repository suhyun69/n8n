import { Play, RotateCcw, Download, Upload } from 'lucide-react';
import { useFlowStore } from '../store/flowStore';
import { runFlow } from '../engine/ExecutionEngine';
import type { NodeExecutionResult } from '../types';

export default function Toolbar() {
  const {
    nodes,
    edges,
    isRunning,
    setIsRunning,
    setNodeStatus,
    setNodeResult,
    setExecutionContext,
    resetExecution,
  } = useFlowStore();

  const handleRun = async () => {
    if (isRunning) return;
    resetExecution();
    setIsRunning(true);

    try {
      await runFlow(nodes, edges, {
        onNodeStart: (nodeId) => {
          setNodeStatus(nodeId, 'running');
          setNodeResult(nodeId, { status: 'running', startedAt: Date.now() });
        },
        onNodeDone: (nodeId, result: NodeExecutionResult) => {
          setNodeStatus(nodeId, result.status);
          setNodeResult(nodeId, result);
        },
        onContextUpdate: (ctx) => {
          setExecutionContext(ctx);
        },
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleExport = () => {
    const { nodes, edges } = useFlowStore.getState();
    const json = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flow.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const { nodes, edges } = JSON.parse(ev.target?.result as string);
          const store = useFlowStore.getState();
          store.onNodesChange(nodes.map((n: { id: string }) => ({ type: 'reset' as const, item: n })));
          // 간단하게 store를 직접 세팅하기 위해 zustand setState 사용
          useFlowStore.setState({ nodes, edges });
        } catch (err) {
          alert('올바르지 않은 파일 형식입니다.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-700">
      {/* 로고 */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-violet-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">A</span>
        </div>
        <span className="text-sm font-semibold text-white">API Flow Tester</span>
      </div>

      {/* 액션 버튼들 */}
      <div className="flex items-center gap-2">
        <button
          onClick={resetExecution}
          disabled={isRunning}
          title="실행 결과 초기화"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
        >
          <RotateCcw size={13} />
          초기화
        </button>

        <button
          onClick={handleImport}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
        >
          <Upload size={13} />
          불러오기
        </button>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Download size={13} />
          저장
        </button>

        <button
          onClick={handleRun}
          disabled={isRunning}
          className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            isRunning
              ? 'bg-violet-700 text-violet-300 cursor-not-allowed'
              : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40'
          }`}
        >
          <Play size={13} fill="currentColor" />
          {isRunning ? '실행 중...' : '실행'}
        </button>
      </div>
    </div>
  );
}
