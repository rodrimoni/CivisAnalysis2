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
        renderEmptyState();
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
