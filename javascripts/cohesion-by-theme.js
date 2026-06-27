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
        svgRoot.attr("viewBox", "0 0 " + outerWidth + " " + outerHeight);
        svg.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        renderToolbar();

        if (!referenceGroup || comparisonGroups.length === 0) {
            renderEmptyState();
            return;
        }

        // Placeholder until small multiples are added (Task 5)
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .attr("fill", "#64748b")
            .text(comparisonGroups.length + " comparison group(s) vs " + referenceGroup.label);
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
