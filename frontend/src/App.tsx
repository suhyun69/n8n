import { ReactFlowProvider } from '@xyflow/react';
import Toolbar from './components/Toolbar';
import NodePalette from './components/NodePalette';
import Canvas from './components/Canvas';
import NodeConfigPanel from './components/panels/NodeConfigPanel';

export default function App() {
  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen bg-gray-950">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <NodePalette />
          <Canvas />
          <NodeConfigPanel />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
