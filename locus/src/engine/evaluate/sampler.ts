import type { Point, Viewport } from '../../types';
import { Transform } from '../transform/coordinateTransform';

/**
 * Adaptive Sampling Engine
 * Handles function sampling with discontinuity detection and adaptive refinement
 */
export class Sampler {
  // Configuration
  private maxRecursionDepth: number = 8;
  private minStepSize: number = 1e-6;
  private curvatureThreshold: number = 0.1;
  private asymptoteThreshold: number = 100;
  private initialSamples: number = 200;
  
  /**
   * Sample a function over a domain with adaptive refinement
   */
  sampleFunction(
    fn: (x: number) => number,
    xMin: number,
    xMax: number,
    transform: Transform
  ): Point[][] {
    const segments: Point[][] = [];
    const viewport = transform.getViewport();
    const yRange = viewport.yMax - viewport.yMin;
    
    // Initial uniform sampling
    const initialPoints: Array<{ x: number; y: number; valid: boolean }> = [];
    const step = (xMax - xMin) / this.initialSamples;
    
    for (let i = 0; i <= this.initialSamples; i++) {
      const x = xMin + i * step;
      const y = this.safeEvaluate(fn, x);
      initialPoints.push({ x, y, valid: this.isValid(y) });
    }
    
    // Detect discontinuities and create initial segments
    const ranges = this.detectDiscontinuities(initialPoints, yRange);
    
    // Sample each continuous range with adaptive refinement
    for (const range of ranges) {
      if (!range.valid) continue;
      
      const points = this.adaptiveSample(
        fn,
        range.xMin,
        range.xMax,
        transform,
        0
      );
      
      if (points.length > 1) {
        segments.push(points);
      }
    }
    
    return segments;
  }
  
  /**
   * Safely evaluate a function, catching errors
   */
  private safeEvaluate(fn: (x: number) => number, x: number): number {
    try {
      const result = fn(x);
      if (!isFinite(result) || isNaN(result)) {
        return NaN;
      }
      return result;
    } catch {
      return NaN;
    }
  }
  
  /**
   * Check if a value is valid for plotting
   */
  private isValid(y: number): boolean {
    return isFinite(y) && !isNaN(y);
  }
  
  /**
   * Detect discontinuities in sampled points
   */
  private detectDiscontinuities(
    points: Array<{ x: number; y: number; valid: boolean }>,
    yRange: number
  ): Array<{ xMin: number; xMax: number; valid: boolean }> {
    const ranges: Array<{ xMin: number; xMax: number; valid: boolean }> = [];
    let rangeStart: number | null = null;
    
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const prevPoint = i > 0 ? points[i - 1] : null;
      
      let isValid = point.valid;
      
      // Check for asymptotes between this point and previous
      if (prevPoint && prevPoint.valid && point.valid) {
        const dy = Math.abs(point.y - prevPoint.y);
        const dx = Math.abs(point.x - prevPoint.x);
        
        // Large slope indicates possible asymptote
        if (dy > this.asymptoteThreshold * yRange && dx > 0) {
          // Check for sign change (vertical asymptote indicator)
          if ((prevPoint.y > 0 && point.y < 0) || (prevPoint.y < 0 && point.y > 0)) {
            isValid = false;
          }
        }
      }
      
      if (isValid) {
        if (rangeStart === null) {
          rangeStart = point.x;
        }
      } else {
        if (rangeStart !== null && prevPoint) {
          ranges.push({
            xMin: rangeStart,
            xMax: prevPoint.x,
            valid: true,
          });
          rangeStart = null;
        }
      }
    }
    
    // Close final range
    if (rangeStart !== null && points.length > 0) {
      ranges.push({
        xMin: rangeStart,
        xMax: points[points.length - 1].x,
        valid: true,
      });
    }
    
    return ranges;
  }
  
  /**
   * Adaptive sampling with curvature-based refinement
   */
  private adaptiveSample(
    fn: (x: number) => number,
    xMin: number,
    xMax: number,
    transform: Transform,
    depth: number
  ): Point[] {
    const points: Point[] = [];
    const midpoint = (xMin + xMax) / 2;
    
    // Evaluate endpoints and midpoint
    const y1 = this.safeEvaluate(fn, xMin);
    const y2 = this.safeEvaluate(fn, midpoint);
    const y3 = this.safeEvaluate(fn, xMax);
    
    const valid1 = this.isValid(y1);
    const valid2 = this.isValid(y2);
    const valid3 = this.isValid(y3);
    
    // If any point is invalid, subdivide
    if (!valid1 || !valid2 || !valid3) {
      if (depth < this.maxRecursionDepth && (xMax - xMin) > this.minStepSize) {
        const left = this.adaptiveSample(fn, xMin, midpoint, transform, depth + 1);
        const right = this.adaptiveSample(fn, midpoint, xMax, transform, depth + 1);
        return this.mergePoints(left, right);
      }
      // Return valid endpoints only
      if (valid1) points.push({ x: xMin, y: y1 });
      if (valid3 && xMax !== xMin) points.push({ x: xMax, y: y3 });
      return points;
    }
    
    // Calculate curvature estimate using second derivative approximation
    const dx = (xMax - xMin) / 2;
    const firstDeriv1 = (y2 - y1) / dx;
    const firstDeriv2 = (y3 - y2) / dx;
    const secondDeriv = (firstDeriv2 - firstDeriv1) / dx;
    
    // Curvature formula: |f''| / (1 + f'^2)^(3/2)
    const avgFirstDeriv = (firstDeriv1 + firstDeriv2) / 2;
    const curvature = Math.abs(secondDeriv) / Math.pow(1 + avgFirstDeriv * avgFirstDeriv, 1.5);
    
    // Check if refinement is needed
    const needsRefinement =
      curvature > this.curvatureThreshold ||
      depth < 2 ||
      (xMax - xMin) > this.getPixelWidth(transform);
    
    if (needsRefinement && depth < this.maxRecursionDepth && (xMax - xMin) > this.minStepSize) {
      const left = this.adaptiveSample(fn, xMin, midpoint, transform, depth + 1);
      const right = this.adaptiveSample(fn, midpoint, xMax, transform, depth + 1);
      return this.mergePoints(left, right);
    }
    
    // Return the three points
    points.push({ x: xMin, y: y1 });
    points.push({ x: midpoint, y: y2 });
    points.push({ x: xMax, y: y3 });
    
    return points;
  }
  
  /**
   * Get the mathematical width of one pixel
   */
  private getPixelWidth(transform: Transform): number {
    const scale = transform.getScale();
    return 1 / scale.x;
  }
  
  /**
   * Merge two point arrays, avoiding duplicates
   */
  private mergePoints(left: Point[], right: Point[]): Point[] {
    if (left.length === 0) return right;
    if (right.length === 0) return left;
    
    // Remove duplicate midpoint
    const leftEnd = left[left.length - 1];
    const rightStart = right[0];
    
    if (Math.abs(leftEnd.x - rightStart.x) < 1e-10) {
      return [...left.slice(0, -1), ...right];
    }
    
    return [...left, ...right];
  }
  
  /**
   * Sample parametric equations
   */
  sampleParametric(
    xFn: (t: number) => number,
    yFn: (t: number) => number,
    tMin: number,
    tMax: number,
    transform: Transform
  ): Point[][] {
    const points: Point[][] = [];
    const numSamples = Math.max(200, (tMax - tMin) * 50);
    const step = (tMax - tMin) / numSamples;
    
    let currentSegment: Point[] = [];
    
    for (let i = 0; i <= numSamples; i++) {
      const t = tMin + i * step;
      const x = this.safeEvaluate(xFn, t);
      const y = this.safeEvaluate(yFn, t);
      
      if (this.isValid(x) && this.isValid(y)) {
        currentSegment.push({ x, y });
      } else {
        if (currentSegment.length > 1) {
          points.push(currentSegment);
        }
        currentSegment = [];
      }
    }
    
    if (currentSegment.length > 1) {
      points.push(currentSegment);
    }
    
    return points;
  }
  
  /**
   * Sample polar equations
   */
  samplePolar(
    rFn: (theta: number) => number,
    thetaMin: number,
    thetaMax: number,
    transform: Transform
  ): Point[][] {
    const xFn = (theta: number) => {
      const r = rFn(theta);
      return r * Math.cos(theta);
    };
    
    const yFn = (theta: number) => {
      const r = rFn(theta);
      return r * Math.sin(theta);
    };
    
    return this.sampleParametric(xFn, yFn, thetaMin, thetaMax, transform);
  }
}
