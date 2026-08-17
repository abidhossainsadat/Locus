"""
Graphing Tool Renderer - HTML5 Canvas Implementation

A complete interactive graphing tool with real-time pan/zoom,
function plotting, and GUI controls.
"""

import tkinter as tk
from tkinter import ttk, colorchooser, messagebox
from typing import List, Optional, Dict, Callable
import math

# Import our custom modules
from parser import CompiledExpression, parse_expression
from transform import Viewport, ScreenBounds, CoordinateTransformer, GridCalculator
from sampler import AdaptiveSampler, ParametricSampler, PolarSampler


class FunctionPlot:
    """Represents a plotted function with styling."""
    
    def __init__(self, expression: str, color: str = "#FF0000", 
                 line_width: int = 2, visible: bool = True):
        self.expression_str = expression
        self.color = color
        self.line_width = line_width
        self.visible = visible
        self.compiled: Optional[CompiledExpression] = None
        self.error: Optional[str] = None
        
        self._compile()
    
    def _compile(self):
        """Compile the expression string."""
        try:
            self.compiled = parse_expression(self.expression_str)
            self.error = None
        except Exception as e:
            self.compiled = None
            self.error = str(e)
    
    def update_expression(self, new_expr: str):
        """Update the expression and recompile."""
        self.expression_str = new_expr
        self._compile()


class GraphCanvas(tk.Canvas):
    """
    Custom canvas widget for rendering mathematical graphs.
    
    Handles all drawing operations including grid, axes, and curves.
    """
    
    def __init__(self, parent, **kwargs):
        super().__init__(parent, **kwargs)
        
        # Configure canvas
        self.configure(bg='white', highlightthickness=1, 
                      highlightbackground='#cccccc')
        
        # State
        self.viewport = Viewport(-10, 10, -10, 10)
        self.screen = ScreenBounds(800, 600)
        self.transformer = CoordinateTransformer(self.viewport, self.screen)
        self.grid_calculator = GridCalculator(self.transformer)
        
        self.functions: List[FunctionPlot] = []
        self.sampler = AdaptiveSampler(
            max_depth=8,
            angle_threshold=0.05,
            vertical_threshold=50.0
        )
        
        # Interaction state
        self._pan_start = None
        self._is_dragging = False
        
        # Bind events
        self.bind('<Configure>', self._on_resize)
        self.bind('<ButtonPress-1>', self._on_mouse_down)
        self.bind('<B1-Motion>', self._on_mouse_drag)
        self.bind('<ButtonRelease-1>', self._on_mouse_up)
        self.bind('<MouseWheel>', self._on_mouse_wheel)
        self.bind('<Button-4>', self._on_mouse_wheel)  # Linux scroll up
        self.bind('<Button-5>', self._on_mouse_wheel)  # Linux scroll down
        
        # Render cache
        self._grid_cache = None
    
    def add_function(self, func: FunctionPlot):
        """Add a function to plot."""
        self.functions.append(func)
        self.render()
    
    def remove_function(self, index: int):
        """Remove a function by index."""
        if 0 <= index < len(self.functions):
            self.functions.pop(index)
            self.render()
    
    def clear_functions(self):
        """Remove all functions."""
        self.functions = []
        self.render()
    
    def _on_resize(self, event):
        """Handle canvas resize."""
        self.screen.width = event.width
        self.screen.height = event.height
        self.transformer.update_screen(self.screen)
        self._grid_cache = None  # Invalidate grid cache
        self.render()
    
    def _on_mouse_down(self, event):
        """Handle mouse button press for panning."""
        self._pan_start = (event.x, event.y)
        self._is_dragging = True
    
    def _on_mouse_drag(self, event):
        """Handle mouse drag for panning."""
        if self._pan_start and self._is_dragging:
            dx = event.x - self._pan_start[0]
            dy = event.y - self._pan_start[1]
            
            # Convert pixel delta to mathematical coordinates
            math_dx = -dx / self.transformer.scale_x
            math_dy = -dy / self.transformer.scale_y
            
            self.viewport.pan(math_dx, math_dy)
            self.transformer.update_viewport(self.viewport)
            self._grid_cache = None
            
            self._pan_start = (event.x, event.y)
            self.render()
    
    def _on_mouse_up(self, event):
        """Handle mouse button release."""
        self._pan_start = None
        self._is_dragging = False
    
    def _on_mouse_wheel(self, event):
        """Handle mouse wheel for zooming."""
        # Get zoom direction
        if event.num == 5 or event.delta < 0:
            factor = 0.9  # Zoom out
        else:
            factor = 1.1  # Zoom in
        
        # Get mouse position in math coordinates before zoom
        mouse_math = self.transformer.screen_to_math(event.x, event.y)
        
        # Apply zoom
        self.viewport.scale_around_center(1.0 / factor)
        self.transformer.update_viewport(self.viewport)
        
        # Adjust viewport so mouse stays over same math point
        new_mouse_math = self.transformer.screen_to_math(event.x, event.y)
        dx = mouse_math[0] - new_mouse_math[0]
        dy = mouse_math[1] - new_mouse_math[1]
        self.viewport.pan(dx, dy)
        self.transformer.update_viewport(self.viewport)
        
        self._grid_cache = None
        self.render()
    
    def _draw_grid(self):
        """Draw the coordinate grid."""
        if self._grid_cache is None:
            self._grid_cache = self.grid_calculator.get_grid_lines()
        
        grid = self._grid_cache
        vp = self.viewport
        
        # Draw minor grid lines
        for x in grid['minor_x']:
            sx, _ = self.transformer.math_to_screen(x, vp.y_min)
            _, sy_end = self.transformer.math_to_screen(x, vp.y_max)
            self.create_line(sx, 0, sx, self.screen.height, 
                           fill='#e0e0e0', width=1)
        
        for y in grid['minor_y']:
            _, sy = self.transformer.math_to_screen(vp.x_min, y)
            _, sy_end = self.transformer.math_to_screen(vp.x_max, y)
            self.create_line(0, sy, self.screen.width, sy,
                           fill='#e0e0e0', width=1)
        
        # Draw major grid lines
        for x in grid['major_x']:
            sx, _ = self.transformer.math_to_screen(x, vp.y_min)
            self.create_line(sx, 0, sx, self.screen.height,
                           fill='#c0c0c0', width=1)
        
        for y in grid['major_y']:
            _, sy = self.transformer.math_to_screen(vp.x_min, y)
            self.create_line(0, sy, self.screen.width, sy,
                           fill='#c0c0c0', width=1)
        
        # Draw axes
        if vp.x_min <= 0 <= vp.x_max:
            x_axis, _ = self.transformer.math_to_screen(0, 0)
            self.create_line(x_axis, 0, x_axis, self.screen.height,
                           fill='#333333', width=2)
        
        if vp.y_min <= 0 <= vp.y_max:
            _, y_axis = self.transformer.math_to_screen(0, 0)
            self.create_line(0, y_axis, self.screen.width, y_axis,
                           fill='#333333', width=2)
        
        # Draw tick labels
        self._draw_tick_labels(grid)
    
    def _draw_tick_labels(self, grid):
        """Draw axis tick labels."""
        vp = self.viewport
        font = ('Arial', 9)
        
        # X-axis labels
        for x in grid['major_x']:
            sx, sy = self.transformer.math_to_screen(x, 0)
            label = self.grid_calculator.format_tick_label(x)
            self.create_text(sx, sy + 15, text=label, font=font, 
                           fill='#666666', anchor='n')
        
        # Y-axis labels
        for y in grid['major_y']:
            sx, sy = self.transformer.math_to_screen(0, y)
            label = self.grid_calculator.format_tick_label(y)
            self.create_text(sx + 5, sy, text=label, font=font,
                           fill='#666666', anchor='w')
    
    def _draw_functions(self):
        """Draw all plotted functions."""
        vp = self.viewport
        
        for func in self.functions:
            if not func.visible or func.compiled is None:
                continue
            
            # Sample the function
            def eval_func(x):
                return func.compiled.evaluate({'x': x})
            
            segments = self.sampler.sample_function(
                eval_func, 
                vp.x_min, vp.x_max,
                initial_samples=150
            )
            
            # Draw each continuous segment
            for segment in segments:
                if segment.point_count < 2:
                    continue
                
                # Transform points to screen coordinates
                screen_points = []
                for pt in segment.points:
                    sx, sy = self.transformer.math_to_screen(pt.x, pt.y)
                    
                    # Only include points within reasonable bounds
                    if -1000 <= sx <= self.screen.width + 1000 and \
                       -1000 <= sy <= self.screen.height + 1000:
                        screen_points.append((sx, sy))
                
                # Draw the segment
                if len(screen_points) >= 2:
                    # Flatten points for create_line
                    flat_points = [coord for pt in screen_points for coord in pt]
                    self.create_line(flat_points, 
                                   fill=func.color, 
                                   width=func.line_width,
                                   capstyle=tk.ROUND,
                                   joinstyle=tk.ROUND)
    
    def render(self):
        """Render the complete graph."""
        self.delete('all')
        
        # Draw background
        self.create_rectangle(0, 0, self.screen.width, self.screen.height,
                            fill='white', outline='')
        
        # Draw grid
        self._draw_grid()
        
        # Draw functions
        self._draw_functions()
    
    def set_viewport(self, x_min: float, x_max: float, 
                     y_min: float, y_max: float):
        """Set the viewport bounds directly."""
        self.viewport.set_bounds(x_min, x_max, y_min, y_max)
        self.transformer.update_viewport(self.viewport)
        self._grid_cache = None
        self.render()
    
    def reset_view(self):
        """Reset to default viewport."""
        self.set_viewport(-10, 10, -10, 10)


class ControlPanel(ttk.Frame):
    """Control panel for managing functions and settings."""
    
    def __init__(self, parent, graph_canvas: GraphCanvas):
        super().__init__(parent, padding=10)
        
        self.graph_canvas = graph_canvas
        self.function_entries = []
        
        self._create_widgets()
    
    def _create_widgets(self):
        """Create control panel widgets."""
        # Functions section
        functions_frame = ttk.LabelFrame(self, text="Functions", padding=10)
        functions_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Add function entry
        entry_frame = ttk.Frame(functions_frame)
        entry_frame.pack(fill=tk.X)
        
        self.expr_entry = ttk.Entry(entry_frame, width=30)
        self.expr_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.expr_entry.insert(0, "sin(x)")
        
        add_btn = ttk.Button(entry_frame, text="Add", command=self._add_function)
        add_btn.pack(side=tk.LEFT, padx=(5, 0))
        
        # Function list
        self.func_listbox_frame = ttk.Frame(functions_frame)
        self.func_listbox_frame.pack(fill=tk.X, pady=(5, 0))
        
        # Color selection
        color_frame = ttk.Frame(functions_frame)
        color_frame.pack(fill=tk.X, pady=(5, 0))
        
        ttk.Label(color_frame, text="Color:").pack(side=tk.LEFT)
        self.color_btn = ttk.Button(color_frame, text="#FF0000", 
                                   command=self._choose_color)
        self.color_btn.pack(side=tk.LEFT, padx=(5, 0))
        self.current_color = "#FF0000"
        
        # View controls
        view_frame = ttk.LabelFrame(self, text="View", padding=10)
        view_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Button(view_frame, text="Reset View", 
                  command=self.graph_canvas.reset_view).pack(fill=tk.X, pady=2)
        
        # Zoom controls
        zoom_frame = ttk.Frame(view_frame)
        zoom_frame.pack(fill=tk.X, pady=(5, 0))
        
        ttk.Button(zoom_frame, text="Zoom In", 
                  command=lambda: self._zoom(1.2)).pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(zoom_frame, text="Zoom Out", 
                  command=lambda: self._zoom(1/1.2)).pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # Preset views
        preset_frame = ttk.Frame(view_frame)
        preset_frame.pack(fill=tk.X, pady=(5, 0))
        
        ttk.Button(preset_frame, text="Standard",
                  command=lambda: self._set_preset(-10, 10, -10, 10)).pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(preset_frame, text="Trig",
                  command=lambda: self._set_preset(-2*math.pi, 2*math.pi, -2, 2)).pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # Info section
        info_frame = ttk.LabelFrame(self, text="Info", padding=10)
        info_frame.pack(fill=tk.BOTH, expand=True)
        
        self.info_text = tk.Text(info_frame, height=8, width=30, 
                                wrap=tk.WORD, font=('Courier', 9))
        self.info_text.pack(fill=tk.BOTH, expand=True)
        
        scrollbar = ttk.Scrollbar(info_frame, orient=tk.VERTICAL, 
                                 command=self.info_text.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.info_text.config(yscrollcommand=scrollbar.set)
        
        self._update_info()
    
    def _add_function(self):
        """Add a function from the entry field."""
        expr = self.expr_entry.get().strip()
        if expr:
            func = FunctionPlot(expr, self.current_color)
            
            if func.error:
                messagebox.showerror("Parse Error", f"Invalid expression:\n{func.error}")
                return
            
            self.graph_canvas.add_function(func)
            self._update_info()
            self.expr_entry.delete(0, tk.END)
    
    def _choose_color(self):
        """Open color chooser dialog."""
        color = colorchooser.askcolor(color=self.current_color)[1]
        if color:
            self.current_color = color
            self.color_btn.config(text=color)
    
    def _zoom(self, factor: float):
        """Zoom in/out from center."""
        cx, cy = self.graph_canvas.viewport.center
        self.graph_canvas.viewport.scale_around_center(1.0 / factor)
        self.graph_canvas.transformer.update_viewport(self.graph_canvas.viewport)
        self.graph_canvas._grid_cache = None
        self.graph_canvas.render()
        self._update_info()
    
    def _set_preset(self, x_min, x_max, y_min, y_max):
        """Set a preset viewport."""
        self.graph_canvas.set_viewport(x_min, x_max, y_min, y_max)
        self._update_info()
    
    def _update_info(self):
        """Update the info panel."""
        vp = self.graph_canvas.viewport
        
        info = f"Viewport:\n"
        info += f"X: [{vp.x_min:.3f}, {vp.x_max:.3f}]\n"
        info += f"Y: [{vp.y_min:.3f}, {vp.y_max:.3f}]\n"
        info += f"Width: {vp.width:.3f}\n"
        info += f"Height: {vp.height:.3f}\n\n"
        info += f"Functions: {len(self.graph_canvas.functions)}\n"
        
        self.info_text.delete(1.0, tk.END)
        self.info_text.insert(1.0, info)


class GraphingToolApp:
    """Main application class for the graphing tool."""
    
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Advanced Graphing Tool")
        self.root.geometry("1200x700")
        
        # Configure style
        style = ttk.Style()
        style.theme_use('clam')
        
        self._create_layout()
    
    def _create_layout(self):
        """Create the main application layout."""
        # Main container
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Graph canvas (left side)
        canvas_frame = ttk.Frame(main_frame)
        canvas_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        self.graph_canvas = GraphCanvas(canvas_frame)
        self.graph_canvas.pack(fill=tk.BOTH, expand=True)
        
        # Control panel (right side)
        self.control_panel = ControlPanel(main_frame, self.graph_canvas)
        self.control_panel.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Add some default functions
        default_functions = [
            ("sin(x)", "#E74C3C"),
            ("cos(x)", "#3498DB"),
            ("x^2 / 10", "#2ECC71"),
        ]
        
        for expr, color in default_functions:
            func = FunctionPlot(expr, color)
            self.graph_canvas.add_function(func)
    
    def run(self):
        """Start the application."""
        self.root.mainloop()


def main():
    """Entry point for the graphing tool."""
    app = GraphingToolApp()
    app.run()


if __name__ == "__main__":
    main()
