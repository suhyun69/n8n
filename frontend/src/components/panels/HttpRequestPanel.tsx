import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import type { HttpRequestNodeData, HttpMethod, Assertion, AssertionOperator } from '../../types';
import KeyValueEditor from './KeyValueEditor';
import { useFlowStore } from '../../store/flowStore';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const methodColors: Record<HttpMethod, string> = {
  GET: 'text-green-400',
  POST: 'text-blue-400',
  PUT: 'text-yellow-400',
  PATCH: 'text-orange-400',
  DELETE: 'text-red-400',
};

const OPERATORS: { value: AssertionOperator; label: string }[] = [
  { value: 'eq',       label: '==' },
  { value: 'neq',      label: '!=' },
  { value: 'contains', label: 'contains' },
  { value: 'gt',       label: '>' },
  { value: 'lt',       label: '<' },
  { value: 'exists',   label: 'exists' },
];

interface Props {
  nodeId: string;
  data: HttpRequestNodeData;
}

function AssertionsEditor({ assertions, onChange }: {
  assertions: Assertion[];
  onChange: (a: Assertion[]) => void;
}) {
  const add = () => onChange([
    ...assertions,
    { enabled: true, type: 'status', jsonPath: '', operator: 'eq', expected: '200' },
  ]);

  const update = (i: number, patch: Partial<Assertion>) =>
    onChange(assertions.map((a, idx) => idx === i ? { ...a, ...patch } : a));

  const remove = (i: number) => onChange(assertions.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {assertions.map((a, i) => (
        <div key={i} className="bg-gray-800 rounded-lg p-3 space-y-2 border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={a.enabled}
                onChange={(e) => update(i, { enabled: e.target.checked })}
                className="w-3.5 h-3.5 accent-violet-500"
              />
              <span className="text-xs text-gray-400">조건 #{i + 1}</span>
            </div>
            <button onClick={() => remove(i)} className="text-gray-600 hover:text-red-400">
              <Trash2 size={12} />
            </button>
          </div>

          {/* 타입 선택 */}
          <div className="flex gap-1">
            {(['status', 'jsonPath'] as const).map((t) => (
              <button
                key={t}
                onClick={() => update(i, { type: t })}
                className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                  a.type === t
                    ? 'border-violet-500 text-violet-400 bg-violet-500/10'
                    : 'border-gray-700 text-gray-500 hover:border-gray-500'
                }`}
              >
                {t === 'status' ? 'HTTP Status' : 'JSON Path'}
              </button>
            ))}
          </div>

          {/* JSON Path 입력 */}
          {a.type === 'jsonPath' && (
            <input
              className="panel-input font-mono"
              placeholder="예: data.success"
              value={a.jsonPath || ''}
              onChange={(e) => update(i, { jsonPath: e.target.value })}
            />
          )}

          {/* 연산자 + 기대값 */}
          <div className="flex gap-2">
            <select
              value={a.operator}
              onChange={(e) => update(i, { operator: e.target.value as AssertionOperator })}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-violet-500"
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
            {a.operator !== 'exists' && (
              <input
                className="panel-input flex-1"
                placeholder="기대값 (예: 201)"
                value={a.expected}
                onChange={(e) => update(i, { expected: e.target.value })}
              />
            )}
          </div>
        </div>
      ))}

      <button
        onClick={add}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-violet-400"
      >
        <Plus size={12} /> 조건 추가
      </button>

      {assertions.length > 0 && (
        <p className="text-xs text-gray-600">
          조건 실패 시 플로우가 중단됩니다.
        </p>
      )}
    </div>
  );
}

export default function HttpRequestPanel({ nodeId, data }: Props) {
  const { updateNodeData, deleteNode, setSelectedNodeId } = useFlowStore();
  const [activeTab, setActiveTab] = useState<'headers' | 'params' | 'body' | 'assert'>('headers');

  const update = (partial: Partial<HttpRequestNodeData>) => updateNodeData(nodeId, partial);

  const assertCount = (data.assertions || []).filter((a) => a.enabled).length;
  const tabs = ['headers', 'params', 'body', 'assert'] as const;

  return (
    <div className="space-y-4">
      {/* 라벨 */}
      <div>
        <label className="panel-label">노드 이름</label>
        <input
          className="panel-input"
          value={data.label}
          onChange={(e) => update({ label: e.target.value })}
        />
      </div>

      {/* Method + URL */}
      <div>
        <label className="panel-label">Method & URL</label>
        <div className="flex gap-2">
          <select
            value={data.method}
            onChange={(e) => update({ method: e.target.value as HttpMethod })}
            className={`bg-gray-800 border border-gray-700 rounded px-2 py-2 text-xs font-bold focus:outline-none focus:border-violet-500 ${methodColors[data.method]}`}
          >
            {METHODS.map((m) => (
              <option key={m} value={m} className="text-white">{m}</option>
            ))}
          </select>
          <input
            className="panel-input flex-1"
            placeholder="https://api.example.com/endpoint"
            value={data.url}
            onChange={(e) => update({ url: e.target.value })}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          변수 사용: <code className="text-violet-400 bg-gray-800 px-1 rounded">{'{{vars.token}}'}</code>
        </p>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex border-b border-gray-700 mb-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-3 py-1.5 text-xs transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-violet-500 text-violet-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'params' ? 'Query' : tab === 'assert' ? 'Assert' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'assert' && assertCount > 0 && (
                <span className="ml-1 px-1 py-0.5 text-xs bg-violet-600 text-white rounded-full leading-none">
                  {assertCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'headers' && (
          <KeyValueEditor
            items={data.headers || []}
            onChange={(headers) => update({ headers })}
            keyPlaceholder="Content-Type"
            valuePlaceholder="application/json"
          />
        )}

        {activeTab === 'params' && (
          <KeyValueEditor
            items={data.queryParams || []}
            onChange={(queryParams) => update({ queryParams })}
            keyPlaceholder="page"
            valuePlaceholder="1"
          />
        )}

        {activeTab === 'body' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              {(['json', 'form', 'none'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => update({ bodyType: t })}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    data.bodyType === t
                      ? 'border-violet-500 text-violet-400 bg-violet-500/10'
                      : 'border-gray-700 text-gray-500 hover:border-gray-500'
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
            {data.bodyType !== 'none' && (
              <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 font-mono resize-none"
                rows={8}
                placeholder={'{\n  "username": "{{vars.userId}}"\n}'}
                value={data.body || ''}
                onChange={(e) => update({ body: e.target.value })}
              />
            )}
          </div>
        )}

        {activeTab === 'assert' && (
          <AssertionsEditor
            assertions={data.assertions || []}
            onChange={(assertions) => update({ assertions })}
          />
        )}
      </div>

      {/* 삭제 */}
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
