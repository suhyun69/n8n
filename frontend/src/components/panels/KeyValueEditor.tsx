import { Plus, Trash2 } from 'lucide-react';
import type { KeyValue } from '../../types';

interface KeyValueEditorProps {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export default function KeyValueEditor({
  items,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: KeyValueEditorProps) {
  const addRow = () =>
    onChange([...items, { key: '', value: '', enabled: true }]);

  const updateRow = (index: number, field: keyof KeyValue, value: string | boolean) =>
    onChange(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));

  const removeRow = (index: number) =>
    onChange(items.filter((_, i) => i !== index));

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(e) => updateRow(i, 'enabled', e.target.checked)}
            className="w-3.5 h-3.5 accent-violet-500 flex-shrink-0"
          />
          <input
            type="text"
            value={item.key}
            onChange={(e) => updateRow(i, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 min-w-0"
          />
          <input
            type="text"
            value={item.value}
            onChange={(e) => updateRow(i, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 min-w-0"
          />
          <button
            onClick={() => removeRow(i)}
            className="text-gray-600 hover:text-red-400 flex-shrink-0"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <button
        onClick={addRow}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-violet-400 mt-1"
      >
        <Plus size={12} /> 추가
      </button>
    </div>
  );
}
