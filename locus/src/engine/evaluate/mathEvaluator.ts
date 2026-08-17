import * as math from 'mathjs';
import type { CompiledFunction, Point } from '../../types';

/**
 * Mathematical Expression Evaluator using MathJS
 * Supports symbolic parsing, compilation, and evaluation
 */
export class MathEvaluator {
  private parser: math.Parser;
  private functions: Map<string, (...args: number[]) => number>;
  
  constructor() {
    this.parser = math.parser();
    this.functions = new Map();
  }
  
  /**
   * Parse and compile an expression into an evaluatable function
   */
  compile(expression: string, variableName: string = 'x'): CompiledFunction | null {
    try {
      const node = math.parse(expression);
      
      // Create compiled function
      const compiled = node.compile();
      
      const evaluate = (value: number): number => {
        const scope: Record<string, number> = { [variableName]: value };
        const result = compiled.evaluate(scope);
        
        if (typeof result !== 'number' || !isFinite(result) || isNaN(result)) {
          return NaN;
        }
        return result;
      };
      
      // Create numerical derivative using central difference
      const derivative = (x: number, h: number = 1e-8): number => {
        const y1 = evaluate(x - h);
        const y2 = evaluate(x + h);
        if (isNaN(y1) || isNaN(y2) || !isFinite(y1) || !isFinite(y2)) {
          return NaN;
        }
        return (y2 - y1) / (2 * h);
      };
      
      const func: CompiledFunction = { evaluate, derivative };
      this.functions.set(`${expression}_${variableName}`, func);
      return func;
    } catch (error) {
      console.error('Compilation error:', error);
      return null;
    }
  }
  
  /**
   * Evaluate an expression with given variable values
   */
  evaluate(expression: string, variables: Record<string, number>): number {
    try {
      const node = math.parse(expression);
      const compiled = node.compile();
      const result = compiled.evaluate(variables);
      
      if (typeof result !== 'number' || !isFinite(result) || isNaN(result)) {
        return NaN;
      }
      return result;
    } catch (error) {
      return NaN;
    }
  }
  
  /**
   * Extract free variables from an expression
   */
  extractVariables(expression: string, exclude: string[] = ['x', 'y', 't', 'theta']): string[] {
    try {
      const node = math.parse(expression);
      const variables = new Set<string>();
      
      const traverse = (node: math.MathNode) => {
        if (node instanceof math.SymbolNode) {
          const name = node.name;
          if (!exclude.includes(name)) {
            variables.add(name);
          }
        }
        node.forEach((child) => traverse(child));
      };
      
      traverse(node);
      return Array.from(variables);
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Validate an expression
   */
  validate(expression: string): { valid: boolean; error?: string } {
    try {
      math.parse(expression);
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Invalid expression' 
      };
    }
  }
  
  /**
   * Simplify an expression
   */
  simplify(expression: string): string {
    try {
      const node = math.parse(expression);
      const simplified = math.simplify(node);
      return simplified.toString();
    } catch (error) {
      return expression;
    }
  }
  
  /**
   * Evaluate derivative at a point
   */
  evaluateDerivative(expression: string, variable: string, x: number): number {
    const func = this.compile(expression, variable);
    if (func?.derivative) {
      return func.derivative(x);
    }
    return NaN;
  }
  
  /**
   * Find roots using Newton-Raphson method
   */
  findRoots(expression: string, range: [number, number], steps: number = 100): Point[] {
    const func = this.compile(expression, 'x');
    if (!func) return [];
    
    const roots: Point[] = [];
    const [start, end] = range;
    const step = (end - start) / steps;
    
    for (let i = 0; i < steps; i++) {
      const x0 = start + i * step;
      const x1 = start + (i + 1) * step;
      
      const y0 = func.evaluate(x0);
      const y1 = func.evaluate(x1);
      
      // Check for sign change
      if (isFinite(y0) && isFinite(y1) && y0 * y1 < 0) {
        // Bisection method for stability
        let a = x0;
        let b = x1;
        let fa = y0;
        let fb = y1;
        
        for (let j = 0; j < 50; j++) {
          const c = (a + b) / 2;
          const fc = func.evaluate(c);
          
          if (!isFinite(fc) || Math.abs(b - a) < 1e-10) break;
          
          if (fa * fc < 0) {
            b = c;
            fb = fc;
          } else {
            a = c;
            fa = fc;
          }
        }
        
        const root = (a + b) / 2;
        const y = func.evaluate(root);
        
        if (isFinite(root) && isFinite(y) && Math.abs(y) < 1e-6) {
          // Avoid duplicate roots
          const isDuplicate = roots.some(r => Math.abs(r.x - root) < 1e-4);
          if (!isDuplicate) {
            roots.push({ x: root, y: 0 });
          }
        }
      }
    }
    
    return roots;
  }
  
  /**
   * Numerical integration using Simpson's rule
   */
  integrate(expression: string, range: [number, number], intervals: number = 1000): number {
    const func = this.compile(expression, 'x');
    if (!func) return NaN;
    
    const [a, b] = range;
    const n = intervals % 2 === 0 ? intervals : intervals + 1;
    const h = (b - a) / n;
    
    let sum = func.evaluate(a) + func.evaluate(b);
    
    for (let i = 1; i < n; i++) {
      const x = a + i * h;
      const y = func.evaluate(x);
      
      if (!isFinite(y)) return NaN;
      
      sum += (i % 2 === 0 ? 2 : 4) * y;
    }
    
    return (h / 3) * sum;
  }
  
  /**
   * Find extrema (local max/min)
   */
  findExtrema(expression: string, range: [number, number], steps: number = 100): Point[] {
    const func = this.compile(expression, 'x');
    if (!func?.derivative) return [];
    
    const extrema: Point[] = [];
    const [start, end] = range;
    const step = (end - start) / steps;
    
    for (let i = 0; i < steps; i++) {
      const x0 = start + i * step;
      const x1 = start + (i + 1) * step;
      
      const d0 = func.derivative(x0);
      const d1 = func.derivative(x1);
      
      // Check for sign change in derivative
      if (isFinite(d0) && isFinite(d1) && d0 * d1 < 0) {
        // Bisection to find critical point
        let a = x0;
        let b = x1;
        let da = d0;
        let db = d1;
        
        for (let j = 0; j < 50; j++) {
          const c = (a + b) / 2;
          const dc = func.derivative(c);
          
          if (!isFinite(dc) || Math.abs(b - a) < 1e-10) break;
          
          if (da * dc < 0) {
            b = c;
            db = dc;
          } else {
            a = c;
            da = dc;
          }
        }
        
        const x = (a + b) / 2;
        const y = func.evaluate(x);
        
        if (isFinite(x) && isFinite(y)) {
          extrema.push({ x, y });
        }
      }
    }
    
    return extrema;
  }
}

// Singleton instance
export const evaluator = new MathEvaluator();
