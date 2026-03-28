import { Plus, Trash2 } from 'lucide-react';
import type { VariableExtractNodeData } from '../../types';
import { useFlowStore } from '../../store/flowStore';

interface Props {
  nodeId: string;
  data: VariableExtractNodeData;
}

export default function VariableExtractPanel({ nodeId, data }: Props) {
  const { updateNodeData, deleteNode, setSelectedNodeId, nodes } = useFlowStore();
  const extractions = data.extractions || [];

  const update = (partial: Partial<VariableExtractNodeData>) =>
    updateNodeData(nodeId, partial);

  const addRow = () =>
    update({ extractions: [...extractions, { variableName: '', jsonPath: '', sourceNodeId: '' }] });

  const updateRow = (i: number, field: string, value: string) =>
    update({
      extractions: extractions.map((ex, idx) => (idx === i ? { ...ex, [field]: value } : ex)),
    });

  const removeRow = (i: number) =>
    update({ extractions: extractions.filter((_, idx) => idx !== i) });

  const httpNodes = nodes.filter((n) => n.type === 'httpRequestNode');

  return (
    <div className="space-y-4">
      <div>
        <label className="panel-label">노드 이름</label>
        <input
          className="panel-input"
          value={data.label}
          onChange={(e) => update({ label: e.target.value })}
        />
      </div>

      <div>
        <label className="panel-label">변수 추출 규칙</label>
        <p className="text-xs text-gray-500 mb-2">
          이전 HTTP 노드의 응답에서 값을 추출해 변수로 저장합니다.
        </p>

        <div className="space-y-3">
          {extractions.map((ex, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">추출 #{i + 1}</span>
                <button onClick={() => removeRow(i)} className="text-gray-600 hover:text-red-400">
                  <Trash2 size={12} />
                </button>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">변수명</label>
                <input
                  className="panel-input"
                  placeholder="예: accessToken"
                  value={ex.variableName}
                  onChange={(e) => updateRow(i, 'variableName', e.target.value)}
                />
                <p className="text-xs text-gray-600 mt-1">
                  이후 <code className="text-violet-400">{'{{vars.accessToken}}'}</code> 로 사용
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">JSON 경로</label>
                <input
                  className="panel-input font-mono"
                  placeholder="예: response.data.token"
                  value={ex.jsonPath}
                  onChange={(e) => updateRow(i, 'jsonPath', e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">소스 노드 (선택)</label>
                <select
                  className="panel-input"
                  value={ex.sourceNodeId || ''}
                  onChange={(e) => updateRow(i, 'sourceNodeId', e.target.value)}
                >
                  <option value="">이전 노드 자동</option>
                  {httpNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {(n.data as { label?: string }).label || n.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          <button
            onClick={addRow}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-violet-400"
          >
            <Plus size={12} /> 추출 규칙 추가
          </button>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-700">
        <button
          onClick={() => { deleteNode(nodeId); setSelectedNodeId(null); }}
          className="flex items-center gap-2 text-xs text-red-500 hover:text-red-400"
        >
          <Trash2 size={12} /> 노드 삭제
        </button>
      </div>
    </div>
  );
}
