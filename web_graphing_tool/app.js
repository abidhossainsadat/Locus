/**
 * Main Application Controller
 * Ties together all modules and handles user interaction
 */

class GraphingApp {
    constructor() {
        // Initialize components
        this.parser = new Parser();
        this.transform = null;
        this.sampler = new Sampler();
        this.renderer = null;
        
        // State
        this.functions = [];
        this.mode = 'cartesian'; // cartesian, parametric, polar
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };
        this.animationFrame = null;
        
        // Default colors for functions
        this.defaultColors = [
            '#e94560', '#00d9ff', '#00ff88', '#ffcc00', 
            '#ff6b6b', '#4ecdc4', '#a78bfa', '#f472b6'
        ];
        this.colorIndex = 0;
        
        // DOM Elements
        this.canvas = document.getElementById('graphCanvas');
        this.sidebar = document.getElementById('sidebar');
        this.functionList = document.getElementById('functionList');
        this.coordsDisplay = document.getElementById('coordsDisplay');
        this.overlay = document.getElementById('overlay');
        
        // Initialize
        this.init();
    }

    init() {
        // Setup renderer
        this.renderer = new Renderer(this.canvas);
        
        // Get canvas dimensions for initial transform
        const rect = this.canvas.getBoundingClientRect();
        this.transform = new Transform(
            rect.width, rect.height,
            -10, 10, -10, 10
        );
        
        // Add default function
        this.addFunction('sin(x)');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initial render
        this.render();
    }

    setupEventListeners() {
        // Canvas interactions
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onMouseUp());
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        
        // Touch support
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.onMouseUp());
        
        // Header buttons
        document.getElementById('resetViewBtn').addEventListener('click', () => this.resetView());
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAllFunctions());
        
        // Zoom controls
        document.getElementById('zoomInBtn').addEventListener('click', () => this.zoom(1.5));
        document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoom(0.67));
        document.getElementById('zoomHomeBtn').addEventListener('click', () => this.resetView());
        
        // Add function button
        document.getElementById('addFunctionBtn').addEventListener('click', () => this.addFunction());
        
        // Mode selector
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setMode(e.target.dataset.mode));
        });
        
        // Range inputs
        ['xMin', 'xMax', 'yMin', 'yMax'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.updateViewportFromInputs());
        });
        
        // Grid/Axes toggles
        document.getElementById('showGrid').addEventListener('change', () => this.render());
        document.getElementById('showAxes').addEventListener('change', () => this.render());
        
        // Mobile toggle
        document.getElementById('mobileToggle').addEventListener('click', () => this.toggleSidebar());
        this.overlay.addEventListener('click', () => this.toggleSidebar());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    /**
     * Add a new function to the list
     */
    addFunction(expr = '') {
        const id = Date.now();
        const color = this.defaultColors[this.colorIndex % this.defaultColors.length];
        this.colorIndex++;
        
        const func = {
            id,
            expression: expr,
            compiledX: null,
            compiledY: null,
            color,
            visible: true,
            segments: [],
            error: false,
            mode: this.mode
        };
        
        this.functions.push(func);
        this.renderFunctionList();
        
        if (expr) {
            this.updateFunction(func);
        }
        
        return func;
    }

    /**
     * Remove a function
     */
    removeFunction(id) {
        this.functions = this.functions.filter(f => f.id !== id);
        this.renderFunctionList();
        this.render();
    }

    /**
     * Toggle function visibility
     */
    toggleVisibility(id) {
        const func = this.functions.find(f => f.id === id);
        if (func) {
            func.visible = !func.visible;
            this.render();
            this.renderFunctionList();
        }
    }

    /**
     * Update function color
     */
    updateColor(id, color) {
        const func = this.functions.find(f => f.id === id);
        if (func) {
            func.color = color;
            this.render();
        }
    }

    /**
     * Update function expression and recompile
     */
    updateExpression(id, expr) {
        const func = this.functions.find(f => f.id === id);
        if (func) {
            func.expression = expr;
            this.updateFunction(func);
        }
    }

    /**
     * Compile and sample a function
     */
    updateFunction(func) {
        const viewport = this.transform.getViewport();
        
        if (this.mode === 'cartesian') {
            const result = this.parser.parseAndCompile(func.expression, 'x');
            
            if (result.valid) {
                func.compiledX = result.fn;
                func.error = false;
                func.segments = this.sampler.sampleFunction(
                    func.compiledX,
                    viewport.xMin,
                    viewport.xMax,
                    this.transform
                );
            } else {
                func.error = true;
                func.compiledX = null;
                func.segments = [];
            }
        } else if (this.mode === 'parametric') {
            // Expect format: x(t), y(t) or just x(t) with y implicit
            const parts = func.expression.split(',').map(s => s.trim());
            
            if (parts.length >= 2) {
                const resultX = this.parser.parseAndCompile(parts[0], 't');
                const resultY = this.parser.parseAndCompile(parts[1], 't');
                
                if (resultX.valid && resultY.valid) {
                    func.compiledX = resultX.fn;
                    func.compiledY = resultY.fn;
                    func.error = false;
                    func.segments = this.sampler.sampleParametric(
                        func.compiledX,
                        func.compiledY,
                        0,
                        2 * Math.PI,
                        this.transform
                    );
                } else {
                    func.error = true;
                    func.segments = [];
                }
            }
        } else if (this.mode === 'polar') {
            const result = this.parser.parseAndCompile(func.expression, 'theta');
            
            if (result.valid) {
                func.compiledX = result.fn;
                func.error = false;
                func.segments = this.sampler.samplePolar(
                    func.compiledX,
                    0,
                    2 * Math.PI,
                    this.transform
                );
            } else {
                func.error = true;
                func.compiledX = null;
                func.segments = [];
            }
        }
        
        this.render();
        this.renderFunctionList();
    }

    /**
     * Render the function list UI
     */
    renderFunctionList() {
        this.functionList.innerHTML = '';
        
        for (const func of this.functions) {
            const item = document.createElement('div');
            item.className = 'function-item';
            
            const inputRow = document.createElement('div');
            inputRow.className = 'function-input-row';
            
            // Color picker
            const colorPicker = document.createElement('input');
            colorPicker.type = 'color';
            colorPicker.className = 'function-color';
            colorPicker.value = func.color;
            colorPicker.addEventListener('input', (e) => this.updateColor(func.id, e.target.value));
            
            // Expression input
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'function-input' + (func.error ? ' error' : '');
            input.placeholder = this.mode === 'cartesian' ? 'f(x) = ...' : 
                               this.mode === 'parametric' ? 'x(t), y(t)' : 'r(θ) = ...';
            input.value = func.expression;
            input.addEventListener('input', (e) => {
                func.expression = e.target.value;
                this.updateFunction(func);
            });
            
            inputRow.appendChild(colorPicker);
            inputRow.appendChild(input);
            
            // Controls
            const controls = document.createElement('div');
            controls.className = 'function-controls';
            
            // Visibility toggle
            const visBtn = document.createElement('button');
            visBtn.className = 'btn btn-small btn-secondary';
            visBtn.textContent = func.visible ? '👁' : '🚫';
            visBtn.addEventListener('click', () => this.toggleVisibility(func.id));
            
            // Delete button
            const delBtn = document.createElement('button');
            delBtn.className = 'btn btn-small btn-danger';
            delBtn.textContent = '✕';
            delBtn.addEventListener('click', () => this.removeFunction(func.id));
            
            controls.appendChild(visBtn);
            controls.appendChild(delBtn);
            
            item.appendChild(inputRow);
            item.appendChild(controls);
            
            if (func.error) {
                const errorMsg = document.createElement('small');
                errorMsg.style.color = '#ff6666';
                errorMsg.textContent = 'Invalid expression';
                item.appendChild(errorMsg);
            }
            
            this.functionList.appendChild(item);
        }
    }

    /**
     * Set graphing mode
     */
    setMode(mode) {
        this.mode = mode;
        
        // Update mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // Clear functions when mode changes
        this.functions = [];
        this.colorIndex = 0;
        this.addFunction();
    }

    /**
     * Mouse down handler
     */
    onMouseDown(e) {
        this.isDragging = true;
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.canvas.style.cursor = 'grabbing';
    }

    /**
     * Mouse move handler
     */
    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Update coordinates display
        const mathCoords = this.transform.screenToMath(mouseX, mouseY);
        this.coordsDisplay.textContent = 
            `x: ${mathCoords.x.toFixed(4)}, y: ${mathCoords.y.toFixed(4)}`;
        
        // Handle dragging
        if (this.isDragging) {
            const dx = e.clientX - this.lastMousePos.x;
            const dy = e.clientY - this.lastMousePos.y;
            
            // Convert pixel delta to mathematical delta
            const mathDx = -dx / this.transform.scaleX;
            const mathDy = dy / this.transform.scaleY;
            
            this.transform.pan(mathDx, mathDy);
            this.lastMousePos = { x: e.clientX, y: e.clientY };
            
            this.render();
        }
    }

    /**
     * Mouse up handler
     */
    onMouseUp() {
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
    }

    /**
     * Touch start handler
     */
    onTouchStart(e) {
        if (e.touches.length === 1) {
            this.isDragging = true;
            this.lastMousePos = { 
                x: e.touches[0].clientX, 
                y: e.touches[0].clientY 
            };
        }
    }

    /**
     * Touch move handler
     */
    onTouchMove(e) {
        if (e.touches.length === 1 && this.isDragging) {
            const dx = e.touches[0].clientX - this.lastMousePos.x;
            const dy = e.touches[0].clientY - this.lastMousePos.y;
            
            const mathDx = -dx / this.transform.scaleX;
            const mathDy = dy / this.transform.scaleY;
            
            this.transform.pan(mathDx, mathDy);
            this.lastMousePos = { 
                x: e.touches[0].clientX, 
                y: e.touches[0].clientY 
            };
            
            this.render();
        }
    }

    /**
     * Wheel handler for zoom
     */
    onWheel(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        this.transform.zoomAtScreen(mouseX, mouseY, factor);
        
        this.render();
    }

    /**
     * Keyboard shortcuts
     */
    onKeyDown(e) {
        switch(e.key) {
            case '+':
            case '=':
                this.zoom(1.2);
                break;
            case '-':
                this.zoom(0.83);
                break;
            case '0':
                this.resetView();
                break;
            case 'g':
                document.getElementById('showGrid').click();
                break;
            case 'a':
                document.getElementById('showAxes').click();
                break;
        }
    }

    /**
     * Zoom at center
     */
    zoom(factor) {
        const viewport = this.transform.getViewport();
        this.transform.zoom(
            (viewport.xMin + viewport.xMax) / 2,
            (viewport.yMin + viewport.yMax) / 2,
            factor
        );
        this.render();
    }

    /**
     * Reset view to default
     */
    resetView() {
        this.transform.setViewport(-10, 10, -10, 10);
        this.syncInputsFromTransform();
        this.render();
    }

    /**
     * Clear all functions
     */
    clearAllFunctions() {
        this.functions = [];
        this.colorIndex = 0;
        this.addFunction();
    }

    /**
     * Toggle sidebar (mobile)
     */
    toggleSidebar() {
        this.sidebar.classList.toggle('open');
        this.overlay.classList.toggle('active');
    }

    /**
     * Update viewport from input fields
     */
    updateViewportFromInputs() {
        const xMin = parseFloat(document.getElementById('xMin').value);
        const xMax = parseFloat(document.getElementById('xMax').value);
        const yMin = parseFloat(document.getElementById('yMin').value);
        const yMax = parseFloat(document.getElementById('yMax').value);
        
        if (xMin < xMax && yMin < yMax) {
            this.transform.setViewport(xMin, xMax, yMin, yMax);
            this.render();
        }
    }

    /**
     * Sync input fields with current transform
     */
    syncInputsFromTransform() {
        const viewport = this.transform.getViewport();
        document.getElementById('xMin').value = viewport.xMin.toFixed(2);
        document.getElementById('xMax').value = viewport.xMax.toFixed(2);
        document.getElementById('yMin').value = viewport.yMin.toFixed(2);
        document.getElementById('yMax').value = viewport.yMax.toFixed(2);
    }

    /**
     * Main render function
     */
    render() {
        const showGrid = document.getElementById('showGrid').checked;
        const showAxes = document.getElementById('showAxes').checked;
        
        this.renderer.render(this.transform, this.functions, {
            showGrid,
            showAxes
        });
        
        // Update range inputs if they're not focused
        if (document.activeElement.tagName !== 'INPUT') {
            this.syncInputsFromTransform();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new GraphingApp();
});
