import { Handle, Position } from '@xyflow/react';
import { Play } from 'lucide-react';
import { useFlowStore } from '../../store/flowStore';

interface StartNodeProps {
  id: string;
}

export default function StartNode({ id }: StartNodeProps) {
  const { selectedNodeId, setSelectedNodeId } = useFlowStore();
  const isSelected = selectedNodeId === id;

  return (
    <div
      onClick={() => setSelectedNodeId(id)}
      className={`
        flex items-center gap-2 px-4 py-3 rounded-full border-2 bg-gray-900 cursor-pointer
        border-green-500 transition-all duration-200
        ${isSelected ? 'ring-2 ring-violet-500 ring-offset-1 ring-offset-gray-900' : ''}
      `}
    >
      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
        <Play size={12} fill="white" className="text-white ml-0.5" />
      </div>
      <span className="text-sm font-semibold text-white">Start</span>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-violet-400"
      />
    </div>
  );
}
