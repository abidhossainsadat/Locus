import { useEffect, useRef, useState, useCallback } from 'react';
import { useGraphStore } from '../../store/graphStore';
import { Transform } from '../../engine/transform/coordinateTransform';
import { CanvasRenderer } from '../../engine/renderer/canvasRenderer';
import { Sampler } from '../../engine/evaluate/sampler';
import { evaluator } from '../../engine/evaluate/mathEvaluator';
import type { Point } from '../../types';

export function GraphCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef<Transform | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const animationFrameRef = useRef<number>(0);
  
  const [mouseCoords, setMouseCoords] = useState<Point>({ x: 0, y: 0 });
  const [fps, setFps] = useState(60);
  
  const {
    functions,
    viewport,
    showGrid,
    showAxes,
    selectedPoint,
    showTangent,
    showIntegral,
    integralRange,
    panViewport,
    zoomViewport,
    updateFunction,
  } = useGraphStore();
  
  const isDragging = useRef(false);
  const lastMousePos = useRef<Point>({ x: 0, y: 0 });
  const lastFpsTime = useRef(performance.now());
  const frameCount = useRef(0);
  
  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current) return;
    
    rendererRef.current = new CanvasRenderer(canvasRef.current);
    
    const rect = canvasRef.current.getBoundingClientRect();
    transformRef.current = new Transform(
      rect.width,
      rect.height,
      viewport
    );
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  // Update transform when viewport changes
  useEffect(() => {
    if (transformRef.current) {
      transformRef.current.setViewport(viewport);
      render();
    }
  }, [viewport]);
  
  // Process functions and sample them
  const processFunctions = useCallback(() => {
    if (!transformRef.current) return [];
    
    const sampler = new Sampler();
    const transform = transformRef.current;
    const vp = transform.getViewport();
    
    return functions.map((func) => {
      try {
        if (func.mode === 'cartesian' && func.expression) {
          const compiled = evaluator.compile(func.expression, 'x');
          if (compiled) {
            const segments = sampler.sampleFunction(
              compiled.evaluate,
              vp.xMin,
              vp.xMax,
              transform
            );
            
            updateFunction(func.id, { 
              segments, 
              compiled: { evaluate: compiled.evaluate, derivative: compiled.derivative },
              error: null 
            });
            
            return { ...func, segments, visible: func.visible };
          }
        } else if (func.mode === 'parametric' && func.expressionX && func.expressionY) {
          const compiledX = evaluator.compile(func.expressionX, 't');
          const compiledY = evaluator.compile(func.expressionY, 't');
          
          if (compiledX && compiledY) {
            const tMin = func.tMin ?? 0;
            const tMax = func.tMax ?? 2 * Math.PI;
            
            const segments = sampler.sampleParametric(
              compiledX.evaluate,
              compiledY.evaluate,
              tMin,
              tMax,
              transform
            );
            
            updateFunction(func.id, { segments, error: null });
            return { ...func, segments, visible: func.visible };
          }
        } else if (func.mode === 'polar' && func.expression) {
          const compiled = evaluator.compile(func.expression, 'theta');
          if (compiled) {
            const segments = sampler.samplePolar(
              compiled.evaluate,
              0,
              2 * Math.PI,
              transform
            );
            
            updateFunction(func.id, { segments, error: null });
            return { ...func, segments, visible: func.visible };
          }
        }
        
        return { ...func, segments: [], visible: func.visible };
      } catch (error) {
        updateFunction(func.id, { segments: [], error: 'Invalid expression' });
        return { ...func, segments: [], visible: func.visible };
      }
    });
  }, [functions, updateFunction]);
  
  // Render loop
  const render = useCallback(() => {
    if (!rendererRef.current || !transformRef.current) return;
    
    const renderer = rendererRef.current;
    const transform = transformRef.current;
    
    const processedFunctions = processFunctions();
    
    renderer.render(transform, processedFunctions, { showGrid, showAxes });
    
    // Draw selected point
    if (selectedPoint) {
      renderer.drawCrosshair(selectedPoint.x, selectedPoint.y, transform);
      renderer.drawPoint(selectedPoint.x, selectedPoint.y, transform, '#3b82f6', 6);
      
      // Draw tangent if enabled
      if (showTangent) {
        const func = functions.find(f => f.compiled?.derivative);
        if (func?.compiled?.derivative) {
          const fn = (x: number) => {
            const compiled = evaluator.compile(func.expression, 'x');
            return compiled?.evaluate(x) ?? NaN;
          };
          renderer.drawTangent(fn, func.compiled.derivative, selectedPoint.x, transform);
        }
      }
      
      // Show coordinates
      renderer.drawText(
        `(${selectedPoint.x.toFixed(4)}, ${selectedPoint.y.toFixed(4)})`,
        selectedPoint.x,
        selectedPoint.y,
        transform,
        { color: '#c9d1d9', align: 'left', baseline: 'bottom' }
      );
    }
    
    // Shade integral area if enabled
    if (showIntegral && functions.length > 0) {
      const func = functions[0];
      if (func.segments.length > 0) {
        renderer.shadeArea(
          func.segments,
          transform,
          integralRange[0],
          integralRange[1]
        );
      }
    }
    
    // FPS counter
    frameCount.current++;
    const now = performance.now();
    if (now - lastFpsTime.current >= 1000) {
      setFps(frameCount.current);
      frameCount.current = 0;
      lastFpsTime.current = now;
    }
  }, [processFunctions, showGrid, showAxes, selectedPoint, showTangent, showIntegral, integralRange, functions]);
  
  // Animation loop
  useEffect(() => {
    const animate = () => {
      render();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);
  
  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    canvasRef.current?.classList.add('canvas-grabbing');
    canvasRef.current?.classList.remove('canvas-grab');
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!transformRef.current || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const mathCoords = transformRef.current.screenToMath(mouseX, mouseY);
    setMouseCoords({ x: mathCoords.x, y: mathCoords.y });
    
    if (isDragging.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      
      const mathDx = -dx / transformRef.current.scaleX;
      const mathDy = dy / transformRef.current.scaleY;
      
      panViewport(mathDx, mathDy);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };
  
  const handleMouseUp = () => {
    isDragging.current = false;
    canvasRef.current?.classList.remove('canvas-grabbing');
    canvasRef.current?.classList.add('canvas-grab');
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!transformRef.current || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    zoomViewport(factor, undefined, undefined);
  };
  
  const handleClick = (e: React.MouseEvent) => {
    if (!transformRef.current || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const mathCoords = transformRef.current.screenToMath(mouseX, mouseY);
    useGraphStore.getState().setSelectedPoint(mathCoords);
  };
  
  return (
    <div className="relative flex-1 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="canvas-grab w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
      />
      
      {/* Coordinates display */}
      <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-2 rounded text-sm font-mono">
        x: {mouseCoords.x.toFixed(4)}, y: {mouseCoords.y.toFixed(4)}
      </div>
      
      {/* FPS counter */}
      <div className="absolute bottom-4 right-4 bg-black/70 px-3 py-2 rounded text-sm">
        FPS: {fps}
      </div>
      
      {/* Zoom controls */}
      <div className="absolute bottom-20 right-4 flex flex-col gap-2">
        <button
          onClick={() => zoomViewport(1.5)}
          className="w-10 h-10 rounded-full bg-locus-panel hover:bg-locus-border transition-colors flex items-center justify-center text-xl"
        >
          +
        </button>
        <button
          onClick={() => zoomViewport(0.67)}
          className="w-10 h-10 rounded-full bg-locus-panel hover:bg-locus-border transition-colors flex items-center justify-center text-xl"
        >
          −
        </button>
        <button
          onClick={() => useGraphStore.getState().resetViewport()}
          className="w-10 h-10 rounded-full bg-locus-panel hover:bg-locus-border transition-colors flex items-center justify-center text-sm"
        >
          ⌂
        </button>
      </div>
    </div>
  );
}
