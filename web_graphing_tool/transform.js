/**
 * Coordinate Transformation Pipeline
 * Maps mathematical coordinates (R²) to screen pixel coordinates (Z²)
 */

class Transform {
    constructor(canvasWidth, canvasHeight, xMin, xMax, yMin, yMax) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.xMin = xMin;
        this.xMax = xMax;
        this.yMin = yMin;
        this.yMax = yMax;
        this.updateMatrix();
    }

    /**
     * Update transformation matrix when viewport changes
     */
    updateMatrix() {
        const dx = this.xMax - this.xMin;
        const dy = this.yMax - this.yMin;
        
        // Transformation matrix components (3x3 affine transform)
        // [ scaleX, 0,      offsetX ]
        // [ 0,      -scaleY, offsetY ]
        // [ 0,      0,      1       ]
        
        this.scaleX = this.canvasWidth / dx;
        this.scaleY = this.canvasHeight / dy;
        
        this.offsetX = -this.xMin * this.scaleX;
        this.offsetY = this.canvasHeight + this.yMin * this.scaleY;
    }

    /**
     * Transform mathematical coordinates to screen coordinates
     * @param {number} x - Mathematical X coordinate
     * @param {number} y - Mathematical Y coordinate
     * @returns {{x: number, y: number}} Screen pixel coordinates
     */
    mathToScreen(x, y) {
        return {
            x: x * this.scaleX + this.offsetX,
            y: this.offsetY - y * this.scaleY
        };
    }

    /**
     * Transform screen coordinates to mathematical coordinates
     * @param {number} sx - Screen X coordinate (pixels)
     * @param {number} sy - Screen Y coordinate (pixels)
     * @returns {{x: number, y: number}} Mathematical coordinates
     */
    screenToMath(sx, sy) {
        return {
            x: (sx - this.offsetX) / this.scaleX,
            y: (this.offsetY - sy) / this.scaleY
        };
    }

    /**
     * Transform only X coordinate (for function plotting)
     */
    mathXToScreenX(x) {
        return x * this.scaleX + this.offsetX;
    }

    /**
     * Transform only Y coordinate
     */
    mathYToScreenY(y) {
        return this.offsetY - y * this.scaleY;
    }

    /**
     * Get the mathematical range covered by the current viewport
     */
    getViewport() {
        return {
            xMin: this.xMin,
            xMax: this.xMax,
            yMin: this.yMin,
            yMax: this.yMax,
            width: this.xMax - this.xMin,
            height: this.yMax - this.yMin
        };
    }

    /**
     * Pan the viewport by a mathematical offset
     */
    pan(dx, dy) {
        this.xMin += dx;
        this.xMax += dx;
        this.yMin += dy;
        this.yMax += dy;
        this.updateMatrix();
    }

    /**
     * Zoom around a specific point
     * @param {number} centerX - Mathematical X coordinate to zoom around
     * @param {number} centerY - Mathematical Y coordinate to zoom around
     * @param {number} factor - Zoom factor (>1 to zoom in, <1 to zoom out)
     */
    zoom(centerX, centerY, factor) {
        const newWidth = (this.xMax - this.xMin) / factor;
        const newHeight = (this.yMax - this.yMin) / factor;
        
        // Calculate new bounds centered on the zoom point
        this.xMin = centerX - newWidth / 2;
        this.xMax = centerX + newWidth / 2;
        this.yMin = centerY - newHeight / 2;
        this.yMax = centerY + newHeight / 2;
        
        this.updateMatrix();
    }

    /**
     * Zoom using screen coordinates (for mouse wheel zoom)
     */
    zoomAtScreen(sx, sy, factor) {
        const mathPoint = this.screenToMath(sx, sy);
        this.zoom(mathPoint.x, mathPoint.y, factor);
    }

    /**
     * Set explicit viewport bounds
     */
    setViewport(xMin, xMax, yMin, yMax) {
        this.xMin = xMin;
        this.xMax = xMax;
        this.yMin = yMin;
        this.yMax = yMax;
        this.updateMatrix();
    }

    /**
     * Reset to default viewport
     */
    reset() {
        this.setViewport(-10, 10, -10, 10);
    }

    /**
     * Get scale (pixels per unit)
     */
    getScale() {
        return {
            x: this.scaleX,
            y: this.scaleY
        };
    }

    /**
     * Check if a mathematical point is within the viewport
     */
    isInViewport(x, y, margin = 0) {
        return x >= this.xMin - margin && 
               x <= this.xMax + margin && 
               y >= this.yMin - margin && 
               y <= this.yMax + margin;
    }

    /**
     * Calculate appropriate tick spacing for grid lines
     */
    getTickSpacing(range) {
        const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
        const normalized = range / magnitude;
        
        let steps;
        if (normalized < 2) steps = 1;
        else if (normalized < 5) steps = 2;
        else steps = 5;
        
        return steps * magnitude;
    }

    /**
     * Generate tick positions for an axis
     */
    generateTicks(min, max, spacing = null) {
        if (!spacing) {
            spacing = this.getTickSpacing(max - min);
        }
        
        const start = Math.ceil(min / spacing) * spacing;
        const ticks = [];
        
        for (let v = start; v <= max; v += spacing) {
            // Round to avoid floating point errors
            ticks.push(Math.round(v * 1e10) / 1e10);
        }
        
        return ticks;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Transform;
}
