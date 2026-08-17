"""
Coordinate Transformation and Viewport Management

This module handles the mapping between mathematical coordinates (R²) 
and screen pixel coordinates (Z²) using affine transformations.
"""

import math
from dataclasses import dataclass, field
from typing import Tuple, Optional


@dataclass
class Viewport:
    """
    Represents the mathematical viewport (world coordinates).
    
    Defines the visible region of the mathematical plane.
    """
    x_min: float = -10.0
    x_max: float = 10.0
    y_min: float = -10.0
    y_max: float = 10.0
    
    @property
    def width(self) -> float:
        """Width of the viewport in mathematical coordinates."""
        return self.x_max - self.x_min
    
    @property
    def height(self) -> float:
        """Height of the viewport in mathematical coordinates."""
        return self.y_max - self.y_min
    
    @property
    def center(self) -> Tuple[float, float]:
        """Center point of the viewport."""
        return ((self.x_min + self.x_max) / 2, 
                (self.y_min + self.y_max) / 2)
    
    @property
    def aspect_ratio(self) -> float:
        """Aspect ratio of the viewport."""
        if self.height == 0:
            return 1.0
        return self.width / self.height
    
    def contains(self, x: float, y: float) -> bool:
        """Check if a point is within the viewport."""
        return (self.x_min <= x <= self.x_max and 
                self.y_min <= y <= self.y_max)
    
    def scale_around_center(self, factor: float):
        """Scale the viewport around its center point."""
        cx, cy = self.center
        new_width = self.width * factor
        new_height = self.height * factor
        
        self.x_min = cx - new_width / 2
        self.x_max = cx + new_width / 2
        self.y_min = cy - new_height / 2
        self.y_max = cy + new_height / 2
    
    def pan(self, dx: float, dy: float):
        """Pan the viewport by the given offsets."""
        self.x_min += dx
        self.x_max += dx
        self.y_min += dy
        self.y_max += dy
    
    def set_bounds(self, x_min: float, x_max: float, 
                   y_min: float, y_max: float):
        """Set new viewport bounds."""
        self.x_min = x_min
        self.x_max = x_max
        self.y_min = y_min
        self.y_max = y_max
    
    def copy(self) -> 'Viewport':
        """Create a copy of this viewport."""
        return Viewport(
            self.x_min, self.x_max,
            self.y_min, self.y_max
        )


@dataclass
class ScreenBounds:
    """Represents the screen/canvas bounds in pixels."""
    width: int = 800
    height: int = 600


class CoordinateTransformer:
    """
    Handles bidirectional transformation between mathematical 
    and screen coordinate spaces.
    
    Mathematical space: Cartesian coordinates with origin at center,
                        Y-axis pointing up
    Screen space:       Pixel coordinates with origin at top-left,
                        Y-axis pointing down
    """
    
    def __init__(self, viewport: Viewport, screen: ScreenBounds):
        self.viewport = viewport
        self.screen = screen
        
        # Pre-compute transformation coefficients
        self._update_transform()
    
    def _update_transform(self):
        """Update transformation coefficients when viewport or screen changes."""
        vx_range = self.viewport.width
        vy_range = self.viewport.height
        
        if vx_range == 0 or vy_range == 0:
            raise ValueError("Viewport dimensions cannot be zero")
        
        # X transformation: x_math -> x_screen
        # X = (x - x_min) / (x_max - x_min) * width
        self.scale_x = self.screen.width / vx_range
        self.offset_x = -self.viewport.x_min * self.scale_x
        
        # Y transformation: y_math -> y_screen (inverted)
        # Y = height - (y - y_min) / (y_max - y_min) * height
        self.scale_y = -self.screen.height / vy_range  # Negative for Y inversion
        self.offset_y = self.screen.height + self.viewport.y_min * (-self.scale_y)
    
    def math_to_screen(self, x: float, y: float) -> Tuple[int, int]:
        """
        Transform mathematical coordinates to screen pixel coordinates.
        
        Args:
            x: Mathematical X coordinate
            y: Mathematical Y coordinate
            
        Returns:
            Tuple of (screen_x, screen_y) as integers
        """
        screen_x = int(x * self.scale_x + self.offset_x)
        screen_y = int(y * self.scale_y + self.offset_y)
        return (screen_x, screen_y)
    
    def screen_to_math(self, screen_x: int, screen_y: int) -> Tuple[float, float]:
        """
        Transform screen pixel coordinates to mathematical coordinates.
        
        Args:
            screen_x: Screen X coordinate (pixels from left)
            screen_y: Screen Y coordinate (pixels from top)
            
        Returns:
            Tuple of (math_x, math_y)
        """
        math_x = (screen_x - self.offset_x) / self.scale_x
        math_y = (screen_y - self.offset_y) / self.scale_y
        return (math_x, math_y)
    
    def transform_points(self, points: list) -> list:
        """
        Transform multiple mathematical points to screen coordinates.
        
        Args:
            points: List of (x, y) tuples in mathematical coordinates
            
        Returns:
            List of (screen_x, screen_y) tuples
        """
        return [self.math_to_screen(x, y) for x, y in points]
    
    def update_viewport(self, viewport: Viewport):
        """Update the viewport and recalculate transformation coefficients."""
        self.viewport = viewport
        self._update_transform()
    
    def update_screen(self, screen: ScreenBounds):
        """Update the screen bounds and recalculate transformation coefficients."""
        self.screen = screen
        self._update_transform()
    
    def get_scale_factors(self) -> Tuple[float, float]:
        """Get the current scale factors (pixels per unit)."""
        return (self.scale_x, abs(self.scale_y))
    
    def zoom_at_point(self, factor: float, focus_x: float, focus_y: float):
        """
        Zoom the viewport centered on a specific mathematical point.
        
        Args:
            factor: Zoom factor (>1 to zoom in, <1 to zoom out)
            focus_x: Mathematical X coordinate to focus on
            focus_y: Mathematical Y coordinate to focus on
        """
        # Calculate current screen position of focus point
        screen_x, screen_y = self.math_to_screen(focus_x, focus_y)
        
        # Scale the viewport
        self.viewport.scale_around_center(1.0 / factor)
        self._update_transform()
        
        # Adjust so focus point stays under cursor
        new_focus_x, new_focus_y = self.screen_to_math(screen_x, screen_y)
        dx = focus_x - new_focus_x
        dy = focus_y - new_focus_y
        self.viewport.pan(dx, dy)
        self._update_transform()
    
    def get_transformation_matrix(self) -> list:
        """
        Get the 3x3 transformation matrix for GPU operations.
        
        Returns:
            3x3 matrix as nested lists representing:
            [[scale_x, 0, offset_x],
             [0, scale_y, offset_y],
             [0, 0, 1]]
        """
        return [
            [self.scale_x, 0, self.offset_x],
            [0, self.scale_y, self.offset_y],
            [0, 0, 1]
        ]
    
    def inverse_transformation_matrix(self) -> list:
        """
        Get the inverse 3x3 transformation matrix.
        
        Returns:
            3x3 matrix for screen-to-math transformation
        """
        inv_scale_x = 1.0 / self.scale_x if self.scale_x != 0 else 0
        inv_scale_y = 1.0 / self.scale_y if self.scale_y != 0 else 0
        
        return [
            [inv_scale_x, 0, -self.offset_x * inv_scale_x],
            [0, inv_scale_y, -self.offset_y * inv_scale_y],
            [0, 0, 1]
        ]


class GridCalculator:
    """
    Calculates optimal grid line positions and labels for rendering.
    
    Implements dynamic tick spacing based on viewport scale.
    """
    
    # Preferred tick intervals
    TICK_INTERVALS = [1, 2, 5, 10]
    
    def __init__(self, transformer: CoordinateTransformer):
        self.transformer = transformer
    
    def _calculate_tick_spacing(self, range_size: float, 
                                 max_ticks: int = 10) -> float:
        """
        Calculate optimal tick spacing for a given range.
        
        Args:
            range_size: Size of the range (width or height)
            max_ticks: Maximum desired number of ticks
            
        Returns:
            Optimal tick spacing
        """
        if range_size == 0:
            return 1.0
        
        # Calculate order of magnitude
        order = math.floor(math.log10(abs(range_size)))
        base = 10 ** order
        
        # Find best interval
        for interval in self.TICK_INTERVALS:
            spacing = interval * base
            num_ticks = range_size / spacing
            if num_ticks <= max_ticks:
                return spacing
        
        # If no suitable interval found, use the largest
        return self.TICK_INTERVALS[-1] * base
    
    def get_major_ticks(self, axis: str = 'both') -> dict:
        """
        Calculate major tick positions for axes.
        
        Args:
            axis: 'x', 'y', or 'both'
            
        Returns:
            Dictionary with 'x' and/or 'y' keys containing tick positions
        """
        result = {}
        vp = self.transformer.viewport
        
        if axis in ('x', 'both'):
            x_spacing = self._calculate_tick_spacing(vp.width)
            x_start = math.ceil(vp.x_min / x_spacing) * x_spacing
            x_ticks = []
            x = x_start
            while x <= vp.x_max:
                x_ticks.append(x)
                x += x_spacing
            result['x'] = x_ticks
        
        if axis in ('y', 'both'):
            y_spacing = self._calculate_tick_spacing(vp.height)
            y_start = math.ceil(vp.y_min / y_spacing) * y_spacing
            y_ticks = []
            y = y_start
            while y <= vp.y_max:
                y_ticks.append(y)
                y += y_spacing
            result['y'] = y_ticks
        
        return result
    
    def get_minor_ticks(self, axis: str = 'both', 
                        subdivisions: int = 5) -> dict:
        """
        Calculate minor tick positions between major ticks.
        
        Args:
            axis: 'x', 'y', or 'both'
            subdivisions: Number of subdivisions between major ticks
            
        Returns:
            Dictionary with 'x' and/or 'y' keys containing minor tick positions
        """
        result = {}
        vp = self.transformer.viewport
        major = self.get_major_ticks(axis)
        
        if axis in ('x', 'both') and 'x' in major:
            if len(major['x']) >= 2:
                x_spacing = major['x'][1] - major['x'][0]
                minor_spacing = x_spacing / subdivisions
                x_start = math.ceil(vp.x_min / minor_spacing) * minor_spacing
                x_ticks = []
                x = x_start
                while x <= vp.x_max:
                    # Skip if this is a major tick
                    if not any(abs(x - mx) < 1e-10 for mx in major['x']):
                        x_ticks.append(x)
                    x += minor_spacing
                result['x'] = x_ticks
        
        if axis in ('y', 'both') and 'y' in major:
            if len(major['y']) >= 2:
                y_spacing = major['y'][1] - major['y'][0]
                minor_spacing = y_spacing / subdivisions
                y_start = math.ceil(vp.y_min / minor_spacing) * minor_spacing
                y_ticks = []
                y = y_start
                while y <= vp.y_max:
                    # Skip if this is a major tick
                    if not any(abs(y - my) < 1e-10 for my in major['y']):
                        y_ticks.append(y)
                    y += minor_spacing
                result['y'] = y_ticks
        
        return result
    
    def format_tick_label(self, value: float) -> str:
        """
        Format a tick value for display.
        
        Uses scientific notation for very large or small numbers.
        """
        if abs(value) < 1e-4 or abs(value) >= 1e4:
            return f"{value:.2e}"
        elif abs(value - round(value)) < 1e-10:
            return str(int(round(value)))
        else:
            return f"{value:.2f}"
    
    def get_grid_lines(self) -> dict:
        """
        Get all grid lines ready for rendering.
        
        Returns:
            Dictionary containing:
            - major_x: List of x-coordinates for vertical major grid lines
            - major_y: List of y-coordinates for horizontal major grid lines
            - minor_x: List of x-coordinates for vertical minor grid lines
            - minor_y: List of y-coordinates for horizontal minor grid lines
        """
        major = self.get_major_ticks('both')
        minor = self.get_minor_ticks('both')
        
        return {
            'major_x': major.get('x', []),
            'major_y': major.get('y', []),
            'minor_x': minor.get('x', []),
            'minor_y': minor.get('y', []),
        }


if __name__ == "__main__":
    # Test the coordinate transformer
    viewport = Viewport(-10, 10, -10, 10)
    screen = ScreenBounds(800, 600)
    
    transformer = CoordinateTransformer(viewport, screen)
    
    print("Coordinate Transformer Test")
    print("=" * 40)
    
    # Test math to screen
    test_points = [
        (0, 0),      # Center
        (-10, -10),  # Bottom-left
        (10, 10),    # Top-right
        (5, 5),      # Upper-right quadrant
    ]
    
    print("\nMathematical -> Screen:")
    for mx, my in test_points:
        sx, sy = transformer.math_to_screen(mx, my)
        print(f"  ({mx:6.1f}, {my:6.1f}) -> ({sx:4d}, {sy:4d})")
    
    # Test screen to math
    print("\nScreen -> Mathematical:")
    screen_points = [
        (400, 300),   # Center
        (0, 600),     # Bottom-left
        (800, 0),     # Top-right
    ]
    
    for sx, sy in screen_points:
        mx, my = transformer.screen_to_math(sx, sy)
        print(f"  ({sx:4d}, {sy:4d}) -> ({mx:6.1f}, {my:6.1f})")
    
    # Test grid calculator
    print("\nGrid Calculator Test")
    print("=" * 40)
    
    grid_calc = GridCalculator(transformer)
    grid = grid_calc.get_grid_lines()
    
    print(f"\nMajor X ticks: {grid['major_x']}")
    print(f"Major Y ticks: {grid['major_y']}")
    
    # Test zoom
    print("\nZoom Test (2x at origin)")
    transformer.zoom_at_point(2.0, 0, 0)
    print(f"New viewport: [{transformer.viewport.x_min:.1f}, {transformer.viewport.x_max:.1f}] x "
          f"[{transformer.viewport.y_min:.1f}, {transformer.viewport.y_max:.1f}]")
