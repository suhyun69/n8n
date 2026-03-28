import { Scissors } from 'lucide-react';
import BaseNode from './BaseNode';
import type { NodeProps } from '@xyflow/react';
import type { VariableExtractNodeData } from '../../types';

export default function VariableExtractNode({ id, data }: NodeProps) {
  const d = data as VariableExtractNodeData;
  const extractions = d.extractions || [];

  return (
    <BaseNode
      id={id}
      icon={<Scissors size={16} />}
      iconBg="bg-purple-600"
      title={d.label || 'Extract Variable'}
    >
      {extractions.length === 0 ? (
        <span className="text-gray-500">추출 항목 없음</span>
      ) : (
        <div className="space-y-1">
          {extractions.slice(0, 3).map((ex, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-purple-400">{ex.variableName}</span>
              <span className="text-gray-500">←</span>
              <span className="text-gray-400 truncate">{ex.jsonPath}</span>
            </div>
          ))}
          {extractions.length > 3 && (
            <div className="text-gray-500">+{extractions.length - 3}개 더</div>
          )}
        </div>
      )}
    </BaseNode>
  );
}
