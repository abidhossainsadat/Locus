# Locus — Interactive Web-Based Graphing Tool

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61dafb)](https://reactjs.org/)
[![Rust+WASM](https://img.shields.io/badge/Rust-WASM-orange)](https://rustwasm.github.io/)

**Locus** is an advanced, web-based mathematical graphing platform engineered to deliver performant computational geometry, numerical analysis, and real-time interactive plotting alongside an intuitive interface.

![Locus Screenshot](./docs/assets/screenshot.png)

---

## ✨ Features

### Core Capabilities
- **Explicit Functions**: Plot $y = f(x)$ with high-precision evaluation
- **Parametric Equations**: Visualize $(x(t), y(t))$ over defined intervals
- **Polar Curves**: Render $r = f(\theta)$ with adaptive sampling
- **Implicit Curves**: Display $f(x, y) = C$ using marching squares algorithm (WASM-powered)
- **Vector Fields**: Explore $\vec{F}(x, y) = \langle P, Q \rangle$ with dynamic normalization
- **Differential Equations**: Solve and visualize ODE phase portraits via adaptive Runge-Kutta (RKF45)

### Interactive Tools
- **Dynamic Sliders**: Animate parameters with continuous playback control
- **Smart Point Snapping**: Detect roots, extrema, inflection points, and intersections
- **Tangent & Normal Vectors**: Trace curves with analytical derivative calculation
- **Definite Integral Visualizer**: Shade regions with real-time numerical quadrature
- **Pan & Zoom**: Smooth navigation with mouse, touch, and stylus support

### Design & Accessibility
- **Dark/Light Modes**: Tokenized design system with seamless theme switching
- **Colorblind-Friendly Palette**: High-contrast curve colors for accessibility
- **Responsive UI**: Optimized for desktop, tablet, and touch devices
- **LaTeX Rendering**: Real-time KaTeX formatted expression display

---

## 🏗️ Architecture

Locus is built on modern web standards with a modular architecture separating UI, computation, and rendering layers:

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERFACE                          │
│  ┌──────────────────┐         ┌─────────────────────────┐   │
│  │ React UI / Input │         │ KaTeX Formatted Output  │   │
│  └──────────────────┘         └─────────────────────────┘   │
└──────────────┬───────────────────────────┬─────────────────┘
               │                           │
               ▼                           │
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION STATE                         │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Zustand Global Store (ASTs, Styles, Viewport, Config) │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────┬───────────────────────────┬─────────────────┘
               │                           │
               ▼                           │
┌─────────────────────────────────────────────────────────────┐
│                COMPUTATION & RENDER ENGINE                   │
│  ┌──────────────────┐         ┌─────────────────────────┐   │
│  │ WASM Numerical   │────────>│ Canvas Render Loop      │   │
│  │ Engine (Rust)    │         │ (requestAnimationFrame) │   │
│  └──────────────────┘         └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Technical Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | React 18+ (TypeScript) | Declarative UI, strict type safety, component modularity |
| **Design System** | Tailwind CSS + Radix UI | Accessible primitives, tokenized design, dark/light modes |
| **Math Parser** | MathJS + Custom AST | Lexical analysis, symbolic simplification, expression evaluation |
| **Numerical Kernel** | Rust → WASM (`wasm-pack`) | Adaptive mesh generation, RK4/RKF45 integration, marching squares |
| **Rendering** | Three.js / WebGL & Canvas 2D | Hardware-accelerated 2D/3D plots, vector fields, high-density curves |
| **Math Formatting** | KaTeX | Fast LaTeX rendering for real-time expression feedback |
| **State Management** | Zustand | Lightweight state separating canvas loops from React re-renders |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **Rust toolchain** (`rustc`, `cargo`, `wasm-pack`) — required for WASM module

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-organization/locus.git
cd locus

# 2. Install dependencies
pnpm install

# 3. Build the WebAssembly module
cd wasm
wasm-pack build --target web
cd ..

# 4. Start the development server
pnpm dev

# 5. Open your browser
# Navigate to http://localhost:5173
```

### Available Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Launch Vite development server with hot reload |
| `pnpm build` | Compile TypeScript and build for production |
| `pnpm preview` | Preview production build locally |
| `pnpm test` | Run Vitest unit test suite |
| `pnpm test:e2e` | Run Playwright end-to-end tests |
| `pnpm wasm:build` | Compile Rust code to WebAssembly |

---

## 📁 Project Structure

```
locus/
├── docs/                     # Architectural documentation & API specifications
├── src/
│   ├── assets/               # Static icons, fonts, design tokens
│   ├── components/           # React UI Components
│   │   ├── canvas/           # Canvas wrapper, viewport controls, overlays
│   │   ├── drawer/           # Expression list, slider cards, tool panels
│   │   ├── math/             # KaTeX input fields, formula builders
│   │   └── ui/               # Radix/Tailwind primitive UI elements
│   ├── engine/               # Math evaluation & rendering logic
│   │   ├── evaluate/         # MathJS parser, AST builders, WASM bridge
│   │   ├── renderer/         # WebGL / Canvas2D render controllers
│   │   └── transform/        # Screen-to-world coordinate converters
│   ├── store/                # Zustand global state slices
│   ├── types/                # TypeScript interfaces & type definitions
│   └── utils/                # Geometry helpers, export utilities (PNG/SVG/PDF)
├── wasm/                     # Rust WebAssembly package
│   └── src/                  # High-speed mesh solvers & RK4 integrations
├── tests/                    # Vitest unit tests & Playwright E2E tests
├── index.html                # Application entry point
├── package.json              # Project dependencies & scripts
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript compiler options
└── vite.config.js            # Vite build configuration
```

---

## 🎨 Usage Examples

### Plotting a Simple Function

Enter `sin(x) * a` in the function input field. A slider for parameter `a` will be automatically generated. Adjust the slider to see the amplitude change in real-time.

### Implicit Curve

Switch mode to **Implicit** and enter `x^2 + y^2 - 25` to plot a circle with radius 5.

### Parametric Equation

Select **Parametric** mode and define:
- $x(t) = \cos(t)$
- $y(t) = \sin(2t)$
- Set $t \in [0, 2\pi]$

### Vector Field

Choose **Vector Field** mode and input:
- $P(x, y) = -y$
- $Q(x, y) = x$

This displays a rotational field centered at the origin.

### Differential Equation

In **ODE** mode, enter `dy/dx = -x/y` with initial conditions to visualize solution trajectories.

---

## 🔬 Performance Considerations

Locus is optimized for 60+ FPS during interactive operations:

1. **Viewport Isolation**: Scale factors, panning translations, and cursor coordinates use `useRef` and are polled during `requestAnimationFrame`, bypassing React reconciliation.
2. **Web Worker Offloading**: CPU-intensive tasks (implicit contouring, 3D surface generation, ODE stepping) run in dedicated Web Workers.
3. **Memory Recycling**: Typed arrays (`Float32Array`) for vertex buffers are allocated once and updated in-place to prevent GC-induced frame drops.

---

## 🧪 Testing

```bash
# Run unit tests
pnpm test

# Run end-to-end tests
pnpm test:e2e

# Generate coverage report
pnpm test -- --coverage
```

**Coverage Requirement**: 100% coverage on core mathematical parser and coordinate mapping functions.

---

## 🛣️ Roadmap

### Phase 1 (MVP Foundation) ✅
- [x] Explicit 2D function plotting
- [x] Coordinate transformation engine
- [x] Interactive pan/zoom
- [x] Expression sliders

### Phase 2 (Advanced Curves) 🚧
- [ ] WASM-powered implicit function engine (marching squares)
- [ ] Parametric and polar coordinate support
- [ ] LaTeX expression editor with live preview

### Phase 3 (Calculus & Analysis Tools) 📋
- [ ] Derivative tracing
- [ ] Dynamic tangent/normal lines
- [ ] Numerical integration with shaded region rendering
- [ ] Point snapping to critical points

### Phase 4 (Differential Equations & 3D) 🔮
- [ ] Vector fields with particle flow simulation
- [ ] ODE phase portraits
- [ ] WebGL 3D surface plot renderer
- [ ] SVG/Vector PDF export module

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards
- **TypeScript**: Strict typing mandatory (`"strict": true`). No implicit `any`.
- **Purity**: Computational helpers must be stateless, pure functions.
- **Testing**: All new features require corresponding unit tests.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [MathJS](https://mathjs.org/) — Powerful mathematics library for JavaScript
- [KaTeX](https://katex.org/) — Fast LaTeX rendering engine
- [Three.js](https://threejs.org/) — WebGL 3D graphics library
- [Zustand](https://zustand-demo.pmnd.rs/) — Bear necessities for state management
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
- [Radix UI](https://www.radix-ui.com/) — Accessible UI primitives

---

**Built with ❤️ by the Locus Team**
