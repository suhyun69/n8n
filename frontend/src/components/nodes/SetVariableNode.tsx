import { Variable } from 'lucide-react';
import BaseNode from './BaseNode';
import type { NodeProps } from '@xyflow/react';
import type { SetVariableNodeData } from '../../types';

export default function SetVariableNode({ id, data }: NodeProps) {
  const d = data as SetVariableNodeData;
  const variables = d.variables || [];

  return (
    <BaseNode
      id={id}
      icon={<Variable size={16} />}
      iconBg="bg-orange-600"
      title={d.label || 'Set Variable'}
    >
      {variables.length === 0 ? (
        <span className="text-gray-500">변수 없음</span>
      ) : (
        <div className="space-y-1">
          {variables.slice(0, 3).map((v, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-orange-400">{v.key}</span>
              <span className="text-gray-500">=</span>
              <span className="text-gray-300 truncate">{v.value}</span>
            </div>
          ))}
          {variables.length > 3 && (
            <div className="text-gray-500">+{variables.length - 3}개 더</div>
          )}
        </div>
      )}
    </BaseNode>
  );
}
