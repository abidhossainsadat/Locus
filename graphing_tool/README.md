# Advanced Graphing Tool

A professional-grade mathematical graphing application built with Python and Tkinter, featuring a custom expression parser, adaptive sampling engine, and interactive visualization.

## Features

### Core Capabilities

1. **Mathematical Expression Parser**
   - Full support for arithmetic operators: `+`, `-`, `*`, `/`, `^`
   - Trigonometric functions: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `sinh`, `cosh`, `tanh`
   - Logarithmic/Exponential: `ln`, `log`, `log2`, `exp`
   - Other functions: `sqrt`, `abs`, `floor`, `ceil`, `round`, `sign`, `max`, `min`
   - Built-in constants: `pi`, `e`, `τ`

2. **Interactive Visualization**
   - Real-time pan (click and drag)
   - Mouse wheel zoom (focused on cursor position)
   - Dynamic grid with major/minor tick marks
   - Automatic axis labeling with smart formatting

3. **Adaptive Sampling Engine**
   - Curvature-based refinement for smooth curves
   - Automatic discontinuity detection (asymptotes, jumps)
   - Segment breaking at undefined regions
   - Support for parametric and polar equations

4. **Multi-Function Plotting**
   - Plot multiple functions simultaneously
   - Custom colors per function
   - Adjustable line widths
   - Function visibility toggling

## Architecture

```
graphing_tool/
├── src/
│   ├── parser.py      # Expression lexer, parser (Pratt), AST evaluator
│   ├── transform.py   # Coordinate transformations, viewport management
│   ├── sampler.py     # Adaptive sampling, discontinuity detection
│   └── renderer.py    # Tkinter canvas rendering, GUI controls
├── tests/
│   └── test_parser.py # Unit tests for the parser
└── assets/            # Resources and icons
```

## Installation

### Requirements

- Python 3.8+
- Tkinter (usually included with Python)

```bash
# No external dependencies required!
# Just run the application directly
python src/renderer.py
```

## Usage

### Running the Application

```bash
cd graphing_tool
python src/renderer.py
```

### Adding Functions

1. Type an expression in the input field (e.g., `sin(x)`, `x^2 + 3*x - 1`)
2. Select a color using the color picker
3. Click "Add" to plot the function

### Navigation Controls

| Action | Method |
|--------|--------|
| Pan | Click and drag on the canvas |
| Zoom In | Scroll mouse wheel up |
| Zoom Out | Scroll mouse wheel down |
| Reset View | Click "Reset View" button |

### Preset Views

- **Standard**: Default view (-10 to 10 on both axes)
- **Trig**: Optimized for trigonometric functions (-2π to 2π, -2 to 2)

## Expression Syntax

### Supported Operators

| Operator | Description | Precedence |
|----------|-------------|------------|
| `^` | Exponentiation | 30 (highest) |
| `*`, `/` | Multiplication, Division | 20 |
| `+`, `-` | Addition, Subtraction | 10 (lowest) |

### Examples

```
# Basic polynomials
x^2 + 2*x + 1
3*x^3 - 5*x + 2

# Trigonometric
sin(x) * cos(x)
tan(x)
sin(x^2)

# Rational functions
1 / x
(x + 1) / (x - 1)

# Composite functions
sin(exp(x))
sqrt(1 - x^2)
ln(abs(x))

# Using constants
pi * x
e^x
τ * sin(x)
```

## Technical Details

### Parser Implementation

The parser uses a **Pratt parsing algorithm** (top-down operator precedence parsing) which provides:
- Clean handling of operator precedence
- Right-associativity for exponentiation
- Easy extension for new operators

### Coordinate Transformation

Mathematical coordinates (ℝ²) are mapped to screen pixels (ℤ²) using affine transformations:

```
X_screen = (x_math - x_min) / (x_max - x_min) * width
Y_screen = height - (y_math - y_min) / (y_max - y_min) * height
```

The Y-axis is inverted to match screen coordinate conventions.

### Adaptive Sampling

The sampler uses recursive subdivision based on local curvature:

1. Initial uniform sampling across the viewport
2. For each segment, calculate the angle between adjacent line segments
3. If the angle exceeds a threshold, recursively subdivide
4. Detect discontinuities by monitoring value jumps and slope changes

## Extending the Tool

### Adding New Functions

Edit `src/parser.py` and add to the `FUNCTIONS` dictionary:

```python
FUNCTIONS = {
    # ... existing functions ...
    'sec': lambda x: 1 / math.cos(x),
    'csc': lambda x: 1 / math.sin(x),
}
```

### Custom Color Schemes

Modify the default colors in `renderer.py`:

```python
default_functions = [
    ("sin(x)", "#E74C3C"),  # Red
    ("cos(x)", "#3498DB"),  # Blue
    # Add your own...
]
```

## Performance Considerations

- The adaptive sampler typically generates 200-500 points per function
- Rendering is optimized using segment caching
- Grid lines are cached and only recalculated on viewport changes
- For very complex expressions, consider reducing initial sample count

## Future Enhancements

Potential additions for extended functionality:

1. **Implicit Plotting**: Marching squares algorithm for F(x,y) = 0
2. **Calculus Tools**: Numerical differentiation/integration visualization
3. **Parametric Mode**: Direct support for x(t), y(t) equations
4. **Polar Mode**: r = f(θ) plotting
5. **Export Options**: Save graphs as PNG/SVG
6. **Animation**: Parameter animation for dynamic visualization

## License

This project is provided as-is for educational and personal use.

## Credits

Built following best practices in:
- Compiler design (lexical analysis, parsing)
- Computer graphics (coordinate transformations)
- Numerical analysis (adaptive sampling)
- UI/UX design (interactive visualization)
