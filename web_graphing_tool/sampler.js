/**
 * Adaptive Sampling Engine
 * Handles function sampling with discontinuity detection and adaptive refinement
 */

class Sampler {
    constructor() {
        // Configuration
        this.maxRecursionDepth = 8;
        this.minStepSize = 1e-6;
        this.curvatureThreshold = 0.1;
        this.asymptoteThreshold = 100;
        this.initialSamples = 100;
    }

    /**
     * Sample a function over a domain with adaptive refinement
     * @param {Function} fn - Compiled function evaluator
     * @param {number} xMin - Domain start
     * @param {number} xMax - Domain end
     * @param {Transform} transform - Coordinate transformer
     * @returns {Array} Array of line segments (to handle discontinuities)
     */
    sampleFunction(fn, xMin, xMax, transform) {
        const segments = [];
        const viewport = transform.getViewport();
        const yRange = viewport.yMax - viewport.yMin;
        
        // Initial uniform sampling
        const initialPoints = [];
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
    safeEvaluate(fn, x) {
        try {
            const result = fn(x);
            if (!isFinite(result) || isNaN(result)) {
                return NaN;
            }
            return result;
        } catch (e) {
            return NaN;
        }
    }

    /**
     * Check if a value is valid for plotting
     */
    isValid(y) {
        return isFinite(y) && !isNaN(y);
    }

    /**
     * Detect discontinuities in sampled points
     */
    detectDiscontinuities(points, yRange) {
        const ranges = [];
        let rangeStart = null;
        
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
                    if ((prevPoint.y > 0 && point.y < 0) || 
                        (prevPoint.y < 0 && point.y > 0)) {
                        isValid = false;
                    }
                }
            }
            
            if (isValid) {
                if (rangeStart === null) {
                    rangeStart = point.x;
                }
            } else {
                if (rangeStart !== null) {
                    ranges.push({
                        xMin: rangeStart,
                        xMax: prevPoint ? prevPoint.x : point.x,
                        valid: true
                    });
                    rangeStart = null;
                }
                // Add invalid range marker
                ranges.push({
                    xMin: point.x,
                    xMax: point.x,
                    valid: false
                });
            }
        }
        
        // Close final range
        if (rangeStart !== null && points.length > 0) {
            ranges.push({
                xMin: rangeStart,
                xMax: points[points.length - 1].x,
                valid: true
            });
        }
        
        return ranges;
    }

    /**
     * Adaptive sampling with curvature-based refinement
     */
    adaptiveSample(fn, xMin, xMax, transform, depth) {
        const points = [];
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
        const needsRefinement = curvature > this.curvatureThreshold || 
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
    getPixelWidth(transform) {
        const scale = transform.getScale();
        return 1 / scale.x;
    }

    /**
     * Merge two point arrays, avoiding duplicates
     */
    mergePoints(left, right) {
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
     * @param {Function} xFn - X component function of t
     * @param {Function} yFn - Y component function of t
     * @param {number} tMin - Parameter start
     * @param {number} tMax - Parameter end
     * @param {Transform} transform - Coordinate transformer
     */
    sampleParametric(xFn, yFn, tMin, tMax, transform) {
        const points = [];
        const numSamples = Math.max(200, (tMax - tMin) * 50);
        const step = (tMax - tMin) / numSamples;
        
        let currentSegment = [];
        
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
     * @param {Function} rFn - Radius function of theta
     * @param {number} thetaMin - Angle start (radians)
     * @param {number} thetaMax - Angle end (radians)
     * @param {Transform} transform - Coordinate transformer
     */
    samplePolar(rFn, thetaMin, thetaMax, transform) {
        const numSamples = Math.max(360, (thetaMax - thetaMin) * 50);
        const step = (thetaMax - thetaMin) / numSamples;
        
        const xFn = (theta) => {
            const r = rFn(theta);
            return r * Math.cos(theta);
        };
        
        const yFn = (theta) => {
            const r = rFn(theta);
            return r * Math.sin(theta);
        };
        
        return this.sampleParametric(xFn, yFn, thetaMin, thetaMax, transform);
    }

    /**
     * Sample for implicit curve using Marching Squares
     * @param {Function} fn - Function F(x,y) where curve is F(x,y) = 0
     * @param {Transform} transform - Coordinate transformer
     * @param {number} resolution - Grid resolution
     */
    sampleImplicit(fn, transform, resolution = 200) {
        const viewport = transform.getViewport();
        const { xMin, xMax, yMin, yMax } = viewport;
        
        const cellWidth = (xMax - xMin) / resolution;
        const cellHeight = (yMax - yMin) / resolution;
        
        // Create grid of values
        const grid = [];
        for (let j = 0; j <= resolution; j++) {
            grid[j] = [];
            for (let i = 0; i <= resolution; i++) {
                const x = xMin + i * cellWidth;
                const y = yMin + j * cellHeight;
                grid[j][i] = this.safeEvaluate(() => fn(x, y), 0);
            }
        }
        
        // Marching squares
        const segments = [];
        let currentSegment = null;
        
        for (let j = 0; j < resolution; j++) {
            for (let i = 0; i < resolution; i++) {
                const v00 = grid[j][i];
                const v10 = grid[j][i + 1];
                const v01 = grid[j + 1][i];
                const v11 = grid[j + 1][i + 1];
                
                // Calculate marching squares index
                let index = 0;
                if (v00 >= 0) index |= 1;
                if (v10 >= 0) index |= 2;
                if (v11 >= 0) index |= 4;
                if (v01 >= 0) index |= 8;
                
                if (index === 0 || index === 15) continue;
                
                const x0 = xMin + i * cellWidth;
                const y0 = yMin + j * cellHeight;
                
                // Interpolate edge crossings
                const edges = this.getEdgeCrossings(index, x0, y0, cellWidth, cellHeight, 
                    v00, v10, v01, v11);
                
                for (const edge of edges) {
                    if (this.isValid(edge.x) && this.isValid(edge.y)) {
                        segments.push([edge]);
                    }
                }
            }
        }
        
        return segments;
    }

    /**
     * Get edge crossings for marching squares
     */
    getEdgeCrossings(index, x0, y0, w, h, v00, v10, v01, v11) {
        const crossings = [];
        
        const lerp = (a, b, t) => a + t * (b - a);
        const interpolateX = (v1, v2) => {
            const t = Math.abs(v1) / (Math.abs(v1) + Math.abs(v2));
            return t;
        };
        
        // Edge definitions based on marching squares lookup table
        const edges = [
            // Bottom edge
            { x: x0 + interpolateX(v00, v10) * w, y: y0 },
            // Right edge
            { x: x0 + w, y: y0 + interpolateX(v10, v11) * h },
            // Top edge
            { x: x0 + interpolateX(v01, v11) * w, y: y0 + h },
            // Left edge
            { x: x0, y: y0 + interpolateX(v00, v01) * h }
        ];
        
        const edgeTable = [
            [],
            [0, 3],
            [1, 0],
            [1, 3],
            [2, 1],
            [0, 2, 3],
            [0, 2],
            [2, 3],
            [3, 2],
            [0, 3, 2],
            [0, 1, 2],
            [1, 2, 3],
            [1, 2],
            [1, 3, 2],
            [0, 1],
            []
        ];
        
        const result = [];
        for (const edgeIdx of edgeTable[index]) {
            result.push(edges[edgeIdx]);
        }
        
        return result;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sampler;
}
