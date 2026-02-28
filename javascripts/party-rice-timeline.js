/**
 * Party Rice Index Timeline Visualization
 * Displays the weighted mean Rice Index by month for a political party
 * 
 * Dependencies:
 * - D3.js v3: For data visualization
 * - congress-definitions.js: For party colors
 */

/* Rice Index Calculation Types */
const RICE_CALC_CLASSIC = 0;  // Only considers Yes/No
const RICE_CALC_BRAZIL = 1;   // Considers Yes/No/Obstruction

/**
 * Creates a Rice Index timeline chart
 * @returns {Function} Chart function following D3 reusable chart pattern
 */
function partyRiceTimeline() {
    // Chart dimensions - adjusted for focus+context layout
    var margin = { top: 60, right: 80, bottom: 60, left: 80 },
        contextMargin = { top: 15, right: 80, bottom: 25, left: 80 },
        outerWidth = 1080,
        outerHeight = 720,
        contextHeight = 60, // Height of the overview sparkline
        contextGap = 50, // Gap between context and focus (increased for x-axis)
        width = outerWidth - margin.left - margin.right,
        focusHeight = outerHeight - margin.top - margin.bottom - contextHeight - contextGap,
        height = focusHeight; // Main focus chart height

    var svg;
    var panelID;
    var dispatch = d3.dispatch('update');

    // Brush & state
    var brush;
    var brushGroup;              // <-- keep a reference so dblclick can reset correctly
    var currentData;
    var currentPartyColor;
    var timeGrouping = 'month';  // 'month' or 'year'
    var originalData;            // preserve original data for toggle re-render
    var isMultiParty = false;    // true when showing coalition of multiple parties

    /**
     * Main chart function
     * @param {d3.selection} selection - D3 selection
     */
    function chart(selection) {
        selection.each(function (data) {
            panelID = ($(this).parents('.panel')).attr('id');

            // Create main SVG container
            svg = d3.select(this)
                .append("svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", "0 0 " + outerWidth + " " + outerHeight)
                .classed("party-rice-timeline", true)
                .append("svg:g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            // Add background rect for focus area (optional visual)
            svg.append("rect")
                .attr("width", width)
                .attr("height", height)
                .attr("fill", "#f9f9f9");

            // Render the visualization
            renderTimeline(data);
        });
    }

    /**
     * Render the timeline visualization
     * @param {Object} data - Data containing party information and roll calls
     */
    function renderTimeline(data) {
        // Preserve original data for toggle re-render
        originalData = data;

        var parties = data.parties || (data.party ? [data.party] : []);
        var party = data.party || (parties.length > 0 ? parties[0] : '');
        var isDeputyMode = !!data.isDeputyMode;
        var deputyIDs = data.deputyIDs || [];
        isMultiParty = parties.length > 1 || isDeputyMode;
        const { rcs, deputies } = data;

        // Get max deputies count for participation calculation
        const deputiesCount = deputies ? deputies.length : 0;

        // Calculate Rice Index by month or year based on toggle
        const monthlyData = timeGrouping === 'year'
            ? calculateYearlyRiceIndex(rcs, parties, deputiesCount, undefined, isDeputyMode ? deputyIDs : undefined)
            : calculateMonthlyRiceIndex(rcs, parties, deputiesCount, undefined, isDeputyMode ? deputyIDs : undefined);

        if (!monthlyData || monthlyData.length === 0) {
            renderNoDataMessage();
            return;
        }

        // Store data for brush updates
        currentData = monthlyData;
        currentPartyColor = isDeputyMode ? '#4a5568' : (isMultiParty ? '#4a5568' : CONGRESS_DEFINE.getPartyColor(party));

        // Clear previous content
        svg.selectAll("*").remove();

        // Render title
        if (isDeputyMode) {
            renderDeputyTitle(deputies, monthlyData);
        } else {
            renderTitle(parties, currentPartyColor, monthlyData);
        }

        // Calculate full data extent
        const fullExtent = d3.extent(monthlyData, function (d) { return d.monthStart; });

        // Create focus and context groups
        const focus = svg.append("g")
            .attr("class", "focus")
            .attr("transform", "translate(0, 0)");

        const context = svg.append("g")
            .attr("class", "context")
            .attr("transform", "translate(0," + (focusHeight + contextGap) + ")");

        // Create scales (context uses full extent)
        const xContextScale = d3.time.scale()
            .domain(fullExtent)
            .range([0, width]);

        const xFocusScale = d3.time.scale()
            .domain(fullExtent)  // Initially shows full range
            .range([0, width]);

        // Context scale - full range [0, 1]
        const yContextScale = d3.scale.linear()
            .domain([0, 1])
            .range([contextHeight, 0]);

        // Create brush
        brush = d3.svg.brush()
            .x(xContextScale)
            .on("brush", function () { brushed(focus, monthlyData, xFocusScale); });

        // Initial render with full extent (focus)
        updateFocusView(focus, monthlyData, xFocusScale, fullExtent);

        // Render context view with brush (returns brushGroup reference)
        brushGroup = renderContextView(context, monthlyData, xContextScale, yContextScale, currentPartyColor);
    }

    /**
     * Update the focus view based on brush selection or full data
     */
    function updateFocusView(focus, monthlyData, xScale, brushExtent) {
        // Filter data to brush extent
        let filteredData = monthlyData;
        if (brushExtent && brushExtent[0] < brushExtent[1]) {
            filteredData = monthlyData.filter(function (d) {
                return d.monthStart >= brushExtent[0] && d.monthStart <= brushExtent[1];
            });
        }

        if (filteredData.length === 0) {
            filteredData = monthlyData;
        }

        // Update x scale domain
        const dataExtent = brushExtent || d3.extent(monthlyData, function (d) { return d.monthStart; });
        xScale.domain(dataExtent);

        // Calculate y extent for filtered data
        const minRice = d3.min(filteredData, function (d) { return d.riceIndex; });
        const maxRice = d3.max(filteredData, function (d) { return d.riceIndex; });
        const riceRange = maxRice - minRice;

        // Add 10% padding to the focus domain for breathing room
        const focusPadding = Math.max(riceRange * 0.1, 0.02);
        const focusMin = Math.max(0, minRice - focusPadding);
        const focusMax = Math.min(1, maxRice + focusPadding);

        // Create y scale
        const yFocusScale = d3.scale.linear()
            .domain([focusMin, focusMax])
            .range([focusHeight, 0])
            .nice();

        // Create axes - let D3 automatically determine appropriate ticks based on zoom level
        const xAxis = d3.svg.axis()
            .scale(xScale)
            .orient("bottom");

        const yFocusAxis = d3.svg.axis()
            .scale(yFocusScale)
            .orient("left")
            .ticks(8)
            .tickFormat(d3.format(".3f"));

        // Clear and re-render focus view
        focus.selectAll("*").remove();
        renderFocusView(focus, filteredData, xScale, yFocusScale, xAxis, yFocusAxis, currentPartyColor, focusHeight);

        // Add statistics
        addStatistics(svg, filteredData, yFocusScale, currentPartyColor);

        // Add low-value annotations
        addLowValueAnnotations(focus, filteredData, xScale, yFocusScale, currentPartyColor);
    }

    /**
     * Handle brush events
     */
    function brushed(focus, monthlyData, xScale) {
        const extent = brush.empty() ? null : brush.extent();
        updateFocusView(focus, monthlyData, xScale, extent);
    }

    /**
     * Render the focus view (main detailed chart)
     */
    function renderFocusView(focus, monthlyData, xScale, yScale, xAxis, yAxis, color, height) {
        // Add background
        focus.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "#fafafa")
            .attr("stroke", "#e0e0e0")
            .attr("stroke-width", 1)
            .attr("rx", 4);

        // Add participation shading as background bands
        // Create vertical bands for each month, opacity based on participation
        if (monthlyData.length > 0) {
            // Calculate band width based on time intervals
            focus.selectAll(".participation-band")
                .data(monthlyData)
                .enter()
                .append("rect")
                .attr("class", "participation-band")
                .attr("x", function (d, i) {
                    // Position at the month start
                    return xScale(d.monthStart);
                })
                .attr("y", 0)
                .attr("width", function (d, i) {
                    // Width spans to the next month (or to the end)
                    if (i < monthlyData.length - 1) {
                        return xScale(monthlyData[i + 1].monthStart) - xScale(d.monthStart);
                    } else {
                        // Last band extends to the edge
                        return width - xScale(d.monthStart);
                    }
                })
                .attr("height", height)
                .attr("fill", color)
                .attr("opacity", function (d) {
                    // Map participation [0,1] to opacity [0.05, 0.3]
                    // Low participation = pale, high participation = darker
                    return 0.05 + (d.participation * 0.25);
                })
                .style("pointer-events", "none"); // Don't interfere with interactions
        }

        // Add grid lines
        focus.selectAll(".grid-line-horizontal")
            .data(yScale.ticks(8))
            .enter()
            .append("line")
            .attr("class", "grid-line-horizontal")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", function (d) { return yScale(d); })
            .attr("y2", function (d) { return yScale(d); })
            .style("stroke", "#e8e8e8")
            .style("stroke-width", 1)
            .style("shape-rendering", "crispEdges");

        // Add axes
        focus.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis)
            .selectAll("text")
            .style("text-anchor", "middle")
            .style("font-size", "11px")
            .style("fill", "#666");

        focus.append("g")
            .attr("class", "y axis")
            .call(yAxis)
            .selectAll("text")
            .style("font-size", "11px")
            .style("fill", "#666");

        // Style axes
        focus.selectAll(".axis path, .axis line")
            .style("fill", "none")
            .style("stroke", "#999")
            .style("stroke-width", 1)
            .style("shape-rendering", "crispEdges");

        // Axis label
        focus.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 20)
            .style("font-size", "13px")
            .style("font-weight", "500")
            .style("fill", "#555")
            .text("Rice Index (Cohesion)");

        // Line
        const line = d3.svg.line()
            .x(function (d) { return xScale(d.monthStart); })
            .y(function (d) { return yScale(d.riceIndex); })
            .interpolate("monotone");

        // Shadow + line
        focus.append("path")
            .datum(monthlyData)
            .attr("class", "line-shadow")
            .attr("d", line)
            .style("fill", "none")
            .style("stroke", "rgba(0,0,0,0.1)")
            .style("stroke-width", 4)
            .attr("transform", "translate(0, 2)");

        focus.append("path")
            .datum(monthlyData)
            .attr("class", "line")
            .attr("d", line)
            .style("fill", "none")
            .style("stroke", color)
            .style("stroke-width", 2.5)
            .style("stroke-linecap", "round")
            .style("stroke-linejoin", "round");

        // Points + tooltips
        const circles = focus.selectAll(".data-point")
            .data(monthlyData)
            .enter()
            .append("circle")
            .attr("class", "data-point")
            .attr("cx", function (d) { return xScale(d.monthStart); })
            .attr("cy", function (d) { return yScale(d.riceIndex); })
            .attr("r", 4)
            .style("fill", "#fff")
            .style("stroke", color)
            .style("stroke-width", 2)
            .style("cursor", "pointer")
            .style("transition", "all 0.2s ease");

        circles.on("mouseover", function (d) {
            d3.select(this)
                .transition()
                .duration(150)
                .attr("r", 6)
                .style("fill", color);

            showTooltip(d, color);
        })
            .on("mouseout", function () {
                d3.select(this)
                    .transition()
                    .duration(150)
                    .attr("r", 4)
                    .style("fill", "#fff");

                hideTooltip();
            });
    }

    /**
     * Render the context view (overview sparkline with full range and brush)
     */
    function renderContextView(context, monthlyData, xScale, yScale, color) {
        // Add subtle background
        context.append("rect")
            .attr("width", width)
            .attr("height", contextHeight)
            .attr("fill", "#f5f5f5")
            .attr("stroke", "#ddd")
            .attr("stroke-width", 1)
            .attr("rx", 3);

        // Add label with instruction
        context.append("text")
            .attr("x", 5)
            .attr("y", -5)
            .style("font-size", "10px")
            .style("fill", "#999")
            .style("font-weight", "500")
            .text("Full Range [0.0 — 1.0] — Drag to zoom");

        // Create x-axis for context
        const xAxisContext = d3.svg.axis()
            .scale(xScale)
            .orient("bottom");

        // Create simplified line
        const contextLine = d3.svg.line()
            .x(function (d) { return xScale(d.monthStart); })
            .y(function (d) { return yScale(d.riceIndex); })
            .interpolate("monotone");

        const contextArea = d3.svg.area()
            .x(function (d) { return xScale(d.monthStart); })
            .y0(contextHeight)
            .y1(function (d) { return yScale(d.riceIndex); })
            .interpolate("monotone");

        // Area + line
        context.append("path")
            .datum(monthlyData)
            .attr("class", "context-area")
            .attr("d", contextArea)
            .style("fill", color)
            .style("opacity", 0.15);

        context.append("path")
            .datum(monthlyData)
            .attr("class", "context-line")
            .attr("d", contextLine)
            .style("fill", "none")
            .style("stroke", color)
            .style("stroke-width", 1.5)
            .style("opacity", 0.7);

        // Reference lines at 0 and 1
        context.append("line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", yScale(0))
            .attr("y2", yScale(0))
            .style("stroke", "#ccc")
            .style("stroke-width", 1);

        context.append("line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", yScale(1))
            .attr("y2", yScale(1))
            .style("stroke", "#ccc")
            .style("stroke-width", 1);

        // Tick labels
        context.append("text")
            .attr("x", width + 5)
            .attr("y", yScale(1))
            .attr("dy", "0.3em")
            .style("font-size", "9px")
            .style("fill", "#999")
            .text("1.0");

        context.append("text")
            .attr("x", width + 5)
            .attr("y", yScale(0))
            .attr("dy", "0.3em")
            .style("font-size", "9px")
            .style("fill", "#999")
            .text("0.0");

        // X-axis
        context.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + contextHeight + ")")
            .call(xAxisContext)
            .selectAll("text")
            .style("text-anchor", "middle")
            .style("font-size", "9px")
            .style("fill", "#999");

        // Style axis
        context.selectAll(".axis path, .axis line")
            .style("fill", "none")
            .style("stroke", "#ccc")
            .style("stroke-width", 1)
            .style("shape-rendering", "crispEdges");

        // Add brush
        const bg = context.append("g")
            .attr("class", "x brush")
            .call(brush);

        // --- IMPORTANT: size the brush rects explicitly ---
        // Background (hit area)
        bg.selectAll(".background")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", width)             // <-- critical so drag starts at mouse, not x=0
            .attr("height", contextHeight)
            .style("fill", "transparent")
            .style("cursor", "crosshair");

        // Selection extent (its width is driven by extent; we set y/height)
        bg.selectAll(".extent")
            .attr("y", 0)
            .attr("height", contextHeight)
            .style("fill", color)
            .style("fill-opacity", 0.2)
            .style("stroke", color)
            .style("stroke-width", 1.5)
            .style("shape-rendering", "crispEdges")
            .style("cursor", "move");

        // Handles
        bg.selectAll(".resize rect")
            .attr("y", 0)
            .attr("height", contextHeight)
            .attr("width", 6)
            .attr("rx", 3)
            .style("fill", color)
            .style("opacity", 0.8);

        return bg; // return brush group
    }

    /**
     * Add statistics overlay (mean line, etc.)
     */
    function addStatistics(svg, monthlyData, yScale, color) {
        // Weighted mean
        const totalVotes = d3.sum(monthlyData, function (d) { return d.totalVotes; });
        const weightedSum = d3.sum(monthlyData, function (d) { return d.riceIndex * d.totalVotes; });
        const meanRice = totalVotes > 0 ? weightedSum / totalVotes : 0;

        const focus = svg.select(".focus");

        // Mean line
        focus.append("line")
            .attr("class", "mean-line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", yScale(meanRice))
            .attr("y2", yScale(meanRice))
            .style("stroke", "#666")
            .style("stroke-width", 1.5)
            .style("stroke-dasharray", "4,4")
            .style("opacity", 0.6);

        // Mean label
        const meanLabel = focus.append("g")
            .attr("class", "mean-label-group")
            .attr("transform", "translate(" + (width - 5) + ", " + yScale(meanRice) + ")");

        meanLabel.append("rect")
            .attr("x", -85)
            .attr("y", -12)
            .attr("width", 80)
            .attr("height", 18)
            .attr("rx", 3)
            .style("fill", "#fff")
            .style("stroke", "#ddd")
            .style("stroke-width", 1)
            .style("opacity", 0.95);

        meanLabel.append("text")
            .attr("x", -45)
            .attr("y", 0)
            .attr("dy", "0.1em")
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .style("font-weight", "600")
            .style("fill", "#666")
            .text("μ = " + meanRice.toFixed(3));
    }

    /**
     * Add annotations for low Rice Index values
     * Highlights local troughs to help viewers understand cohesion drops
     * @param {d3.selection} focus - The focus group element
     * @param {Array} monthlyData - Filtered monthly data in view
     * @param {Function} xScale - X scale function
     * @param {Function} yScale - Y scale function
     * @param {string} color - Party color
     */
    function addLowValueAnnotations(focus, monthlyData, xScale, yScale, color) {
        if (!monthlyData || monthlyData.length < 2) return;

        // Find lowest points in visible window
        // Only annotate if we have at least 3 months visible
        const numToAnnotate = monthlyData.length >= 10 ? 3 : (monthlyData.length >= 5 ? 2 : 1);

        // Sort by Rice Index and take the lowest N
        const sortedData = monthlyData.slice().sort(function (a, b) {
            return a.riceIndex - b.riceIndex;
        });

        const lowestPoints = sortedData.slice(0, numToAnnotate);

        // Only annotate if the point is truly low (below median or bottom 40%)
        const medianRice = d3.median(monthlyData, function (d) { return d.riceIndex; });
        const qualifyingPoints = lowestPoints.filter(function (d) {
            return d.riceIndex < medianRice;
        });

        if (qualifyingPoints.length === 0) return;

        // Create annotation group
        const annotationGroup = focus.append("g")
            .attr("class", "low-value-annotations");

        // Add markers and labels for each low point
        qualifyingPoints.forEach(function (d, i) {
            const x = xScale(d.monthStart);
            const y = yScale(d.riceIndex);

            // Flag pole (vertical line from point upward)
            annotationGroup.append("line")
                .attr("class", "annotation-pole")
                .attr("x1", x)
                .attr("x2", x)
                .attr("y1", y)
                .attr("y2", y - 30)
                .style("stroke", "#d32f2f")
                .style("stroke-width", 1.5)
                .style("stroke-dasharray", "2,2")
                .style("opacity", 0.7);

            // Triangle marker removed per request

            // Flag/label at top of pole
            const flag = annotationGroup.append("g")
                .attr("class", "annotation-flag")
                .attr("transform", "translate(" + x + "," + (y - 35) + ")")
                .style("cursor", "pointer");

            // Flag background
            flag.append("rect")
                .attr("x", -35)
                .attr("y", -12)
                .attr("width", 70)
                .attr("height", 20)
                .attr("rx", 3)
                .style("fill", "#d32f2f")
                .style("stroke", "#fff")
                .style("stroke-width", 1.5)
                .style("opacity", 0.9);

            // Flag text
            flag.append("text")
                .attr("x", 0)
                .attr("y", 0)
                .attr("dy", "0.32em")
                .attr("text-anchor", "middle")
                .style("font-size", "10px")
                .style("font-weight", "600")
                .style("fill", "#fff")
                .style("pointer-events", "none")
                .text("Low: " + (d.riceIndex * 100).toFixed(1) + "%");

            // Interactive tooltip on hover
            flag.on("mouseenter", function () {
                showLowValueTooltip(d, color);
            })
                .on("mouseleave", function () {
                    hideTooltip();
                });

            // Marker hover handlers removed since marker is no longer drawn
        });
    }

    /**
     * Show detailed tooltip for low-value annotations
     * Includes information about the roll calls that contributed to the low Rice Index
     */
    function showLowValueTooltip(d, color) {
        const tooltip = d3.select(".toolTip");
        if (tooltip.empty()) return;

        // Cancel any ongoing hide transitions
        tooltip.transition().duration(0);

        // Format period label based on grouping
        var monthYear;
        if (timeGrouping === 'year') {
            monthYear = "" + d.monthStart.getFullYear();
        } else {
            const monthNames = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];
            monthYear = monthNames[d.monthStart.getMonth()] + " " + d.monthStart.getFullYear();
        }

        const ricePercentage = (d.riceIndex * 100).toFixed(1);

        // Get the individual roll calls for this month, sorted by lowest cohesion
        let rollCallsHtml = "";
        if (d.rollCalls && d.rollCalls.length > 0) {
            // Sort roll calls by Rice Index (lowest first)
            const sortedRollCalls = d.rollCalls.slice().sort(function (a, b) {
                return a.rice - b.rice;
            });

            // Show up to 3 lowest cohesion roll calls
            const topLowRollCalls = sortedRollCalls.slice(0, 3);

            rollCallsHtml = "<div style='margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;'>" +
                "<div style='font-size: 11px; font-weight: 600; color: #d32f2f; margin-bottom: 6px;'>Lowest Cohesion Votes:</div>";

            topLowRollCalls.forEach(function (rcData, idx) {
                const rcRicePercent = (rcData.rice * 100).toFixed(1);
                const rcTitle = rcData.rc.rollCallName || "Roll Call #" + (idx + 1);
                const rcTitleWithTheme = rcTitle + " (" + localizedTheme(rcData.rc.theme) + ")";
                const truncatedTitle = rcTitleWithTheme.length > 50 ? rcTitleWithTheme.substring(0, 47) + "..." : rcTitleWithTheme;

                rollCallsHtml +=
                    "<div style='margin-bottom: 4px; padding: 4px; background: #fff8f8; border-radius: 2px;'>" +
                    "<div style='font-size: 10px; color: #666; margin-bottom: 2px;'>" + truncatedTitle + "</div>" +
                    "<div style='font-size: 10px;'>" +
                    "<span style='color: #999;'>Cohesion:</span> " +
                    "<span style='font-weight: 600; color: #d32f2f;'>" + rcRicePercent + "%</span>" +
                    "<span style='color: #999; margin-left: 6px;'>Votes:</span> " +
                    "<span style='color: #666;'>" + rcData.votes + "</span>" +
                    "</div>" +
                    "</div>";
            });

            rollCallsHtml += "</div>";
        }

        const html =
            "<div style='min-width: 240px; max-width: 320px;'>" +
            "<div style='padding-bottom: 8px; margin-bottom: 8px; border-bottom: 2px solid #d32f2f;'>" +
            "<div style='font-size: 14px; font-weight: 600; color: #d32f2f; margin-bottom: 2px;'>⚠ Low Cohesion Period</div>" +
            "<div style='font-size: 12px; color: #666;'>" + monthYear + "</div>" +
            "</div>" +
            "<div style='font-size: 13px; line-height: 1.6;'>" +
            "<div style='margin-bottom: 6px;'>" +
            "<span style='color: #666; font-weight: 500;'>Cohesion:</span> " +
            "<span style='font-weight: 600; color: #d32f2f; font-size: 15px;'>" + ricePercentage + "%</span>" +
            "</div>" +
            "<div style='margin-bottom: 4px; color: #666;'>" +
            "<span style='font-weight: 500;'>Roll Calls:</span> " +
            "<span style='color: #333;'>" + d.rollCallCount + "</span>" +
            "</div>" +
            "<div style='color: #666;'>" +
            "<span style='font-weight: 500;'>Total Votes:</span> " +
            "<span style='color: #333;'>" + d.totalVotes + "</span>" +
            "</div>" +
            "</div>" +
            rollCallsHtml +
            "</div>";

        tooltip.style("left", d3.event.pageX + 15 + "px");
        tooltip.style("top", d3.event.pageY - 10 + "px");
        tooltip.style("display", "inline-block")
            .style("opacity", 1);
        tooltip.html(html);
    }

    /**
     * Calculate weighted Rice Index by month
     * @param {Array} rcs - Roll calls array
     * @param {string|Array} parties - Party name or array of party names
     * @param {number} deputiesCount - Total number of deputies in the party
     * @returns {Array} Array of monthly data with Rice Index and participation
     */
    function calculateMonthlyRiceIndex(rcs, parties, deputiesCount, type = RICE_CALC_CLASSIC, deputyIDs) {
        var partiesArr = Array.isArray(parties) ? parties : [parties];
        if (!rcs || !rcs.length) return [];

        // Group roll calls by month
        const monthMap = new Map();

        rcs.forEach(function (rc) {
            if (!rc || !rc.votes || !rc.datetime) return;

            // Parse date and get month start (first day of month)
            const date = new Date(rc.datetime);
            const monthStart = getMonthStart(date);
            const monthKey = monthStart.toISOString();

            if (!monthMap.has(monthKey)) {
                monthMap.set(monthKey, {
                    monthStart: monthStart,
                    rollCalls: [],
                    weightedSum: 0,
                    totalVotes: 0
                });
            }

            // Calculate Rice Index for this roll call
            const partyVotes = deputyIDs && deputyIDs.length > 0
                ? rc.votes.filter(function (v) { return deputyIDs.indexOf(v.deputyID) > -1; })
                : rc.votes.filter(function (v) { return partiesArr.indexOf(v.party) > -1; });

            // Support Classic (Yes/No) and Brazil (Yes/No/Obstruction) methods
            var validVotes, yesCount, noCount;
            if (type === RICE_CALC_CLASSIC) {
                validVotes = partyVotes.filter(function (v) {
                    return v.vote === 'Sim' || v.vote === 'Não';
                });
                yesCount = validVotes.filter(function (v) { return v.vote === 'Sim'; }).length;
                noCount = validVotes.filter(function (v) { return v.vote === 'Não'; }).length;
            } else {
                validVotes = partyVotes.filter(function (v) {
                    return v.vote === 'Sim' || v.vote === 'Não' || v.vote === 'Obstrução';
                });
                yesCount = validVotes.filter(function (v) { return v.vote === 'Sim'; }).length;
                noCount = validVotes.filter(function (v) { return v.vote === 'Não' || v.vote === 'Obstrução'; }).length;
            }

            const total = yesCount + noCount;

            if (total > 0) {
                const rice = Math.abs(yesCount - noCount) / total;
                const monthData = monthMap.get(monthKey);
                monthData.weightedSum += rice * total;
                monthData.totalVotes += total;
                monthData.rollCalls.push({
                    rc: rc,
                    rice: rice,
                    votes: total
                });
            }
        });

        // Convert map to array and calculate weighted mean for each month
        const monthlyData = [];
        monthMap.forEach(function (monthData) {
            if (monthData.totalVotes > 0) {
                // Calculate participation rate: actual votes / max possible votes
                const maxPossibleVotes = monthData.rollCalls.length * deputiesCount;
                const participationRate = maxPossibleVotes > 0
                    ? monthData.totalVotes / maxPossibleVotes
                    : 0;

                monthlyData.push({
                    monthStart: monthData.monthStart,
                    riceIndex: monthData.weightedSum / monthData.totalVotes,
                    rollCallCount: monthData.rollCalls.length,
                    totalVotes: monthData.totalVotes,
                    participation: participationRate, // normalized [0,1]
                    rollCalls: monthData.rollCalls // Individual roll calls for this month
                });
            }
        });

        // Sort by date
        monthlyData.sort(function (a, b) {
            return a.monthStart - b.monthStart;
        });

        return monthlyData;
    }

    /**
     * Get the start of the month (first day) for a given date
     * @param {Date} date - Input date
     * @returns {Date} Start of the month
     */
    function getMonthStart(date) {
        const d = new Date(date);
        return new Date(d.getFullYear(), d.getMonth(), 1);
    }

    /**
     * Get the start of the year (January 1st) for a given date
     * @param {Date} date - Input date
     * @returns {Date} Start of the year
     */
    function getYearStart(date) {
        const d = new Date(date);
        return new Date(d.getFullYear(), 0, 1);
    }

    /**
     * Calculate weighted Rice Index by year
     * Same logic as calculateMonthlyRiceIndex but grouped by year
     * @param {Array} rcs - Roll calls array
     * @param {string|Array} parties - Party name or array of party names
     * @param {number} deputiesCount - Total number of deputies in the party
     * @returns {Array} Array of yearly data with Rice Index and participation
     */
    function calculateYearlyRiceIndex(rcs, parties, deputiesCount, type, deputyIDs) {
        var partiesArr = Array.isArray(parties) ? parties : [parties];
        if (type === undefined) type = RICE_CALC_CLASSIC;
        if (!rcs || !rcs.length) return [];

        const yearMap = new Map();

        rcs.forEach(function (rc) {
            if (!rc || !rc.votes || !rc.datetime) return;

            const date = new Date(rc.datetime);
            const yearStart = getYearStart(date);
            const yearKey = yearStart.toISOString();

            if (!yearMap.has(yearKey)) {
                yearMap.set(yearKey, {
                    monthStart: yearStart, // keep field name for compatibility
                    rollCalls: [],
                    weightedSum: 0,
                    totalVotes: 0
                });
            }

            const partyVotes = deputyIDs && deputyIDs.length > 0
                ? rc.votes.filter(function (v) { return deputyIDs.indexOf(v.deputyID) > -1; })
                : rc.votes.filter(function (v) { return partiesArr.indexOf(v.party) > -1; });

            var validVotes, yesCount, noCount;
            if (type === RICE_CALC_CLASSIC) {
                validVotes = partyVotes.filter(function (v) {
                    return v.vote === 'Sim' || v.vote === 'Não';
                });
                yesCount = validVotes.filter(function (v) { return v.vote === 'Sim'; }).length;
                noCount = validVotes.filter(function (v) { return v.vote === 'Não'; }).length;
            } else {
                validVotes = partyVotes.filter(function (v) {
                    return v.vote === 'Sim' || v.vote === 'Não' || v.vote === 'Obstrução';
                });
                yesCount = validVotes.filter(function (v) { return v.vote === 'Sim'; }).length;
                noCount = validVotes.filter(function (v) { return v.vote === 'Não' || v.vote === 'Obstrução'; }).length;
            }

            const total = yesCount + noCount;

            if (total > 0) {
                const rice = Math.abs(yesCount - noCount) / total;
                const yearData = yearMap.get(yearKey);
                yearData.weightedSum += rice * total;
                yearData.totalVotes += total;
                yearData.rollCalls.push({
                    rc: rc,
                    rice: rice,
                    votes: total
                });
            }
        });

        const yearlyData = [];
        yearMap.forEach(function (yearData) {
            if (yearData.totalVotes > 0) {
                const maxPossibleVotes = yearData.rollCalls.length * deputiesCount;
                const participationRate = maxPossibleVotes > 0
                    ? yearData.totalVotes / maxPossibleVotes
                    : 0;

                yearlyData.push({
                    monthStart: yearData.monthStart, // keep field name for compatibility
                    riceIndex: yearData.weightedSum / yearData.totalVotes,
                    rollCallCount: yearData.rollCalls.length,
                    totalVotes: yearData.totalVotes,
                    participation: participationRate,
                    rollCalls: yearData.rollCalls
                });
            }
        });

        yearlyData.sort(function (a, b) {
            return a.monthStart - b.monthStart;
        });

        return yearlyData;
    }

    /**
     * Render title
     * @param {string|Array} parties - Party name or array of party names
     * @param {string} partyColor - Party color
     * @param {Array} monthlyData - Monthly data
     */
    function renderTitle(parties, partyColor, monthlyData) {
        var partiesArr = Array.isArray(parties) ? parties : [parties];
        var isMultiParty = partiesArr.length > 1;

        // Subtitle metadata (shared by both modes)
        const totalPeriods = monthlyData.length;
        const totalRollCalls = d3.sum(monthlyData, function (d) { return d.rollCallCount; });
        const totalVotesAll = d3.sum(monthlyData, function (d) { return d.totalVotes; });
        const weightedSumAll = d3.sum(monthlyData, function (d) { return d.riceIndex * d.totalVotes; });
        const meanRice = totalVotesAll > 0 ? weightedSumAll / totalVotesAll : 0;

        var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);
        const periodLabel = timeGrouping === 'year'
            ? totalPeriods + (isEnglish ? " years" : " anos")
            : totalPeriods + (isEnglish ? " months" : " meses");

        if (isMultiParty) {
            // Line 1: Coalition title
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", -58)
                .attr("text-anchor", "middle")
                .attr("font-size", "24px")
                .attr("font-weight", "bold")
                .attr("fill", "#4a5568")
                .text(isEnglish ? "Coalition Cohesion Over Time" : "Coesão da Coalizão ao Longo do Tempo");

            // Line 2: Party names with individual colors
            var partyNamesText = svg.append("text")
                .attr("x", width / 2)
                .attr("y", -36)
                .attr("text-anchor", "middle")
                .attr("font-size", "13px");

            partiesArr.forEach(function (p, i) {
                if (i > 0) {
                    partyNamesText.append("tspan")
                        .attr("fill", "#999")
                        .text(" · ");
                }
                partyNamesText.append("tspan")
                    .attr("fill", CONGRESS_DEFINE.getPartyColor(p))
                    .attr("font-weight", "600")
                    .text(p);
            });

            // Line 3: Stats (same pattern as single party)
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", -20)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .attr("fill", "#666")
                .text(periodLabel + " | " + partiesArr.length + (isEnglish ? " parties" : " partidos") + " | " + totalRollCalls + " roll calls | Rice Index: " + meanRice.toFixed(3));

            // Participation shading legend
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", -4)
                .attr("text-anchor", "middle")
                .attr("font-size", "10px")
                .attr("fill", "#999")
                .attr("font-style", "italic")
                .text("Background shading indicates participation rate — darker = higher participation");

        } else {
            // Single party mode (original behavior)
            var party = partiesArr[0];
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", -55)
                .attr("text-anchor", "middle")
                .attr("font-size", "24px")
                .attr("font-weight", "bold")
                .attr("fill", partyColor)
                .text(party + " - Cohesion Over Time");

            svg.append("text")
                .attr("x", width / 2)
                .attr("y", -32)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .attr("fill", "#666")
                .text(periodLabel + " | " + totalRollCalls + " roll calls | Rice Index: " + meanRice.toFixed(3));

            // Add participation shading legend
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", -12)
                .attr("text-anchor", "middle")
                .attr("font-size", "10px")
                .attr("fill", "#999")
                .attr("font-style", "italic")
                .text("Background shading indicates participation rate — darker = higher participation");
        }

        renderTimeToggle(monthlyData);
    }

    /**
     * Render title for deputy mode
     * @param {Array} deputies - Selected deputies
     * @param {Array} monthlyData - Monthly data for stats
     */
    function renderDeputyTitle(deputies, monthlyData) {
        var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);

        // Stats
        var totalPeriods = monthlyData.length;
        var totalRollCalls = d3.sum(monthlyData, function (d) { return d.rollCallCount; });
        var totalVotesAll = d3.sum(monthlyData, function (d) { return d.totalVotes; });
        var weightedSumAll = d3.sum(monthlyData, function (d) { return d.riceIndex * d.totalVotes; });
        var meanRice = totalVotesAll > 0 ? weightedSumAll / totalVotesAll : 0;
        var periodLabel = timeGrouping === 'year'
            ? totalPeriods + (isEnglish ? " years" : " anos")
            : totalPeriods + (isEnglish ? " months" : " meses");

        // Line 1: Title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -58)
            .attr("text-anchor", "middle")
            .attr("font-size", "24px")
            .attr("font-weight", "bold")
            .attr("fill", "#4a5568")
            .text(isEnglish ? "Deputies Cohesion Over Time" : "Coesão dos Deputados ao Longo do Tempo");

        // Line 2: Stats (same pattern as single party)
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -36)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("fill", "#666")
            .text(periodLabel + " | " + deputies.length + (isEnglish ? " deputies" : " deputados") + " | " + totalRollCalls + " roll calls | Rice Index: " + meanRice.toFixed(3));

        // Participation shading legend
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -20)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("fill", "#999")
            .attr("font-style", "italic")
            .text("Background shading indicates participation rate — darker = higher participation");

        // Clickable drawer toggle for deputy list
        var drawerOpen = false;
        var drawerGroup = null;

        var toggleText = svg.append("text")
            .attr("x", width / 2)
            .attr("y", -4)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("fill", "#4a5568")
            .style("cursor", "pointer")
            .text("▶ " + deputies.length + (isEnglish ? " deputies selected" : " deputados selecionados"));

        toggleText.on("click", function () {
            if (drawerOpen) {
                // Close drawer
                if (drawerGroup) drawerGroup.remove();
                drawerGroup = null;
                toggleText.text("▶ " + deputies.length + (isEnglish ? " deputies selected" : " deputados selecionados"));
                drawerOpen = false;
            } else {
                // Open drawer
                toggleText.text("▼ " + deputies.length + (isEnglish ? " deputies selected" : " deputados selecionados"));

                var drawerX = width / 2 - 200;
                var drawerY = 4;
                var drawerW = 400;
                var drawerH = Math.min(120, Math.ceil(deputies.length / 3) * 28 + 16);

                drawerGroup = svg.append("g")
                    .attr("class", "deputy-drawer")
                    .attr("transform", "translate(" + drawerX + "," + drawerY + ")");

                // Background with shadow
                drawerGroup.append("rect")
                    .attr("width", drawerW)
                    .attr("height", drawerH)
                    .attr("rx", 6)
                    .attr("ry", 6)
                    .style("fill", "#ffffff")
                    .style("stroke", "#e2e8f0")
                    .style("stroke-width", 1)
                    .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

                // Use foreignObject for scrollable pill layout
                var fo = drawerGroup.append("foreignObject")
                    .attr("x", 8)
                    .attr("y", 8)
                    .attr("width", drawerW - 16)
                    .attr("height", drawerH - 16);

                var div = fo.append("xhtml:div")
                    .style("display", "flex")
                    .style("flex-wrap", "wrap")
                    .style("gap", "4px")
                    .style("max-height", (drawerH - 16) + "px")
                    .style("overflow-y", "auto")
                    .style("font-family", "system-ui, -apple-system, sans-serif");

                deputies.forEach(function (d) {
                    var partyColor = CONGRESS_DEFINE.getPartyColor(d.party);
                    div.append("xhtml:span")
                        .style("display", "inline-block")
                        .style("padding", "2px 8px")
                        .style("border-radius", "12px")
                        .style("background-color", hexToRgba(partyColor, 0.15))
                        .style("border", "1px solid " + hexToRgba(partyColor, 0.4))
                        .style("font-size", "10px")
                        .style("color", "#2d3748")
                        .style("white-space", "nowrap")
                        .text(d.name + " (" + d.party + ")");
                });

                drawerOpen = true;
            }
        });

        renderTimeToggle(monthlyData);
    }

    /**
     * Convert hex color to rgba
     * @param {string} hex - Hex color string
     * @param {number} alpha - Alpha value (0-1)
     * @returns {string} rgba color string
     */
    function hexToRgba(hex, alpha) {
        if (!hex) return "rgba(128,128,128," + alpha + ")";
        hex = hex.replace('#', '');
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        var r = parseInt(hex.substring(0, 2), 16);
        var g = parseInt(hex.substring(2, 4), 16);
        var b = parseInt(hex.substring(4, 6), 16);
        return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
    }

    /**
     * Render Month/Year toggle switch
     * @param {Array} monthlyData - Monthly data to determine year span
     */
    function renderTimeToggle(monthlyData) {
        var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);

        // Determine if year grouping is possible (need data spanning 2+ distinct years)
        var firstYear = monthlyData[0].monthStart.getFullYear();
        var lastYear = monthlyData[monthlyData.length - 1].monthStart.getFullYear();
        var yearDisabled = (firstYear === lastYear);

        // If year toggle is disabled and currently set to year, force back to month
        if (yearDisabled && timeGrouping === 'year') {
            timeGrouping = 'month';
        }

        var monthLabel = isEnglish ? "Month" : "Mês";
        var yearLabel = isEnglish ? "Year" : "Ano";
        var toggleW = 110;
        var toggleH = 24;
        var knobW = Math.floor(toggleW / 2);
        var toggleX = width - toggleW;
        var toggleY = -50;

        var timeToggle = svg.append("g")
            .attr("class", "time-grouping-toggle")
            .attr("transform", "translate(" + toggleX + "," + toggleY + ")")
            .style("cursor", yearDisabled ? "default" : "pointer");

        // Background pill
        timeToggle.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", toggleW)
            .attr("height", toggleH)
            .attr("rx", toggleH / 2)
            .attr("ry", toggleH / 2)
            .style("fill", "#f2f2f7")
            .style("stroke", "#d1d1d6")
            .style("stroke-width", 1);

        // Knob
        var knob = timeToggle.append("rect")
            .attr("class", "knob")
            .attr("x", timeGrouping === 'month' ? 0 : knobW)
            .attr("y", 0)
            .attr("width", knobW)
            .attr("height", toggleH)
            .attr("rx", toggleH / 2)
            .attr("ry", toggleH / 2)
            .style("fill", "#ffffff")
            .style("stroke", "#c7c7cc")
            .style("stroke-width", 1);

        // Left label: Mês / Month
        timeToggle.append("text")
            .attr("class", "month-label")
            .attr("x", knobW / 2)
            .attr("y", Math.floor(toggleH / 2))
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .text(monthLabel)
            .style("fill", timeGrouping === 'month' ? "#000" : "#6c6c70")
            .style("font-weight", timeGrouping === 'month' ? "600" : "400")
            .style("pointer-events", "none");

        // Right label: Ano / Year
        timeToggle.append("text")
            .attr("class", "year-label")
            .attr("x", knobW + knobW / 2)
            .attr("y", Math.floor(toggleH / 2))
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .text(yearLabel)
            .style("fill", yearDisabled ? "#c7c7cc" : (timeGrouping === 'year' ? "#000" : "#6c6c70"))
            .style("font-weight", timeGrouping === 'year' ? "600" : "400")
            .style("pointer-events", "none");

        // Click handler (disabled when only 1 year of data)
        if (!yearDisabled) {
            timeToggle.on("click", function () {
                timeGrouping = (timeGrouping === 'month') ? 'year' : 'month';

                // Animate knob
                knob.transition().duration(160)
                    .attr("x", timeGrouping === 'month' ? 0 : knobW);

                // Update label colors
                timeToggle.select(".month-label")
                    .style("fill", timeGrouping === 'month' ? "#000" : "#6c6c70")
                    .style("font-weight", timeGrouping === 'month' ? "600" : "400");
                timeToggle.select(".year-label")
                    .style("fill", timeGrouping === 'year' ? "#000" : "#6c6c70")
                    .style("font-weight", timeGrouping === 'year' ? "600" : "400");

                // Re-render with new grouping
                if (originalData) {
                    renderTimeline(originalData);
                }
            });
        }
    }

    /**
     * Render no data message
     */
    function renderNoDataMessage() {
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", focusHeight / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("fill", "#999")
            .text("Insufficient data to display Cohesion timeline");
    }

    /**
     * Show tooltip
     */
    function showTooltip(d, color) {
        const tooltip = d3.select(".toolTip");
        if (tooltip.empty()) return; // guard if no tooltip div present

        // Cancel any ongoing hide transitions to prevent race conditions
        tooltip.transition().duration(0);

        // Format period label based on grouping
        var monthYear;
        if (timeGrouping === 'year') {
            monthYear = "" + d.monthStart.getFullYear();
        } else {
            const monthNames = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];
            monthYear = monthNames[d.monthStart.getMonth()] + " " + d.monthStart.getFullYear();
        }

        const ricePercentage = (d.riceIndex * 100).toFixed(1);
        const participationPercentage = (d.participation * 100).toFixed(1);

        var coalitionLabel = isMultiParty
            ? "<div style='font-size: 11px; color: #999; margin-bottom: 2px;'>" + (originalData && originalData.isDeputyMode ? "Deputies" : "Coalition") + "</div>"
            : "";

        const html =
            "<div style='min-width: 180px;'>" +
            "<div style='padding-bottom: 8px; margin-bottom: 8px; border-bottom: 2px solid " + color + ";'>" +
            coalitionLabel +
            "<div style='font-size: 14px; font-weight: 600; color: " + color + "; margin-bottom: 2px;'>" + monthYear + "</div>" +
            "</div>" +
            "<div style='font-size: 13px; line-height: 1.6;'>" +
            "<div style='margin-bottom: 6px;'>" +
            "<span style='color: #666; font-weight: 500;'>Cohesion:</span> " +
            "<span style='font-weight: 600; color: " + color + "; font-size: 15px;'>" + ricePercentage + "%</span>" +
            "<span style='color: #999; font-size: 11px; margin-left: 4px;'>(" + d.riceIndex.toFixed(3) + ")</span>" +
            "</div>" +
            "<div style='margin-bottom: 6px; color: #666;'>" +
            "<span style='font-weight: 500;'>Participation:</span> " +
            "<span style='font-weight: 600; color: #333;'>" + participationPercentage + "%</span>" +
            "</div>" +
            "<div style='color: #666;'>" +
            "<span style='font-weight: 500;'>Roll Calls:</span> " +
            "<span style='color: #333;'>" + d.rollCallCount + "</span>" +
            "</div>" +
            "<div style='color: #666;'>" +
            "<span style='font-weight: 500;'>Total Votes:</span> " +
            "<span style='color: #333;'>" + d.totalVotes + "</span>" +
            "</div>" +
            "</div>" +
            "</div>";

        tooltip.style("left", d3.event.pageX + 15 + "px");
        tooltip.style("top", d3.event.pageY - 10 + "px");
        tooltip.style("display", "inline-block")
            .style("opacity", 1);
        tooltip.html(html);
    }

    /**
     * Hide tooltip instantly (no transition to avoid race conditions)
     */
    function hideTooltip() {
        const tooltip = d3.select(".toolTip");
        if (tooltip.empty()) return;

        // Cancel any ongoing transitions
        tooltip.transition().duration(0);

        // Hide instantly
        tooltip.style("display", "none")
            .style("opacity", 1);
    }

    /**
     * Public API
     */
    chart.update = function () {
        dispatch.update();
        return chart;
    };

    chart.margin = function (_) {
        if (!arguments.length) return margin;
        margin = _;
        return chart;
    };

    chart.width = function (_) {
        if (!arguments.length) return width;
        width = _;
        return chart;
    };

    chart.height = function (_) {
        if (!arguments.length) return height;
        height = _;
        return chart;
    };

    chart.outerWidth = function (_) {
        if (!arguments.length) return outerWidth;
        outerWidth = _;
        return chart;
    };

    chart.outerHeight = function (_) {
        if (!arguments.length) return outerHeight;
        outerHeight = _;
        return chart;
    };

    return d3.rebind(chart, dispatch, 'on');
}
