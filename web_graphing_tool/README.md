# Advanced Web Graphing Tool

A professional, responsive graphing calculator web application that works seamlessly on both mobile phones and desktop computers.

## Features

### Core Capabilities
- **Mathematical Expression Parser** - Full-featured parser supporting:
  - Basic operators: `+`, `-`, `*`, `/`, `^` (power)
  - Trigonometric: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`
  - Hyperbolic: `sinh`, `cosh`, `tanh`
  - Other functions: `log`, `ln`, `exp`, `sqrt`, `abs`, `floor`, `ceil`, `round`
  - Constants: `pi`, `e`, `phi`

- **Graphing Modes**:
  - **Cartesian**: `y = f(x)` - Standard function plotting
  - **Parametric**: `x(t), y(t)` - Parametric curves
  - **Polar**: `r = f(θ)` - Polar coordinates

- **Adaptive Sampling Engine**:
  - Curvature-based refinement for smooth curves
  - Automatic discontinuity/asymptote detection
  - Handles rapid oscillations and undefined regions

- **Interactive Controls**:
  - Pan by dragging (mouse or touch)
  - Zoom with mouse wheel or pinch gesture
  - Real-time coordinate display
  - Dynamic gridlines and axis labels

### User Interface
- Responsive design for mobile and desktop
- Multiple function overlay with custom colors
- Function visibility toggle
- Grid and axes toggles
- Keyboard shortcuts
- Mobile-friendly sidebar

## Quick Start

### Option 1: Open Directly
Simply open `index.html` in any modern web browser.

### Option 2: Use Local Server
```bash
# Using Python
python3 -m http.server 8000

# Or using Node.js (if you have http-server installed)
npx http-server -p 8000
```

Then navigate to `http://localhost:8000`

## Usage Examples

### Cartesian Mode
Enter functions like:
- `sin(x)`
- `x^2 - 3*x + 2`
- `ln(x) + sqrt(x)`
- `1/(x-2)` (shows asymptote handling)
- `sin(x^2) * cos(x)`

### Parametric Mode
Enter as `x(t), y(t)`:
- `cos(t), sin(t)` (circle)
- `cos(3*t), sin(5*t)` (Lissajous curve)
- `t*cos(t), t*sin(t)` (spiral)

### Polar Mode
Enter `r = f(θ)`:
- `1` (circle)
- `theta` (spiral)
- `1 + cos(theta)` (cardioid)
- `sin(3*theta)` (rose curve)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `0` | Reset view |
| `G` | Toggle grid |
| `A` | Toggle axes |

## File Structure

```
web_graphing_tool/
├── index.html      # Main HTML file with UI
├── parser.js       # Expression parser & AST engine
├── transform.js    # Coordinate transformation pipeline
├── sampler.js      # Adaptive sampling engine
├── renderer.js     # Canvas rendering engine
├── app.js          # Application controller
└── README.md       # This file
```

## Architecture

The application follows a modular architecture:

1. **Parser** (`parser.js`)
   - Tokenizer (lexical analysis)
   - Pratt Parser for AST construction
   - Code generation for fast evaluation

2. **Transform** (`transform.js`)
   - Affine transformation matrix
   - ℝ² → ℤ² coordinate mapping
   - Viewport management (pan/zoom)

3. **Sampler** (`sampler.js`)
   - Adaptive mesh refinement
   - Discontinuity detection
   - Support for cartesian, parametric, and polar modes

4. **Renderer** (`renderer.js`)
   - Canvas 2D drawing
   - Dynamic gridline generation
   - Axis labels and formatting

5. **App** (`app.js`)
   - Event handling
   - UI state management
   - Module coordination

## Browser Compatibility

Works on all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

## Technical Highlights

- **No external dependencies** - Pure vanilla JavaScript
- **Responsive design** - Works on any screen size
- **Touch support** - Full mobile interaction
- **High DPI support** - Sharp rendering on Retina displays
- **Real-time updates** - Instant feedback when typing expressions

## License

MIT License - Free to use and modify.
