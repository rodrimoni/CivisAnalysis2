/**
 * Bar Chart Tabs Module
 * Renders tabbed interface with Theme Rice Index and Deputy Alignment bar charts
 */

(function (global) {
    'use strict';

    /**
     * Localize theme name
     * @param {string} theme - Theme name
     * @returns {string} Localized theme name
     */
    function localizedTheme(theme) {
        if (typeof subjectsToEnglish !== 'undefined' && typeof language !== 'undefined' && language === ENGLISH && subjectsToEnglish[theme]) {
            return subjectsToEnglish[theme];
        }
        return theme;
    }

    /**
     * Truncate text if needed
     * @param {string} text - Text to truncate
     * @param {number} maxWidth - Maximum width in pixels
     * @param {number} approxCharW - Approximate character width
     * @returns {string} Truncated text
     */
    function truncateText(text, maxWidth, approxCharW = 7.5) {
        var textLength = text.length * approxCharW;
        if (textLength <= maxWidth) return text;
        var maxChars = Math.floor(maxWidth / approxCharW) - 1;
        return text.substring(0, Math.max(1, maxChars)) + '…';
    }

    /**
     * Render Theme Rice Index bars
     * @param {Object} group - D3 group selection
     * @param {Object} options - Configuration options
     */
    function renderThemesRiceBars(group, options) {
        var party = options.party;
        var data = options.data;
        var x0 = options.x;
        var y0 = options.y;
        var w = options.w;
        var h = options.h;
        var selectedTheme = options.selectedTheme;
        var onThemeClick = options.onThemeClick;

        if (!data || !data.length) {
            var noDataText = (typeof language !== 'undefined' && language === ENGLISH)
                ? "No data available"
                : "Sem dados disponíveis";
            group.append("text")
                .attr("x", w / 2)
                .attr("y", y0 + h / 2)
                .attr("text-anchor", "middle")
                .attr("font-size", "16px")
                .attr("fill", "#999")
                .text(noDataText);
            return;
        }

        var contentGroup = group.append("g")
            .attr("transform", "translate(" + x0 + "," + y0 + ")");

        // Scales
        var maxValue = 1; // Rice Index in [0,1]
        var topPad = 8;
        var bottomPad = 20;
        var innerH = h - topPad - bottomPad;

        var barHeight = Math.min(24, Math.floor(innerH / data.length) - 3);
        var barGap = Math.max(2, Math.floor((innerH - barHeight * data.length) / Math.max(1, data.length - 1)));
        if (barGap > 14) barGap = 14;

        // Calculate actual content height
        var actualContentHeight = data.length * barHeight + Math.max(0, (data.length - 1)) * barGap;

        // Determine label column width
        var approxCharW = 7.5;
        var labelGap = 8;
        var maxLabelChars = d3.max(data, function (d) { return localizedTheme(d.theme).length; });
        var labelW = Math.min(200, Math.max(80, (maxLabelChars || 12) * approxCharW));

        var barAreaW = w - labelW - labelGap - 10;
        if (barAreaW < 80) {
            barAreaW = 80;
            labelW = Math.max(80, w - barAreaW - labelGap - 10);
        }

        var xScale = d3.scale.linear().domain([0, maxValue]).range([0, barAreaW]);
        var baseColor = CONGRESS_DEFINE.getPartyColor(party);

        // Fixed bottom axis (pinned, not scrolling)
        var axis = d3.svg.axis()
            .scale(xScale)
            .tickValues([0, 0.2, 0.4, 0.6, 0.8, 1])
            .tickFormat(function (v) { return (v * 100).toFixed(0) + "%"; })
            .tickSize(0)
            .orient("bottom");

        // Remove previous fixed axis if present
        group.selectAll(".fixed-bottom-axis").remove();

        var axisGroup = group.append("g")
            .attr("class", "axisHorizontal fixed-bottom-axis")
            .attr("transform", "translate(" + (x0 + labelW + labelGap) + "," + (y0 + h - bottomPad) + ")")
            .call(axis);

        axisGroup.selectAll("path").style("fill", "none");
        axisGroup.selectAll(".tick line")
            .style("stroke-width", 1)
            .style("stroke", "rgba(0, 0, 0, 0.2)");

        var rows = contentGroup.selectAll("g.theme-row")
            .data(data)
            .enter()
            .append("g")
            .attr("class", "theme-row")
            .attr("transform", function (d, i) {
                var y = topPad + i * (barHeight + barGap);
                return "translate(0," + y + ")";
            })
            .style("cursor", "pointer")
            .on("click", function (d) {
                if (onThemeClick) {
                    onThemeClick(d.theme);
                }
            });

        // Expand interactive area to entire row (label + bar)
        rows.append("rect")
            .attr("class", "hit-area")
            .attr("x", -5)
            .attr("y", -2)
            .attr("height", barHeight + 4)
            .attr("width", w + 10)
            .style("fill", "transparent")
            .style("pointer-events", "all")
            .style("cursor", "pointer");

        // Add selection highlight background
        rows.append("rect")
            .attr("class", "selection-bg")
            .attr("x", -5)
            .attr("y", -2)
            .attr("height", barHeight + 4)
            .attr("width", w + 10)
            .attr("rx", 4)
            .attr("ry", 4)
            .style("fill", function (d) {
                return (selectedTheme === d.theme) ? baseColor : "transparent";
            })
            .style("fill-opacity", 0.08)
            .style("stroke", function (d) {
                return (selectedTheme === d.theme) ? baseColor : "transparent";
            })
            .style("stroke-width", 2)
            .style("stroke-opacity", 0.3)
            .style("pointer-events", "none");

        // Labels
        rows.append("text")
            .attr("class", "label")
            .attr("x", 0)
            .attr("y", Math.floor(barHeight / 2))
            .attr("dy", ".35em")
            .attr("text-anchor", "start")
            .attr("font-size", "12px")
            .text(function (d) { return truncateText(localizedTheme(d.theme), labelW - 4, approxCharW); })
            .style("fill", "#333")
            .style("pointer-events", "none");

        // Bars
        rows.append("rect")
            .attr("class", "bar")
            .attr("x", labelW + labelGap)
            .attr("y", 0)
            .attr("height", barHeight)
            .attr("width", function (d) { return xScale(d.rice); })
            .style("fill", baseColor)
            .style("fill-opacity", function (d) { return 0.3 + (d.rice * 0.7); });

        // Values
        rows.append("text")
            .attr("class", "value")
            .attr("x", function (d) { return labelW + labelGap + xScale(d.rice) + 4; })
            .attr("y", Math.floor(barHeight / 2))
            .attr("dy", ".35em")
            .attr("text-anchor", "start")
            .attr("font-size", "11px")
            .attr("font-weight", "bold")
            .text(function (d) { return (d.rice * 100).toFixed(1) + "%"; })
            .style("fill", "#555")
            .style("pointer-events", "none");

        // Tooltip
        var div = d3.select(".toolTip");
        rows.on("mousemove", function (d) {
            div.style("left", d3.event.pageX + 10 + "px");
            div.style("top", d3.event.pageY - 25 + "px");
            div.style("display", "inline-block");
            var label = localizedTheme(d.theme);
            var html = "<strong>" + label + "</strong><br> Cohesion: " + (d.rice * 100).toFixed(1) + "%";
            div.html(html);
        }).on("mouseout", function () { div.style("display", "none"); });
    }

    /**
     * Render Deputy Alignment bars
     * @param {Object} group - D3 group selection
     * @param {Object} options - Configuration options
     */
    function renderDeputyAlignmentBars(group, options) {
        var party = options.party;
        var deputies = options.deputies;
        var x0 = options.x;
        var y0 = options.y;
        var w = options.w;
        var h = options.h;
        var sortOrder = (options.sortOrder === 'asc') ? 'asc' : 'desc';

        // Calculate deputy alignment data
        var data = [];
        if (deputies) {
            deputies.forEach(function (deputy) {
                if (deputy.alignment !== undefined && deputy.alignment !== null) {
                    data.push({
                        name: deputy.name,
                        party: deputy.party,
                        alignment: deputy.alignment
                    });
                }
            });
        }

        // Sort by alignment based on selected order; tie-break by name respecting order
        data.sort(function (a, b) {
            if (a.alignment === b.alignment) {
                var nameA = (a.name || '').toString();
                var nameB = (b.name || '').toString();
                var cmp = nameA.localeCompare(nameB);
                return (sortOrder === 'asc') ? cmp : -cmp;
            }
            return (sortOrder === 'asc') ? (a.alignment - b.alignment) : (b.alignment - a.alignment);
        });

        if (!data || !data.length) {
            var noDataText = (typeof language !== 'undefined' && language === ENGLISH)
                ? "No alignment data available"
                : "Sem dados de alinhamento";
            group.append("text")
                .attr("x", w / 2)
                .attr("y", y0 + h / 2)
                .attr("text-anchor", "middle")
                .attr("font-size", "16px")
                .attr("fill", "#999")
                .text(noDataText);
            return;
        }

        // Create a scrollable container using foreignObject to keep a window of ~20 deputies
        var axisHeight = 26; // reserve space for fixed bottom axis
        var fo = group.append("foreignObject")
            .attr("x", x0)
            .attr("y", y0)
            .attr("width", w)
            .attr("height", Math.max(0, h - axisHeight));

        var scrollDiv = fo.append("xhtml:div")
            .style("width", w + "px")
            .style("height", Math.max(0, h - axisHeight) + "px")
            .style("overflow-y", "auto")
            .style("-webkit-overflow-scrolling", "touch");

        // Scales
        var maxValue = 1;
        var topPad = 8;
        var bottomPad = 4; // tighter internal bottom padding; axis is outside
        var innerH = Math.max(0, (h - axisHeight) - topPad - bottomPad);

        // Keep bar sizing based on a window of up to 20 items
        var visibleCount = Math.min(20, data.length);
        var barHeight = Math.min(24, Math.floor(innerH / visibleCount) - 3);
        var barGap = Math.max(2, Math.floor((innerH - barHeight * visibleCount) / Math.max(1, visibleCount - 1)));
        if (barGap > 14) barGap = 14;

        // Total height considering all rows (used for grid/axis and inner SVG sizing)
        var actualContentHeight = data.length * barHeight + Math.max(0, (data.length - 1)) * barGap;

        // Inner SVG sized tightly to content height; the outer div scrolls
        var innerSvgHeight = topPad + (data.length * (barHeight + barGap)) - barGap + bottomPad;
        var innerSvg = scrollDiv.append("svg")
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .attr("width", w)
            .attr("height", innerSvgHeight);

        var contentGroup = innerSvg.append("g")
            .attr("transform", "translate(0,0)");

        var approxCharW = 7.5;
        var labelGap = 8;
        var maxLabelChars = d3.max(data, function (d) { return d.name.length; });
        var labelW = Math.min(280, Math.max(80, (maxLabelChars || 12) * approxCharW));

        var barAreaW = w - labelW - labelGap - 10;
        if (barAreaW < 80) {
            barAreaW = 80;
            labelW = Math.max(80, w - barAreaW - labelGap - 10);
        }

        var xScale = d3.scale.linear().domain([0, maxValue]).range([0, barAreaW]);
        var baseColor = CONGRESS_DEFINE.getPartyColor(party);

        // Fixed bottom axis (pinned at bottom of visible window)
        group.selectAll(".fixed-bottom-axis").remove();
        var fixedAxis = d3.svg.axis()
            .scale(xScale)
            .tickValues([0, 0.2, 0.4, 0.6, 0.8, 1])
            .tickFormat(function (v) { return (v * 100).toFixed(0) + "%"; })
            .tickSize(0)
            .orient("bottom");

        var fixedAxisGroup = group.append("g")
            .attr("class", "axisHorizontal fixed-bottom-axis")
            .attr("transform", "translate(" + (x0 + labelW + labelGap) + "," + (y0 + h - 4) + ")")
            .call(fixedAxis);

        fixedAxisGroup.selectAll("path").style("fill", "none");
        fixedAxisGroup.selectAll(".tick line")
            .style("stroke-width", 1)
            .style("stroke", "rgba(0, 0, 0, 0.2)");

        var rows = contentGroup.selectAll("g.deputy-row")
            .data(data)
            .enter()
            .append("g")
            .attr("class", "deputy-row")
            .attr("transform", function (d, i) {
                var y = topPad + i * (barHeight + barGap);
                return "translate(0," + y + ")";
            })
            .style("cursor", "pointer");

        // Expand interactive area to entire row (label + bar); tooltip only, no click needed
        rows.append("rect")
            .attr("class", "hit-area")
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", barHeight)
            .attr("width", w)
            .style("fill", "transparent")
            .style("pointer-events", "all")
            .style("cursor", "pointer");

        // Labels
        rows.append("text")
            .attr("class", "label")
            .attr("x", 0)
            .attr("y", Math.floor(barHeight / 2))
            .attr("dy", ".35em")
            .attr("text-anchor", "start")
            .attr("font-size", "12px")
            .text(function (d) { return truncateText(d.name, labelW - 4, approxCharW); })
            .style("fill", "#333")
            .style("pointer-events", "none");

        // Bars - colored by party
        rows.append("rect")
            .attr("class", "bar")
            .attr("x", labelW + labelGap)
            .attr("y", 0)
            .attr("height", barHeight)
            .attr("width", function (d) { return xScale(d.alignment); })
            .style("fill", function (d) { return CONGRESS_DEFINE.getPartyColor(d.party); })
            .style("fill-opacity", function (d) { return 0.3 + (d.alignment * 0.7); });

        // Values
        rows.append("text")
            .attr("class", "value")
            .attr("x", function (d) { return labelW + labelGap + xScale(d.alignment) + 4; })
            .attr("y", Math.floor(barHeight / 2))
            .attr("dy", ".35em")
            .attr("text-anchor", "start")
            .attr("font-size", "11px")
            .attr("font-weight", "bold")
            .text(function (d) { return (d.alignment * 100).toFixed(1) + "%"; })
            .style("fill", "#555")
            .style("pointer-events", "none");

        // Tooltip
        var div = d3.select(".toolTip");
        rows.on("mousemove", function (d) {
            var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);
            var alignmentLabel = isEnglish ? "Alignment" : "Alinhamento";
            var html = "<strong>" + d.name + "</strong><br>" +
                alignmentLabel + ": " + (d.alignment * 100).toFixed(1) + "%";
            div.style("left", d3.event.pageX + 10 + "px");
            div.style("top", d3.event.pageY - 25 + "px");
            div.style("display", "inline-block");
            div.html(html);
        }).on("mouseout", function () { div.style("display", "none"); });
    }

    /**
     * Create a tabbed bar chart interface
     * @param {Object} svgSelection - D3 selection where to append the chart
     * @param {Object} options - Configuration options
     * @param {string} options.party - Party name
     * @param {Array} options.deputies - Deputies data
     * @param {Array} options.riceData - Theme Rice Index data
     * @param {number} options.x - X position
     * @param {number} options.y - Y position
     * @param {number} options.w - Width
     * @param {number} options.h - Height
     * @param {string} options.currentMode - Current mode ('themeRice' or 'deputyAlignment')
     * @param {Function} options.onModeChange - Callback for mode change
     */
    function renderBarChartTabs(svgSelection, options) {
        var party = options.party;
        var deputies = options.deputies;
        var riceData = options.riceData;
        var x0 = options.x;
        var y0 = options.y;
        var w = Math.max(100, options.w);
        var h = Math.max(120, options.h);
        var currentMode = options.currentMode || 'themeRice';
        var onModeChange = options.onModeChange;
        var sortOrder = 'desc';

        var group = svgSelection.append("g")
            .attr("class", "right-bar-chart-container")
            .attr("transform", "translate(" + x0 + "," + y0 + ")");

        // Create tabs (80%) + right controls area (20%)
        var tabHeight = 35;
        var tabsAreaW = Math.floor(w * 0.8);
        var controlsAreaW = Math.max(0, w - tabsAreaW);
        var tabGroup = group.append("g").attr("class", "bar-chart-tabs");

        var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);
        var tabs = [
            { id: 'themeRice', label: isEnglish ? 'Cohesion by Subject' : 'Coesão por Tema' },
            { id: 'deputyAlignment', label: isEnglish ? 'Deputy Alignment' : 'Alinhamento de Deputados' }
        ];

        var tabWidth = Math.floor(tabsAreaW / tabs.length) - 4;

        tabs.forEach(function (tab, i) {
            var isActive = tab.id === currentMode;
            var tabX = i * (tabWidth + 4);

            // Tab background
            var tabRect = tabGroup.append("rect")
                .attr("class", "tab-button")
                .attr("data-mode", tab.id)
                .attr("x", tabX)
                .attr("y", 0)
                .attr("width", tabWidth)
                .attr("height", tabHeight - 5)
                .attr("rx", 6)
                .attr("ry", 6)
                .style("fill", isActive ? "#007aff" : "#ffffff")
                .style("stroke", isActive ? "#007aff" : "#d1d1d6")
                .style("stroke-width", 1)
                .style("cursor", "pointer")
                .on("mouseover", function () {
                    if (d3.select(this).attr("data-mode") !== currentMode) {
                        d3.select(this).style("fill", "#f5f5f7");
                    }
                })
                .on("mouseout", function () {
                    if (d3.select(this).attr("data-mode") !== currentMode) {
                        d3.select(this).style("fill", "#ffffff");
                    }
                })
                .on("click", function () {
                    var mode = d3.select(this).attr("data-mode");
                    if (mode !== currentMode && onModeChange) {
                        onModeChange(mode);
                    }
                });
            // Tab label centered
            tabGroup.append("text")
                .attr("x", tabX + tabWidth / 2)
                .attr("y", (tabHeight - 5) / 2)
                .attr("dy", ".35em")
                .attr("text-anchor", "middle")
                .attr("font-size", "13px")
                .attr("font-weight", "500")
                .attr("fill", isActive ? "#ffffff" : "#000000")
                .style("pointer-events", "none")
                .text(tab.label);
        });

        // Right-side controls area (20% width). Show sort toggle only when Deputy tab is active
        var controlsGroup = group.append('g')
            .attr('class', 'bar-chart-controls')
            .attr('transform', 'translate(' + tabsAreaW + ',0)');

        if (currentMode === 'deputyAlignment' && controlsAreaW > 0) {
            var toggleW = Math.min(120, Math.max(70, controlsAreaW - 8));
            var toggleH = 24;
            var knobW = Math.floor(toggleW / 2);
            var toggleX = Math.max(0, controlsAreaW - toggleW - 4);
            var toggleY = Math.max(1, ((tabHeight - 5) - toggleH) / 2);
            var isEnglishCtrl = (typeof language !== 'undefined' && language === ENGLISH);
            var sortAscLabel = isEnglishCtrl ? 'Asc' : 'Asc';
            var sortDescLabel = isEnglishCtrl ? 'Desc' : 'Desc';

            var sortToggle = controlsGroup.append('g')
                .attr('class', 'deputy-sort-toggle')
                .attr('transform', 'translate(' + toggleX + ',' + toggleY + ')')
                .style('cursor', 'pointer');

            // Background pill
            sortToggle.append('rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', toggleW)
                .attr('height', toggleH)
                .attr('rx', toggleH / 2)
                .attr('ry', toggleH / 2)
                .style('fill', '#f2f2f7')
                .style('stroke', '#d1d1d6')
                .style('stroke-width', 1);

            var knob = sortToggle.append('rect')
                .attr('class', 'knob')
                .attr('x', sortOrder === 'desc' ? 0 : knobW)
                .attr('y', 0)
                .attr('width', knobW)
                .attr('height', toggleH)
                .attr('rx', toggleH / 2)
                .attr('ry', toggleH / 2)
                .style('fill', '#ffffff')
                .style('stroke', '#c7c7cc')
                .style('stroke-width', 1);

            // Left label: Desc
            sortToggle.append('text')
                .attr('class', 'desc-label')
                .attr('x', knobW / 2)
                .attr('y', Math.floor(toggleH / 2))
                .attr('dy', '.35em')
                .attr('text-anchor', 'middle')
                .attr('font-size', '11px')
                .text(sortDescLabel)
                .style('fill', sortOrder === 'desc' ? '#000' : '#6c6c70')
                .style('pointer-events', 'none');

            // Right label: Asc
            sortToggle.append('text')
                .attr('class', 'asc-label')
                .attr('x', knobW + knobW / 2)
                .attr('y', Math.floor(toggleH / 2))
                .attr('dy', '.35em')
                .attr('text-anchor', 'middle')
                .attr('font-size', '11px')
                .text(sortAscLabel)
                .style('fill', sortOrder === 'asc' ? '#000' : '#6c6c70')
                .style('pointer-events', 'none');

            sortToggle.on('click', function () {
                sortOrder = (sortOrder === 'asc') ? 'desc' : 'asc';
                knob.transition().duration(160).attr('x', sortOrder === 'desc' ? 0 : knobW);
                sortToggle.select('.asc-label').style('fill', sortOrder === 'asc' ? '#000' : '#6c6c70');
                sortToggle.select('.desc-label').style('fill', sortOrder === 'desc' ? '#000' : '#6c6c70');

                // Re-render content only
                group.selectAll('.bar-chart-content').remove();
                var contentGroup = group.append('g').attr('class', 'bar-chart-content');
                renderDeputyAlignmentBars(contentGroup, {
                    party: party,
                    deputies: deputies,
                    x: 0,
                    y: tabHeight + 5,
                    w: w,
                    h: h - (tabHeight + 5),
                    sortOrder: sortOrder
                });
            });
        }

        // Render the appropriate chart below tabs
        var chartY = tabHeight + 5;
        var chartH = h - chartY;

        // Content container to allow selective re-rendering
        var contentGroup = group.append('g').attr('class', 'bar-chart-content');

        if (currentMode === 'themeRice') {
            renderThemesRiceBars(contentGroup, {
                party: party,
                data: riceData,
                x: 0,
                y: chartY,
                w: w,
                h: chartH,
                selectedTheme: options.selectedTheme,
                onThemeClick: options.onThemeClick
            });
        } else {
            renderDeputyAlignmentBars(contentGroup, {
                party: party,
                deputies: deputies,
                x: 0,
                y: chartY,
                w: w,
                h: chartH,
                sortOrder: sortOrder
            });
        }
    }

    // Export to global scope
    global.BarChartTabs = {
        render: renderBarChartTabs
    };

})(window);

