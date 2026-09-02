# Locus - Interactive Graphing Tool

A modern, interactive mathematical graphing tool built with React, TypeScript, and WebGL-inspired Canvas rendering.

## Features

- **Multiple Graph Modes**: Cartesian (y = f(x)), Parametric, and Polar coordinates
- **Interactive Canvas**: Pan and zoom with mouse/touch controls
- **Dark/Light Mode**: Toggle between themes
- **Real-time Rendering**: Smooth 60 FPS graphing
- **Function Management**: Add, remove, and toggle visibility of multiple functions
- **Color Customization**: Each function can have its own color
- **Viewport Controls**: Adjust x/y ranges manually or use zoom buttons
- **Coordinate Display**: Real-time mouse position in mathematical coordinates
- **Advanced Features**: 
  - Tangent lines at selected points
  - Integral area shading
  - Grid and axes toggles

## Supported Functions

- **Math Functions**: sin, cos, tan, log, ln, exp, sqrt, abs, ^
- **Constants**: pi, e

## Tech Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS v4
- **State Management**: Zustand
- **Math Engine**: mathjs
- **Rendering**: HTML5 Canvas with custom renderer
- **3D Library**: Three.js (included for future features)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

This starts a local development server at http://localhost:3000

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` folder, ready for deployment.

### Preview Production Build

```bash
npm run preview
```

## Deploying to GitHub Pages

This project is configured for easy GitHub Pages deployment.

### Option 1: Manual Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. The `dist/` folder contains all static files needed.

3. Push to a `gh-pages` branch or configure your repository settings.

### Option 2: Using GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Option 3: Using gh-pages Package

```bash
npm install --save-dev gh-pages
```

Add to package.json scripts:
```json
"deploy": "npm run build && gh-pages -d dist"
```

Then run:
```bash
npm run deploy
```

## Project Structure

```
locus/
├── src/
│   ├── components/
│   │   ├── canvas/
│   │   │   └── GraphCanvas.tsx    # Main graphing canvas component
│   │   └── drawer/
│   │       └── FunctionDrawer.tsx # Sidebar for function management
│   ├── engine/
│   │   ├── evaluate/
│   │   │   ├── mathEvaluator.ts   # Math expression parser
│   │   │   └── sampler.ts         # Function sampling algorithm
│   │   ├── renderer/
│   │   │   └── canvasRenderer.ts  # Canvas drawing engine
│   │   └── transform/
│   │       └── coordinateTransform.ts # Coordinate conversion
│   ├── store/
│   │   └── graphStore.ts          # Zustand state management
│   ├── types/
│   │   └── index.ts               # TypeScript type definitions
│   ├── App.tsx                    # Main application component
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles
├── dist/                          # Production build output
├── index.html                     # HTML template
├── package.json
├── vite.config.js                 # Vite configuration
├── tailwind.config.js             # TailwindCSS configuration
└── tsconfig.json                  # TypeScript configuration
```

## License

MIT

## Acknowledgments

Built with modern web technologies for educational and mathematical visualization purposes.
