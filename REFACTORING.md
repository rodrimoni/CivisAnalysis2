# Code Refactoring Documentation

## Overview

This document describes the refactoring of `windows-system.js` and `windows-system-controller.js` into a modular architecture following software engineering best practices.

## Architecture

### Directory Structure

```
javascripts/
├── core/
│   ├── constants.js              # All constants and enums
│   └── state-manager.js          # Global state management (Singleton pattern)
│
├── data/
│   ├── data-loader.js            # Data loading operations (Service pattern)
│   └── data-processor.js         # Data transformations & calculations
│
├── ui/
│   ├── ui-menu-factory.js        # Menu creation (Factory pattern)
│   ├── ui-utilities.js           # UI helper functions
│   └── panel-manager.js          # Panel lifecycle management
│
├── charts/
│   ├── chart-initializer.js     # Chart initialization (Strategy pattern)
│   └── visualization-updater.js  # Visualization coordination (Observer pattern)
│
├── events/
│   └── event-handlers.js         # Event and context menu handlers
│
├── utils/
│   └── general-utilities.js      # General utility functions
│
├── windows-system.js             # Legacy orchestrator (kept for compatibility)
└── windows-system-controller.js  # Legacy controller (kept for compatibility)
```

## Design Patterns Applied

### 1. **Module Pattern**
Each file exports specific, focused functionality with clear responsibilities.

### 2. **Singleton Pattern** (`state-manager.js`)
Centralizes global state management with a single instance.

```javascript
var StateManager = StateManager.getInstance();
```

### 3. **Factory Pattern** (`ui-menu-factory.js`)
Creates various UI components dynamically.

```javascript
addConfigMenu(panelID, 'scatterplot', false);
addSearchDeputyMenu(panelID, deputies);
```

### 4. **Strategy Pattern** (`chart-initializer.js`)
Different initialization strategies for each chart type.

```javascript
function initializeChart(newID, chartObj) {
    switch (chartObj.chartID) {
        case SCATTER_PLOT:
            return initializeScatterPlot(newID, chartObj);
        // ...
    }
}
```

### 5. **Observer Pattern** (`visualization-updater.js`)
Coordinates updates across multiple visualizations.

```javascript
function updateVisualizations() {
    tree.traverseBF(function (n) {
        if (needsUpdate(n.typeChart))
            n.chart.update();
    })
}
```

### 6. **Service Pattern** (`data-loader.js`)
Encapsulates data access logic.

## Module Responsibilities

### Core Modules

#### `constants.js`
- Chart type constants (TIME_LINE, SCATTER_PLOT, etc.)
- Dimension constants (INITIAL_HEIGHT, INITIAL_WIDTH, etc.)
- Language constants (ENGLISH, PORTUGUESE)
- Dimensional reduction techniques (PCA, MDS, TSNE)

#### `state-manager.js`
- Manages global application state
- Provides getters/setters for state access
- Maintains first-time flags for tutorials
- Legacy compatibility layer

### Data Modules

#### `data-loader.js`
- `loadDeputies()` - Load deputies from JSON
- `loadRollCalls()` - Load roll calls data
- `loadNodes()` - Load pre-calculated nodes
- `setDateRange()` - Load data for date range
- `updateDataforDateRange()` - Update period data

#### `data-processor.js`
- `createDeputyNodes()` - Transform deputy data
- `createMatrixDeputiesPerRollCall()` - Create vote matrix
- `filterDeputies()` - Filter by participation
- `filterMotions()` - Filter by criteria
- `calcPartiesSizeAndCenter()` - Calculate party metrics
- `calcRollCallRate()` - Calculate voting rates
- `setNewDateRange()` - Check for pre-calculated periods

### UI Modules

#### `ui-menu-factory.js`
- `addConfigMenu()` - Configuration menu
- `addSearchDeputyMenu()` - Deputy search
- `addSearchRollCallMenu()` - Roll call search
- `addFilterMotionTypeMenu()` - Motion type filter
- `addThemeFilter()` - Theme filter
- `addDatePickerTimeline()` - Date picker
- `addEditTitleInput()` - Title editor
- `initializeSlider()` - K-means slider

#### `panel-manager.js`
- `createNewChild()` - Create new panel
- `removeWindow()` - Remove panel and children
- `minimizeWindow()` - Minimize to icon
- `maximizeWindow()` - Restore from icon
- `setUpPanel()` - Configure drag/resize
- `updateSideBar()` - Update tree view

#### `ui-utilities.js`
- `drawLine()` - Connect panels with lines
- `getCenter()` - Get panel center
- `centerLine()` - Update line positions
- `getContainmentArray()` - Calculate boundaries
- `getChartIcon()` - Get chart icon class
- `getChartIconTitle()` - Get icon HTML

### Chart Modules

#### `chart-initializer.js`
- `initializeChart()` - Main entry point
- `initializeScatterPlot()` - Scatter plot setup
- `initializeBarChart()` - Bar chart setup
- `initializeChamberInfographic()` - Chamber setup
- `initializeRollCallsHeatmap()` - Heatmap setup
- And more for each chart type...

#### `visualization-updater.js`
- `updateVisualizations()` - Update all charts
- `updateDeputies()` - Update deputy data
- `updateRollCalls()` - Update roll call data
- `resetSelection()` - Reset all selections
- `selectByStates()` - Filter by states

### Event Modules

#### `event-handlers.js`
- `handleContextMenuScatterPlot()` - Scatter plot menu
- `handleContextMenuTimeline()` - Timeline menu
- `handleContextMenuDeputy()` - Deputy menu
- `setUpScatterPlotData()` - Prepare scatter plot
- `reloadScatterPlotData()` - Reload with filters
- `enableBrushForAllScatterPlots()` - Enable brush mode
- `disableBrushForAllScatterPlots()` - Disable brush mode

### Utility Modules

#### `general-utilities.js`
- `createArray()` - Multi-dimensional arrays
- `array_flip()` - Flip object keys/values
- `mergeObjects()` - Merge two objects
- `popoverAttr()` - Popover attributes
- `initSystem()` - Initialize application

## Benefits of Refactoring

### 1. **Single Responsibility Principle**
Each module has one clear, focused purpose.

### 2. **Improved Maintainability**
- Easy to locate specific functionality
- Reduced cognitive load per file
- Clear module boundaries

### 3. **Better Testability**
- Modules can be tested in isolation
- Mocking dependencies is easier
- Unit tests can be more focused

### 4. **Enhanced Reusability**
- Functions are properly encapsulated
- Modules can be used independently
- Easier to extract for other projects

### 5. **Scalability**
- Easy to add new chart types
- Simple to extend functionality
- Clear patterns to follow

### 6. **Code Readability**
- Smaller, focused files
- Clear naming conventions
- Organized by responsibility

## Migration Notes

### Backward Compatibility
The refactoring maintains backward compatibility:
- Original `windows-system.js` and `windows-system-controller.js` remain
- Legacy global variables are preserved
- No breaking changes to existing functionality

### Gradual Migration Strategy
You can gradually migrate to the new modules:
1. Include new module files in `index.html`
2. Original files continue to work
3. Optionally refactor to use StateManager
4. Eventually deprecate legacy files

## File Loading Order

The modules must be loaded in this order in `index.html`:

1. `core/constants.js` - Constants first
2. `core/state-manager.js` - State manager
3. `data/data-loader.js` - Data services
4. `data/data-processor.js` - Data processing
5. `ui/ui-utilities.js` - UI utilities
6. `ui/ui-menu-factory.js` - Menu factory
7. `ui/panel-manager.js` - Panel management
8. `charts/chart-initializer.js` - Chart initialization
9. `charts/visualization-updater.js` - Visualization updates
10. `events/event-handlers.js` - Event handlers
11. `utils/general-utilities.js` - General utilities
12. Original files for compatibility

## Future Improvements

1. **Convert to ES6 Modules**
   - Use `import/export` syntax
   - Enable tree-shaking
   - Better dependency management

2. **TypeScript Migration**
   - Add type safety
   - Better IDE support
   - Catch errors at compile time

3. **Dependency Injection**
   - Reduce tight coupling
   - Improve testability
   - More flexible architecture

4. **Unit Testing**
   - Add Jest or Mocha tests
   - Test individual modules
   - Automated testing pipeline

5. **Build Process**
   - Add Webpack or Rollup
   - Minification
   - Code splitting

## Questions?

For questions or issues with the refactored code:
- Check module documentation in file headers
- Review this architecture guide
- Examine the original files for reference

