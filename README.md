# CivisAnalysis2

A comprehensive web-based data visualization platform for analyzing Brazilian congressional data, including deputies, roll calls, voting patterns, and party metrics. Built with D3.js, jQuery, and Bootstrap.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [State Management](#state-management)
- [Visualizations](#visualizations)
- [Development](#development)
- [API Documentation](#api-documentation)

## Overview

CivisAnalysis2 is an interactive visualization system that allows users to explore and analyze Brazilian congressional voting data through multiple coordinated visualizations. The application supports:

- **Timeline visualization** of roll calls over time
- **Scatter plots** showing political spectrum positioning
- **Heatmaps** for roll call analysis
- **Party metrics** with Rice Index calculations
- **Force-directed graphs** for similarity analysis
- **Chamber infographics** and more

The system uses a modular architecture with centralized state management, following industry best practices and design patterns.

## Features

### Core Capabilities

- **Multi-panel Interface**: Create and manage multiple visualization panels simultaneously
- **Interactive Visualizations**: Click, drag, brush, and filter data across visualizations
- **Data Filtering**: Filter by deputies, roll calls, dates, themes, and motion types
- **Search Functionality**: Search for deputies and roll calls with autocomplete
- **Panel Management**: Minimize, maximize, remove, and organize panels
- **State Persistence**: Centralized state management ensures consistency across visualizations
- **Bilingual Support**: English and Portuguese language support

### Visualizations

1. **Timeline** - Temporal view of roll calls
2. **Scatter Plot** - Political spectrum positioning using dimensionality reduction (PCA, MDS, t-SNE, UMAP)
3. **Roll Calls Heatmap** - Matrix visualization of voting patterns
4. **Chamber Infographic** - Visual representation of chamber composition
5. **Party Metrics** - Rice Index gauge, roll calls list, and bar charts
6. **Similarity Force Layout** - Network graph of deputy relationships
7. **Themes Bubble Chart** - Theme-based analysis
8. **Small Multiples** - Comparative visualizations

## Architecture

### Design Patterns

The codebase follows several design patterns:

- **Singleton Pattern**: `StateManager` for centralized state
- **Module Pattern**: Encapsulated functionality per file
- **Factory Pattern**: Dynamic UI component creation
- **Strategy Pattern**: Different chart initialization strategies
- **Observer Pattern**: Coordinated visualization updates
- **Service Pattern**: Encapsulated data access

### Module Structure

```
javascripts/
├── core/
│   ├── constants.js              # All constants and enums
│   └── state-manager.js          # Centralized state management (Singleton)
│
├── data/
│   ├── data-loader.js            # Data loading operations
│   └── data-processor.js         # Data transformations & calculations
│
├── ui/
│   ├── ui-menu-factory.js        # Menu creation (Factory pattern)
│   ├── ui-utilities.js           # UI helper functions
│   └── panel-manager.js          # Panel lifecycle management
│
├── charts/
│   ├── chart-initializer.js      # Chart initialization (Strategy pattern)
│   └── visualization-updater.js  # Visualization coordination (Observer pattern)
│
├── events/
│   └── event-handlers.js         # Event and context menu handlers
│
└── utils/
    └── general-utilities.js     # General utility functions
```

### Refactoring History

The project underwent a major refactoring from monolithic files to a modular architecture:

**Before:**
- `windows-system.js`: 2,268 lines
- `windows-system-controller.js`: 916 lines
- Total: 3,184 lines in 2 files

**After:**
- 11+ focused modules
- Average ~200-400 lines per file
- Clear separation of concerns
- Improved maintainability and testability

## Getting Started

### Prerequisites

- Node.js >= 18
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd CivisAnalysis2
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

This creates a `dist/` directory with all static files ready for deployment.

## Project Structure

```
CivisAnalysis2/
├── data/                    # JSON data files
│   ├── deputies.json        # Deputy information
│   ├── arrayRollCalls.json  # Roll call data
│   ├── deputiesNodesByYear.json
│   └── precalc/            # Pre-calculated period data
│
├── javascripts/            # Source code
│   ├── core/               # Core modules
│   ├── data/               # Data modules
│   ├── ui/                 # UI modules
│   ├── charts/             # Chart modules
│   ├── events/             # Event handlers
│   ├── utils/              # Utilities
│   └── [visualization files].js
│
├── stylesheets/            # CSS files
├── images/                 # Images and icons
├── fonts/                  # Font files
└── index.html             # Main HTML file
```

## State Management

### StateManager Singleton

All application state is managed through the `StateManager` singleton pattern:

```javascript
var state = StateManager.getInstance();

// Reading state
var deputies = state.getDeputiesArray();
var deputyNodes = state.getDeputyNodes();
var tree = state.getTree();
var language = state.getLanguage();

// Writing state
state.setCurrentDeputies(deputies);
state.addDeputyNode(panelID, data);
state.setShiftKey(true);
```

### State Access Pattern

**✅ DO:**
```javascript
function myFunction() {
    // Get state at function scope
    var deputyNodes = state.getDeputyNodes();
    var tree = state.getTree();
    
    // Use retrieved state
    for (var key in deputyNodes) {
        // ... logic
    }
    
    // Use setters for mutations
    state.addDeputyNode(panelID, data);
}
```

**❌ DON'T:**
```javascript
// Don't cache state globally
var myGlobalDeputies = state.getDeputyNodes();  // BAD!

// Don't mutate directly (no longer possible)
deputyNodes[panelID] = data;  // Won't work - not exposed!
```

### Available State Methods

**Getters:**
- `getDeputiesArray()` - All deputies data
- `getDeputiesNodesByYear()` - Deputies organized by year
- `getArrayRollCalls()` - All roll calls
- `getDeputyNodes()` - Deputy nodes by panel ID
- `getRollCallsRates()` - Roll call rates by panel ID
- `getCurrentDeputies()` - Currently selected deputies
- `getCurrentRollCalls()` - Currently selected roll calls
- `getTree()` - Panel tree structure
- `getLanguage()` - Current language setting
- `getShiftKey()` - Shift key state
- `getSelectionOn()` - Selection state

**Setters:**
- `setCurrentDeputies(value)` - Set current deputies
- `setCurrentRollCalls(value)` - Set current roll calls
- `addDeputyNode(id, data)` - Add deputy node for panel
- `addRollCallRate(id, data)` - Add roll call rate for panel
- `removeDeputyNode(id)` - Remove deputy node
- `removeRollCallRate(id)` - Remove roll call rate
- `setShiftKey(value)` - Set shift key state
- `setLanguage(value)` - Set language

## Visualizations

### Timeline

The timeline visualization shows roll calls over time. Users can:
- Select date ranges
- Create scatter plots from selected periods
- Filter by various criteria

### Scatter Plot

Shows deputies positioned on a political spectrum using dimensionality reduction techniques:
- **PCA** (Principal Component Analysis)
- **MDS** (Multidimensional Scaling)
- **t-SNE** (t-Distributed Stochastic Neighbor Embedding)
- **UMAP** (Uniform Manifold Approximation and Projection)

Features:
- Brush selection for filtering
- Party legend with context menu
- Search and filter capabilities
- K-means clustering slider

### Party Metrics

A comprehensive visualization showing party cohesion metrics:

**Components:**
1. **Gauge Chart** (`gauge-chart.js`) - Rice Index gauge with colored sections
2. **Roll Calls List** (`roll-calls-list.js`) - Top 10 least cohesive roll calls
3. **Bar Chart Tabs** (`bar-chart-tabs.js`) - Theme Rice Index and Deputy Alignment

**Usage:**
1. Open a Scatter Plot visualization
2. Right-click on any party in the legend
3. Select "Show Party Metrics"
4. A new panel displays party metrics

**Rice Index Calculation:**
The Rice Index measures party cohesion (0-1 scale):
- **0.0-0.4**: Low cohesion (Red)
- **0.4-0.6**: Moderate cohesion (Orange)
- **0.6-0.8**: Good cohesion (Yellow)
- **0.8-1.0**: High cohesion (Green)

### Roll Calls Heatmap

Matrix visualization showing voting patterns across roll calls and deputies.

### Chamber Infographic

Visual representation of the chamber composition and party distribution.

### Similarity Force Layout

Network graph showing relationships and similarities between deputies.

## Development

### Adding a New Visualization

1. **Define constant** in `javascripts/core/constants.js`:
```javascript
var NEW_CHART_TYPE = 12;
typeChartToString[12] = "New Chart";
```

2. **Create visualization file** in `javascripts/`:
```javascript
function newChart() {
    // D3 reusable chart pattern
    var width = 1020,
        height = 680;
    
    function chart(selection) {
        selection.each(function(data) {
            // Rendering logic
        });
    }
    
    chart.width = function(value) { /* ... */ };
    chart.height = function(value) { /* ... */ };
    
    return chart;
}
```

3. **Add initialization** in `javascripts/charts/chart-initializer.js`:
```javascript
case NEW_CHART_TYPE:
    return initializeNewChart(newID, chartObj);
```

4. **Add script tag** in `index.html`:
```html
<script src="javascripts/new-chart.js"></script>
```

### Adding New State

1. **Add to StateManager** (`javascripts/core/state-manager.js`):
```javascript
this._newState = initialValue;

this.getNewState = function() { 
    return this._newState; 
};

this.setNewState = function(value) { 
    this._newState = value; 
};
```

2. **Use everywhere explicitly**:
```javascript
var newState = state.getNewState();
state.setNewState(updatedValue);
```

### Code Style Guidelines

- Use explicit state access: `state.getXXX()` and `state.setXXX()`
- Keep modules focused on single responsibility
- Follow existing patterns for consistency
- Document complex logic with comments
- Use descriptive variable and function names

## API Documentation

### Window System Functions

#### Panel Management

- `createNewChild(currentId, shape)` - Create a new panel with selected shape
- `removeWindow()` - Remove selected panel and its children
- `minimizeWindow()` - Minimize panel to icon
- `maximizeWindow()` - Restore panel from icon
- `setUpPanel(newID, shape)` - Configure panel settings

#### UI Utilities

- `drawLine(panelX, panelY)` - Draw line between two panels
- `getCenter(obj)` - Get center coordinates of a panel
- `centerLine(panelID, icon)` - Update line positions when panel moves
- `checkLimits()` - Ensure panels don't overflow window

#### Data Processing

- `createDeputyNodes(deputies, filteredDeputies)` - Transform deputy data
- `calcRollCallRate(rollCalls, deputies)` - Calculate voting rates
- `filterDeputies(deputies, minParticipation)` - Filter by participation
- `filterMotions(rollCalls, criteria)` - Filter by motion criteria

### Party Metrics API

#### GaugeChart Module

```javascript
GaugeChart.render(svgSelection, value, centerX, centerY, areaW, areaH)
```

Renders a semicircular gauge chart displaying Rice Index value.

#### RollCallsList Module

```javascript
RollCallsList.render(svgSelection, {
    party: string,
    data: array,
    x: number,
    y: number,
    w: number,
    h: number
})
```

Displays a compact list of up to 10 least cohesive roll calls.

#### BarChartTabs Module

```javascript
BarChartTabs.render(svgSelection, {
    party: string,
    deputies: array,
    riceData: array,
    x: number,
    y: number,
    w: number,
    h: number,
    currentMode: string,
    onModeChange: function
})
```

Renders tabbed interface with Theme Rice Index and Deputy Alignment charts.

#### PartyMetrics Main Module

```javascript
var chart = partyMetrics()
    .width(1020)
    .height(680)
    .margin({ top: 15, right: 30, bottom: 25, left: 30 });

d3.select("#container")
    .datum(data)
    .call(chart);
```

Main coordinator for party metrics visualization.

## Testing

### Manual Testing Checklist

- [ ] Application loads without errors
- [ ] Timeline displays correctly
- [ ] Create scatter plot from timeline
- [ ] Scatter plot shows deputies correctly
- [ ] Apply filters (deputies, roll calls, dates)
- [ ] Search functions work
- [ ] Create chamber infographic
- [ ] Create roll calls heatmap
- [ ] Create deputies similarity force
- [ ] Minimize/maximize panels
- [ ] Remove panels (data cleanup)
- [ ] Reload scatter plot with subjects
- [ ] Multiple panels with different data
- [ ] Panel selections work across visualizations
- [ ] Party metrics visualization works
- [ ] Context menus function properly

### Browser Console Checks

```javascript
// Verify state is properly managed
state.getDeputiesArray().length  // Should show number of deputies
state.getArrayRollCalls().length // Should show number of roll calls
state.getTree()                  // Should show tree structure
```

## Troubleshooting

### Common Issues

**State not accessible:**
- Ensure `state-manager.js` is loaded first in `index.html`
- Check console: `state` should be defined
- Verify StateManager singleton is instantiated

**Visualizations not rendering:**
- Check browser console for errors
- Verify data files are loaded
- Ensure D3.js is loaded before visualization scripts

**Panel management issues:**
- Verify jQuery UI is loaded
- Check that panel IDs are unique
- Ensure tree structure is properly maintained

## Contributing

When contributing to this project:

1. Follow existing code patterns and architecture
2. Use StateManager for all state access
3. Keep modules focused on single responsibility
4. Test thoroughly before submitting
5. Update documentation as needed

## License

[Add license information here]

## Acknowledgments

Built with:
- D3.js v3 for visualizations
- jQuery and jQuery UI for interactions
- Bootstrap for UI components
- Various open-source libraries (see `index.html` for full list)

---

**Status:** ✅ Production Ready  
**Architecture:** Modular with centralized state management  
**Code Quality:** Professional-grade, following industry best practices
