# Party Metrics Module API Reference

Quick reference guide for developers working with the modularized Party Metrics visualization.

---

## Module Overview

| Module | Purpose | Exports | Size |
|--------|---------|---------|------|
| `gauge-chart.js` | Rice Index gauge | `GaugeChart` | 325 lines |
| `roll-calls-list.js` | Roll calls list | `RollCallsList` | 185 lines |
| `bar-chart-tabs.js` | Tabbed bar charts | `BarChartTabs` | 440 lines |
| `party-metrics.js` | Main coordinator | `partyMetrics()` | 396 lines |

---

## 1. GaugeChart Module

### Purpose
Renders a semicircular gauge chart displaying the Rice Index value with colored sections, needle, and interpretation.

### API

```javascript
GaugeChart.render(svgSelection, value, centerX, centerY, areaW, areaH)
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `svgSelection` | D3 Selection | D3 selection of SVG container |
| `value` | Number | Value between 0 and 1 (Rice Index) |
| `centerX` | Number | X coordinate of gauge center |
| `centerY` | Number | Y coordinate of gauge center |
| `areaW` | Number | Available width for gauge |
| `areaH` | Number | Available height for gauge |

### Example Usage

```javascript
// Render a gauge at the center of an SVG
var svg = d3.select("#viz").append("svg");
GaugeChart.render(svg, 0.75, 250, 200, 500, 400);
```

### Visual Output
- **Gauge sections**: 50 colored sections from red (low) to green (high)
- **Needle**: Points to current value
- **Center value**: Displays percentage (e.g., "75.0%")
- **Label**: "Party Cohesion"
- **Interpretation**: Text interpretation (e.g., "High Cohesion")
- **Tick marks**: At 0%, 20%, 40%, 60%, 80%, 100%

### Color Scale
```javascript
[0.0, 0.4]   → Red     (#d32f2f)
[0.4, 0.6]   → Orange  (#ff9800)
[0.6, 0.8]   → Yellow  (#fdd835)
[0.8, 1.0]   → Green   (#4caf50)
```

---

## 2. RollCallsList Module

### Purpose
Displays a compact list of up to 10 roll calls sorted by Rice Index (lowest first), showing the least cohesive votes for a party.

### API

```javascript
RollCallsList.render(svgSelection, options)
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `svgSelection` | D3 Selection | D3 selection of SVG container |
| `options` | Object | Configuration object |

### Options Object

```javascript
{
    party: String,        // Party name (e.g., "PT", "PSDB")
    data: Array,          // Array of roll call objects (pre-sorted)
    x: Number,           // X position
    y: Number,           // Y position
    w: Number,           // Width
    h: Number            // Height
}
```

### Data Format

Each item in the `data` array should have:
```javascript
{
    rc: Object,          // Original roll call object
    label: String,       // Display label
    rice: Number,        // Rice Index (0-1)
    yesCount: Number,    // Count of "Yes" votes
    noCount: Number,     // Count of "No" votes
    total: Number        // Total votes counted
}
```

### Example Usage

```javascript
var svg = d3.select("#viz").append("svg");
RollCallsList.render(svg, {
    party: "PT",
    data: rollCallsData,  // Array of roll call objects
    x: 0,
    y: 100,
    w: 400,
    h: 300
});
```

### Visual Output
- **Title**: "Least Cohesive Roll Calls" / "Menor Coesão – 10 Itens"
- **List items**: Up to 10 roll calls
- **Index pill**: Numbered 1-10
- **Label**: Roll call name (truncated if needed)
- **Rice badge**: Rice Index percentage
- **Tooltip**: Shows amendment, vote counts, and Rice Index

---

## 3. BarChartTabs Module

### Purpose
Renders a tabbed interface with two bar chart visualizations:
1. **Theme Rice Index**: Rice Index by legislative theme
2. **Deputy Alignment**: Top 20 deputies by alignment percentage

### API

```javascript
BarChartTabs.render(svgSelection, options)
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `svgSelection` | D3 Selection | D3 selection of SVG container |
| `options` | Object | Configuration object |

### Options Object

```javascript
{
    party: String,           // Party name
    deputies: Array,         // Array of deputy objects
    riceData: Array,         // Array of theme Rice Index data
    x: Number,              // X position
    y: Number,              // Y position
    w: Number,              // Width
    h: Number,              // Height
    currentMode: String,    // 'themeRice' or 'deputyAlignment'
    onModeChange: Function  // Callback when tab is clicked
}
```

### Data Formats

**Theme Rice Data:**
```javascript
[
    {
        theme: String,              // Theme name
        rice: Number,               // Rice Index (0-1)
        totalVotes: Number,         // Total votes in theme
        totalValidRollCalls: Number // Number of roll calls
    },
    // ...
]
```

**Deputies Data:**
```javascript
[
    {
        name: String,        // Deputy name
        party: String,       // Deputy's party
        alignment: Number    // Alignment value (0-1)
    },
    // ...
]
```

### Example Usage

```javascript
var svg = d3.select("#viz").append("svg");
var currentMode = 'themeRice';

BarChartTabs.render(svg, {
    party: "PT",
    deputies: deputiesArray,
    riceData: themeRiceArray,
    x: 500,
    y: 100,
    w: 500,
    h: 500,
    currentMode: currentMode,
    onModeChange: function(newMode) {
        currentMode = newMode;
        // Re-render or update state
    }
});
```

### Visual Output

**Tabs:**
- "Rice Index by Subject" / "Índice Rice por Tema"
- "Deputy Alignment" / "Alinhamento de Deputados"

**Theme Rice Mode:**
- Horizontal bars sorted by Rice Index (descending)
- Labels on the left, bars colored by party
- Values displayed at bar end
- Tooltips with theme name and percentage

**Deputy Alignment Mode:**
- Top 20 deputies by alignment (descending)
- Horizontal bars colored by each deputy's party
- Values displayed at bar end
- Tooltips with name, party, and alignment

---

## 4. PartyMetrics Main Module

### Purpose
Main coordinator that orchestrates the layout and rendering of all sub-modules, calculates Rice Index, and manages state.

### API

```javascript
var chart = partyMetrics()
    .width(value)
    .height(value)
    .margin(value);

d3.select("#container")
    .datum(data)
    .call(chart);
```

### Data Format

```javascript
{
    party: String,      // Party name
    deputies: Array,    // Array of deputy objects
    rcs: Array         // Array of roll call objects
}
```

### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `width()` | `Number` (optional) | `Number` or `chart` | Get/set inner width |
| `height()` | `Number` (optional) | `Number` or `chart` | Get/set inner height |
| `margin()` | `Object` (optional) | `Object` or `chart` | Get/set margins |
| `outerWidth()` | `Number` (optional) | `Number` or `chart` | Get/set outer width |
| `outerHeight()` | `Number` (optional) | `Number` or `chart` | Get/set outer height |
| `update()` | None | None | Update visualization |
| `on()` | `String`, `Function` | `chart` | Register event handler |

### Example Usage

```javascript
// Create chart instance
var chart = partyMetrics()
    .width(1020)
    .height(680)
    .margin({ top: 15, right: 30, bottom: 25, left: 30 });

// Prepare data
var data = {
    party: "PT",
    deputies: [...],
    rcs: [...]
};

// Render
d3.select("#party-metrics-container")
    .datum(data)
    .call(chart);

// Listen to events
chart.on('update', function() {
    console.log('Chart updated');
});
```

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│                     Title & Subtitle                     │
├──────────────────────────┬──────────────────────────────┤
│                          │                              │
│      Gauge Chart         │                              │
│                          │     Bar Chart Tabs           │
│                          │   ┌──────────┬──────────┐    │
├──────────────────────────┤   │  Tab 1   │  Tab 2   │    │
│                          │   └──────────┴──────────┘    │
│   Roll Calls List        │                              │
│                          │      Bar Charts              │
│                          │                              │
└──────────────────────────┴──────────────────────────────┘
```

---

## Integration Example

Complete example showing all modules working together:

```javascript
// 1. Load all scripts in HTML (in order)
// <script src="javascripts/gauge-chart.js"></script>
// <script src="javascripts/roll-calls-list.js"></script>
// <script src="javascripts/bar-chart-tabs.js"></script>
// <script src="javascripts/party-metrics.js"></script>

// 2. Prepare data
var partyData = {
    party: "PT",
    deputies: [
        { name: "Deputy A", party: "PT", alignment: 0.95 },
        { name: "Deputy B", party: "PT", alignment: 0.87 },
        // ...
    ],
    rcs: [
        {
            rollCallID: 1,
            rollCallName: "RC 001/2024",
            theme: "Economia",
            votes: [
                { party: "PT", vote: "Sim" },
                { party: "PT", vote: "Não" },
                // ...
            ]
        },
        // ...
    ]
};

// 3. Create and render chart
var chart = partyMetrics()
    .width(1020)
    .height(680);

d3.select("#visualization")
    .datum(partyData)
    .call(chart);

// 4. Handle updates
chart.on('update', function() {
    console.log('Visualization updated');
});
```

---

## Global Dependencies

All modules require these globals to be available:

### Required Globals

```javascript
// D3.js v3
d3

// Party color mapping
CONGRESS_DEFINE.getPartyColor(party)

// Language settings
language                // Global language constant
ENGLISH                 // Constant for English language
subjectsToEnglish       // Translation dictionary

// Motion data (for tooltips)
motions                 // Object mapping motion keys to data
```

### Example Setup

```javascript
// Ensure globals are available
if (typeof CONGRESS_DEFINE === 'undefined') {
    console.error('CONGRESS_DEFINE not loaded');
}

if (typeof language === 'undefined') {
    var language = 'pt'; // or ENGLISH
}
```

---

## Error Handling

### Common Issues

1. **Missing Dependencies**
   ```javascript
   // Check before rendering
   if (typeof GaugeChart === 'undefined') {
       console.error('gauge-chart.js not loaded');
   }
   ```

2. **Invalid Data**
   ```javascript
   // Validate data structure
   if (!data.party || !data.rcs) {
       console.error('Invalid data format');
   }
   ```

3. **Load Order**
   ```javascript
   // Ensure modules load before coordinator
   // Correct order in HTML:
   // 1. gauge-chart.js
   // 2. roll-calls-list.js
   // 3. bar-chart-tabs.js
   // 4. party-metrics.js
   ```

---

## Testing

### Unit Test Examples

```javascript
// Test gauge rendering
describe('GaugeChart', function() {
    it('should render gauge with correct value', function() {
        var svg = d3.select('body').append('svg');
        GaugeChart.render(svg, 0.75, 250, 200, 500, 400);
        
        // Assert gauge elements exist
        expect(svg.selectAll('.gauge')[0].length).toBe(1);
    });
});

// Test roll calls list
describe('RollCallsList', function() {
    it('should display up to 10 items', function() {
        var svg = d3.select('body').append('svg');
        var data = generateRollCallsData(15); // 15 items
        
        RollCallsList.render(svg, {
            party: 'PT',
            data: data,
            x: 0, y: 0, w: 400, h: 300
        });
        
        // Assert only 10 items rendered
        expect(svg.selectAll('.rc-row')[0].length).toBe(10);
    });
});
```

---

## Performance Considerations

### Optimization Tips

1. **Limit Data Size**
   - Roll calls list: Maximum 10 items
   - Deputy alignment: Maximum 20 items

2. **Avoid Re-rendering**
   - Cache calculated data when possible
   - Use `switchBarChartMode()` for tab changes

3. **SVG Optimization**
   - Remove old elements before re-rendering
   - Use D3 transitions sparingly

---

## Browser Compatibility

**Tested Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Required Features:**
- D3.js v3 support
- SVG rendering
- ES6 features (const, let, arrow functions)

---

## Versioning

- **Current Version**: 2.0.0
- **Previous Version**: 1.0.0 (monolithic)
- **Breaking Changes**: None (backward compatible)

---

## Support & Contributing

For issues, questions, or contributions:
1. Check existing documentation
2. Review module source code
3. Create detailed bug reports
4. Suggest improvements with examples

---

**Happy Coding! 🚀**

