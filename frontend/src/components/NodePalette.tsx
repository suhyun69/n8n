import { Globe, Scissors, Variable } from 'lucide-react';
import { useFlowStore } from '../store/flowStore';
import type { FlowNode } from '../store/flowStore';
import type {
  HttpRequestNodeData,
  VariableExtractNodeData,
  SetVariableNodeData,
} from '../types';

const palette = [
  {
    type: 'httpRequestNode',
    label: 'HTTP Request',
    description: 'API 호출',
    icon: <Globe size={16} />,
    iconBg: 'bg-blue-600',
    defaultData: (): HttpRequestNodeData => ({
      label: 'HTTP Request',
      method: 'GET',
      url: '',
      headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
      queryParams: [],
      body: '',
      bodyType: 'json',
      assertions: [],
    }),
  },
  {
    type: 'variableExtractNode',
    label: 'Extract Variable',
    description: '응답에서 변수 추출',
    icon: <Scissors size={16} />,
    iconBg: 'bg-purple-600',
    defaultData: (): VariableExtractNodeData => ({
      label: 'Extract Variable',
      extractions: [{ variableName: '', jsonPath: '', sourceNodeId: '' }],
    }),
  },
  {
    type: 'setVariableNode',
    label: 'Set Variable',
    description: '공통 변수 정의',
    icon: <Variable size={16} />,
    iconBg: 'bg-orange-600',
    defaultData: (): SetVariableNodeData => ({
      label: 'Set Variable',
      variables: [{ key: '', value: '', enabled: true }],
    }),
  },
];

export default function NodePalette() {
  const { addNode, nodes } = useFlowStore();

  const handleAdd = (item: (typeof palette)[number]) => {
    const id = `${item.type}-${Date.now()}`;
    // 기존 노드들보다 살짝 오른쪽/아래에 배치
    const maxX = nodes.reduce((m, n) => Math.max(m, n.position.x), 0);
    const newNode: FlowNode = {
      id,
      type: item.type,
      position: { x: maxX + 250, y: 200 },
      data: item.defaultData(),
    };
    addNode(newNode);
  };

  return (
    <div className="w-52 bg-gray-900 border-r border-gray-700 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">노드 팔레트</h2>
      </div>
      <div className="p-3 space-y-2 flex-1 overflow-y-auto">
        {palette.map((item) => (
          <button
            key={item.type}
            onClick={() => handleAdd(item)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 transition-all text-left group"
          >
            <div className={`w-7 h-7 rounded-md ${item.iconBg} flex items-center justify-center text-white flex-shrink-0`}>
              {item.icon}
            </div>
            <div>
              <div className="text-xs font-medium text-white group-hover:text-gray-100">
                {item.label}
              </div>
              <div className="text-xs text-gray-500">{item.description}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-gray-700">
        <p className="text-xs text-gray-600 leading-relaxed">
          노드를 클릭해 캔버스에 추가하세요.<br />
          노드를 연결해 순서를 정의합니다.
        </p>
      </div>
    </div>
  );
}
