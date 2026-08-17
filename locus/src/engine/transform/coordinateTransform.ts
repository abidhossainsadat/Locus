import type { Point, Viewport } from '../../types';

/**
 * Coordinate Transformation Pipeline
 * Maps mathematical coordinates (R²) to screen pixel coordinates (Z²)
 */
export class Transform {
  private canvasWidth: number;
  private canvasHeight: number;
  private viewport: Viewport;
  
  // Transformation matrix components
  scaleX: number = 1;
  scaleY: number = 1;
  offsetX: number = 0;
  offsetY: number = 0;
  
  constructor(
    canvasWidth: number,
    canvasHeight: number,
    viewport: Viewport
  ) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.viewport = viewport;
    this.updateMatrix();
  }
  
  /**
   * Update transformation matrix when viewport changes
   */
  updateMatrix(): void {
    const dx = this.viewport.xMax - this.viewport.xMin;
    const dy = this.viewport.yMax - this.viewport.yMin;
    
    this.scaleX = this.canvasWidth / dx;
    this.scaleY = this.canvasHeight / dy;
    
    this.offsetX = -this.viewport.xMin * this.scaleX;
    this.offsetY = this.canvasHeight + this.viewport.yMin * this.scaleY;
  }
  
  /**
   * Transform mathematical coordinates to screen coordinates
   */
  mathToScreen(x: number, y: number): Point {
    return {
      x: x * this.scaleX + this.offsetX,
      y: this.offsetY - y * this.scaleY,
    };
  }
  
  /**
   * Transform screen coordinates to mathematical coordinates
   */
  screenToMath(sx: number, sy: number): Point {
    return {
      x: (sx - this.offsetX) / this.scaleX,
      y: (this.offsetY - sy) / this.scaleY,
    };
  }
  
  /**
   * Transform only X coordinate
   */
  mathXToScreenX(x: number): number {
    return x * this.scaleX + this.offsetX;
  }
  
  /**
   * Transform only Y coordinate
   */
  mathYToScreenY(y: number): number {
    return this.offsetY - y * this.scaleY;
  }
  
  /**
   * Get the current viewport
   */
  getViewport(): Viewport {
    return { ...this.viewport };
  }
  
  /**
   * Set the viewport
   */
  setViewport(viewport: Viewport): void {
    this.viewport = viewport;
    this.updateMatrix();
  }
  
  /**
   * Pan the viewport by a mathematical offset
   */
  pan(dx: number, dy: number): void {
    this.viewport = {
      xMin: this.viewport.xMin + dx,
      xMax: this.viewport.xMax + dx,
      yMin: this.viewport.yMin + dy,
      yMax: this.viewport.yMax + dy,
    };
    this.updateMatrix();
  }
  
  /**
   * Zoom around a specific point
   */
  zoom(factor: number, centerX?: number, centerY?: number): void {
    const cx = centerX ?? (this.viewport.xMin + this.viewport.xMax) / 2;
    const cy = centerY ?? (this.viewport.yMin + this.viewport.yMax) / 2;
    
    const newWidth = (this.viewport.xMax - this.viewport.xMin) / factor;
    const newHeight = (this.viewport.yMax - this.viewport.yMin) / factor;
    
    this.viewport = {
      xMin: cx - newWidth / 2,
      xMax: cx + newWidth / 2,
      yMin: cy - newHeight / 2,
      yMax: cy + newHeight / 2,
    };
    this.updateMatrix();
  }
  
  /**
   * Zoom using screen coordinates (for mouse wheel zoom)
   */
  zoomAtScreen(sx: number, sy: number, factor: number): void {
    const mathPoint = this.screenToMath(sx, sy);
    this.zoom(factor, mathPoint.x, mathPoint.y);
  }
  
  /**
   * Get scale (pixels per unit)
   */
  getScale(): { x: number; y: number } {
    return { x: this.scaleX, y: this.scaleY };
  }
  
  /**
   * Check if a mathematical point is within the viewport
   */
  isInViewport(x: number, y: number, margin: number = 0): boolean {
    return (
      x >= this.viewport.xMin - margin &&
      x <= this.viewport.xMax + margin &&
      y >= this.viewport.yMin - margin &&
      y <= this.viewport.yMax + margin
    );
  }
  
  /**
   * Calculate appropriate tick spacing for grid lines
   */
  getTickSpacing(range: number): number {
    const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
    const normalized = range / magnitude;
    
    let steps: number;
    if (normalized < 2) steps = 1;
    else if (normalized < 5) steps = 2;
    else steps = 5;
    
    return steps * magnitude;
  }
  
  /**
   * Generate tick positions for an axis
   */
  generateTicks(min: number, max: number, spacing?: number): number[] {
    if (!spacing) {
      spacing = this.getTickSpacing(max - min);
    }
    
    const start = Math.ceil(min / spacing) * spacing;
    const ticks: number[] = [];
    
    for (let v = start; v <= max; v += spacing) {
      // Round to avoid floating point errors
      ticks.push(Math.round(v * 1e10) / 1e10);
    }
    
    return ticks;
  }
  
  /**
   * Get the mathematical width of one pixel
   */
  getPixelWidth(): number {
    return 1 / this.scaleX;
  }
  
  /**
   * Get the mathematical height of one pixel
   */
  getPixelHeight(): number {
    return 1 / this.scaleY;
  }
}
