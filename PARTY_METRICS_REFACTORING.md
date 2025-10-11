# Party Metrics Refactoring

## Overview
The `party-metrics.js` file has been refactored from a monolithic 1209-line file into a modular architecture with separate, focused modules. This refactoring improves code maintainability, readability, and scalability.

## Architecture

### Before Refactoring
- **Single File**: `party-metrics.js` (1209 lines)
- All visualization logic in one file
- Difficult to maintain and test individual components
- High coupling between components

### After Refactoring
The visualization is now split into 4 focused modules:

#### 1. **gauge-chart.js** (325 lines)
**Purpose**: Renders the semicircular Rice Index gauge chart

**Responsibilities**:
- Gauge rendering with colored sections
- Value arc and needle display
- Tick marks and labels
- Center text (value, label, interpretation)
- Color scale management

**API**:
```javascript
GaugeChart.render(svgSelection, value, centerX, centerY, areaW, areaH)
```

**Key Features**:
- Self-contained gauge configuration
- Modular color scale system
- Reusable across different contexts

---

#### 2. **roll-calls-list.js** (185 lines)
**Purpose**: Displays a compact list of the 10 least cohesive roll calls

**Responsibilities**:
- Rendering roll call list items
- Text truncation for long labels
- Tooltip with detailed information
- Visual styling (pills, badges)

**API**:
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

**Key Features**:
- Automatic text truncation
- Rich tooltips with amendment details
- Responsive layout

---

#### 3. **bar-chart-tabs.js** (440 lines)
**Purpose**: Tabbed interface for Theme Rice Index and Deputy Alignment bar charts

**Responsibilities**:
- Tab switching interface
- Theme Rice Index bar chart rendering
- Deputy Alignment bar chart rendering
- Data sorting and filtering
- Interactive tooltips

**API**:
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

**Key Features**:
- Two visualization modes: 'themeRice' and 'deputyAlignment'
- Top 20 deputies by alignment
- Automatic label width calculation
- Party-colored bars

---

#### 4. **party-metrics.js** (396 lines) - Main Coordinator
**Purpose**: Orchestrates the overall party metrics visualization

**Responsibilities**:
- Main SVG setup and layout management
- Rice Index calculation (core business logic)
- Data processing and aggregation
- Coordinating sub-visualizations
- Title and subtitle rendering
- Mode switching logic

**Key Functions**:
- `renderPartyMetrics()`: Main rendering orchestrator
- `calcRiceIndex()`: Rice Index calculation engine
- `renderTitle()`: Title and metadata display
- `switchBarChartMode()`: Handle tab switching

---

## Benefits of Refactoring

### 1. **Improved Maintainability**
- Each module has a single, well-defined responsibility
- Easier to locate and fix bugs
- Changes to one visualization don't affect others

### 2. **Better Readability**
- Smaller, focused files (185-440 lines vs 1209 lines)
- Clear module boundaries
- Self-documenting code structure

### 3. **Enhanced Testability**
- Modules can be tested independently
- Mock dependencies more easily
- Unit tests can be more focused

### 4. **Increased Reusability**
- Gauge chart can be reused in other contexts
- Roll calls list can display different data
- Bar charts can be adapted for other metrics

### 5. **Scalability**
- Easy to add new visualizations
- New features can be added to individual modules
- Simpler to onboard new developers

### 6. **Separation of Concerns**
- **Presentation logic** (gauge, list, bars) separated from **business logic** (Rice Index calculation)
- **Layout management** separated from **rendering**
- **Data processing** separated from **visualization**

---

## Module Dependencies

```
index.html
    ├── gauge-chart.js
    ├── roll-calls-list.js
    ├── bar-chart-tabs.js
    └── party-metrics.js (depends on all above)
```

**Load Order**: The modules must be loaded before `party-metrics.js` in the HTML file.

---

## External Dependencies

All modules depend on:
- **D3.js v3**: For SVG manipulation and data binding
- **CONGRESS_DEFINE**: For party color mapping
- **language**: Global language setting (ENGLISH constant)
- **subjectsToEnglish**: Translation dictionary
- **motions**: Motion data for tooltips

---

## Code Quality Improvements

### Encapsulation
Each module uses an IIFE (Immediately Invoked Function Expression) to avoid polluting the global namespace:
```javascript
(function (global) {
    'use strict';
    // Module code
    global.ModuleName = { ... };
})(window);
```

### Constants
Module-specific constants are kept within each module, reducing the main file's constant clutter.

### Helper Functions
Utility functions like `truncateText()`, `localizedTheme()`, and `polarToCartesian()` are now private to their respective modules.

### API Design
Clean, consistent API across modules with clear parameter objects:
```javascript
ModuleName.render(svgSelection, optionsObject)
```

---

## Future Enhancements

### Potential Improvements
1. **TypeScript Migration**: Add type safety
2. **Unit Tests**: Add comprehensive test coverage
3. **State Management**: Consider a more formal state management pattern
4. **Animation**: Add smooth transitions between modes
5. **Accessibility**: Add ARIA labels and keyboard navigation
6. **Documentation**: Add JSDoc comments for better IDE support

### Easy Extensions
- Add new visualization types as separate modules
- Create alternative gauge designs (linear, radial)
- Add export functionality to individual modules
- Implement theming system

---

## Migration Notes

### Breaking Changes
- None - The public API remains unchanged
- Existing code that uses `partyMetrics()` continues to work

### Load Order Requirement
The three new modules must be loaded before `party-metrics.js`:
```html
<script src="javascripts/gauge-chart.js"></script>
<script src="javascripts/roll-calls-list.js"></script>
<script src="javascripts/bar-chart-tabs.js"></script>
<script src="javascripts/party-metrics.js"></script>
```

---

## File Statistics

| File | Lines | Responsibility |
|------|-------|----------------|
| `gauge-chart.js` | 325 | Gauge visualization |
| `roll-calls-list.js` | 185 | Roll calls list |
| `bar-chart-tabs.js` | 440 | Tabbed bar charts |
| `party-metrics.js` | 396 | Coordination & calculation |
| **Total** | **1346** | **(+137 for structure, -1209 monolith)** |

The slight increase in total lines is due to:
- Module boilerplate (IIFE wrappers)
- Better documentation
- Clearer separation of concerns
- Duplicated constants (intentional for module independence)

---

## Conclusion

This refactoring successfully transforms a monolithic file into a clean, modular architecture that follows best practices for maintainability, scalability, and code organization. The resulting codebase is easier to understand, test, and extend.

