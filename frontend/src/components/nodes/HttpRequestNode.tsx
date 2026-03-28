import { Globe } from 'lucide-react';
import BaseNode from './BaseNode';
import type { NodeProps } from '@xyflow/react';
import type { HttpRequestNodeData } from '../../types';

const methodColors: Record<string, string> = {
  GET: 'text-green-400',
  POST: 'text-blue-400',
  PUT: 'text-yellow-400',
  PATCH: 'text-orange-400',
  DELETE: 'text-red-400',
};

export default function HttpRequestNode({ id, data }: NodeProps) {
  const d = data as HttpRequestNodeData;
  const method = d.method || 'GET';
  const url = d.url || 'URL을 입력하세요';

  return (
    <BaseNode
      id={id}
      icon={<Globe size={16} />}
      iconBg="bg-blue-600"
      title={d.label || 'HTTP Request'}
      subtitle={`${method} ${url}`}
    >
      <div className="flex items-center gap-2 py-1">
        <span className={`font-bold text-xs ${methodColors[method]}`}>{method}</span>
        <span className="text-gray-400 truncate max-w-[140px]">{url}</span>
      </div>
    </BaseNode>
  );
}
