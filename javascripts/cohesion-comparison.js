/**
 * Cohesion Comparison Chart
 * Displays multiple Rice Index series on the same timeline for comparison.
 * Supports up to 4 series of party groups or individual deputies.
 *
 * Dependencies:
 * - D3.js v3
 * - congress-definitions.js: For party colors
 * - core/rice-index.js: For Rice Index calculation functions
 */

/**
 * Creates a Cohesion Comparison chart
 * @returns {Function} Chart function following D3 reusable chart pattern
 */
function cohesionComparison() {
    // Chart dimensions
    var margin = { top: 120, right: 80, bottom: 60, left: 80 },
        contextMargin = { top: 15, right: 80, bottom: 25, left: 80 },
        outerWidth = 1080,
        outerHeight = 780,
        contextHeight = 60,
        contextGap = 50,
        width = outerWidth - margin.left - margin.right,
        focusHeight = outerHeight - margin.top - margin.bottom - contextHeight - contextGap,
        height = focusHeight;

    var svg;
    var panelID;
    var dispatch = d3.dispatch('update');

    // Internal state
    var seriesList = [];      // max 4 series
    var timeGrouping = 'month';
    var focusedSeriesId = null;
    var savedBrushExtent = null;
    var brush;
    var brushGroup;
    var chartData = null;     // original data passed from event handler

    // Series palette
    var SERIES_PALETTE = [
        { color: '#2563eb', pattern: '0',       strokeWidth: 3, label: 'solid' },
        { color: '#dc2626', pattern: '8,4',     strokeWidth: 2, label: 'dashed' },
        { color: '#059669', pattern: '2,3',     strokeWidth: 2, label: 'dotted' },
        { color: '#d97706', pattern: '8,4,2,4', strokeWidth: 2, label: 'dashdot' }
    ];

    var MAX_SERIES = 4;

    // ─── Helpers ────────────────────────────────────────────────────

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

    function getSeriesStyle(index, singleParty) {
        var palette = SERIES_PALETTE[index] || SERIES_PALETTE[0];
        var color = palette.color;
        // If series is a single party, use party color
        if (singleParty) {
            var partyColor = CONGRESS_DEFINE.getPartyColor(singleParty);
            if (partyColor) color = partyColor;
        }
        return {
            color: color,
            dasharray: palette.pattern,
            strokeWidth: palette.strokeWidth
        };
    }

    /**
     * Prevent SVG/D3 from swallowing keyboard events on HTML inputs inside foreignObject
     */
    function enableInputEvents(inputSelection) {
        inputSelection
            .on("keydown", function () { d3.event.stopPropagation(); })
            .on("keyup", function () { d3.event.stopPropagation(); })
            .on("keypress", function () { d3.event.stopPropagation(); })
            .on("focus", function () { d3.event.stopPropagation(); })
            .on("mousedown", function () { d3.event.stopPropagation(); });
    }

    function getMonthNames() {
        return ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
    }

    function formatPeriodLabel(d) {
        if (timeGrouping === 'year') {
            return "" + d.monthStart.getFullYear();
        }
        return getMonthNames()[d.monthStart.getMonth()] + " " + d.monthStart.getFullYear();
    }

    // ─── Main chart function ────────────────────────────────────────

    function chart(selection) {
        selection.each(function (data) {
            panelID = ($(this).parents('.panel')).attr('id');
            chartData = data;

            svg = d3.select(this)
                .append("svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", "0 0 " + outerWidth + " " + outerHeight)
                .classed("cohesion-comparison", true)
                .append("svg:g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            // Background
            svg.append("rect")
                .attr("width", width)
                .attr("height", height)
                .attr("fill", "#f9f9f9");

            renderChart();
        });
    }

    // ─── Render orchestrator ────────────────────────────────────────

    function renderChart() {
        // Save current brush extent before destroying DOM
        if (brush && !brush.empty()) {
            savedBrushExtent = brush.extent();
        }

        svg.selectAll("*").remove();

        renderTitle();
        renderToolbar();

        if (seriesList.length === 0) {
            savedBrushExtent = null;
            renderEmptyState();
            return;
        }

        // Recalculate data for all series
        recalculateAllSeries();

        // Get combined extent across all series
        var allData = [];
        seriesList.forEach(function (s) {
            var d = timeGrouping === 'year' ? s.yearlyData : s.monthlyData;
            allData = allData.concat(d);
        });

        if (allData.length === 0) {
            savedBrushExtent = null;
            renderEmptyState();
            return;
        }

        var fullExtent = d3.extent(allData, function (d) { return d.monthStart; });

        // Create focus and context groups
        var focus = svg.append("g")
            .attr("class", "focus")
            .attr("transform", "translate(0, 0)");

        var context = svg.append("g")
            .attr("class", "context")
            .attr("transform", "translate(0," + (focusHeight + contextGap) + ")");

        // Context scales
        var xContextScale = d3.time.scale()
            .domain(fullExtent)
            .range([0, width]);

        var xFocusScale = d3.time.scale()
            .domain(fullExtent)
            .range([0, width]);

        var yContextScale = d3.scale.linear()
            .domain([0, 1])
            .range([contextHeight, 0]);

        // Brush
        brush = d3.svg.brush()
            .x(xContextScale)
            .on("brush", function () { brushed(focus, xFocusScale); });

        // Restore saved brush extent or use full extent
        var initialExtent = fullExtent;
        if (savedBrushExtent && savedBrushExtent[0] < savedBrushExtent[1]) {
            brush.extent(savedBrushExtent);
            initialExtent = savedBrushExtent;
        }

        // Initial render with restored or full extent
        updateFocusView(focus, xFocusScale, initialExtent);

        // Context view
        brushGroup = renderContextView(context, xContextScale, yContextScale);

        // If brush was restored, visually update the brush rect
        if (savedBrushExtent && savedBrushExtent[0] < savedBrushExtent[1]) {
            brushGroup.call(brush);
        }
    }

    // ─── Title ──────────────────────────────────────────────────────

    function renderTitle() {
        var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -100)
            .attr("text-anchor", "middle")
            .attr("font-size", "22px")
            .attr("font-weight", "bold")
            .attr("fill", "#1e293b")
            .text(isEnglish ? "Cohesion Comparison" : "Comparativo de Coesao");

        // Subtitle with period info
        if (chartData && chartData.period) {
            var p = chartData.period;
            var startDate = p[0] instanceof Date ? p[0] : new Date(p[0]);
            var endDate = p[1] instanceof Date ? p[1] : new Date(p[1]);

            // Count actual data periods and roll calls (like the original cohesion chart)
            var totalPeriods = 0;
            var totalRollCalls = 0;
            if (seriesList.length > 0) {
                var dataToCount = timeGrouping === 'year' ? seriesList[0].yearlyData : seriesList[0].monthlyData;
                totalPeriods = dataToCount ? dataToCount.length : 0;
                totalRollCalls = dataToCount ? d3.sum(dataToCount, function (d) { return d.rollCallCount; }) : 0;
            }

            var periodLabel = timeGrouping === 'year'
                ? totalPeriods + (isEnglish ? " years" : " anos")
                : totalPeriods + (isEnglish ? " months" : " meses");

            var periodText = periodLabel + " | " + totalRollCalls + " roll calls";

            svg.append("text")
                .attr("x", width / 2)
                .attr("y", -82)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .attr("fill", "#64748b")
                .text(periodText);
        }

        renderTimeToggle();
    }

    // ─── Time Toggle ────────────────────────────────────────────────

    function renderTimeToggle() {
        var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);

        // Determine if year grouping is possible
        var yearDisabled = true;
        if (chartData && chartData.period) {
            var p = chartData.period;
            var startYear = (p[0] instanceof Date ? p[0] : new Date(p[0])).getFullYear();
            var endYear = (p[1] instanceof Date ? p[1] : new Date(p[1])).getFullYear();
            yearDisabled = (startYear === endYear);
        }

        if (yearDisabled && timeGrouping === 'year') {
            timeGrouping = 'month';
        }

        var monthLabel = isEnglish ? "Month" : "Mes";
        var yearLabel = isEnglish ? "Year" : "Ano";
        var toggleW = 110;
        var toggleH = 24;
        var knobW = Math.floor(toggleW / 2);
        var toggleX = width - toggleW;
        var toggleY = -88;

        var timeToggle = svg.append("g")
            .attr("class", "time-grouping-toggle")
            .attr("transform", "translate(" + toggleX + "," + toggleY + ")")
            .style("cursor", yearDisabled ? "default" : "pointer");

        timeToggle.append("rect")
            .attr("width", toggleW)
            .attr("height", toggleH)
            .attr("rx", toggleH / 2)
            .style("fill", "#f2f2f7")
            .style("stroke", "#d1d1d6")
            .style("stroke-width", 1);

        var knob = timeToggle.append("rect")
            .attr("class", "knob")
            .attr("x", timeGrouping === 'month' ? 0 : knobW)
            .attr("y", 0)
            .attr("width", knobW)
            .attr("height", toggleH)
            .attr("rx", toggleH / 2)
            .style("fill", "#ffffff")
            .style("stroke", "#c7c7cc")
            .style("stroke-width", 1);

        timeToggle.append("text")
            .attr("x", knobW / 2)
            .attr("y", Math.floor(toggleH / 2))
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .text(monthLabel)
            .style("fill", timeGrouping === 'month' ? "#000" : "#6c6c70")
            .style("font-weight", timeGrouping === 'month' ? "600" : "400")
            .style("pointer-events", "none");

        timeToggle.append("text")
            .attr("x", knobW + knobW / 2)
            .attr("y", Math.floor(toggleH / 2))
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .text(yearLabel)
            .style("fill", yearDisabled ? "#c7c7cc" : (timeGrouping === 'year' ? "#000" : "#6c6c70"))
            .style("font-weight", timeGrouping === 'year' ? "600" : "400")
            .style("pointer-events", "none");

        if (!yearDisabled) {
            timeToggle.on("click", function () {
                timeGrouping = (timeGrouping === 'month') ? 'year' : 'month';
                renderChart();
            });
        }
    }

    // ─── Toolbar (Legend + New Group button with flexbox wrapping) ───

    function renderToolbar() {
        // Measure how many rows we need: render off-screen, check height, then position
        var fo = svg.append("foreignObject")
            .attr("class", "toolbar")
            .attr("x", 0)
            .attr("y", -20)
            .attr("width", width)
            .attr("height", 1);

        var container = fo.append("xhtml:div")
            .style("display", "flex")
            .style("flex-wrap", "wrap")
            .style("align-items", "center")
            .style("gap", "6px 16px")
            .style("width", "100%")
            .style("font-family", "inherit");

        // Legend items
        seriesList.forEach(function (series) {
            var isFocused = focusedSeriesId === series.id;
            var dashSvg = series.dasharray === '0' ? '' : ' stroke-dasharray="' + series.dasharray + '"';

            var item = container.append("xhtml:div")
                .style("display", "inline-flex")
                .style("align-items", "center")
                .style("gap", "6px")
                .style("cursor", "default");

            // Line sample using inline SVG to support dash patterns
            item.append("xhtml:span")
                .style("display", "inline-flex")
                .style("align-items", "center")
                .style("flex-shrink", "0")
                .html('<svg width="24" height="6" xmlns="http://www.w3.org/2000/svg">' +
                    '<line x1="0" y1="3" x2="24" y2="3" stroke="' + series.color + '"' +
                    ' stroke-width="' + series.strokeWidth + '"' + dashSvg +
                    ' stroke-linecap="round"/></svg>');

            // Label
            item.append("xhtml:span")
                .style("font-size", "12px")
                .style("font-weight", isFocused ? "700" : "500")
                .style("color", isFocused ? series.color : "#374151")
                .style("cursor", "pointer")
                .style("white-space", "nowrap")
                .text(function () {
                    var data = timeGrouping === 'year' ? series.yearlyData : series.monthlyData;
                    if (data && data.length > 0) {
                        var totalVotes = d3.sum(data, function (d) { return d.totalVotes; });
                        var weightedSum = d3.sum(data, function (d) { return d.riceIndex * d.totalVotes; });
                        var meanRice = totalVotes > 0 ? weightedSum / totalVotes : 0;
                        return series.label + " (" + meanRice.toFixed(3) + ")";
                    }
                    return series.label;
                })
                .on("click", (function (s) {
                    return function () {
                        if (focusedSeriesId === s.id) {
                            focusedSeriesId = null;
                        } else {
                            focusedSeriesId = s.id;
                        }
                        renderChart();
                    };
                })(series));

            // Edit button
            item.append("xhtml:span")
                .style("font-size", "11px")
                .style("color", "#94a3b8")
                .style("cursor", "pointer")
                .text("\u270E")
                .on("click", (function (s) {
                    return function () { promptRenameSeries(s); };
                })(series));

            // Remove button
            item.append("xhtml:span")
                .style("font-size", "13px")
                .style("color", "#94a3b8")
                .style("cursor", "pointer")
                .style("line-height", "1")
                .text("\u00D7")
                .on("click", (function (s) {
                    return function () { removeSeries(s.id); };
                })(series));
        });

        // "+ New Group" button
        if (seriesList.length < MAX_SERIES) {
            container.append("xhtml:div")
                .style("display", "inline-flex")
                .style("align-items", "center")
                .style("justify-content", "center")
                .style("padding", "4px 16px")
                .style("background", "#2563eb")
                .style("color", "#ffffff")
                .style("font-size", "12px")
                .style("font-weight", "600")
                .style("border-radius", "14px")
                .style("cursor", "pointer")
                .style("white-space", "nowrap")
                .style("margin-left", "auto")
                .text("+ New Group")
                .on("click", function () {
                    openGroupEditor();
                });
        }

        // Auto-size foreignObject height to actual content and position above chart
        var contentHeight = container.node().scrollHeight || 28;
        fo.attr("height", contentHeight);
        fo.attr("y", -contentHeight - 14);
    }

    // ─── Group Editor (Mini-editor overlay) ─────────────────────────

    function openGroupEditor() {
        // Remove any existing editor
        svg.selectAll(".group-editor-overlay").remove();

        var editorW = 420;
        var editorH = 400;
        var editorX = (width - editorW) / 2;
        var editorY = -20;

        var overlay = svg.append("g")
            .attr("class", "group-editor-overlay")
            .attr("transform", "translate(" + editorX + "," + editorY + ")");

        // Backdrop (click to close)
        svg.insert("rect", ".group-editor-overlay")
            .attr("class", "group-editor-backdrop")
            .attr("x", -margin.left)
            .attr("y", -margin.top)
            .attr("width", outerWidth)
            .attr("height", outerHeight)
            .style("fill", "rgba(0,0,0,0.3)")
            .style("cursor", "pointer")
            .on("click", function () {
                closeGroupEditor();
            });

        // Use foreignObject for the HTML form
        var fo = overlay.append("foreignObject")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", editorW)
            .attr("height", editorH);

        var container = fo.append("xhtml:div")
            .style("width", editorW + "px")
            .style("height", editorH + "px")
            .style("background", "#ffffff")
            .style("border-radius", "12px")
            .style("box-shadow", "0 8px 32px rgba(0,0,0,0.15)")
            .style("padding", "20px")
            .style("font-family", "system-ui, -apple-system, sans-serif")
            .style("overflow-y", "auto")
            .style("box-sizing", "border-box");

        // State for the editor
        var editorState = {
            name: '',
            activeTab: 'parties',
            selectedParties: [],
            selectedDeputies: [],
            searchText: '',
            partyFilter: 'All'
        };

        buildEditorContent(container, editorState);
    }

    function closeGroupEditor() {
        svg.selectAll(".group-editor-overlay").remove();
        svg.selectAll(".group-editor-backdrop").remove();
    }

    function buildEditorContent(container, editorState) {
        container.html('');
        editorState.mainContainer = container;
        var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);

        // Title
        container.append("xhtml:div")
            .style("font-size", "16px")
            .style("font-weight", "700")
            .style("color", "#1e293b")
            .style("margin-bottom", "12px")
            .text(isEnglish ? "Add New Group" : "Adicionar Novo Grupo");

        // Name input
        var nameRow = container.append("xhtml:div")
            .style("margin-bottom", "12px");

        nameRow.append("xhtml:label")
            .style("display", "block")
            .style("font-size", "11px")
            .style("font-weight", "600")
            .style("color", "#64748b")
            .style("margin-bottom", "4px")
            .text(isEnglish ? "Group Name:" : "Nome do Grupo:");

        var nameInput = nameRow.append("xhtml:input")
            .attr("type", "text")
            .attr("placeholder", isEnglish ? "e.g. Government Base" : "ex. Base do Governo")
            .attr("value", editorState.name)
            .style("width", "100%")
            .style("padding", "6px 10px")
            .style("border", "1px solid #d1d5db")
            .style("border-radius", "6px")
            .style("font-size", "13px")
            .style("outline", "none")
            .style("box-sizing", "border-box");

        enableInputEvents(nameInput);

        nameInput.on("input", function () {
            editorState.name = this.value;
        });

        // Tabs
        var tabRow = container.append("xhtml:div")
            .style("display", "flex")
            .style("gap", "0")
            .style("margin-bottom", "12px")
            .style("border-bottom", "2px solid #e2e8f0");

        ['parties', 'deputies'].forEach(function (tab) {
            var label = tab === 'parties'
                ? (isEnglish ? "Parties" : "Partidos")
                : (isEnglish ? "Deputies" : "Deputados");

            tabRow.append("xhtml:button")
                .style("flex", "1")
                .style("padding", "6px 0")
                .style("font-size", "12px")
                .style("font-weight", editorState.activeTab === tab ? "700" : "400")
                .style("color", editorState.activeTab === tab ? "#2563eb" : "#64748b")
                .style("background", "none")
                .style("border", "none")
                .style("border-bottom", editorState.activeTab === tab ? "2px solid #2563eb" : "2px solid transparent")
                .style("margin-bottom", "-2px")
                .style("cursor", "pointer")
                .text(label)
                .on("click", function () {
                    editorState.activeTab = tab;
                    editorState.searchText = '';
                    buildEditorContent(container, editorState);
                });
        });

        // Tab content wrapper — keeps search results contained so they don't shift buttons
        var tabContentWrapper = container.append("xhtml:div")
            .attr("class", "tab-content-wrapper");

        if (editorState.activeTab === 'parties') {
            buildPartiesTab(tabContentWrapper, editorState);
        } else {
            buildDeputiesTab(tabContentWrapper, editorState);
        }

        // Bottom section wrapper — keeps members + buttons in stable position
        var bottomWrapper = container.append("xhtml:div")
            .attr("class", "editor-bottom-wrapper");

        // Members section
        buildMembersSection(bottomWrapper, editorState);

        // Action buttons
        var actionsRow = bottomWrapper.append("xhtml:div")
            .attr("class", "editor-actions-row")
            .style("display", "flex")
            .style("gap", "8px")
            .style("justify-content", "flex-end")
            .style("margin-top", "12px")
            .style("padding-top", "12px")
            .style("border-top", "1px solid #e2e8f0");

        actionsRow.append("xhtml:button")
            .style("padding", "6px 16px")
            .style("font-size", "12px")
            .style("background", "#f1f5f9")
            .style("color", "#64748b")
            .style("border", "1px solid #cbd5e1")
            .style("border-radius", "6px")
            .style("cursor", "pointer")
            .text(isEnglish ? "Cancel" : "Cancelar")
            .on("click", function () {
                closeGroupEditor();
            });

        var hasMembers = editorState.selectedParties.length > 0 || editorState.selectedDeputies.length > 0;

        actionsRow.append("xhtml:button")
            .style("padding", "6px 16px")
            .style("font-size", "12px")
            .style("font-weight", "600")
            .style("background", hasMembers ? "#2563eb" : "#94a3b8")
            .style("color", "#ffffff")
            .style("border", "none")
            .style("border-radius", "6px")
            .style("cursor", hasMembers ? "pointer" : "default")
            .style("opacity", hasMembers ? "1" : "0.6")
            .text(isEnglish ? "Add to Chart" : "Adicionar ao Grafico")
            .on("click", function () {
                if (!hasMembers) return;
                addSeriesFromEditor(editorState);
                closeGroupEditor();
            });
    }

    function buildPartiesTab(container, editorState) {
        var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);

        // Search
        var searchRow = container.append("xhtml:div")
            .style("margin-bottom", "8px");

        var searchInput = searchRow.append("xhtml:input")
            .attr("type", "text")
            .attr("placeholder", isEnglish ? "Search party..." : "Buscar partido...")
            .property("value", editorState.searchText || '')
            .style("width", "100%")
            .style("padding", "5px 10px")
            .style("border", "1px solid #e2e8f0")
            .style("border-radius", "6px")
            .style("font-size", "12px")
            .style("outline", "none")
            .style("box-sizing", "border-box");

        enableInputEvents(searchInput);

        // Debounce: only rebuild filtered list, not on every keystroke
        var debounceTimer = null;
        searchInput.on("input", function () {
            var val = this.value;
            editorState.searchText = val.toLowerCase();
            // Rebuild only the chips area below, not the whole form
            container.selectAll(".party-chips-container").remove();
            buildPartyChips(container, editorState);
        });

        // Auto-focus if user was searching
        if (editorState.searchText) {
            setTimeout(function () {
                var node = searchInput.node();
                if (node) {
                    node.focus();
                    // Place cursor at end
                    var len = node.value.length;
                    node.setSelectionRange(len, len);
                }
            }, 0);
        }

        // Build initial chips
        buildPartyChips(container, editorState);
    }

    function buildPartyChips(container, editorState) {
        // Get parties from deputies
        var deputies = chartData ? chartData.deputies : [];
        var partiesSet = {};
        deputies.forEach(function (d) {
            if (d.party) {
                if (!partiesSet[d.party]) partiesSet[d.party] = 0;
                partiesSet[d.party]++;
            }
        });

        var partiesList = Object.keys(partiesSet).sort();
        if (editorState.searchText) {
            partiesList = partiesList.filter(function (p) {
                return p.toLowerCase().indexOf(editorState.searchText) > -1;
            });
        }

        // Chips in a replaceable container
        var chipsContainer = container.append("xhtml:div")
            .attr("class", "party-chips-container")
            .style("display", "flex")
            .style("flex-wrap", "wrap")
            .style("gap", "6px")
            .style("max-height", "100px")
            .style("overflow-y", "auto")
            .style("margin-bottom", "8px");

        partiesList.forEach(function (party) {
            var isSelected = editorState.selectedParties.indexOf(party) > -1;
            var partyColor = CONGRESS_DEFINE.getPartyColor(party) || '#6b7280';
            var count = partiesSet[party];

            chipsContainer.append("xhtml:span")
                .style("display", "inline-flex")
                .style("align-items", "center")
                .style("padding", "4px 10px")
                .style("border-radius", "9px")
                .style("font-size", "11px")
                .style("font-weight", "bold")
                .style("cursor", "pointer")
                .style("background", "#f8fafc")
                .style("border", isSelected ? "2px solid " + partyColor : "1px solid #e2e8f0")
                .style("color", isSelected ? partyColor : "#374151")
                .style("font-weight", isSelected ? "bold" : "500")
                .text(party + " (" + count + ")")
                .on("click", function () {
                    var idx = editorState.selectedParties.indexOf(party);
                    if (idx > -1) {
                        editorState.selectedParties.splice(idx, 1);
                    } else {
                        editorState.selectedParties.push(party);
                    }
                    // Rebuild the whole form to update chips + members + button state
                    buildEditorContent(editorState.mainContainer, editorState);
                });
        });
    }

    function buildDeputiesTab(container, editorState) {
        var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);
        var deputies = chartData ? chartData.deputies : [];

        // Party filter dropdown
        var filterRow = container.append("xhtml:div")
            .style("display", "flex")
            .style("gap", "6px")
            .style("margin-bottom", "8px");

        var searchInput = filterRow.append("xhtml:input")
            .attr("type", "text")
            .attr("placeholder", isEnglish ? "Search deputy..." : "Buscar deputado...")
            .property("value", editorState.searchText || '')
            .style("flex", "1")
            .style("padding", "5px 10px")
            .style("border", "1px solid #e2e8f0")
            .style("border-radius", "6px")
            .style("font-size", "12px")
            .style("outline", "none");

        enableInputEvents(searchInput);

        searchInput.on("input", function () {
            editorState.searchText = this.value.toLowerCase();
            // Only rebuild the results list, not the whole form
            container.selectAll(".deputy-results-container").remove();
            buildDeputyResults(container, editorState);
        });

        // Auto-focus if user was searching
        if (editorState.searchText) {
            setTimeout(function () {
                var node = searchInput.node();
                if (node) {
                    node.focus();
                    var len = node.value.length;
                    node.setSelectionRange(len, len);
                }
            }, 0);
        }

        // Party filter
        var partiesSet = {};
        deputies.forEach(function (d) {
            if (d.party) partiesSet[d.party] = true;
        });
        var partiesList = ['All'].concat(Object.keys(partiesSet).sort());

        var select = filterRow.append("xhtml:select")
            .style("padding", "5px 8px")
            .style("border", "1px solid #e2e8f0")
            .style("border-radius", "6px")
            .style("font-size", "11px")
            .style("background", "#ffffff")
            .style("cursor", "pointer");

        enableInputEvents(select);

        partiesList.forEach(function (p) {
            select.append("xhtml:option")
                .attr("value", p)
                .property("selected", editorState.partyFilter === p)
                .text(p);
        });

        select.on("change", function () {
            editorState.partyFilter = this.value;
            // Rebuild results with new party filter
            container.selectAll(".deputy-results-container").remove();
            buildDeputyResults(container, editorState);
        });

        // Build initial results
        buildDeputyResults(container, editorState);
    }

    function buildDeputyResults(container, editorState) {
        var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);
        var deputies = chartData ? chartData.deputies : [];

        // Filter deputies
        var filtered = deputies.slice();
        if (editorState.partyFilter && editorState.partyFilter !== 'All') {
            filtered = filtered.filter(function (d) { return d.party === editorState.partyFilter; });
        }
        if (editorState.searchText) {
            filtered = filtered.filter(function (d) {
                return d.name && d.name.toLowerCase().indexOf(editorState.searchText) > -1;
            });
        }

        // Exclude already selected
        var selectedIDs = editorState.selectedDeputies.map(function (d) { return d.deputyID; });
        filtered = filtered.filter(function (d) {
            return selectedIDs.indexOf(d.deputyID) === -1;
        });

        // Show max 30 results
        filtered = filtered.slice(0, 30);

        var listContainer = container.append("xhtml:div")
            .attr("class", "deputy-results-container")
            .style("max-height", "90px")
            .style("overflow-y", "auto")
            .style("border", "1px solid #e2e8f0")
            .style("border-radius", "6px")
            .style("margin-bottom", "8px");

        if (filtered.length === 0) {
            listContainer.append("xhtml:div")
                .style("padding", "8px")
                .style("color", "#94a3b8")
                .style("font-size", "11px")
                .style("text-align", "center")
                .text(isEnglish ? "No deputies found" : "Nenhum deputado encontrado");
        }

        filtered.forEach(function (dep) {
            var partyColor = CONGRESS_DEFINE.getPartyColor(dep.party) || '#6b7280';

            listContainer.append("xhtml:div")
                .style("padding", "4px 10px")
                .style("font-size", "11px")
                .style("cursor", "pointer")
                .style("border-bottom", "1px solid #f1f5f9")
                .style("display", "flex")
                .style("justify-content", "space-between")
                .style("align-items", "center")
                .html(
                    '<span>' + dep.name + '</span>' +
                    '<span style="color:' + partyColor + ';font-weight:500;font-size:10px;">' + dep.party + '</span>'
                )
                .on("click", function () {
                    editorState.selectedDeputies.push(dep);
                    editorState.searchText = '';
                    // Rebuild the whole form to update members section
                    buildEditorContent(editorState.mainContainer, editorState);
                });
        });
    }

    function buildMembersSection(container, editorState) {
        var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);
        var hasMembers = editorState.selectedParties.length > 0 || editorState.selectedDeputies.length > 0;

        if (!hasMembers) return;

        var membersDiv = container.append("xhtml:div")
            .attr("class", "members-section")
            .style("margin-top", "8px");

        membersDiv.append("xhtml:div")
            .style("font-size", "11px")
            .style("font-weight", "600")
            .style("color", "#64748b")
            .style("margin-bottom", "6px")
            .text(isEnglish ? "Members:" : "Membros:");

        var chipsDiv = membersDiv.append("xhtml:div")
            .style("display", "flex")
            .style("flex-wrap", "wrap")
            .style("gap", "4px");

        // Party chips
        var deputies = chartData ? chartData.deputies : [];

        editorState.selectedParties.forEach(function (party) {
            var partyColor = CONGRESS_DEFINE.getPartyColor(party) || '#6b7280';
            var count = deputies.filter(function (d) { return d.party === party; }).length;

            chipsDiv.append("xhtml:span")
                .style("display", "inline-flex")
                .style("align-items", "center")
                .style("gap", "4px")
                .style("padding", "4px 10px")
                .style("border-radius", "9px")
                .style("font-size", "11px")
                .style("font-weight", "bold")
                .style("background", "#f8fafc")
                .style("border", "1px solid " + partyColor)
                .style("color", partyColor)
                .html(party + ' (' + count + ' deps) <span style="cursor:pointer;color:#ef4444;font-weight:bold;margin-left:2px;" class="remove-party">&times;</span>')
                .on("click", function () {
                    // Check if click was on the X
                    if (d3.event.target.classList.contains('remove-party')) {
                        var idx = editorState.selectedParties.indexOf(party);
                        if (idx > -1) editorState.selectedParties.splice(idx, 1);
                        buildEditorContent(editorState.mainContainer, editorState);
                    }
                });
        });

        // Deputy chips
        editorState.selectedDeputies.forEach(function (dep, i) {
            var partyColor = CONGRESS_DEFINE.getPartyColor(dep.party) || '#6b7280';

            chipsDiv.append("xhtml:span")
                .style("display", "inline-flex")
                .style("align-items", "center")
                .style("gap", "4px")
                .style("padding", "4px 10px")
                .style("border-radius", "9px")
                .style("font-size", "11px")
                .style("font-weight", "bold")
                .style("background", "#f8fafc")
                .style("border", "1px solid " + partyColor)
                .style("color", partyColor)
                .html(dep.name + ' - ' + dep.party + ' <span style="cursor:pointer;color:#ef4444;font-weight:bold;margin-left:2px;" class="remove-deputy">&times;</span>')
                .on("click", function () {
                    if (d3.event.target.classList.contains('remove-deputy')) {
                        editorState.selectedDeputies.splice(i, 1);
                        buildEditorContent(editorState.mainContainer, editorState);
                    }
                });
        });
    }

    // ─── Add series from editor ─────────────────────────────────────

    function addSeriesFromEditor(editorState) {
        if (seriesList.length >= MAX_SERIES) return;

        var deputies = chartData ? chartData.deputies : [];
        var rcs = chartData ? chartData.rcs : [];

        // Collect deputy IDs
        var deputyIDs = [];
        var deputyObjects = [];
        var isSingleParty = (editorState.selectedParties.length === 1 && editorState.selectedDeputies.length === 0);
        var singleParty = isSingleParty ? editorState.selectedParties[0] : null;

        // Add deputies from selected parties
        editorState.selectedParties.forEach(function (party) {
            deputies.forEach(function (d) {
                if (d.party === party && deputyIDs.indexOf(d.deputyID) === -1) {
                    deputyIDs.push(d.deputyID);
                    deputyObjects.push(d);
                }
            });
        });

        // Add individually selected deputies
        editorState.selectedDeputies.forEach(function (d) {
            if (deputyIDs.indexOf(d.deputyID) === -1) {
                deputyIDs.push(d.deputyID);
                deputyObjects.push(d);
            }
        });

        if (deputyIDs.length === 0) return;

        // Generate label
        var label = editorState.name;
        if (!label) {
            if (isSingleParty) {
                label = singleParty;
            } else if (editorState.selectedParties.length > 0) {
                label = editorState.selectedParties.join(' + ');
            } else {
                label = deputyObjects.length + ' deputies';
            }
        }

        // Calculate data
        var monthlyData = calculateMonthlyRiceIndex(rcs, [], deputyIDs.length, RICE_CALC_CLASSIC, deputyIDs);
        var yearlyData = calculateYearlyRiceIndex(rcs, [], deputyIDs.length, RICE_CALC_CLASSIC, deputyIDs);

        var style = getSeriesStyle(seriesList.length, singleParty);

        var series = {
            id: 'series-' + Date.now(),
            label: label,
            color: style.color,
            dasharray: style.dasharray,
            strokeWidth: style.strokeWidth,
            singleParty: singleParty,
            deputyIDs: deputyIDs,
            deputies: deputyObjects,
            monthlyData: monthlyData,
            yearlyData: yearlyData
        };

        seriesList.push(series);
        renderChart();
    }

    function removeSeries(seriesId) {
        seriesList = seriesList.filter(function (s) { return s.id !== seriesId; });

        // Reassign colors/patterns based on new positions
        seriesList.forEach(function (s, i) {
            var style = getSeriesStyle(i, s.singleParty);
            s.color = style.color;
            s.dasharray = style.dasharray;
            s.strokeWidth = style.strokeWidth;
        });

        focusedSeriesId = null;
        renderChart();
    }

    function recalculateAllSeries() {
        var rcs = chartData ? chartData.rcs : [];
        seriesList.forEach(function (s) {
            s.monthlyData = calculateMonthlyRiceIndex(rcs, [], s.deputyIDs.length, RICE_CALC_CLASSIC, s.deputyIDs);
            s.yearlyData = calculateYearlyRiceIndex(rcs, [], s.deputyIDs.length, RICE_CALC_CLASSIC, s.deputyIDs);
        });
    }

    // renderLegend merged into renderToolbar above

    function promptRenameSeries(series) {
        var newName = prompt("Rename series:", series.label);
        if (newName && newName.trim()) {
            series.label = newName.trim();
            renderChart();
        }
    }

    // ─── Empty state ────────────────────────────────────────────────

    function renderEmptyState() {
        var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", focusHeight / 2 - 10)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("fill", "#94a3b8")
            .text(isEnglish ? "No groups added yet" : "Nenhum grupo adicionado ainda");

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", focusHeight / 2 + 16)
            .attr("text-anchor", "middle")
            .attr("font-size", "13px")
            .attr("fill", "#cbd5e1")
            .text(isEnglish
                ? 'Click "+ New Group" to add parties or deputies'
                : 'Clique em "+ New Group" para adicionar partidos ou deputados');
    }

    // ─── Focus View ─────────────────────────────────────────────────

    function updateFocusView(focus, xScale, brushExtent) {
        var allData = [];
        seriesList.forEach(function (s) {
            var d = timeGrouping === 'year' ? s.yearlyData : s.monthlyData;
            allData = allData.concat(d);
        });

        // Filter to brush extent
        var filteredExtent = brushExtent;
        if (brushExtent && brushExtent[0] < brushExtent[1]) {
            allData = allData.filter(function (d) {
                return d.monthStart >= brushExtent[0] && d.monthStart <= brushExtent[1];
            });
        }

        if (allData.length === 0) return;

        var dataExtent = filteredExtent || d3.extent(allData, function (d) { return d.monthStart; });
        xScale.domain(dataExtent);

        // Y scale from all visible series
        var minRice = d3.min(allData, function (d) { return d.riceIndex; });
        var maxRice = d3.max(allData, function (d) { return d.riceIndex; });
        var riceRange = maxRice - minRice;
        var focusPadding = Math.max(riceRange * 0.1, 0.02);
        var focusMin = Math.max(0, minRice - focusPadding);
        var focusMax = Math.min(1, maxRice + focusPadding);

        var yFocusScale = d3.scale.linear()
            .domain([focusMin, focusMax])
            .range([focusHeight, 0])
            .nice();

        var xAxis = d3.svg.axis().scale(xScale).orient("bottom");
        var yAxis = d3.svg.axis().scale(yFocusScale).orient("left")
            .ticks(8).tickFormat(d3.format(".3f"));

        focus.selectAll("*").remove();
        renderFocusView(focus, xScale, yFocusScale, xAxis, yAxis, brushExtent);

        // Add statistics for focused series
        if (focusedSeriesId) {
            var focusedSeries = seriesList.filter(function (s) { return s.id === focusedSeriesId; })[0];
            if (focusedSeries) {
                var focusedData = timeGrouping === 'year' ? focusedSeries.yearlyData : focusedSeries.monthlyData;
                if (brushExtent && brushExtent[0] < brushExtent[1]) {
                    focusedData = focusedData.filter(function (d) {
                        return d.monthStart >= brushExtent[0] && d.monthStart <= brushExtent[1];
                    });
                }
                addLowValueAnnotations(focus, focusedData, xScale, yFocusScale, focusedSeries.color);
            }
        }
    }

    function renderFocusView(focus, xScale, yScale, xAxis, yAxis, brushExtent) {
        // Background
        focus.append("rect")
            .attr("width", width)
            .attr("height", focusHeight)
            .attr("fill", "#fafafa")
            .attr("stroke", "#e0e0e0")
            .attr("stroke-width", 1)
            .attr("rx", 4);

        // Grid
        focus.selectAll(".grid-line-horizontal")
            .data(yScale.ticks(8))
            .enter()
            .append("line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", function (d) { return yScale(d); })
            .attr("y2", function (d) { return yScale(d); })
            .style("stroke", "#e8e8e8")
            .style("stroke-width", 1)
            .style("shape-rendering", "crispEdges");

        // Axes
        focus.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + focusHeight + ")")
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

        focus.selectAll(".axis path, .axis line")
            .style("fill", "none")
            .style("stroke", "#999")
            .style("stroke-width", 1)
            .style("shape-rendering", "crispEdges");

        focus.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -focusHeight / 2)
            .attr("y", -margin.left + 20)
            .style("font-size", "13px")
            .style("font-weight", "500")
            .style("fill", "#555")
            .text("Rice Index (Cohesion)");

        // Render each series
        seriesList.forEach(function (series) {
            var seriesData = timeGrouping === 'year' ? series.yearlyData : series.monthlyData;
            if (!seriesData || seriesData.length === 0) return;

            // Filter data to brush extent so lines don't extend outside chart area
            if (brushExtent && brushExtent[0] < brushExtent[1]) {
                seriesData = seriesData.filter(function (d) {
                    return d.monthStart >= brushExtent[0] && d.monthStart <= brushExtent[1];
                });
            }
            if (seriesData.length === 0) return;

            var isFocused = focusedSeriesId === null || focusedSeriesId === series.id;
            var opacity = isFocused ? 1.0 : 0.2;
            var extraWidth = (focusedSeriesId === series.id) ? 1 : 0;

            var line = d3.svg.line()
                .x(function (d) { return xScale(d.monthStart); })
                .y(function (d) { return yScale(d.riceIndex); })
                .interpolate("monotone");

            // Shadow
            focus.append("path")
                .datum(seriesData)
                .attr("class", "line-shadow series-" + series.id)
                .attr("d", line)
                .style("fill", "none")
                .style("stroke", "rgba(0,0,0,0.1)")
                .style("stroke-width", series.strokeWidth + extraWidth + 1)
                .style("opacity", opacity * 0.5)
                .attr("transform", "translate(0, 2)");

            // Main line
            focus.append("path")
                .datum(seriesData)
                .attr("class", "line series-" + series.id)
                .attr("d", line)
                .style("fill", "none")
                .style("stroke", series.color)
                .style("stroke-width", series.strokeWidth + extraWidth)
                .style("stroke-dasharray", series.dasharray === '0' ? 'none' : series.dasharray)
                .style("stroke-linecap", "round")
                .style("stroke-linejoin", "round")
                .style("opacity", opacity);

            // Data points
            focus.selectAll(".data-point-" + series.id)
                .data(seriesData)
                .enter()
                .append("circle")
                .attr("class", "data-point data-point-" + series.id)
                .attr("cx", function (d) { return xScale(d.monthStart); })
                .attr("cy", function (d) { return yScale(d.riceIndex); })
                .attr("r", 3)
                .style("fill", "#fff")
                .style("stroke", series.color)
                .style("stroke-width", 1.5)
                .style("cursor", "pointer")
                .style("opacity", opacity)
                .on("mouseover", function (d) {
                    var xPos = xScale(d.monthStart);
                    showCrosshair(xPos, yScale);
                    highlightAllPointsAtTime(d.monthStart, yScale);
                    showMultiSeriesTooltip(d, xScale);
                })
                .on("mouseout", function () {
                    hideCrosshair();
                    resetAllPoints();
                    hideTooltip();
                });
        });
    }

    // ─── Context View ───────────────────────────────────────────────

    function renderContextView(context, xScale, yScale) {
        context.append("rect")
            .attr("width", width)
            .attr("height", contextHeight)
            .attr("fill", "#f5f5f5")
            .attr("stroke", "#ddd")
            .attr("stroke-width", 1)
            .attr("rx", 3);

        context.append("text")
            .attr("x", 5)
            .attr("y", -5)
            .style("font-size", "10px")
            .style("fill", "#999")
            .style("font-weight", "500")
            .text("Full Range [0.0 \u2014 1.0] \u2014 Drag to zoom");

        var xAxisContext = d3.svg.axis().scale(xScale).orient("bottom");

        // Render each series as a line
        seriesList.forEach(function (series) {
            var seriesData = timeGrouping === 'year' ? series.yearlyData : series.monthlyData;
            if (!seriesData || seriesData.length === 0) return;

            var contextLine = d3.svg.line()
                .x(function (d) { return xScale(d.monthStart); })
                .y(function (d) { return yScale(d.riceIndex); })
                .interpolate("monotone");

            context.append("path")
                .datum(seriesData)
                .attr("d", contextLine)
                .style("fill", "none")
                .style("stroke", series.color)
                .style("stroke-width", 1.5)
                .style("stroke-dasharray", series.dasharray === '0' ? 'none' : series.dasharray)
                .style("opacity", 0.5);
        });

        // Reference lines
        context.append("line")
            .attr("x1", 0).attr("x2", width)
            .attr("y1", yScale(0)).attr("y2", yScale(0))
            .style("stroke", "#ccc").style("stroke-width", 1);
        context.append("line")
            .attr("x1", 0).attr("x2", width)
            .attr("y1", yScale(1)).attr("y2", yScale(1))
            .style("stroke", "#ccc").style("stroke-width", 1);

        // Tick labels
        context.append("text")
            .attr("x", width + 5).attr("y", yScale(1)).attr("dy", "0.3em")
            .style("font-size", "9px").style("fill", "#999").text("1.0");
        context.append("text")
            .attr("x", width + 5).attr("y", yScale(0)).attr("dy", "0.3em")
            .style("font-size", "9px").style("fill", "#999").text("0.0");

        // X axis
        context.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + contextHeight + ")")
            .call(xAxisContext)
            .selectAll("text")
            .style("text-anchor", "middle")
            .style("font-size", "9px")
            .style("fill", "#999");

        context.selectAll(".axis path, .axis line")
            .style("fill", "none")
            .style("stroke", "#ccc")
            .style("stroke-width", 1)
            .style("shape-rendering", "crispEdges");

        // Brush
        var bg = context.append("g")
            .attr("class", "x brush")
            .call(brush);

        bg.selectAll(".background")
            .attr("x", 0).attr("y", 0)
            .attr("width", width).attr("height", contextHeight)
            .style("fill", "transparent")
            .style("cursor", "crosshair");

        bg.selectAll(".extent")
            .attr("y", 0).attr("height", contextHeight)
            .style("fill", "#2563eb")
            .style("fill-opacity", 0.15)
            .style("stroke", "#2563eb")
            .style("stroke-width", 1.5)
            .style("shape-rendering", "crispEdges")
            .style("cursor", "move");

        bg.selectAll(".resize rect")
            .attr("y", 0).attr("height", contextHeight)
            .attr("width", 6).attr("rx", 3)
            .style("fill", "#2563eb")
            .style("opacity", 0.8);

        return bg;
    }

    function brushed(focus, xScale) {
        if (brush.empty()) {
            savedBrushExtent = null;
            updateFocusView(focus, xScale, null);
        } else {
            savedBrushExtent = brush.extent();
            updateFocusView(focus, xScale, savedBrushExtent);
        }
    }

    // ─── Multi-series Tooltip ───────────────────────────────────────

    function showMultiSeriesTooltip(d, xScale) {
        var tooltip = d3.select(".toolTip");
        if (tooltip.empty()) return;
        tooltip.transition().duration(0);

        var monthYear = formatPeriodLabel(d);

        var html = "<div style='min-width: 220px; max-width: 340px;'>" +
            "<div style='padding-bottom: 4px; margin-bottom: 8px;'>" +
            "<div style='font-size: 14px; font-weight: 600; color: #1e293b;'>" + monthYear + "</div>" +
            "</div>";

        // Show all series values for this time period
        seriesList.forEach(function (series, idx) {
            var seriesData = timeGrouping === 'year' ? series.yearlyData : series.monthlyData;
            var match = null;

            // Find matching data point
            for (var i = 0; i < seriesData.length; i++) {
                if (seriesData[i].monthStart.getTime() === d.monthStart.getTime()) {
                    match = seriesData[i];
                    break;
                }
            }

            var dashDisplay = series.dasharray === '0'
                ? '\u2014\u2014'
                : (series.dasharray === '8,4' ? '- -' : (series.dasharray === '2,3' ? '\u00B7\u00B7\u00B7' : '-\u00B7-'));

            // Separator between series (except first)
            if (idx > 0) {
                html += "<div style='border-top: 1px solid #e2e8f0; margin: 6px 0;'></div>";
            }

            html += "<div style='margin-bottom: 4px;'>";

            if (match) {
                var ricePercent = (match.riceIndex * 100).toFixed(1);
                var participationPercent = (match.participation * 100).toFixed(1);

                // Series header with name and line style
                html += "<div style='display:flex; align-items:center; gap:6px; padding-bottom:4px; margin-bottom:4px; border-bottom: 2px solid " + series.color + ";'>" +
                    "<span style='color:" + series.color + ";font-weight:600;'>" + dashDisplay + "</span> " +
                    "<span style='font-weight:600; font-size:13px; color:" + series.color + ";'>" + series.label + "</span>" +
                    "</div>";

                // Cohesion
                html += "<div style='font-size: 13px; line-height: 1.6;'>" +
                    "<div style='margin-bottom: 4px;'>" +
                    "<span style='color: #666; font-weight: 500;'>Cohesion:</span> " +
                    "<span style='font-weight: 600; color: " + series.color + "; font-size: 15px;'>" + ricePercent + "%</span>" +
                    "<span style='color: #999; font-size: 11px; margin-left: 4px;'>(" + match.riceIndex.toFixed(3) + ")</span>" +
                    "</div>";

                // Participation
                html += "<div style='margin-bottom: 4px; color: #666;'>" +
                    "<span style='font-weight: 500;'>Participation:</span> " +
                    "<span style='font-weight: 600; color: #333;'>" + participationPercent + "%</span>" +
                    "</div>";

                // Roll Calls
                html += "<div style='margin-bottom: 4px; color: #666;'>" +
                    "<span style='font-weight: 500;'>Roll Calls:</span> " +
                    "<span style='color: #333;'>" + match.rollCallCount + "</span>" +
                    "</div>";

                // Total Votes
                html += "<div style='color: #666;'>" +
                    "<span style='font-weight: 500;'>Total Votes:</span> " +
                    "<span style='color: #333;'>" + match.totalVotes + "</span>" +
                    "</div>" +
                    "</div>";

            } else {
                html += "<div style='display:flex; align-items:center; gap:6px;'>" +
                    "<span style='color:" + series.color + ";font-weight:600;'>" + dashDisplay + "</span> " +
                    "<span style='font-weight:500; color:" + series.color + ";'>" + series.label + ":</span> " +
                    "<span style='color:#94a3b8;'>\u2014</span>" +
                    "</div>";
            }

            html += "</div>";
        });

        html += "</div>";

        tooltip.style("left", d3.event.pageX + 15 + "px");
        tooltip.style("top", d3.event.pageY - 10 + "px");
        tooltip.style("display", "inline-block").style("opacity", 1);
        tooltip.html(html);
    }

    function hideTooltip() {
        var tooltip = d3.select(".toolTip");
        if (tooltip.empty()) return;
        tooltip.transition().duration(0);
        tooltip.style("display", "none").style("opacity", 1);
    }

    // ─── Crosshair and Multi-Point Highlighting ──────────────────────

    function showCrosshair(xPos, yScale) {
        var focus = svg.selectAll("g.focus");
        if (focus.empty()) return;

        // Remove existing crosshair if present
        focus.selectAll(".crosshair-line").remove();

        // Add vertical crosshair line
        focus.append("line")
            .attr("class", "crosshair-line")
            .attr("x1", xPos)
            .attr("x2", xPos)
            .attr("y1", 0)
            .attr("y2", focusHeight)
            .style("stroke", "#94a3b8")
            .style("stroke-width", 1)
            .style("stroke-dasharray", "4,3")
            .style("opacity", 0.6)
            .style("pointer-events", "none");
    }

    function hideCrosshair() {
        var focus = svg.selectAll("g.focus");
        if (focus.empty()) return;
        focus.selectAll(".crosshair-line").remove();
    }

    function highlightAllPointsAtTime(monthStart, yScale) {
        // Highlight all data points across all series at this time period
        seriesList.forEach(function (series, seriesIdx) {
            var seriesData = timeGrouping === 'year' ? series.yearlyData : series.monthlyData;
            if (!seriesData) return;

            // Find the data point for this series at this time
            var matchingPoint = null;
            for (var i = 0; i < seriesData.length; i++) {
                if (seriesData[i].monthStart.getTime() === monthStart.getTime()) {
                    matchingPoint = seriesData[i];
                    break;
                }
            }

            if (!matchingPoint) return;

            // Highlight only matching points (no dimming of others)
            var pointElements = svg.selectAll(".data-point-" + series.id);
            pointElements.each(function (d) {
                if (d.monthStart.getTime() === monthStart.getTime()) {
                    d3.select(this)
                        .transition().duration(150)
                        .attr("r", 5)
                        .style("fill", series.color);
                }
            });
        });
    }

    function resetAllPoints() {
        // Reset all points to their default state
        svg.selectAll(".data-point").each(function (d) {
            var pointClass = d3.select(this).attr("class");
            var seriesId = pointClass.match(/data-point-(\S+)/)[1];
            var series = seriesList.filter(function (s) { return s.id === seriesId; })[0];
            if (!series) return;

            var isFocused = focusedSeriesId === null || focusedSeriesId === series.id;
            var opacity = isFocused ? 1.0 : 0.2;

            d3.select(this)
                .transition().duration(150)
                .attr("r", 3)
                .style("fill", "#fff")
                .style("opacity", opacity);
        });
    }

    // ─── Low Value Annotations (on focus) ───────────────────────────

    function addLowValueAnnotations(focus, monthlyData, xScale, yScale, color) {
        if (!monthlyData || monthlyData.length < 2) return;

        var numToAnnotate = monthlyData.length >= 10 ? 3 : (monthlyData.length >= 5 ? 2 : 1);

        var sortedData = monthlyData.slice().sort(function (a, b) {
            return a.riceIndex - b.riceIndex;
        });

        var lowestPoints = sortedData.slice(0, numToAnnotate);

        var medianRice = d3.median(monthlyData, function (d) { return d.riceIndex; });
        var qualifyingPoints = lowestPoints.filter(function (d) {
            return d.riceIndex < medianRice;
        });

        if (qualifyingPoints.length === 0) return;

        var annotationGroup = focus.append("g")
            .attr("class", "low-value-annotations");

        qualifyingPoints.forEach(function (d) {
            var x = xScale(d.monthStart);
            var y = yScale(d.riceIndex);

            annotationGroup.append("line")
                .attr("x1", x).attr("x2", x)
                .attr("y1", y).attr("y2", y - 30)
                .style("stroke", "#d32f2f")
                .style("stroke-width", 1.5)
                .style("stroke-dasharray", "2,2")
                .style("opacity", 0.7);

            var flag = annotationGroup.append("g")
                .attr("transform", "translate(" + x + "," + (y - 35) + ")")
                .style("cursor", "pointer");

            flag.append("rect")
                .attr("x", -35).attr("y", -12)
                .attr("width", 70).attr("height", 20)
                .attr("rx", 3)
                .style("fill", "#d32f2f")
                .style("stroke", "#fff")
                .style("stroke-width", 1.5)
                .style("opacity", 0.9);

            flag.append("text")
                .attr("x", 0).attr("y", 0)
                .attr("dy", "0.32em")
                .attr("text-anchor", "middle")
                .style("font-size", "10px")
                .style("font-weight", "600")
                .style("fill", "#fff")
                .style("pointer-events", "none")
                .text("Low: " + (d.riceIndex * 100).toFixed(1) + "%");

            flag.on("mouseenter", function () {
                showLowValueTooltip(d, color);
            })
                .on("mouseleave", function () {
                    hideTooltip();
                });
        });
    }

    function showLowValueTooltip(d, color) {
        var tooltip = d3.select(".toolTip");
        if (tooltip.empty()) return;
        tooltip.transition().duration(0);

        var monthYear = formatPeriodLabel(d);
        var ricePercentage = (d.riceIndex * 100).toFixed(1);

        var rollCallsHtml = "";
        if (d.rollCalls && d.rollCalls.length > 0) {
            var sortedRollCalls = d.rollCalls.slice().sort(function (a, b) {
                return a.rice - b.rice;
            });
            var topLowRollCalls = sortedRollCalls.slice(0, 3);

            rollCallsHtml = "<div style='margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;'>" +
                "<div style='font-size: 11px; font-weight: 600; color: #d32f2f; margin-bottom: 6px;'>Lowest Cohesion Votes:</div>";

            topLowRollCalls.forEach(function (rcData, idx) {
                var rcRicePercent = (rcData.rice * 100).toFixed(1);
                var rcTitle = rcData.rc.rollCallName || "Roll Call #" + (idx + 1);
                var truncatedTitle = rcTitle.length > 40 ? rcTitle.substring(0, 37) + "..." : rcTitle;

                rollCallsHtml +=
                    "<div style='margin-bottom: 4px; padding: 4px; background: #fff8f8; border-radius: 2px;'>" +
                    "<div style='font-size: 10px; color: #666; margin-bottom: 2px;'>" + truncatedTitle + "</div>" +
                    "<div style='font-size: 10px;'>" +
                    "<span style='color: #999;'>Cohesion:</span> " +
                    "<span style='font-weight: 600; color: #d32f2f;'>" + rcRicePercent + "%</span>" +
                    "<span style='color: #999; margin-left: 6px;'>Votes:</span> " +
                    "<span style='color: #666;'>" + rcData.votes + "</span>" +
                    "</div></div>";
            });

            rollCallsHtml += "</div>";
        }

        var html =
            "<div style='min-width: 240px; max-width: 320px;'>" +
            "<div style='padding-bottom: 8px; margin-bottom: 8px; border-bottom: 2px solid #d32f2f;'>" +
            "<div style='font-size: 14px; font-weight: 600; color: #d32f2f; margin-bottom: 2px;'>Low Cohesion Period</div>" +
            "<div style='font-size: 12px; color: #666;'>" + monthYear + "</div></div>" +
            "<div style='font-size: 13px; line-height: 1.6;'>" +
            "<div style='margin-bottom: 6px;'>" +
            "<span style='color: #666; font-weight: 500;'>Cohesion:</span> " +
            "<span style='font-weight: 600; color: #d32f2f; font-size: 15px;'>" + ricePercentage + "%</span></div>" +
            "<div style='margin-bottom: 4px; color: #666;'>" +
            "<span style='font-weight: 500;'>Roll Calls:</span> <span style='color: #333;'>" + d.rollCallCount + "</span></div>" +
            "<div style='color: #666;'>" +
            "<span style='font-weight: 500;'>Total Votes:</span> <span style='color: #333;'>" + d.totalVotes + "</span></div>" +
            "</div>" + rollCallsHtml + "</div>";

        tooltip.style("left", d3.event.pageX + 15 + "px");
        tooltip.style("top", d3.event.pageY - 10 + "px");
        tooltip.style("display", "inline-block").style("opacity", 1);
        tooltip.html(html);
    }

    // ─── Public API ─────────────────────────────────────────────────

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
