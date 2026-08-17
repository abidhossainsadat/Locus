import { create } from 'zustand';
import type { GraphState, FunctionDef, SliderDef, Viewport, Point } from '../types';

const DEFAULT_VIEWPORT: Viewport = {
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
};

const DEFAULT_COLORS = [
  '#3b82f6', // Cobalt Blue
  '#10b981', // Emerald Green
  '#ef4444', // Crimson Red
  '#f59e0b', // Amber Yellow
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#ec4899', // Pink
];

interface GraphStore extends GraphState {
  // Actions
  addFunction: (func?: Partial<FunctionDef>) => void;
  removeFunction: (id: string) => void;
  updateFunction: (id: string, updates: Partial<FunctionDef>) => void;
  toggleFunctionVisibility: (id: string) => void;
  clearFunctions: () => void;
  
  addSlider: (slider?: Partial<SliderDef>) => void;
  removeSlider: (id: string) => void;
  updateSlider: (id: string, updates: Partial<SliderDef>) => void;
  setSliderValue: (id: string, value: number) => void;
  toggleSliderPlaying: (id: string) => void;
  
  setViewport: (viewport: Partial<Viewport>) => void;
  resetViewport: () => void;
  panViewport: (dx: number, dy: number) => void;
  zoomViewport: (factor: number, centerX?: number, centerY?: number) => void;
  
  toggleGrid: () => void;
  toggleAxes: () => void;
  toggleDarkMode: () => void;
  
  setSelectedPoint: (point: Point | null) => void;
  toggleTangent: () => void;
  toggleIntegral: () => void;
  setIntegralRange: (range: [number, number]) => void;
  
  // Helpers
  getNextColor: () => string;
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  functions: [],
  sliders: [],
  viewport: DEFAULT_VIEWPORT,
  showGrid: true,
  showAxes: true,
  darkMode: true,
  selectedPoint: null,
  showTangent: false,
  showIntegral: false,
  integralRange: [-5, 5],
  
  addFunction: (func) => {
    const id = `func_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const color = get().getNextColor();
    const newFunc: FunctionDef = {
      id,
      expression: func?.expression || '',
      mode: func?.mode || 'cartesian',
      color: func?.color || color,
      visible: func?.visible ?? true,
      segments: [],
      error: null,
      ...func,
    };
    set((state) => ({ functions: [...state.functions, newFunc] }));
    return id;
  },
  
  removeFunction: (id) => {
    set((state) => ({ 
      functions: state.functions.filter((f) => f.id !== id) 
    }));
  },
  
  updateFunction: (id, updates) => {
    set((state) => ({
      functions: state.functions.map((f) => 
        f.id === id ? { ...f, ...updates } : f
      ),
    }));
  },
  
  toggleFunctionVisibility: (id) => {
    set((state) => ({
      functions: state.functions.map((f) =>
        f.id === id ? { ...f, visible: !f.visible } : f
      ),
    }));
  },
  
  clearFunctions: () => {
    set({ functions: [] });
  },
  
  addSlider: (slider) => {
    const id = `slider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newSlider: SliderDef = {
      id,
      variable: slider?.variable || 'a',
      value: slider?.value ?? 1,
      min: slider?.min ?? -10,
      max: slider?.max ?? 10,
      step: slider?.step ?? 0.1,
      playing: slider?.playing ?? false,
      speed: slider?.speed ?? 1,
      ...slider,
    };
    set((state) => ({ sliders: [...state.sliders, newSlider] }));
    return id;
  },
  
  removeSlider: (id) => {
    set((state) => ({ 
      sliders: state.sliders.filter((s) => s.id !== id) 
    }));
  },
  
  updateSlider: (id, updates) => {
    set((state) => ({
      sliders: state.sliders.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
  },
  
  setSliderValue: (id, value) => {
    set((state) => ({
      sliders: state.sliders.map((s) =>
        s.id === id ? { ...s, value } : s
      ),
    }));
  },
  
  toggleSliderPlaying: (id) => {
    set((state) => ({
      sliders: state.sliders.map((s) =>
        s.id === id ? { ...s, playing: !s.playing } : s
      ),
    }));
  },
  
  setViewport: (viewport) => {
    set((state) => ({
      viewport: { ...state.viewport, ...viewport },
    }));
  },
  
  resetViewport: () => {
    set({ viewport: DEFAULT_VIEWPORT });
  },
  
  panViewport: (dx, dy) => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        xMin: state.viewport.xMin + dx,
        xMax: state.viewport.xMax + dx,
        yMin: state.viewport.yMin + dy,
        yMax: state.viewport.yMax + dy,
      },
    }));
  },
  
  zoomViewport: (factor, centerX, centerY) => {
    set((state) => {
      const { viewport } = state;
      const cx = centerX ?? (viewport.xMin + viewport.xMax) / 2;
      const cy = centerY ?? (viewport.yMin + viewport.yMax) / 2;
      
      const newWidth = (viewport.xMax - viewport.xMin) / factor;
      const newHeight = (viewport.yMax - viewport.yMin) / factor;
      
      return {
        viewport: {
          xMin: cx - newWidth / 2,
          xMax: cx + newWidth / 2,
          yMin: cy - newHeight / 2,
          yMax: cy + newHeight / 2,
        },
      };
    });
  },
  
  toggleGrid: () => {
    set((state) => ({ showGrid: !state.showGrid }));
  },
  
  toggleAxes: () => {
    set((state) => ({ showAxes: !state.showAxes }));
  },
  
  toggleDarkMode: () => {
    set((state) => ({ darkMode: !state.darkMode }));
  },
  
  setSelectedPoint: (point) => {
    set({ selectedPoint: point });
  },
  
  toggleTangent: () => {
    set((state) => ({ showTangent: !state.showTangent }));
  },
  
  toggleIntegral: () => {
    set((state) => ({ showIntegral: !state.showIntegral }));
  },
  
  setIntegralRange: (range) => {
    set({ integralRange: range });
  },
  
  getNextColor: () => {
    const { functions } = get();
    const usedColors = functions.map((f) => f.color);
    const nextColor = DEFAULT_COLORS.find((c) => !usedColors.includes(c));
    return nextColor || DEFAULT_COLORS[functions.length % DEFAULT_COLORS.length];
  },
}));
