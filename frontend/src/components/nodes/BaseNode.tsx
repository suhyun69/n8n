import { type ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useFlowStore } from '../../store/flowStore';
import type { NodeStatus } from '../../types';

const statusColors: Record<NodeStatus, string> = {
  idle: 'border-gray-600',
  running: 'border-blue-400 shadow-blue-400/30 shadow-lg',
  success: 'border-green-400 shadow-green-400/30 shadow-lg',
  error: 'border-red-400 shadow-red-400/30 shadow-lg',
  skipped: 'border-gray-500',
};

const statusDot: Record<NodeStatus, string> = {
  idle: 'bg-gray-500',
  running: 'bg-blue-400 animate-pulse',
  success: 'bg-green-400',
  error: 'bg-red-400',
  skipped: 'bg-gray-500',
};

interface BaseNodeProps {
  id: string;
  icon: ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  hasInput?: boolean;
  hasOutput?: boolean;
  children?: ReactNode;
}

export default function BaseNode({
  id,
  icon,
  iconBg,
  title,
  subtitle,
  hasInput = true,
  hasOutput = true,
  children,
}: BaseNodeProps) {
  const { selectedNodeId, setSelectedNodeId, nodeStatuses } = useFlowStore();
  const isSelected = selectedNodeId === id;
  const status: NodeStatus = nodeStatuses[id] ?? 'idle';

  return (
    <div
      onClick={() => setSelectedNodeId(id)}
      className={`
        relative min-w-[200px] rounded-xl border-2 bg-gray-900 cursor-pointer
        transition-all duration-200
        ${statusColors[status]}
        ${isSelected ? 'ring-2 ring-violet-500 ring-offset-1 ring-offset-gray-900' : ''}
      `}
    >
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-gray-500 !border-2 !border-gray-400"
        />
      )}

      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center text-white flex-shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white truncate">{title}</div>
          {subtitle && <div className="text-xs text-gray-400 truncate">{subtitle}</div>}
        </div>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[status]}`} />
      </div>

      {children && (
        <div className="px-4 py-2 text-xs text-gray-400">
          {children}
        </div>
      )}

      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-violet-500 !border-2 !border-violet-400"
        />
      )}
    </div>
  );
}
