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
        margin = { top: 96, right: 20, bottom: 20, left: 20 },
        width = outerWidth - margin.left - margin.right,
        height = outerHeight - margin.top - margin.bottom;

    var svgRoot, svg, panelID;
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
            panelID = ($(this).parents('.panel')).attr('id');
            chartData = data;
            referenceGroup = data.referenceGroup || null;
            comparisonGroups = data.comparisonGroups || [];

            svgRoot = d3.select(this)
                .append("svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("preserveAspectRatio", "xMinYMin meet")
                .attr("viewBox", "0 0 " + outerWidth + " " + outerHeight)
                .classed("cohesion-by-theme", true);

            svg = svgRoot.append("svg:g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            renderChart();
        });
    }

    // ─── Render orchestrator ────────────────────────────────────────
    function renderChart() {
        if (!svg) return;
        svg.selectAll("*").remove();
        svg.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        renderToolbar();

        if (!referenceGroup || comparisonGroups.length === 0) {
            svgRoot.attr("viewBox", "0 0 " + outerWidth + " " + outerHeight);
            renderEmptyState();
            return;
        }

        var themeData = computeThemeData();
        if (themeData.length === 0) {
            svgRoot.attr("viewBox", "0 0 " + outerWidth + " " + outerHeight);
            renderEmptyState(true);
            return;
        }

        var totalHeight = renderSmallMultiples(themeData);
        svgRoot.attr("viewBox", "0 0 " + outerWidth + " " + Math.max(outerHeight, totalHeight));
    }

    // ─── Toolbar (reference + comparison chips) ─────────────────────
    function renderToolbar() {
        var fo = svg.append("foreignObject")
            .attr("x", 0)
            .attr("y", -(margin.top - 12))
            .attr("width", width)
            .attr("height", margin.top - 20);

        var bar = fo.append("xhtml:div")
            .style("display", "flex").style("flex-wrap", "wrap").style("align-items", "center")
            .style("gap", "8px 14px").style("width", "100%")
            .style("font-family", "system-ui, -apple-system, sans-serif");

        bar.append("xhtml:span")
            .style("font-size", "12px").style("font-weight", "700").style("color", "#1e293b")
            .text(isEnglish() ? "Reference:" : "Referência:");

        if (referenceGroup) {
            appendGroupChip(bar, referenceGroup, 'reference');
        } else {
            appendAddButton(bar, isEnglish() ? "Set reference group" : "Definir grupo referência", function () {
                openEditor('reference');
            });
        }

        bar.append("xhtml:span")
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
        var chip = bar.append("xhtml:span")
            .style("display", "inline-flex").style("align-items", "center").style("gap", "6px")
            .style("padding", "3px 8px").style("border-radius", "12px")
            .style("background", "#f8fafc").style("border", "1px solid " + (group.color || '#cbd5e1'));

        chip.append("xhtml:span")
            .style("width", "10px").style("height", "10px").style("border-radius", "50%")
            .style("background", group.color || '#2563eb').style("flex-shrink", "0");

        chip.append("xhtml:span")
            .style("font-size", "12px").style("color", "#374151").style("white-space", "nowrap")
            .text(group.label);

        chip.append("xhtml:span")
            .style("cursor", "pointer").style("color", "#94a3b8").style("font-size", "13px").style("line-height", "1")
            .text("×")
            .on("click", function () {
                if (role === 'reference') referenceGroup = null;
                else comparisonGroups.splice(index, 1);
                renderChart();
            });
    }

    function appendAddButton(bar, label, onClick) {
        bar.append("xhtml:div")
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
    function renderSmallMultiples(themeData) {
        var cols = Math.max(1, Math.min(3, Math.floor(width / 320)));
        var cellW = width / cols;
        var headerH = 34;
        var barRowH = 24;
        var cellPadV = 16;
        var nBars = comparisonGroups.length;
        var cellH = headerH + nBars * barRowH + cellPadV;
        var rows = Math.ceil(themeData.length / cols);

        var labelW = 64;   // left label column inside a cell
        var valueW = 34;   // right value column inside a cell
        var barX = labelW + 8;
        var barW = cellW - labelW - valueW - 16;
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

                g.append("text")
                    .attr("x", 4).attr("y", y + barRowH / 2 + 3)
                    .style("font-size", "10px").style("fill", "#374151")
                    .text(truncate(bar.label, 9))
                    .append("svg:title").text(bar.label);

                g.append("rect")
                    .attr("x", barX).attr("y", y + 3)
                    .attr("width", barW).attr("height", barRowH - 10)
                    .attr("fill", "#f1f5f9");

                var rect = g.append("rect")
                    .attr("x", barX).attr("y", y + 3)
                    .attr("width", Math.max(0, xScale(bar.rice || 0)))
                    .attr("height", barRowH - 10)
                    .attr("rx", 2)
                    .attr("fill", bar.color || "#2563eb");

                rect.append("svg:title").text(
                    bar.label + " — Rice " + (bar.rice || 0).toFixed(3) +
                    " | " + bar.rollCallCount + (isEnglish() ? " roll calls | " : " votações | ") +
                    bar.totalVotes + (isEnglish() ? " votes" : " votos"));

                g.append("text")
                    .attr("x", barX + barW + 4).attr("y", y + barRowH / 2 + 3)
                    .style("font-size", "10px").style("fill", "#475569")
                    .text((bar.rice || 0).toFixed(2));
            });

            // Baseline (reference internal Rice) — dashed vertical line over the bar rows
            var baseX = barX + xScale(cell.baseline);
            g.append("line")
                .attr("x1", baseX).attr("x2", baseX)
                .attr("y1", headerH - 4).attr("y2", headerH + nBars * barRowH - 4)
                .attr("stroke", "#475569").attr("stroke-width", 1)
                .attr("stroke-dasharray", "3,3");

            g.append("text")
                .attr("x", baseX).attr("y", headerH - 7)
                .attr("text-anchor", "middle")
                .style("font-size", "9px").style("fill", "#475569")
                .text("ref " + cell.baseline.toFixed(2));
        });

        return margin.top + rows * cellH + margin.bottom;
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
