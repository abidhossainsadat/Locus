import { FunctionDrawer } from './drawer/FunctionDrawer';
import { GraphCanvas } from './canvas/GraphCanvas';
import { useGraphStore } from '../store/graphStore';

export default function App() {
  const { resetViewport, clearFunctions, toggleDarkMode, darkMode } = useGraphStore();
  
  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'bg-locus-bg' : 'bg-gray-100'}`}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-locus-panel border-b border-locus-border">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-locus-blue">📍 Locus</h1>
          <span className="text-xs text-gray-500">Interactive Graphing Tool</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={resetViewport}
            className="px-4 py-2 text-sm bg-locus-panel border border-locus-border rounded hover:bg-locus-border transition-colors"
          >
            Reset View
          </button>
          <button
            onClick={clearFunctions}
            className="px-4 py-2 text-sm bg-locus-panel border border-locus-border rounded hover:bg-locus-border transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={toggleDarkMode}
            className="px-4 py-2 text-sm bg-locus-panel border border-locus-border rounded hover:bg-locus-border transition-colors"
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-locus-panel border-r border-locus-border flex flex-col overflow-hidden">
          <FunctionDrawer />
        </aside>
        
        {/* Canvas area */}
        <GraphCanvas />
      </div>
      
      {/* Status bar */}
      <footer className="flex items-center justify-between px-4 py-2 bg-locus-panel border-t border-locus-border text-xs text-gray-500">
        <div>
          Ready | Engine: Canvas 2D
        </div>
        <div className="flex items-center gap-4">
          <span>Supported: sin, cos, tan, log, ln, exp, sqrt, abs, ^</span>
          <span>Constants: pi, e</span>
        </div>
      </footer>
    </div>
  );
}
