// Types for the Locus application

export interface Point {
  x: number;
  y: number;
}

export interface Viewport {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export type GraphMode = 'cartesian' | 'parametric' | 'polar' | 'implicit' | 'vector-field' | 'ode';

export interface FunctionDef {
  id: string;
  expression: string;
  mode: GraphMode;
  color: string;
  visible: boolean;
  compiled?: CompiledFunction;
  segments: Point[][];
  error?: string | null;
  // For parametric: x(t), y(t)
  expressionX?: string;
  expressionY?: string;
  // Parameter range for parametric/polar
  tMin?: number;
  tMax?: number;
  // For implicit: f(x,y) = c
  constant?: number;
  // For vector field: P(x,y), Q(x,y)
  expressionP?: string;
  expressionQ?: string;
  // For ODE: dy/dx = f(x, y) or system
  odeExpression?: string;
  initialConditions?: { x: number; y: number };
}

export interface CompiledFunction {
  evaluate: (...args: number[]) => number;
  derivative?: (x: number) => number;
}

export interface SliderDef {
  id: string;
  variable: string;
  value: number;
  min: number;
  max: number;
  step: number;
  playing: boolean;
  speed: number;
}

export interface GraphState {
  functions: FunctionDef[];
  sliders: SliderDef[];
  viewport: Viewport;
  showGrid: boolean;
  showAxes: boolean;
  darkMode: boolean;
  selectedPoint: Point | null;
  showTangent: boolean;
  showIntegral: boolean;
  integralRange: [number, number];
}

export interface TransformMatrix {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
}

export interface RenderOptions {
  showGrid: boolean;
  showAxes: boolean;
  width: number;
  height: number;
}

export interface AnalysisResult {
  roots: Point[];
  extrema: Point[];
  inflectionPoints: Point[];
  intersections: Point[];
}
