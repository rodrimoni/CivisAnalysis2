/**
 * Party Metrics Visualization - Main Coordinator
 * Orchestrates the display of metrics and statistics for a specific political party
 * 
 * Dependencies:
 * - gauge-chart.js: Renders the Rice Index gauge
 * - roll-calls-list.js: Renders the list of least cohesive roll calls
 * - bar-chart-tabs.js: Renders the tabbed bar charts (Theme Rice / Deputy Alignment)
 */

/* Rice Index Calculation Types */
const RICE_INDEX_CLASSIC = 0;  // Only considers Yes/No
const RICE_INDEX_BRAZIL = 1;   // Considers Yes/No/Obstruction

/* UI Text Constants */
const UI_TEXT = {
    TITLE: "Rice Index",
    SUBTITLE_COHESION: "Party Cohesion",
    SUBTITLE_ROLL_CALLS: "roll calls",
    SUBTITLE_VOTES_COUNTED: "votes counted",
    NO_DATA: "Insufficient data to calculate Rice Index"
};

/* Text Style Constants */
const TEXT_STYLES = {
    TITLE: { size: "32px", weight: "bold", color: "#333", y: 25 },
    SUBTITLE: { size: "14px", weight: "normal", color: "#666", y: 52 },
    NO_DATA: { size: "16px", weight: "normal", color: "#999" }
};

function partyMetrics() {
    var margin = { top: 15, right: 30, bottom: 25, left: 30 },
        outerWidth = 1080,
        outerHeight = 720,
        width = outerWidth - margin.left - margin.right,
        height = outerHeight - margin.top - margin.bottom;

    var svg;
    var panelID;
    var dispatch = d3.dispatch('update');
    var currentBarChartMode = 'themeRice'; // 'themeRice' or 'deputyAlignment'
    var selectedTheme = null; // Currently selected theme for filtering
    var currentData = null; // Store current data for re-rendering

    function chart(selection) {
        selection.each(function (data) {
            panelID = ($(this).parents('.panel')).attr('id');
            currentData = data; // Store data for theme selection

            // Create main SVG container
            svg = d3.select(this)
                .append("svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", "0 0 " + "1080" + " " + "720")
                .classed("party-metrics", true)
                .append("svg:g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            // Add background rect
            svg.append("rect")
                .attr("width", width)
                .attr("height", height)
                .attr("fill", "#f9f9f9");

            // Render the visualization
            renderPartyMetrics(data);
        });
    }

    /**
     * Render the party metrics visualization
     * @param {Object} data - Data containing party information
     */
    function renderPartyMetrics(data) {
        const { party, deputies, rcs } = data;

        // Calculate all Rice Index data in a single pass
        const riceIndexData = calcRiceIndex(rcs, party);

        // Calculate filtered Rice Index if theme is selected
        let displayRiceIndex = riceIndexData.overall;
        if (selectedTheme) {
            // Filter roll calls by selected theme
            const filteredRcs = rcs.filter(function (rc) {
                return rc.theme === selectedTheme;
            });
            const filteredRiceData = calcRiceIndex(filteredRcs, party);
            displayRiceIndex = filteredRiceData.overall;
        }

        // Clear previous content
        svg.selectAll("*").remove();

        // Render title and subtitle
        renderTitle(party, displayRiceIndex);

        // Layout: gauge + list on the left, bars on the right
        var contentTop = 90; // leave room for title/subtitle
        var contentHeight = height - contentTop - 15;
        var leftWidth = Math.floor(width * 0.48);
        var rightWidth = width - leftWidth - 25;

        // Left column split: top = gauge, bottom = least cohesive roll calls
        var gaugeHeight = Math.floor(contentHeight * 0.50);
        var listHeight = contentHeight - gaugeHeight - 20; // spacing between

        if (displayRiceIndex.riceAvg !== null) {
            // Render gauge using GaugeChart module
            GaugeChart.render(
                svg,
                displayRiceIndex.riceAvg,
                Math.floor(leftWidth / 2),
                contentTop + Math.floor(gaugeHeight / 2),
                leftWidth,
                gaugeHeight
            );
        } else {
            renderNoDataMessage();
        }

        // Render least cohesive roll calls list using RollCallsList module
        RollCallsList.render(svg, {
            party: party,
            data: riceIndexData.byRollCall,
            x: 0,
            y: contentTop + gaugeHeight + 20,
            w: leftWidth,
            h: listHeight,
            selectedTheme: selectedTheme // Pass selected theme for filtering
        });

        // Render right side bar chart with tabs using BarChartTabs module
        BarChartTabs.render(svg, {
            party: party,
            deputies: deputies,
            riceData: riceIndexData.byTheme,
            x: leftWidth + 20,
            y: contentTop,
            w: rightWidth,
            h: contentHeight,
            currentMode: currentBarChartMode,
            selectedTheme: selectedTheme,
            onModeChange: function (mode) {
                switchBarChartMode(mode, party, deputies, riceIndexData.byTheme, riceIndexData.byRollCall, leftWidth + 20, contentTop, rightWidth, contentHeight, listHeight);
            },
            onThemeClick: function (theme) {
                handleThemeClick(theme);
            }
        });
    }

    /**
     * Render the title and subtitle
     * @param {string} party - Party name
     * @param {Object} riceIndexResult - Rice index calculation result
     */
    function renderTitle(party, riceIndexResult) {
        // Get party color
        var partyColor = CONGRESS_DEFINE.getPartyColor(party);

        // Create title with party name in party color
        var titleText = svg.append("text")
            .attr("x", width / 2)
            .attr("y", TEXT_STYLES.TITLE.y)
            .attr("text-anchor", "middle")
            .attr("font-size", TEXT_STYLES.TITLE.size)
            .attr("font-weight", TEXT_STYLES.TITLE.weight);

        titleText.append("tspan")
            .attr("fill", partyColor)
            .text(party);

        // Create subtitle with metadata
        const subtitleText = UI_TEXT.SUBTITLE_COHESION + " | " +
            riceIndexResult.totalRollCalls + " " + UI_TEXT.SUBTITLE_ROLL_CALLS + " | " +
            riceIndexResult.totalVotesCounted + " " + UI_TEXT.SUBTITLE_VOTES_COUNTED;

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", TEXT_STYLES.SUBTITLE.y)
            .attr("text-anchor", "middle")
            .attr("font-size", TEXT_STYLES.SUBTITLE.size)
            .attr("fill", TEXT_STYLES.SUBTITLE.color)
            .text(subtitleText);
    }

    /**
     * Render no data message
     */
    function renderNoDataMessage() {
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", TEXT_STYLES.NO_DATA.size)
            .attr("fill", TEXT_STYLES.NO_DATA.color)
            .text(UI_TEXT.NO_DATA);
    }

    /**
     * Calculate all Rice Index metrics in a single pass through roll calls
     * Returns an object with overall average, by theme, and by roll call data
     * 
     * @param {Array} rcs - Roll call votes array
     * @param {string} party - Party name
     * @param {number} type - Calculation type (RICE_INDEX_CLASSIC or RICE_INDEX_BRAZIL)
     * @returns {Object} { overall, byTheme, byRollCall }
     */
    function calcRiceIndex(rcs, party, type = RICE_INDEX_BRAZIL) {
        if (!rcs || !rcs.length) {
            return {
                overall: { party, riceAvg: null, totalRollCalls: 0, totalVotesCounted: 0, calculationType: type === RICE_INDEX_CLASSIC ? 'CLASSIC' : 'BRAZIL' },
                byTheme: [],
                byRollCall: []
            };
        }

        // Accumulators for all three calculations
        let overallWeightedSum = 0;
        let overallTotalVotes = 0;
        let overallValidRollCalls = 0;

        var themeAgg = {};
        var byRollCallData = [];

        // Single iteration through all roll calls
        rcs.forEach(function (rc) {
            if (!rc || !rc.votes) return;

            var partyVotes = rc.votes.filter(function (v) { return v.party === party; });

            // Calculate valid votes based on type
            var validVotes, S, N;
            if (type === RICE_INDEX_CLASSIC) {
                validVotes = partyVotes.filter(function (v) { return v.vote === 'Sim' || v.vote === 'Não'; });
                S = validVotes.filter(function (v) { return v.vote === 'Sim'; }).length;
                N = validVotes.filter(function (v) { return v.vote === 'Não'; }).length;
            } else {
                validVotes = partyVotes.filter(function (v) { return v.vote === 'Sim' || v.vote === 'Não' || v.vote === 'Obstrução'; });
                S = validVotes.filter(function (v) { return v.vote === 'Sim'; }).length;
                N = validVotes.filter(function (v) { return v.vote === 'Não' || v.vote === 'Obstrução'; }).length;
            }

            var total = S + N;
            if (total === 0) return;

            var rice = Math.abs(S - N) / total;

            // 1. Accumulate for overall average
            overallWeightedSum += rice * total;
            overallTotalVotes += total;
            overallValidRollCalls++;

            // 2. Accumulate for theme aggregation
            var theme = rc.theme;
            if (theme) {
                if (!themeAgg[theme]) {
                    themeAgg[theme] = { weightedSum: 0, totalVotes: 0, totalValidRollCalls: 0 };
                }
                themeAgg[theme].weightedSum += rice * total;
                themeAgg[theme].totalVotes += total;
                themeAgg[theme].totalValidRollCalls += 1;
            }

            // 3. Collect individual roll call data
            var label = (rc.rollCallName) ? rc.rollCallName :
                (rc.type && rc.number && rc.year) ? (rc.type + " " + rc.number + " " + rc.year) :
                    (rc.rollCallID != null ? ("#" + rc.rollCallID) : "Roll Call");

            // Append theme in parentheses if available and not already the main label
            if (theme && label !== localizedTheme(theme)) {
                label += " (" + localizedTheme(theme) + ")";
            }

            byRollCallData.push({
                rc: rc,
                label: label,
                rice: rice,
                yesCount: S,
                noCount: N,
                total: total,
                theme: theme // Store theme for filtering
            });
        });

        // Process overall data
        const riceAvg = overallTotalVotes > 0 ? overallWeightedSum / overallTotalVotes : null;
        const overall = {
            party,
            riceAvg,
            totalRollCalls: overallValidRollCalls,
            totalVotesCounted: overallTotalVotes,
            calculationType: type === RICE_INDEX_CLASSIC ? 'CLASSIC' : 'BRAZIL'
        };

        // Process theme data
        var byTheme = [];
        for (var theme in themeAgg) {
            var agg = themeAgg[theme];
            if (agg.totalVotes > 0) {
                byTheme.push({
                    theme: theme,
                    rice: agg.weightedSum / agg.totalVotes,
                    totalVotes: agg.totalVotes,
                    totalValidRollCalls: agg.totalValidRollCalls
                });
            }
        }
        // Sort by rice descending
        byTheme.sort(function (a, b) { return d3.descending(a.rice, b.rice); });

        // Sort roll call data by rice ascending (least cohesive first)
        byRollCallData.sort(function (a, b) {
            if (a.rice !== b.rice) return d3.ascending(a.rice, b.rice);
            return d3.descending(a.total, b.total);
        });

        return {
            overall: overall,
            byTheme: byTheme,
            byRollCall: byRollCallData
        };
    }

    function localizedTheme(theme) {
        if (typeof subjectsToEnglish !== 'undefined' && language === ENGLISH && subjectsToEnglish[theme]) {
            return subjectsToEnglish[theme];
        }
        return theme;
    }

    /**
     * Handle theme click - toggle selection and update visualization
     */
    function handleThemeClick(theme) {
        // Toggle theme selection (click again to deselect)
        selectedTheme = (selectedTheme === theme) ? null : theme;

        // Re-render the entire visualization with the new selection
        renderPartyMetrics(currentData);
    }

    /**
     * Switch between Theme Rice Index and Deputy Alignment views
     */
    function switchBarChartMode(mode, party, deputies, riceData, rollCallData, x0, y0, w, h, listHeight) {
        if (mode === currentBarChartMode) return;

        currentBarChartMode = mode;

        // Remove old chart container and re-render
        svg.selectAll(".right-bar-chart-container").remove();

        // Re-render with new mode using BarChartTabs module
        BarChartTabs.render(svg, {
            party: party,
            deputies: deputies,
            riceData: riceData,
            x: x0,
            y: y0,
            w: w,
            h: h,
            currentMode: currentBarChartMode,
            selectedTheme: selectedTheme,
            onModeChange: function (newMode) {
                switchBarChartMode(newMode, party, deputies, riceData, rollCallData, x0, y0, w, h, listHeight);
            },
            onThemeClick: function (theme) {
                handleThemeClick(theme);
            }
        });
    }

    /**
     * Update the visualization
     */
    chart.update = function () {
        // TODO: Implement update logic
        dispatch.update();
    };

    /**
     * Get/set margin
     */
    chart.margin = function (_) {
        if (!arguments.length) return margin;
        margin = _;
        return chart;
    };

    /**
     * Get/set width
     */
    chart.width = function (_) {
        if (!arguments.length) return width;
        width = _;
        return chart;
    };

    /**
     * Get/set height
     */
    chart.height = function (_) {
        if (!arguments.length) return height;
        height = _;
        return chart;
    };

    /**
     * Get/set outer width
     */
    chart.outerWidth = function (_) {
        if (!arguments.length) return outerWidth;
        outerWidth = _;
        return chart;
    };

    /**
     * Get/set outer height
     */
    chart.outerHeight = function (_) {
        if (!arguments.length) return outerHeight;
        outerHeight = _;
        return chart;
    };

    return d3.rebind(chart, dispatch, 'on');
}

