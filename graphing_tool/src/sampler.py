"""
Adaptive Sampling and Discontinuity Detection Engine

This module implements adaptive mesh refinement for accurate function plotting,
handling asymptotes, rapid oscillations, and undefined regions.
"""

import math
from dataclasses import dataclass, field
from typing import List, Tuple, Optional, Callable
from enum import Enum


@dataclass
class SamplePoint:
    """Represents a sampled point on a curve."""
    x: float
    y: float
    valid: bool = True  # False if point is at discontinuity/undefined
    
    def __iter__(self):
        return iter((self.x, self.y))


@dataclass
class CurveSegment:
    """
    Represents a continuous segment of a curve.
    
    Segments are broken at discontinuities to prevent
    connecting lines across asymptotes.
    """
    points: List[SamplePoint] = field(default_factory=list)
    
    def add_point(self, x: float, y: float, valid: bool = True):
        """Add a point to this segment."""
        self.points.append(SamplePoint(x, y, valid))
    
    def is_empty(self) -> bool:
        return len(self.points) == 0
    
    @property
    def point_count(self) -> int:
        return len(self.points)


class DiscontinuityType(Enum):
    """Types of discontinuities that can be detected."""
    NONE = 0
    VERTICAL_ASYMPTOTE = 1
    JUMP_DISCONTINUITY = 2
    UNDEFINED_REGION = 3
    INFINITE_VALUE = 4


class AdaptiveSampler:
    """
    Implements adaptive sampling for function plotting.
    
    Uses recursive subdivision based on local curvature to ensure
    smooth curves while minimizing sample count.
    """
    
    def __init__(self, 
                 max_depth: int = 10,
                 min_step: float = 1e-6,
                 angle_threshold: float = 0.1,  # Radians
                 vertical_threshold: float = 100.0,
                 value_threshold: float = 1e10):
        """
        Initialize the adaptive sampler.
        
        Args:
            max_depth: Maximum recursion depth for subdivision
            min_step: Minimum step size before stopping subdivision
            angle_threshold: Max angle change between segments (radians)
            vertical_threshold: Slope threshold for detecting vertical asymptotes
            value_threshold: Value threshold for detecting infinite values
        """
        self.max_depth = max_depth
        self.min_step = min_step
        self.angle_threshold = angle_threshold
        self.vertical_threshold = vertical_threshold
        self.value_threshold = value_threshold
        
        self._segments: List[CurveSegment] = []
        self._current_segment: Optional[CurveSegment] = None
    
    def _evaluate_function(self, func: Callable[[float], float], 
                          x: float) -> Tuple[float, bool]:
        """
        Safely evaluate a function at a point.
        
        Returns:
            Tuple of (value, is_valid)
        """
        try:
            y = func(x)
            
            # Check for infinity or NaN
            if math.isnan(y) or math.isinf(y):
                return (float('nan'), False)
            
            # Check for extremely large values (near asymptote)
            if abs(y) > self.value_threshold:
                return (float('nan'), False)
            
            return (y, True)
            
        except (ValueError, ZeroDivisionError, OverflowError, TypeError):
            return (float('nan'), False)
    
    def _calculate_angle(self, p1: SamplePoint, p2: SamplePoint, 
                         p3: SamplePoint) -> float:
        """
        Calculate the angle between two consecutive segments.
        
        Returns the absolute angle change in radians.
        """
        # Vector from p1 to p2
        dx1 = p2.x - p1.x
        dy1 = p2.y - p1.y
        
        # Vector from p2 to p3
        dx2 = p3.x - p2.x
        dy2 = p3.y - p2.y
        
        # Calculate angles
        angle1 = math.atan2(dy1, dx1)
        angle2 = math.atan2(dy2, dx2)
        
        # Angle difference (normalized to [0, pi])
        angle_diff = abs(angle2 - angle1)
        if angle_diff > math.pi:
            angle_diff = 2 * math.pi - angle_diff
        
        return angle_diff
    
    def _detect_discontinuity(self, x1: float, y1: float, 
                              x2: float, y2: float,
                              valid1: bool, valid2: bool) -> DiscontinuityType:
        """
        Detect the type of discontinuity between two points.
        """
        if not valid1 or not valid2:
            return DiscontinuityType.UNDEFINED_REGION
        
        # Check for extreme slope (vertical asymptote indicator)
        dx = x2 - x1
        if abs(dx) > 1e-10:
            slope = (y2 - y1) / dx
            if abs(slope) > self.vertical_threshold:
                return DiscontinuityType.VERTICAL_ASYMPTOTE
        
        # Check for extreme value jump
        dy = abs(y2 - y1)
        if dy > self.value_threshold:
            return DiscontinuityType.JUMP_DISCONTINUITY
        
        # Check for sign flip with large magnitude change
        if y1 * y2 < 0 and dy > 10:
            return DiscontinuityType.VERTICAL_ASYMPTOTE
        
        return DiscontinuityType.NONE
    
    def _adaptive_sample_recursive(self, func: Callable[[float], float],
                                   x1: float, x2: float,
                                   y1: float, y2: float,
                                   valid1: bool, valid2: bool,
                                   depth: int):
        """
        Recursively sample a function interval with adaptive refinement.
        """
        # Check termination conditions
        if depth >= self.max_depth:
            return
        
        step = x2 - x1
        if abs(step) < self.min_step:
            return
        
        # Midpoint
        x_mid = (x1 + x2) / 2
        y_mid, valid_mid = self._evaluate_function(func, x_mid)
        
        # If midpoint is invalid, don't subdivide further
        if not valid_mid:
            return
        
        # Add midpoint to current segment
        if self._current_segment:
            self._current_segment.add_point(x_mid, y_mid, valid_mid)
        
        # Check if subdivision is needed based on curvature
        if valid1 and valid2:
            # Create temporary points for angle calculation
            p1 = SamplePoint(x1, y1, valid1)
            p_mid = SamplePoint(x_mid, y_mid, valid_mid)
            p2 = SamplePoint(x2, y2, valid2)
            
            angle = self._calculate_angle(p1, p_mid, p2)
            
            # Subdivide if angle exceeds threshold
            if angle > self.angle_threshold:
                # Left half
                self._adaptive_sample_recursive(
                    func, x1, x_mid, y1, y_mid, 
                    valid1, valid_mid, depth + 1
                )
                
                # Right half
                self._adaptive_sample_recursive(
                    func, x_mid, x2, y_mid, y2,
                    valid_mid, valid2, depth + 1
                )
    
    def sample_function(self, func: Callable[[float], float],
                       x_min: float, x_max: float,
                       initial_samples: int = 100) -> List[CurveSegment]:
        """
        Sample a function over an interval using adaptive refinement.
        
        Args:
            func: Function to sample (callable taking float, returning float)
            x_min: Start of interval
            x_max: End of interval
            initial_samples: Number of initial uniform samples
            
        Returns:
            List of CurveSegment objects representing continuous portions
        """
        self._segments = []
        self._current_segment = CurveSegment()
        
        if x_min >= x_max:
            return self._segments
        
        # Initial uniform sampling
        step = (x_max - x_min) / (initial_samples - 1) if initial_samples > 1 else 0
        
        prev_x = None
        prev_y = None
        prev_valid = False
        
        for i in range(initial_samples):
            x = x_min + i * step
            y, valid = self._evaluate_function(func, x)
            
            # Check for discontinuity with previous point
            if prev_x is not None and prev_valid and valid:
                discontinuity = self._detect_discontinuity(
                    prev_x, prev_y, x, y, prev_valid, valid
                )
                
                # Break segment at discontinuity
                if discontinuity != DiscontinuityType.NONE:
                    if not self._current_segment.is_empty():
                        self._segments.append(self._current_segment)
                    self._current_segment = CurveSegment()
            
            # Add point to current segment
            if valid:
                self._current_segment.add_point(x, y, True)
                
                # Apply adaptive refinement
                if prev_valid and prev_x is not None:
                    self._adaptive_sample_recursive(
                        func, prev_x, x, prev_y, y,
                        prev_valid, valid, 0
                    )
            
            prev_x = x
            prev_y = y
            prev_valid = valid
        
        # Don't forget the last segment
        if not self._current_segment.is_empty():
            self._segments.append(self._current_segment)
        
        return self._segments
    
    def get_all_points(self) -> List[SamplePoint]:
        """Get all sampled points from all segments as a flat list."""
        points = []
        for segment in self._segments:
            points.extend(segment.points)
        return points
    
    def get_segments_as_arrays(self) -> Tuple[List[List[float]], List[List[float]]]:
        """
        Get segments formatted for rendering.
        
        Returns:
            Tuple of (x_arrays, y_arrays) where each is a list of lists
        """
        x_arrays = []
        y_arrays = []
        
        for segment in self._segments:
            if segment.point_count < 2:
                continue
            
            x_arr = [p.x for p in segment.points]
            y_arr = [p.y for p in segment.points]
            
            x_arrays.append(x_arr)
            y_arrays.append(y_arr)
        
        return (x_arrays, y_arrays)


class ParametricSampler:
    """
    Sampler for parametric equations x(t), y(t).
    """
    
    def __init__(self, max_depth: int = 10, min_step: float = 1e-6,
                 angle_threshold: float = 0.1):
        self.max_depth = max_depth
        self.min_step = min_step
        self.angle_threshold = angle_threshold
        self._points: List[SamplePoint] = []
    
    def _evaluate_parametric(self, x_func: Callable[[float], float],
                             y_func: Callable[[float], float],
                             t: float) -> Tuple[float, float, bool]:
        """Safely evaluate parametric functions."""
        try:
            x = x_func(t)
            y = y_func(t)
            
            if (math.isnan(x) or math.isnan(y) or 
                math.isinf(x) or math.isinf(y)):
                return (float('nan'), float('nan'), False)
            
            return (x, y, True)
        except (ValueError, ZeroDivisionError, OverflowError, TypeError):
            return (float('nan'), float('nan'), False)
    
    def sample(self, x_func: Callable[[float], float],
               y_func: Callable[[float], float],
               t_min: float, t_max: float,
               initial_samples: int = 200) -> List[SamplePoint]:
        """
        Sample a parametric curve.
        
        Args:
            x_func: Function x(t)
            y_func: Function y(t)
            t_min: Start of parameter interval
            t_max: End of parameter interval
            initial_samples: Number of initial samples
            
        Returns:
            List of SamplePoint objects
        """
        self._points = []
        
        step = (t_max - t_min) / (initial_samples - 1) if initial_samples > 1 else 0
        
        for i in range(initial_samples):
            t = t_min + i * step
            x, y, valid = self._evaluate_parametric(x_func, y_func, t)
            
            if valid:
                self._points.append(SamplePoint(x, y, True))
        
        return self._points
    
    def get_arrays(self) -> Tuple[List[float], List[float]]:
        """Get x and y coordinate arrays."""
        x = [p.x for p in self._points]
        y = [p.y for p in self._points]
        return (x, y)


class PolarSampler:
    """
    Sampler for polar equations r = f(θ).
    """
    
    def __init__(self, max_depth: int = 10, min_step: float = 1e-6):
        self.max_depth = max_depth
        self.min_step = min_step
        self._points: List[SamplePoint] = []
    
    def sample(self, r_func: Callable[[float], float],
               theta_min: float, theta_max: float,
               initial_samples: int = 360) -> List[SamplePoint]:
        """
        Sample a polar curve.
        
        Args:
            r_func: Function r(θ)
            theta_min: Start angle (radians)
            theta_max: End angle (radians)
            initial_samples: Number of initial samples
            
        Returns:
            List of SamplePoint objects in Cartesian coordinates
        """
        self._points = []
        
        step = (theta_max - theta_min) / (initial_samples - 1) if initial_samples > 1 else 0
        
        for i in range(initial_samples):
            theta = theta_min + i * step
            
            try:
                r = r_func(theta)
                
                if math.isnan(r) or math.isinf(r):
                    continue
                
                # Convert to Cartesian
                x = r * math.cos(theta)
                y = r * math.sin(theta)
                
                if not (math.isnan(x) or math.isnan(y) or 
                       math.isinf(x) or math.isinf(y)):
                    self._points.append(SamplePoint(x, y, True))
                    
            except (ValueError, ZeroDivisionError, OverflowError, TypeError):
                continue
        
        return self._points
    
    def get_arrays(self) -> Tuple[List[float], List[float]]:
        """Get x and y coordinate arrays."""
        x = [p.x for p in self._points]
        y = [p.y for p in self._points]
        return (x, y)


if __name__ == "__main__":
    # Test adaptive sampling
    print("Adaptive Sampler Test")
    print("=" * 50)
    
    sampler = AdaptiveSampler(
        max_depth=8,
        angle_threshold=0.05,
        vertical_threshold=50.0
    )
    
    # Test 1: Simple parabola
    print("\n1. Testing f(x) = x^2")
    segments = sampler.sample_function(lambda x: x**2, -5, 5, initial_samples=20)
    total_points = sum(seg.point_count for seg in segments)
    print(f"   Segments: {len(segments)}, Total points: {total_points}")
    
    # Test 2: Sine wave
    print("\n2. Testing f(x) = sin(x)")
    segments = sampler.sample_function(math.sin, 0, 4*math.pi, initial_samples=30)
    total_points = sum(seg.point_count for seg in segments)
    print(f"   Segments: {len(segments)}, Total points: {total_points}")
    
    # Test 3: Tangent (with asymptotes)
    print("\n3. Testing f(x) = tan(x)")
    segments = sampler.sample_function(math.tan, -math.pi, math.pi, initial_samples=50)
    total_points = sum(seg.point_count for seg in segments)
    print(f"   Segments: {len(segments)} (should be >1 due to asymptotes)")
    print(f"   Total points: {total_points}")
    
    # Test 4: Rational function with asymptote
    print("\n4. Testing f(x) = 1/x")
    segments = sampler.sample_function(lambda x: 1/x if x != 0 else float('nan'), 
                                       -5, 5, initial_samples=50)
    total_points = sum(seg.point_count for seg in segments)
    print(f"   Segments: {len(segments)} (should be 2 due to asymptote at x=0)")
    print(f"   Total points: {total_points}")
    
    # Test parametric sampling
    print("\n5. Testing parametric circle: x=cos(t), y=sin(t)")
    param_sampler = ParametricSampler()
    points = param_sampler.sample(math.cos, math.sin, 0, 2*math.pi, 100)
    print(f"   Points sampled: {len(points)}")
    
    # Test polar sampling
    print("\n6. Testing polar rose: r = cos(3θ)")
    polar_sampler = PolarSampler()
    points = polar_sampler.sample(lambda t: math.cos(3*t), 0, 2*math.pi, 200)
    print(f"   Points sampled: {len(points)}")
