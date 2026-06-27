/**
 * Cohesion by Theme Chart
 * Small multiples of horizontal bar charts — one chart per theme. Each bar is a
 * comparison group; its length is the Rice Index of the union
 * (reference ∪ that comparison group) restricted to the theme's roll calls.
 * A dashed vertical baseline marks the reference group's own internal Rice in
 * the theme.
 *
 * Dependencies: D3 v3, congress-definitions.js (party colors), core/rice-index.js,
 * ui/group-editor.js (shared openGroupEditor)
 */
function cohesionByTheme() {
    // Layout
    var outerWidth = 1080,
        outerHeight = 780,
        margin = { top: 28, right: 16, bottom: 16, left: 16 },
        width = outerWidth - margin.left - margin.right,
        height = outerHeight - margin.top - margin.bottom;

    var svgRoot, svg, panelID, toolbarEl, gridEl, resizeTimer;
    var dispatch = d3.dispatch('update');

    // State
    var chartData = null;        // { period, rcs, deputies, ... }
    var referenceGroup = null;   // { parties, deputyIDs, color, label }
    var comparisonGroups = [];   // [{ parties, deputyIDs, color, label }]
    var selectedTypes = [];      // motion-type filter (empty = all)
    var selectedThemes = [];     // themes-shown filter (empty = all)

    var MAX_COMPARISONS = 8;
    var DEFAULT_PALETTE = ['#2563eb', '#dc2626', '#059669', '#d97706',
        '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

    function isEnglish() { return (typeof language !== 'undefined' && language === ENGLISH); }

    // System tooltip — reuses the shared frosted-glass ".toolTip" element
    // (index.html) styled in windows-system.css, matching every other chart.
    var tooltip = d3.select(".toolTip");

    function showToolTip(html) {
        if (tooltip.empty()) return;
        tooltip.transition().duration(0);
        tooltip.style("left", (d3.event.pageX + 15) + "px");
        tooltip.style("top", (d3.event.pageY - 10) + "px");
        tooltip.style("display", "inline-block").style("opacity", 1);
        tooltip.html(html);
    }

    function moveToolTip() {
        if (tooltip.empty()) return;
        tooltip.style("left", (d3.event.pageX + 15) + "px");
        tooltip.style("top", (d3.event.pageY - 10) + "px");
    }

    function hideToolTip() {
        if (tooltip.empty()) return;
        tooltip.transition().duration(0);
        tooltip.style("display", "none").style("opacity", 1);
    }

    // Each bar is the Rice cohesion of the union (reference ∪ this comparison
    // group); the tooltip makes that explicit and shows the reference's own
    // (baseline) cohesion for context.
    function barTooltipHtml(themeName, bar, refLabel, baseline, refColor) {
        var eng = isEnglish();
        var rColor = refColor || '#1e293b';
        var cColor = bar.color || '#2563eb';
        var rice = bar.rice || 0;

        return "<div style='min-width: 220px; max-width: 340px;'>" +
            "<div style='padding-bottom: 4px; margin-bottom: 8px;'>" +
            "<div style='font-size: 14px; font-weight: 600; color: #1e293b;'>" + themeName + "</div>" +
            "</div>" +
            "<div style='margin-bottom: 4px;'>" +
            "<div style='display:flex; align-items:center; gap:6px; padding-bottom:4px; margin-bottom:4px; border-bottom: 2px solid " + cColor + ";'>" +
            "<span style='font-weight:600; font-size:13px;'>" +
            "<span style='color:" + rColor + ";'>" + refLabel + "</span>" +
            "<span style='color:#94a3b8; font-weight:400;'> + </span>" +
            "<span style='color:" + cColor + ";'>" + bar.label + "</span>" +
            "</span>" +
            "</div>" +
            "<div style='font-size: 13px; line-height: 1.6;'>" +
            "<div style='margin-bottom: 4px;'>" +
            "<span style='color: #666; font-weight: 500;'>" + (eng ? 'Bloc cohesion:' : 'Coesão do bloco:') + "</span> " +
            "<span style='font-weight: 600; color: " + cColor + "; font-size: 15px;'>" + (rice * 100).toFixed(1) + "%</span>" +
            "<span style='color: #999; font-size: 11px; margin-left: 4px;'>(" + rice.toFixed(3) + ")</span>" +
            "</div>" +
            "<div style='margin-bottom: 4px; color: #666;'>" +
            "<span style='font-weight: 500;'>" + (eng ? 'Reference alone:' : 'Só a referência:') + "</span> " +
            "<span style='font-weight: 600; color: " + rColor + ";'>" + ((baseline || 0) * 100).toFixed(1) + "%</span>" +
            "</div>" +
            "<div style='margin-bottom: 4px; color: #666;'>" +
            "<span style='font-weight: 500;'>" + (eng ? 'Roll Calls:' : 'Votações:') + "</span> " +
            "<span style='color: #333;'>" + bar.rollCallCount + "</span>" +
            "</div>" +
            "<div style='color: #666;'>" +
            "<span style='font-weight: 500;'>" + (eng ? 'Total Votes:' : 'Total de votos:') + "</span> " +
            "<span style='color: #333;'>" + bar.totalVotes + "</span>" +
            "</div>" +
            "</div>" +
            "</div>" +
            "</div>";
    }

    function nextPaletteColor() {
        var used = comparisonGroups.map(function (g) { return g.color; });
        for (var i = 0; i < DEFAULT_PALETTE.length; i++) {
            if (used.indexOf(DEFAULT_PALETTE[i]) === -1) return DEFAULT_PALETTE[i];
        }
        return DEFAULT_PALETTE[comparisonGroups.length % DEFAULT_PALETTE.length];
    }

    function getDefaultEditorColor(role) {
        return role === 'reference' ? '#1e293b' : nextPaletteColor();
    }

    /**
     * Build a group spec from the shared editor's state. Party membership stays as
     * parties[] (attributed by the vote's own party label); only hand-picked
     * deputies go into deputyIDs[]. calcGroupRiceForRcs's union predicate handles
     * mixed groups.
     */
    function buildGroupFromEditor(editorState) {
        var deputyIDs = [];
        editorState.selectedDeputies.forEach(function (d) {
            if (deputyIDs.indexOf(d.deputyID) === -1) deputyIDs.push(d.deputyID);
        });

        var isSingleParty = (editorState.selectedParties.length === 1 && editorState.selectedDeputies.length === 0);
        var label = editorState.name;
        if (!label) {
            if (isSingleParty) {
                label = editorState.selectedParties[0];
            } else if (editorState.selectedParties.length > 0) {
                label = editorState.selectedParties.join(' + ');
            } else {
                label = editorState.selectedDeputies.length + (isEnglish() ? ' deputies' : ' deputados');
            }
        }

        return {
            parties: editorState.selectedParties.slice(),
            deputyIDs: deputyIDs,
            color: editorState.color,
            label: label
        };
    }

    function openEditor(role) {
        if (gridEl) gridEl.node().scrollTop = 0;
        openGroupEditor({
            svg: svg,
            layout: { width: width, margin: margin, outerWidth: outerWidth, outerHeight: outerHeight },
            deputies: chartData ? chartData.deputies : [],
            title: role === 'reference'
                ? (isEnglish() ? "Set Reference Group" : "Definir Grupo Referência")
                : (isEnglish() ? "Add Comparison Group" : "Adicionar Grupo de Comparação"),
            confirmLabel: role === 'reference'
                ? (isEnglish() ? "Set as Reference" : "Definir como Referência")
                : (isEnglish() ? "Add Comparison" : "Adicionar Comparação"),
            initialColor: getDefaultEditorColor(role),
            nextColor: function () { return nextPaletteColor(); },
            onSave: function (editorState) {
                var group = buildGroupFromEditor(editorState);
                if (role === 'reference') referenceGroup = group;
                else if (comparisonGroups.length < MAX_COMPARISONS) comparisonGroups.push(group);
                renderChart();
            }
        });
    }

    // Roll calls for the period, narrowed to the selected motion types (empty = all)
    function getFilteredRcs() {
        var rcs = chartData ? chartData.rcs : [];
        return selectedTypes.length
            ? rcs.filter(function (rc) { return selectedTypes.indexOf(rc.type) > -1; })
            : rcs;
    }

    // ─── Main chart function ────────────────────────────────────────
    function chart(selection) {
        selection.each(function (data) {
            var container = this;
            panelID = ($(this).parents('.panel')).attr('id');
            chartData = data;
            referenceGroup = data.referenceGroup || null;
            comparisonGroups = data.comparisonGroups || [];

            // Panel body becomes a fixed-height flex column: a sticky toolbar on
            // top and a scrollable, full-width grid below.
            var root = d3.select(container)
                .style("display", "flex")
                .style("flex-direction", "column");

            toolbarEl = root.append("div")
                .attr("class", "cbt-toolbar")
                .style("flex", "0 0 auto")
                .style("padding", "8px 12px")
                .style("border-bottom", "1px solid #e2e8f0")
                .style("background", "#ffffff")
                .style("font-family", "system-ui, -apple-system, sans-serif");

            gridEl = root.append("div")
                .attr("class", "cbt-grid")
                .style("flex", "1 1 auto")
                .style("min-height", "0")
                .style("overflow-y", "auto")
                .style("overflow-x", "hidden")
                .style("position", "relative");

            svgRoot = gridEl.append("svg")
                .attr("width", "100%")
                .attr("preserveAspectRatio", "xMinYMin meet")
                .classed("cohesion-by-theme", true);

            svg = svgRoot.append("svg:g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            // Reflow on panel resize (skip while the group editor overlay is open).
            $(container).on("resize", function () {
                if (resizeTimer) clearTimeout(resizeTimer);
                resizeTimer = setTimeout(function () {
                    if (svg && svg.select(".group-editor-overlay").empty()) renderChart();
                }, 120);
            });

            renderChart();
        });
    }

    // ─── Render orchestrator ────────────────────────────────────────
    function gridSize() {
        var node = gridEl && gridEl.node() ? gridEl.node() : null;
        return {
            w: node && node.clientWidth > 0 ? node.clientWidth : 800,
            h: node && node.clientHeight > 0 ? node.clientHeight : 600
        };
    }

    // Size the grid SVG to fill the available width. Height grows with content; the
    // grid container scrolls vertically when content is taller than the panel.
    function sizeGrid(availW, pixelHeight) {
        outerWidth = availW;
        outerHeight = pixelHeight;
        width = availW - margin.left - margin.right;
        height = pixelHeight - margin.top - margin.bottom;
        svgRoot
            .attr("height", pixelHeight + "px")
            .attr("viewBox", "0 0 " + availW + " " + pixelHeight);
        svg.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    }

    function renderChart() {
        if (!svg) return;
        svg.selectAll("*").remove();
        hideToolTip();
        renderToolbar();

        var size = gridSize();

        if (!referenceGroup || comparisonGroups.length === 0) {
            sizeGrid(size.w, size.h);
            renderEmptyState();
            return;
        }

        var themeData = computeThemeData();
        if (themeData.length === 0) {
            sizeGrid(size.w, size.h);
            renderEmptyState(true);
            return;
        }

        renderSmallMultiples(themeData, size.w, size.h);
    }

    // ─── Toolbar (reference + comparison chips) ─────────────────────
    function renderToolbar() {
        toolbarEl.selectAll("*").remove();

        var bar = toolbarEl.append("div")
            .style("display", "flex").style("flex-wrap", "wrap").style("align-items", "center")
            .style("gap", "8px 14px").style("width", "100%");

        bar.append("span")
            .style("font-size", "12px").style("font-weight", "700").style("color", "#1e293b")
            .text(isEnglish() ? "Reference:" : "Referência:");

        if (referenceGroup) {
            appendGroupChip(bar, referenceGroup, 'reference');
        } else {
            appendAddButton(bar, isEnglish() ? "Set reference group" : "Definir grupo referência", function () {
                openEditor('reference');
            });
        }

        bar.append("span")
            .style("font-size", "12px").style("font-weight", "700").style("color", "#1e293b")
            .style("margin-left", "12px")
            .text(isEnglish() ? "Compare:" : "Comparar:");

        comparisonGroups.forEach(function (g, i) {
            appendGroupChip(bar, g, 'comparison', i);
        });

        if (comparisonGroups.length < MAX_COMPARISONS) {
            appendAddButton(bar, "+ " + (isEnglish() ? "Add comparison" : "Adicionar comparação"), function () {
                openEditor('comparison');
            });
        }
    }

    function appendGroupChip(bar, group, role, index) {
        var chip = bar.append("span")
            .style("display", "inline-flex").style("align-items", "center").style("gap", "6px")
            .style("padding", "3px 8px").style("border-radius", "12px")
            .style("background", "#f8fafc").style("border", "1px solid " + (group.color || '#cbd5e1'));

        chip.append("span")
            .style("width", "10px").style("height", "10px").style("border-radius", "50%")
            .style("background", group.color || '#2563eb').style("flex-shrink", "0");

        chip.append("span")
            .style("font-size", "12px").style("color", "#374151").style("white-space", "nowrap")
            .text(group.label);

        chip.append("span")
            .style("cursor", "pointer").style("color", "#94a3b8").style("font-size", "13px").style("line-height", "1")
            .text("×")
            .on("click", function () {
                if (role === 'reference') referenceGroup = null;
                else comparisonGroups.splice(index, 1);
                renderChart();
            });
    }

    function appendAddButton(bar, label, onClick) {
        bar.append("div")
            .style("display", "inline-flex").style("align-items", "center").style("justify-content", "center")
            .style("padding", "3px 12px").style("background", "#2563eb").style("color", "#ffffff")
            .style("font-size", "12px").style("font-weight", "600").style("border-radius", "12px")
            .style("cursor", "pointer").style("white-space", "nowrap")
            .text(label)
            .on("click", onClick);
    }

    // ─── Per-theme computation ──────────────────────────────────────
    function themeDisplayName(theme) {
        return (isEnglish() && typeof subjectsToEnglish !== 'undefined' && subjectsToEnglish[theme])
            ? subjectsToEnglish[theme]
            : theme;
    }

    function groupSpec(group) {
        return { parties: (group && group.parties) || [], deputyIDs: (group && group.deputyIDs) || [] };
    }

    function unionSpec(a, b) {
        var parties = a.parties.slice();
        b.parties.forEach(function (p) { if (parties.indexOf(p) === -1) parties.push(p); });
        var deputyIDs = a.deputyIDs.slice();
        b.deputyIDs.forEach(function (id) { if (deputyIDs.indexOf(id) === -1) deputyIDs.push(id); });
        return { parties: parties, deputyIDs: deputyIDs };
    }

    function computeThemeData() {
        var rcs = getFilteredRcs();
        var rawThemes = d3.map(rcs, function (d) { return d.theme; }).keys();
        var refSpec = groupSpec(referenceGroup);

        var result = [];
        rawThemes.forEach(function (theme) {
            var display = themeDisplayName(theme);
            if (selectedThemes.length && selectedThemes.indexOf(display) === -1) return;

            var rcsT = rcs.filter(function (rc) { return rc.theme === theme; });
            var baseline = calcGroupRiceForRcs(rcsT, refSpec, RICE_CALC_CLASSIC);

            var bars = comparisonGroups.map(function (c) {
                var u = unionSpec(refSpec, groupSpec(c));
                var r = calcGroupRiceForRcs(rcsT, u, RICE_CALC_CLASSIC);
                return {
                    label: c.label, color: c.color,
                    rice: r.rice, rollCallCount: r.rollCallCount, totalVotes: r.totalVotes
                };
            });

            result.push({
                theme: display, rawTheme: theme,
                baseline: baseline.rice, baselineCount: baseline.rollCallCount,
                bars: bars
            });
        });

        result.sort(function (a, b) { return b.baseline - a.baseline; });
        return result;
    }

    function truncate(s, n) {
        if (!s) return '';
        return s.length > n ? s.slice(0, n - 1) + '…' : s;
    }

    // ─── Small multiples render ─────────────────────────────────────
    function renderSmallMultiples(themeData, availW, availH) {
        var MIN_CELL = 300;
        var headerH = 34;
        var barRowH = 24;
        var cellPadV = 16;
        var nBars = comparisonGroups.length;
        var cellH = headerH + nBars * barRowH + cellPadV;

        // Columns fill the available width and depend on the panel width, not on the
        // number of comparison groups — so the layout stays stable as groups change.
        var inner = availW - margin.left - margin.right;
        var cols = Math.max(1, Math.min(6, Math.floor(inner / MIN_CELL)));
        if (cols > themeData.length) cols = Math.max(1, themeData.length);
        var cellW = Math.floor(inner / cols);
        var rows = Math.ceil(themeData.length / cols);

        // Fill width; the grid container scrolls when content is taller than the panel.
        var contentOuterH = margin.top + rows * cellH + margin.bottom;
        sizeGrid(availW, Math.max(availH, contentOuterH));

        var labelW = 64;   // left label column inside a cell
        var valueW = 34;   // right value column inside a cell
        var barX = labelW + 8;
        var barW = Math.max(0, cellW - labelW - valueW - 16);
        var xScale = d3.scale.linear().domain([0, 1]).range([0, barW]);

        var cells = svg.selectAll(".theme-cell")
            .data(themeData)
            .enter().append("g")
            .attr("class", "theme-cell")
            .attr("transform", function (d, i) {
                var cx = (i % cols) * cellW;
                var cy = Math.floor(i / cols) * cellH;
                return "translate(" + cx + "," + cy + ")";
            });

        cells.append("text")
            .attr("x", 4).attr("y", 16)
            .style("font-size", "13px").style("font-weight", "700").style("fill", "#1e293b")
            .text(function (d) { return truncate(d.theme, 30); })
            .append("svg:title").text(function (d) { return d.theme; });

        cells.append("text")
            .attr("x", 4).attr("y", 29)
            .style("font-size", "10px").style("fill", "#94a3b8")
            .text(function (d) {
                return d.baselineCount + (isEnglish() ? " roll calls" : " votações");
            });

        cells.each(function (cell) {
            var g = d3.select(this);

            cell.bars.forEach(function (bar, j) {
                var y = headerH + j * barRowH;

                var showBarTip = (function (theme, b, refLabel, baseline, refColor) {
                    return function () { showToolTip(barTooltipHtml(theme, b, refLabel, baseline, refColor)); };
                })(cell.theme, bar, referenceGroup ? referenceGroup.label : '', cell.baseline,
                    referenceGroup ? referenceGroup.color : '#1e293b');

                g.append("text")
                    .attr("x", 4).attr("y", y + barRowH / 2 + 3)
                    .style("font-size", "10px").style("fill", "#374151")
                    .style("cursor", "default")
                    .text(truncate(bar.label, 9))
                    .on("mouseover", showBarTip)
                    .on("mousemove", moveToolTip)
                    .on("mouseout", hideToolTip);

                g.append("rect")
                    .attr("x", barX).attr("y", y + 3)
                    .attr("width", barW).attr("height", barRowH - 10)
                    .attr("fill", "#f1f5f9")
                    .style("cursor", "default")
                    .on("mouseover", showBarTip)
                    .on("mousemove", moveToolTip)
                    .on("mouseout", hideToolTip);

                g.append("rect")
                    .attr("x", barX).attr("y", y + 3)
                    .attr("width", Math.max(0, xScale(bar.rice || 0)))
                    .attr("height", barRowH - 10)
                    .attr("rx", 2)
                    .attr("fill", bar.color || "#2563eb")
                    .style("cursor", "default")
                    .on("mouseover", showBarTip)
                    .on("mousemove", moveToolTip)
                    .on("mouseout", hideToolTip);

                g.append("text")
                    .attr("x", barX + barW + 4).attr("y", y + barRowH / 2 + 3)
                    .style("font-size", "10px").style("fill", "#475569")
                    .text((bar.rice || 0).toFixed(2));
            });

            // Baseline (reference internal Rice) — dashed vertical line over the bar rows
            var baseline = cell.baseline || 0;
            var baseX = barX + xScale(baseline);
            g.append("line")
                .attr("x1", baseX).attr("x2", baseX)
                .attr("y1", headerH - 4).attr("y2", headerH + nBars * barRowH - 4)
                .attr("stroke", "#475569").attr("stroke-width", 1)
                .attr("stroke-dasharray", "3,3");

            g.append("text")
                .attr("x", baseX).attr("y", headerH - 7)
                .attr("text-anchor", "middle")
                .style("font-size", "9px").style("fill", "#475569")
                .text("ref " + baseline.toFixed(2));
        });
    }

    function renderEmptyState(noData) {
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2 - 10)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("fill", "#94a3b8")
            .text(noData
                ? (isEnglish() ? "No roll calls match the current filters" : "Nenhuma votação atende aos filtros atuais")
                : (isEnglish() ? "No groups configured yet" : "Nenhum grupo configurado ainda"));

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2 + 16)
            .attr("text-anchor", "middle")
            .attr("font-size", "13px")
            .attr("fill", "#cbd5e1")
            .text(isEnglish()
                ? "Set a reference group and add comparison groups"
                : "Defina um grupo referência e adicione grupos de comparação");
    }

    // ─── Public API ─────────────────────────────────────────────────
    chart.update = function () {
        dispatch.update();
        return chart;
    };

    chart.setMotionTypeFilter = function (types) {
        selectedTypes = types || [];
        if (svg) renderChart();
        return chart;
    };

    chart.setThemeFilter = function (themes) {
        selectedThemes = themes || [];
        if (svg) renderChart();
        return chart;
    };

    chart.margin = function (_) { if (!arguments.length) return margin; margin = _; return chart; };
    chart.width = function (_) { if (!arguments.length) return width; width = _; return chart; };
    chart.height = function (_) { if (!arguments.length) return height; height = _; return chart; };
    chart.outerWidth = function (_) { if (!arguments.length) return outerWidth; outerWidth = _; return chart; };
    chart.outerHeight = function (_) { if (!arguments.length) return outerHeight; outerHeight = _; return chart; };

    return d3.rebind(chart, dispatch, 'on');
}
