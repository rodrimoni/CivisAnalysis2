# Party Metrics Visualization - Usage Guide

## How to Use

### Triggering the Visualization

1. Open a **Scatter Plot** visualization (Political Spectrum of Deputies)
2. Look at the **legend** on the right side showing all political parties
3. **Right-click** on any party name or circle in the legend
4. Select **"Show Party Metrics"** from the context menu
5. A new panel will be created showing metrics for that specific party

### Current State

The infrastructure is fully implemented and functional. The visualization currently shows:
- Party name placeholder
- A message indicating where the visualization will be implemented

### What Data is Passed

When you trigger the visualization, the following data is passed to the chart:

```javascript
{
    party: "PT",           // The selected party abbreviation
    panelID: "panel-1-2"   // Source panel ID for accessing party data
}
```

### Next Implementation Steps

To complete the visualization in `javascripts/party-metrics.js`, you can:

1. **Access the source panel data**:
   ```javascript
   var deputyNodes = state.getDeputyNodes();
   var sourceDeputies = deputyNodes[sourcePanelID];
   var partyDeputies = sourceDeputies.filter(d => d.party === party);
   ```

2. **Calculate metrics**:
   - Number of deputies in the party
   - Average voting alignment
   - Voting patterns (Yes/No/Abstention rates)
   - Party cohesion metrics
   - Position on political spectrum

3. **Create visualizations** using D3:
   - Bar charts for voting statistics
   - Line charts for temporal trends
   - Summary statistics
   - Deputy list with individual metrics

## Technical Details

### Context Menu Location
- HTML: `index.html` line ~374-376
- ID: `contextMenuPartyLegend`
- Menu item ID: `party-metrics`

### Event Handler
- File: `javascripts/events/event-handlers.js`
- Function: `handleContextMenuPartyLegend(invokedOn, selectedMenu)`
- Extracts party name from D3 data binding

### Chart File
- File: `javascripts/party-metrics.js`
- Main function: `partyMetrics()`
- Render function: `renderPartyMetrics(data)`

### Integration Point
- File: `javascripts/scatter-plot.js`
- Function: `updateLegend(data, svg)` (line ~454-461)
- Binds context menu to `.legend` elements

## Example Use Cases

1. **Party Analysis**: Right-click "PT" to see PT party metrics
2. **Comparison**: Open metrics for multiple parties in different panels
3. **Temporal Analysis**: Compare same party across different time periods

## Tips for D3 Implementation

```javascript
// Example structure for renderPartyMetrics
function renderPartyMetrics(data) {
    var party = data.party;
    var sourcePanelID = data.panelID;
    
    // Get deputy data from state
    var deputyNodes = state.getDeputyNodes();
    var partyDeputies = deputyNodes[sourcePanelID].filter(d => d.party === party);
    
    // Calculate metrics
    var totalDeputies = partyDeputies.length;
    var avgAlignment = d3.mean(partyDeputies, d => d.alignment);
    
    // Create visualizations
    // ... your D3 code here ...
}
```

## Styling

Add custom CSS in `stylesheets/` directory if needed:
- Create `party-metrics.css`
- Link in `index.html`
- Use class `.party-metrics` for scoping

## State Management

The chart has access to:
- `state.getDeputyNodes()` - All deputy data by panel
- `state.getRollCallsRates()` - Roll call voting data
- `state.getCurrentDeputies()` - Current global deputy selection
- `state.getCurrentRollCalls()` - Current global roll call selection

## Event Dispatch

The chart implements D3 dispatch for updates:
```javascript
chart.on('update', function() {
    // Handle updates when deputy selection changes
});
```

Call `dispatch.update()` when visualization needs to be refreshed.

