import { useState } from 'react';
import { useGraphStore } from '../../store/graphStore';
import type { GraphMode } from '../../types';

interface FunctionDrawerProps {
  onAddFunction?: () => void;
}

export function FunctionDrawer({ onAddFunction }: FunctionDrawerProps) {
  const [mode, setMode] = useState<GraphMode>('cartesian');
  
  const { 
    functions, 
    addFunction, 
    removeFunction, 
    updateFunction, 
    toggleFunctionVisibility,
    getNextColor 
  } = useGraphStore();
  
  const handleAddFunction = () => {
    const color = getNextColor();
    addFunction({ mode, color });
    onAddFunction?.();
  };
  
  const handleExpressionChange = (id: string, expression: string) => {
    updateFunction(id, { expression });
  };
  
  const handleColorChange = (id: string, color: string) => {
    updateFunction(id, { color });
  };
  
  const modes: Array<{ value: GraphMode; label: string }> = [
    { value: 'cartesian', label: 'Y = f(x)' },
    { value: 'parametric', label: 'Parametric' },
    { value: 'polar', label: 'Polar' },
  ];
  
  return (
    <div className="flex flex-col h-full">
      {/* Mode selector */}
      <div className="flex gap-1 p-3 border-b border-locus-border">
        {modes.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={`flex-1 py-2 px-3 text-xs rounded transition-colors ${
              mode === m.value
                ? 'bg-locus-blue text-white'
                : 'bg-locus-panel text-gray-400 hover:bg-locus-border'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      
      {/* Function list */}
      <div className="flex-1 overflow-y-auto p-3">
        {functions.length === 0 && (
          <div className="text-center text-gray-500 py-8 text-sm">
            No functions yet.<br />Click "+ Add Function" to start.
          </div>
        )}
        
        {functions.map((func, index) => (
          <div
            key={func.id}
            className="bg-locus-panel rounded-lg p-3 mb-3 animate-fade-in"
          >
            {/* Expression input row */}
            <div className="flex items-center gap-2 mb-2">
              <input
                type="color"
                value={func.color}
                onChange={(e) => handleColorChange(func.id, e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
              />
              <input
                type="text"
                value={func.expression}
                onChange={(e) => handleExpressionChange(func.id, e.target.value)}
                placeholder={
                  mode === 'cartesian' ? 'f(x) = sin(x)' :
                  mode === 'parametric' ? 'x(t), y(t)' :
                  'r(θ) = ...'
                }
                className={`flex-1 bg-locus-bg border rounded px-3 py-2 text-sm outline-none transition-colors ${
                  func.error 
                    ? 'border-red-500 bg-red-900/20' 
                    : 'border-locus-border focus:border-locus-blue'
                }`}
              />
            </div>
            
            {/* Controls */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => toggleFunctionVisibility(func.id)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  func.visible 
                    ? 'bg-green-900/30 text-green-400' 
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {func.visible ? '👁 Visible' : '🚫 Hidden'}
              </button>
              
              <button
                onClick={() => removeFunction(func.id)}
                className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
              >
                ✕ Delete
              </button>
            </div>
            
            {/* Error message */}
            {func.error && (
              <div className="mt-2 text-xs text-red-400">
                {func.error}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Add function button */}
      <div className="p-3 border-t border-locus-border">
        <button
          onClick={handleAddFunction}
          className="w-full py-3 border-2 border-dashed border-locus-border rounded-lg text-gray-400 hover:border-locus-blue hover:text-locus-blue transition-colors"
        >
          + Add Function
        </button>
      </div>
      
      {/* Viewport controls */}
      <ViewportControls />
    </div>
  );
}

function ViewportControls() {
  const { viewport, setViewport, showGrid, showAxes, toggleGrid, toggleAxes } = useGraphStore();
  
  return (
    <div className="p-3 border-t border-locus-border space-y-3">
      {/* X Range */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">X Range</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={viewport.xMin}
            onChange={(e) => setViewport({ xMin: parseFloat(e.target.value) || -10 })}
            className="flex-1 bg-locus-bg border border-locus-border rounded px-2 py-1 text-sm text-center"
          />
          <input
            type="number"
            value={viewport.xMax}
            onChange={(e) => setViewport({ xMax: parseFloat(e.target.value) || 10 })}
            className="flex-1 bg-locus-bg border border-locus-border rounded px-2 py-1 text-sm text-center"
          />
        </div>
      </div>
      
      {/* Y Range */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Y Range</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={viewport.yMin}
            onChange={(e) => setViewport({ yMin: parseFloat(e.target.value) || -10 })}
            className="flex-1 bg-locus-bg border border-locus-border rounded px-2 py-1 text-sm text-center"
          />
          <input
            type="number"
            value={viewport.yMax}
            onChange={(e) => setViewport({ yMax: parseFloat(e.target.value) || 10 })}
            className="flex-1 bg-locus-bg border border-locus-border rounded px-2 py-1 text-sm text-center"
          />
        </div>
      </div>
      
      {/* Toggles */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={toggleGrid}
            className="accent-locus-blue"
          />
          Show Grid
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showAxes}
            onChange={toggleAxes}
            className="accent-locus-blue"
          />
          Show Axes
        </label>
      </div>
    </div>
  );
}
