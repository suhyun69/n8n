import { Plus, Trash2 } from 'lucide-react';
import type { SetVariableNodeData, KeyValue } from '../../types';
import { useFlowStore } from '../../store/flowStore';

interface Props {
  nodeId: string;
  data: SetVariableNodeData;
}

function isValidJson(str: string): boolean {
  try { JSON.parse(str); return true; } catch { return false; }
}

function VariableEditor({ items, onChange }: {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
}) {
  const add = () =>
    onChange([...items, { key: '', value: '', enabled: true, type: 'string' }]);

  const update = (i: number, patch: Partial<KeyValue>) =>
    onChange(items.map((v, idx) => idx === i ? { ...v, ...patch } : v));

  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const isJson = item.type === 'json';
        const jsonInvalid = isJson && item.value.trim() !== '' && !isValidJson(item.value);

        return (
          <div key={i} className="bg-gray-800 rounded-lg p-3 space-y-2 border border-gray-700">
            {/* 상단 행: 체크박스 + 변수명 + 타입 토글 + 삭제 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.enabled}
                onChange={(e) => update(i, { enabled: e.target.checked })}
                className="w-3.5 h-3.5 accent-violet-500 flex-shrink-0"
              />
              <input
                type="text"
                value={item.key}
                onChange={(e) => update(i, { key: e.target.value })}
                placeholder="변수명"
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
              <div className="flex rounded overflow-hidden border border-gray-600 flex-shrink-0">
                <button
                  onClick={() => update(i, { type: 'string' })}
                  className={`px-2 py-1 text-xs transition-colors ${
                    !isJson ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  string
                </button>
                <button
                  onClick={() => update(i, { type: 'json' })}
                  className={`px-2 py-1 text-xs transition-colors ${
                    isJson ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  JSON
                </button>
              </div>
              <button onClick={() => remove(i)} className="text-gray-600 hover:text-red-400 flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </div>

            {/* 값 입력 */}
            {isJson ? (
              <div>
                <textarea
                  value={item.value}
                  onChange={(e) => update(i, { value: e.target.value })}
                  placeholder={'{\n  "key": "value"\n}'}
                  rows={4}
                  className={`w-full bg-gray-700 border rounded px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none font-mono resize-none ${
                    jsonInvalid ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-violet-500'
                  }`}
                />
                {jsonInvalid && (
                  <p className="text-xs text-red-400 mt-1">유효하지 않은 JSON 형식입니다.</p>
                )}
              </div>
            ) : (
              <input
                type="text"
                value={item.value}
                onChange={(e) => update(i, { value: e.target.value })}
                placeholder="값"
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
              />
            )}

            {/* 참조 힌트 */}
            {item.key && (
              <p className="text-xs text-gray-600">
                참조: <code className="text-violet-400">{'{{vars.' + item.key + '}}'}</code>
                {isJson && (
                  <span className="ml-2">
                    필드 접근: <code className="text-violet-400">{'{{vars.' + item.key + '.fieldName}}'}</code>
                  </span>
                )}
              </p>
            )}
          </div>
        );
      })}

      <button
        onClick={add}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-violet-400"
      >
        <Plus size={12} /> 변수 추가
      </button>
    </div>
  );
}

export default function SetVariablePanel({ nodeId, data }: Props) {
  const { updateNodeData, deleteNode, setSelectedNodeId } = useFlowStore();
  const update = (partial: Partial<SetVariableNodeData>) => updateNodeData(nodeId, partial);

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
        <label className="panel-label">변수 설정</label>
        <p className="text-xs text-gray-500 mb-2">
          string: 단순 값 &nbsp;|&nbsp; JSON: 객체/배열 — 필드를{' '}
          <code className="text-violet-400">{'{{vars.변수.field}}'}</code> 로 참조
        </p>
        <VariableEditor
          items={data.variables || []}
          onChange={(variables) => update({ variables })}
        />
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
