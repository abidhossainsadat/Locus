/**
 * Rendering Engine
 * Handles canvas drawing, grid lines, axes, and function curves
 */

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.colors = {
            background: '#1a1a2e',
            gridMajor: 'rgba(255, 255, 255, 0.3)',
            gridMinor: 'rgba(255, 255, 255, 0.1)',
            axis: 'rgba(255, 255, 255, 0.6)',
            text: '#aaaaaa',
            axisLabel: '#eeeeee'
        };
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * Resize canvas to match container
     */
    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
    }

    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * Draw the coordinate grid
     */
    drawGrid(transform, showMajor = true, showMinor = true) {
        const viewport = transform.getViewport();
        const { xMin, xMax, yMin, yMax } = viewport;
        
        // Calculate tick spacing
        const xSpacing = transform.getTickSpacing(xMax - xMin);
        const ySpacing = transform.getTickSpacing(yMax - yMin);
        
        // Minor grid spacing (5 subdivisions)
        const xMinorSpacing = xSpacing / 5;
        const yMinorSpacing = ySpacing / 5;
        
        this.ctx.lineWidth = 1;
        
        // Draw minor grid
        if (showMinor) {
            this.ctx.strokeStyle = this.colors.gridMinor;
            this.ctx.beginPath();
            
            // Vertical minor lines
            const xMinorStart = Math.ceil(xMin / xMinorSpacing) * xMinorSpacing;
            for (let x = xMinorStart; x <= xMax; x += xMinorSpacing) {
                const sx = transform.mathXToScreenX(x);
                this.ctx.moveTo(sx, 0);
                this.ctx.lineTo(sx, this.height);
            }
            
            // Horizontal minor lines
            const yMinorStart = Math.ceil(yMin / yMinorSpacing) * yMinorSpacing;
            for (let y = yMinorStart; y <= yMax; y += yMinorSpacing) {
                const sy = transform.mathYToScreenY(y);
                this.ctx.moveTo(0, sy);
                this.ctx.lineTo(this.width, sy);
            }
            
            this.ctx.stroke();
        }
        
        // Draw major grid
        if (showMajor) {
            this.ctx.strokeStyle = this.colors.gridMajor;
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            
            // Vertical major lines
            const xTicks = transform.generateTicks(xMin, xMax, xSpacing);
            for (const x of xTicks) {
                const sx = transform.mathXToScreenX(x);
                this.ctx.moveTo(sx, 0);
                this.ctx.lineTo(sx, this.height);
            }
            
            // Horizontal major lines
            const yTicks = transform.generateTicks(yMin, yMax, ySpacing);
            for (const y of yTicks) {
                const sy = transform.mathYToScreenY(y);
                this.ctx.moveTo(0, sy);
                this.ctx.lineTo(this.width, sy);
            }
            
            this.ctx.stroke();
        }
    }

    /**
     * Draw X and Y axes
     */
    drawAxes(transform) {
        const viewport = transform.getViewport();
        const { xMin, xMax, yMin, yMax } = viewport;
        
        this.ctx.strokeStyle = this.colors.axis;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        // X-axis (if in viewport)
        if (yMin <= 0 && yMax >= 0) {
            const y = transform.mathYToScreenY(0);
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
        }
        
        // Y-axis (if in viewport)
        if (xMin <= 0 && xMax >= 0) {
            const x = transform.mathXToScreenX(0);
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
        }
        
        this.ctx.stroke();
        
        // Draw axis labels
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '12px Segoe UI, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        
        const xSpacing = transform.getTickSpacing(xMax - xMin);
        const xTicks = transform.generateTicks(xMin, xMax, xSpacing);
        
        for (const x of xTicks) {
            if (Math.abs(x) < 1e-10) continue; // Skip origin
            
            const sx = transform.mathXToScreenX(x);
            const sy = yMin <= 0 && yMax >= 0 ? transform.mathYToScreenY(0) : this.height - 20;
            
            this.ctx.fillText(this.formatNumber(x), sx, sy + 5);
        }
        
        // Y-axis labels
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'middle';
        
        const ySpacing = transform.getTickSpacing(yMax - yMin);
        const yTicks = transform.generateTicks(yMin, yMax, ySpacing);
        
        for (const y of yTicks) {
            if (Math.abs(y) < 1e-10) continue; // Skip origin
            
            const sx = xMin <= 0 && xMax >= 0 ? transform.mathXToScreenX(0) : 20;
            const sy = transform.mathYToScreenY(y);
            
            this.ctx.fillText(this.formatNumber(y), sx - 5, sy);
        }
    }

    /**
     * Format numbers for display
     */
    formatNumber(num) {
        if (Math.abs(num) < 1e-6 || Math.abs(num) > 1e6) {
            return num.toExponential(1);
        }
        
        // Round to avoid floating point artifacts
        const rounded = Math.round(num * 1e10) / 1e10;
        
        if (Number.isInteger(rounded)) {
            return rounded.toString();
        }
        
        return rounded.toFixed(2).replace(/\.?0+$/, '');
    }

    /**
     * Draw a function curve
     * @param {Array} segments - Array of point arrays (from sampler)
     * @param {string} color - Line color
     * @param {number} lineWidth - Line width
     */
    drawCurve(segments, color = '#e94560', lineWidth = 2) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        for (const segment of segments) {
            if (segment.length < 2) continue;
            
            this.ctx.beginPath();
            
            const startPoint = segment[0];
            const screenStart = {
                x: startPoint.x * (this.width / (this.transform?.xMax - this.transform?.xMin)) + 
                   (this.transform?.offsetX || 0),
                y: (this.transform?.offsetY || this.height) - 
                   startPoint.y * (this.height / (this.transform?.yMax - this.transform?.yMin))
            };
            
            this.ctx.moveTo(screenStart.x, screenStart.y);
            
            for (let i = 1; i < segment.length; i++) {
                const point = segment[i];
                const screenPoint = {
                    x: point.x * (this.width / (this.transform?.xMax - this.transform?.xMin)) + 
                       (this.transform?.offsetX || 0),
                    y: (this.transform?.offsetY || this.height) - 
                       point.y * (this.height / (this.transform?.yMax - this.transform?.yMin))
                };
                
                this.ctx.lineTo(screenPoint.x, screenPoint.y);
            }
            
            this.ctx.stroke();
        }
    }

    /**
     * Draw a function curve with proper transform
     */
    drawCurveWithTransform(segments, transform, color = '#e94560', lineWidth = 2) {
        this.transform = transform;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        for (const segment of segments) {
            if (segment.length < 2) continue;
            
            this.ctx.beginPath();
            
            const start = transform.mathToScreen(segment[0].x, segment[0].y);
            this.ctx.moveTo(start.x, start.y);
            
            for (let i = 1; i < segment.length; i++) {
                const point = segment[i];
                const screen = transform.mathToScreen(point.x, point.y);
                this.ctx.lineTo(screen.x, screen.y);
            }
            
            this.ctx.stroke();
        }
    }

    /**
     * Draw a point
     */
    drawPoint(x, y, transform, color = '#ffffff', size = 5) {
        const screen = transform.mathToScreen(x, y);
        
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(screen.x, screen.y, size, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Draw text at mathematical coordinates
     */
    drawText(text, x, y, transform, options = {}) {
        const screen = transform.mathToScreen(x, y);
        
        this.ctx.fillStyle = options.color || this.colors.text;
        this.ctx.font = options.font || '12px Segoe UI, sans-serif';
        this.ctx.textAlign = options.align || 'left';
        this.ctx.textBaseline = options.baseline || 'bottom';
        
        this.ctx.fillText(text, screen.x, screen.y);
    }

    /**
     * Highlight a point with crosshair
     */
    drawCrosshair(x, y, transform, color = '#ffffff') {
        const screen = transform.mathToScreen(x, y);
        const size = 8;
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        
        // Horizontal line
        this.ctx.moveTo(screen.x - size, screen.y);
        this.ctx.lineTo(screen.x + size, screen.y);
        
        // Vertical line
        this.ctx.moveTo(screen.x, screen.y - size);
        this.ctx.lineTo(screen.x, screen.y + size);
        
        this.ctx.stroke();
    }

    /**
     * Draw tangent line at a point
     */
    drawTangent(fn, x, transform, color = '#00ff00', length = 1) {
        const h = 0.001;
        const y1 = fn(x - h);
        const y2 = fn(x + h);
        const slope = (y2 - y1) / (2 * h);
        const y = fn(x);
        
        const viewport = transform.getViewport();
        const xRange = viewport.xMax - viewport.xMin;
        
        const dx = length * xRange / 2;
        const xStart = x - dx;
        const xEnd = x + dx;
        const yStart = y - slope * dx;
        const yEnd = y + slope * dx;
        
        const screenStart = transform.mathToScreen(xStart, yStart);
        const screenEnd = transform.mathToScreen(xEnd, yEnd);
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(screenStart.x, screenStart.y);
        this.ctx.lineTo(screenEnd.x, screenEnd.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    /**
     * Shade area under curve
     */
    shadeArea(segments, transform, xMin, xMax, color = 'rgba(233, 69, 96, 0.3)') {
        if (segments.length === 0) return;
        
        const segment = segments[0];
        if (segment.length < 2) return;
        
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        
        // Find points within range
        const points = segment.filter(p => p.x >= xMin && p.x <= xMax);
        if (points.length < 2) return;
        
        const start = transform.mathToScreen(points[0].x, points[0].y);
        this.ctx.moveTo(start.x, start.y);
        
        for (let i = 1; i < points.length; i++) {
            const screen = transform.mathToScreen(points[i].x, points[i].y);
            this.ctx.lineTo(screen.x, screen.y);
        }
        
        // Close to x-axis
        const lastPoint = points[points.length - 1];
        const firstPoint = points[0];
        const screenLastX = transform.mathToScreen(lastPoint.x, 0);
        const screenFirstX = transform.mathToScreen(firstPoint.x, 0);
        
        this.ctx.lineTo(screenLastX.x, screenLastX.y);
        this.ctx.lineTo(screenFirstX.x, screenFirstX.y);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * Full render pass
     */
    render(transform, functions, options = {}) {
        this.clear();
        
        if (options.showGrid !== false) {
            this.drawGrid(transform, true, true);
        }
        
        if (options.showAxes !== false) {
            this.drawAxes(transform);
        }
        
        // Draw all function curves
        for (const func of functions) {
            if (func.visible && func.segments) {
                this.drawCurveWithTransform(func.segments, transform, func.color, func.lineWidth || 2);
            }
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Renderer;
}
