/**
 * Party Metrics Visualization
 * Displays metrics and statistics for a specific political party
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
    NO_DATA: "Insufficient data to calculate Rice Index",
    INTERPRETATION: {
        VERY_HIGH: "Very High Cohesion",
        HIGH: "High Cohesion",
        MODERATE: "Moderate Cohesion",
        LOW: "Low Cohesion",
        VERY_LOW: "Very Low Cohesion"
    }
};

/* Gauge Configuration Constants */
const GAUGE_CONFIG = {
    WIDTH: 45,
    NUM_SECTIONS: 50,
    COLOR_DOMAIN: [0, 0.4, 0.6, 0.8, 1.0],
    COLOR_RANGE: ["#d32f2f", "#ff9800", "#fdd835", "#8bc34a", "#4caf50"],
    TICK_VALUES: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
    TICK_LENGTH: 10,
    LABEL_OFFSET: 26,
    // Arc angle domain (d3 arc coordinates): [-π/2 (left), +π/2 (right)]
    START_ARC: -Math.PI / 2,
    END_ARC: Math.PI / 2
};

/* Text Style Constants */
const TEXT_STYLES = {
    TITLE: { size: "32px", weight: "bold", color: "#333", y: 25 },
    SUBTITLE: { size: "14px", weight: "normal", color: "#666", y: 52 },
    VALUE: { size: "48px", weight: "bold", y: 70 },
    LABEL: { size: "13px", weight: "normal", color: "#666", y: 98 },
    INTERPRETATION: { size: "15px", weight: "bold", y: 120 },
    TICK: { size: "12px", weight: "bold", color: "#666" },
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

    function chart(selection) {
        selection.each(function (data) {
            panelID = ($(this).parents('.panel')).attr('id');

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

        // Clear previous content
        svg.selectAll("*").remove();

        // Render title and subtitle
        renderTitle(party, riceIndexData.overall);

        // Layout: gauge + list on the left, bars on the right
        var contentTop = 90; // leave room for title/subtitle
        var contentHeight = height - contentTop - 15;
        var leftWidth = Math.floor(width * 0.48);
        var rightWidth = width - leftWidth - 25;

        // Left column split: top = gauge, bottom = least cohesive roll calls
        var gaugeHeight = Math.floor(contentHeight * 0.50);
        var listHeight = contentHeight - gaugeHeight - 20; // spacing between

        if (riceIndexData.overall.riceAvg !== null) {
            // Gauge centered within top-left area and sized to fit
            renderGaugeChart(
                riceIndexData.overall.riceAvg,
                Math.floor(leftWidth / 2),
                contentTop + Math.floor(gaugeHeight / 2),
                leftWidth,
                gaugeHeight
            );
        } else {
            renderNoDataMessage();
        }

        // Least Cohesive Roll Calls list (bottom-left)
        renderLeastCohesiveRollCallsList({
            party: party,
            data: riceIndexData.byRollCall,
            x: 0,
            y: contentTop + gaugeHeight + 20,
            w: leftWidth,
            h: listHeight
        });

        // Themes Rice Index bar chart on the right (full height)
        renderThemesRiceBars({
            party: party,
            data: riceIndexData.byTheme,
            x: leftWidth + 20,
            y: contentTop + 30,
            w: rightWidth,
            h: contentHeight
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
     * Render a gauge chart for the Rice Index
     * @param {number} value - Value between 0 and 1
     * @param {number} centerX - X coordinate of the gauge center
     * @param {number} centerY - Y coordinate of the gauge center
     */
    function renderGaugeChart(value, centerX, centerY, areaW, areaH) {
        const gaugeRadius = Math.min(areaW || width, areaH || height) / 2.5;

        // Create a group for the gauge
        const gaugeGroup = svg.append("g")
            .attr("transform", `translate(${centerX}, ${centerY})`);

        // Define color scale for the gauge (D3 v3 syntax)
        const colorScale = createColorScale();

        // Draw gauge components
        drawGaugeBackground(gaugeGroup, gaugeRadius);
        drawGaugeSections(gaugeGroup, gaugeRadius, colorScale);
        drawValueArc(gaugeGroup, gaugeRadius, value, colorScale);
        drawTickMarks(gaugeGroup, gaugeRadius);
        drawNeedle(gaugeGroup, gaugeRadius, value);
        drawCenterElements(gaugeGroup, value, colorScale);
    }

    /**
     * Create color scale for the gauge
     * @returns {Object} D3 color scale
     */
    function createColorScale() {
        return d3.scale.linear()
            .domain(GAUGE_CONFIG.COLOR_DOMAIN)
            .range(GAUGE_CONFIG.COLOR_RANGE)
            .interpolate(d3.interpolateHcl);
    }

    /**
     * Draw gauge background arc
     * @param {Object} gaugeGroup - D3 selection for gauge group
     * @param {number} gaugeRadius - Gauge radius
     */
    function drawGaugeBackground(gaugeGroup, gaugeRadius) {
        const backgroundArc = d3.svg.arc()
            .innerRadius(gaugeRadius - GAUGE_CONFIG.WIDTH)
            .outerRadius(gaugeRadius)
            .startAngle(GAUGE_CONFIG.START_ARC)
            .endAngle(GAUGE_CONFIG.END_ARC);

        gaugeGroup.append("path")
            .attr("d", backgroundArc)
            .attr("fill", "#e0e0e0");
    }

    /**
     * Draw colored gauge sections
     * @param {Object} gaugeGroup - D3 selection for gauge group
     * @param {number} gaugeRadius - Gauge radius
     * @param {Object} colorScale - D3 color scale
     */
    function drawGaugeSections(gaugeGroup, gaugeRadius, colorScale) {
        for (let i = 0; i < GAUGE_CONFIG.NUM_SECTIONS; i++) {
            const startArc = valueToArcAngle(i / GAUGE_CONFIG.NUM_SECTIONS);
            const endArc = valueToArcAngle((i + 1) / GAUGE_CONFIG.NUM_SECTIONS);
            const sectionValue = i / GAUGE_CONFIG.NUM_SECTIONS;

            const sectionArc = d3.svg.arc()
                .innerRadius(gaugeRadius - GAUGE_CONFIG.WIDTH)
                .outerRadius(gaugeRadius)
                .startAngle(startArc)
                .endAngle(endArc);

            gaugeGroup.append("path")
                .attr("d", sectionArc)
                .attr("fill", colorScale(sectionValue))
                .attr("opacity", 0.3);
        }
    }

    /**
     * Draw value arc showing current value
     * @param {Object} gaugeGroup - D3 selection for gauge group
     * @param {number} gaugeRadius - Gauge radius
     * @param {number} value - Current value (0-1)
     * @param {Object} colorScale - D3 color scale
     */
    function drawValueArc(gaugeGroup, gaugeRadius, value, colorScale) {
        const valueArc = d3.svg.arc()
            .innerRadius(gaugeRadius - GAUGE_CONFIG.WIDTH)
            .outerRadius(gaugeRadius)
            .startAngle(GAUGE_CONFIG.START_ARC)
            .endAngle(valueToArcAngle(value));

        gaugeGroup.append("path")
            .attr("d", valueArc)
            .attr("fill", colorScale(value))
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);
    }

    /**
     * Calculate angle for tick or needle
     * @param {number} normalizedValue - Value between 0 and 1
     * @returns {number} Angle in radians
     */
    function calculateAngle(normalizedValue) {
        // Convert normalized value to arc angle, then to math angle for cos/sin
        return arcToMath(valueToArcAngle(normalizedValue));
    }

    function valueToArcAngle(normalizedValue) {
        const angleRange = GAUGE_CONFIG.END_ARC - GAUGE_CONFIG.START_ARC;
        return GAUGE_CONFIG.START_ARC + (angleRange * normalizedValue);
    }

    function arcToMath(thetaArc) { return thetaArc - Math.PI / 2; }

    function polarToCartesian(radius, angleRad) {
        return { x: Math.cos(angleRad) * radius, y: Math.sin(angleRad) * radius };
    }

    /**
     * Draw tick marks and labels
     * @param {Object} gaugeGroup - D3 selection for gauge group
     * @param {number} gaugeRadius - Gauge radius
     */
    function drawTickMarks(gaugeGroup, gaugeRadius) {
        GAUGE_CONFIG.TICK_VALUES.forEach(tick => {
            const angle = calculateAngle(tick);
            const p1 = polarToCartesian(gaugeRadius, angle);
            const p2 = polarToCartesian(gaugeRadius + GAUGE_CONFIG.TICK_LENGTH, angle);

            // Draw tick line
            gaugeGroup.append("line")
                .attr("x1", p1.x)
                .attr("y1", p1.y)
                .attr("x2", p2.x)
                .attr("y2", p2.y)
                .attr("stroke", TEXT_STYLES.TICK.color)
                .attr("stroke-width", 2);

            // Draw tick label
            const labelRadius = gaugeRadius + GAUGE_CONFIG.LABEL_OFFSET;
            const labelPoint = polarToCartesian(labelRadius, angle);

            gaugeGroup.append("text")
                .attr("x", labelPoint.x)
                .attr("y", labelPoint.y)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("font-size", TEXT_STYLES.TICK.size)
                .attr("font-weight", TEXT_STYLES.TICK.weight)
                .attr("fill", TEXT_STYLES.TICK.color)
                .text((tick * 100).toFixed(0) + "%");
        });
    }

    /**
     * Draw needle pointing to current value
     * @param {Object} gaugeGroup - D3 selection for gauge group
     * @param {number} gaugeRadius - Gauge radius
     * @param {number} value - Current value (0-1)
     */
    function drawNeedle(gaugeGroup, gaugeRadius, value) {
        const needleAngle = calculateAngle(value);
        const needleLength = gaugeRadius - GAUGE_CONFIG.WIDTH / 2;
        const needleX = Math.cos(needleAngle) * needleLength;
        const needleY = Math.sin(needleAngle) * needleLength;

        gaugeGroup.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", needleX)
            .attr("y2", needleY)
            .attr("stroke", "#333")
            .attr("stroke-width", 3)
            .attr("stroke-linecap", "round");

        // Draw center circle
        gaugeGroup.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 8)
            .attr("fill", "#333");
    }

    /**
     * Draw center text elements (value, label, interpretation)
     * @param {Object} gaugeGroup - D3 selection for gauge group
     * @param {number} value - Current value (0-1)
     * @param {Object} colorScale - D3 color scale
     */
    function drawCenterElements(gaugeGroup, value, colorScale) {
        // Display the value
        gaugeGroup.append("text")
            .attr("x", 0)
            .attr("y", TEXT_STYLES.VALUE.y)
            .attr("text-anchor", "middle")
            .attr("font-size", TEXT_STYLES.VALUE.size)
            .attr("font-weight", TEXT_STYLES.VALUE.weight)
            .attr("fill", colorScale(value))
            .text((value * 100).toFixed(1) + "%");

        // Display label
        gaugeGroup.append("text")
            .attr("x", 0)
            .attr("y", TEXT_STYLES.LABEL.y)
            .attr("text-anchor", "middle")
            .attr("font-size", TEXT_STYLES.LABEL.size)
            .attr("fill", TEXT_STYLES.LABEL.color)
            .text(UI_TEXT.SUBTITLE_COHESION);

        // Display interpretation
        const interpretation = getInterpretation(value);
        gaugeGroup.append("text")
            .attr("x", 0)
            .attr("y", TEXT_STYLES.INTERPRETATION.y)
            .attr("text-anchor", "middle")
            .attr("font-size", TEXT_STYLES.INTERPRETATION.size)
            .attr("font-weight", TEXT_STYLES.INTERPRETATION.weight)
            .attr("fill", colorScale(value))
            .text(interpretation);
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
                total: total
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
     * Render horizontal bars of Rice Index per theme (to the right of the gauge)
     */
    function renderThemesRiceBars(opts) {
        var party = opts.party;
        var data = opts.data; // Pre-calculated data
        var x0 = opts.x;
        var y0 = opts.y;
        var w = Math.max(100, opts.w);
        var h = Math.max(120, opts.h);

        if (!data || !data.length) return;

        // Scales
        var maxValue = 1; // Rice Index in [0,1]
        var leftLabelPad = 2;
        var topPad = 8;
        var bottomPad = 20;
        var innerH = h - topPad - bottomPad;

        var barHeight = Math.min(24, Math.floor(innerH / data.length) - 3);
        var barGap = Math.max(2, Math.floor((innerH - barHeight * data.length) / Math.max(1, data.length - 1)));
        if (barGap > 14) barGap = 14;

        // Determine label column width by measuring text lengths approximately
        // Fallback constant if measurement not available at this moment
        var approxCharW = 6; // px
        var maxLabelChars = d3.max(data, function (d) { return localizedTheme(d.theme).length; });
        var labelW = Math.min(260, Math.max(70, (maxLabelChars || 12) * approxCharW));

        var barAreaW = w - labelW - 20; // 20 for values pad
        if (barAreaW < 60) { barAreaW = 60; labelW = Math.max(60, w - barAreaW - 20); }

        var xScale = d3.scale.linear().domain([0, maxValue]).range([0, barAreaW]);

        var group = svg.append("g").attr("transform", "translate(" + x0 + "," + y0 + ")");

        // Title for the bar section
        group.append("text")
            .attr("x", 0)
            .attr("y", -8)
            .attr("text-anchor", "start")
            .attr("font-size", "15px")
            .attr("font-weight", "bold")
            .attr("fill", "#444")
            .text(language === ENGLISH ? "By Subject" : "Por Tema");

        var baseColor = CONGRESS_DEFINE.getPartyColor(party);

        // Axis (0% .. 100%) BEFORE bars so gridlines are behind
        var axis = d3.svg.axis()
            .scale(xScale)
            .tickValues([0, 0.2, 0.4, 0.6, 0.8, 1])
            .tickFormat(function (v) { return (v * 100).toFixed(0) + "%"; })
            .tickSize(-innerH)
            .orient("bottom");

        var axisGroup = group.append("g")
            .attr("class", "axisHorizontal")
            .attr("transform", "translate(" + (labelW + leftLabelPad) + "," + (topPad + data.length * (barHeight + barGap) + 6) + ")")
            .call(axis);

        // Match bar-chart axis styling without inheriting its fonts
        axisGroup.selectAll("path").style("fill", "none");
        axisGroup.selectAll(".tick line")
            .style("stroke-width", 1)
            .style("stroke", "rgba(0, 0, 0, 0.2)");

        var rows = group.selectAll("g.theme-row")
            .data(data)
            .enter()
            .append("g")
            .attr("class", "theme-row")
            .attr("transform", function (d, i) {
                var y = topPad + i * (barHeight + barGap);
                return "translate(0," + y + ")";
            })
            .style("cursor", "pointer");

        // Labels
        rows.append("text")
            .attr("class", "label")
            .attr("x", 0)
            .attr("y", Math.floor(barHeight / 2))
            .attr("dy", ".35em")
            .attr("text-anchor", "start")
            .attr("font-size", "12px")
            .text(function (d) { return localizedTheme(d.theme); })
            .style("fill", "#333")
            .style("pointer-events", "none");

        // Bars
        rows.append("rect")
            .attr("class", "bar")
            .attr("x", labelW + leftLabelPad)
            .attr("y", 0)
            .attr("height", barHeight)
            .attr("width", function (d) { return xScale(d.rice); })
            .style("fill", baseColor)
            .style("fill-opacity", function (d) { return 0.3 + (d.rice * 0.7); });

        // Values
        rows.append("text")
            .attr("class", "value")
            .attr("x", function (d) { return labelW + leftLabelPad + xScale(d.rice) + 4; })
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
            var html = label + "<br>" + (d.rice * 100).toFixed(1) + "%";
            div.html(html);
        }).on("mouseout", function () { div.style("display", "none"); });
    }

    /**
     * Render a clean, compact list of the 10 roll calls with the lowest Rice Index
     */
    function renderLeastCohesiveRollCallsList(opts) {
        var party = opts.party;
        var allData = opts.data; // Pre-calculated data
        var x0 = opts.x;
        var y0 = opts.y;
        var w = Math.max(180, opts.w);
        var h = Math.max(140, opts.h);

        var data = allData ? allData.slice(0, 10) : [];
        if (!data.length) return;

        var group = svg.append("g").attr("transform", "translate(" + x0 + "," + y0 + ")");

        // Section title
        group.append("text")
            .attr("x", 0)
            .attr("y", -8)
            .attr("text-anchor", "start")
            .attr("font-size", "15px")
            .attr("font-weight", "bold")
            .attr("fill", "#444")
            .text(language === ENGLISH ? "Least Cohesive Roll Calls" : "Menor Coesão – 10 Itens");

        var baseColor = CONGRESS_DEFINE.getPartyColor(party);

        var topPad = 5;
        var rowGap = 6;
        var n = data.length;
        var available = h - topPad - (n > 0 ? (rowGap * (n - 1)) : 0);
        var rowH = Math.min(32, Math.max(22, Math.floor(available / n)));
        var radius = Math.floor(rowH / 2);

        // Right-side badge width
        var badgeW = 60;
        var paddingX = 10;

        // Truncation helper by approximate char width
        var approxCharW = 7;
        function truncateLabel(text, maxPx) {
            var maxChars = Math.max(4, Math.floor(maxPx / approxCharW));
            if (text.length <= maxChars) return text;
            return text.substr(0, maxChars - 1) + '…';
        }

        var rows = group.selectAll("g.rc-row")
            .data(data)
            .enter()
            .append("g")
            .attr("class", "rc-row")
            .attr("transform", function (d, i) {
                var y = topPad + i * (rowH + rowGap);
                return "translate(0," + y + ")";
            })
            .style("cursor", "pointer");

        // Row background (subtle rounded capsule)
        rows.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("rx", Math.min(10, Math.floor(rowH / 3)))
            .attr("ry", Math.min(10, Math.floor(rowH / 3)))
            .attr("width", w)
            .attr("height", rowH)
            .style("fill", "#ffffff")
            .style("stroke", "rgba(0,0,0,0.08)")
            .style("stroke-width", 1);

        // Index pill
        var indexPillW = 22;
        rows.append("rect")
            .attr("x", paddingX)
            .attr("y", Math.floor((rowH - 18) / 2))
            .attr("rx", 9)
            .attr("ry", 9)
            .attr("width", indexPillW)
            .attr("height", 18)
            .style("fill", baseColor)
            .style("fill-opacity", 0.15)
            .style("stroke", baseColor)
            .style("stroke-opacity", 0.4)
            .style("stroke-width", 1);

        rows.append("text")
            .attr("x", paddingX + Math.floor(indexPillW / 2))
            .attr("y", Math.floor(rowH / 2))
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .style("fill", baseColor)
            .text(function (d, i) { return (i + 1); });

        // Roll call label (truncated)
        var labelStartX = paddingX + indexPillW + 10;
        var labelMaxW = Math.max(60, w - labelStartX - (badgeW + paddingX));
        rows.append("text")
            .attr("x", labelStartX)
            .attr("y", Math.floor(rowH / 2))
            .attr("dy", ".35em")
            .attr("text-anchor", "start")
            .style("fill", "#333")
            .style("font-size", "11px")
            .text(function (d) { return truncateLabel(d.label, labelMaxW); });

        // Rice badge at right
        rows.append("rect")
            .attr("x", w - badgeW - paddingX)
            .attr("y", Math.floor((rowH - 20) / 2))
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("width", badgeW)
            .attr("height", 20)
            .style("fill", baseColor)
            .style("fill-opacity", 0.12)
            .style("stroke", baseColor)
            .style("stroke-opacity", 0.35)
            .style("stroke-width", 1);

        rows.append("text")
            .attr("x", w - Math.floor(badgeW / 2) - paddingX)
            .attr("y", Math.floor(rowH / 2))
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .style("fill", baseColor)
            .text(function (d) { return (d.rice * 100).toFixed(1) + "%"; });

        // Hover tooltip with details
        var div = d3.select(".toolTip");
        rows.on("mousemove", function (d) {
            var yesLabel = language === ENGLISH ? "Yes" : "Sim";
            var noLabel = language === ENGLISH ? "No" : "Não";
            var votersLabel = language === ENGLISH ? "Voters" : "Votantes";
            var riceLabel = language === ENGLISH ? "Rice Index" : "Índice Rice";
            var html = votersLabel + ": " + d.total + "<br>" +
                yesLabel + ": " + d.yesCount + " | " + noLabel + ": " + d.noCount + "<br>" +
                riceLabel + ": " + (d.rice * 100).toFixed(1) + "%";
            div.style("left", d3.event.pageX + 10 + "px");
            div.style("top", d3.event.pageY - 25 + "px");
            div.style("display", "inline-block");
            div.html(html);
        }).on("mouseout", function () { div.style("display", "none"); });
    }

    /**
     * Get interpretation text based on value
     * @param {number} value - Value between 0 and 1
     * @returns {string} Interpretation text
     */
    function getInterpretation(value) {
        if (value >= 0.8) return UI_TEXT.INTERPRETATION.VERY_HIGH;
        if (value >= 0.6) return UI_TEXT.INTERPRETATION.HIGH;
        if (value >= 0.4) return UI_TEXT.INTERPRETATION.MODERATE;
        if (value >= 0.2) return UI_TEXT.INTERPRETATION.LOW;
        return UI_TEXT.INTERPRETATION.VERY_LOW;
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

