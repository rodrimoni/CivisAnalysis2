/**
 * Gauge Chart Module
 * Renders a semicircular gauge chart for displaying Rice Index values
 */

(function (global) {
    'use strict';

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
        VALUE: { size: "48px", weight: "bold", y: 70 },
        LABEL: { size: "13px", weight: "normal", color: "#666", y: 98 },
        INTERPRETATION: { size: "15px", weight: "bold", y: 120 },
        TICK: { size: "12px", weight: "bold", color: "#666" }
    };

    /* UI Text Constants */
    const UI_TEXT = {
        SUBTITLE_COHESION: "Party Cohesion",
        INTERPRETATION: {
            VERY_HIGH: "Very High Cohesion",
            HIGH: "High Cohesion",
            MODERATE: "Moderate Cohesion",
            LOW: "Low Cohesion",
            VERY_LOW: "Very Low Cohesion"
        }
    };

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
     * Convert normalized value to arc angle
     * @param {number} normalizedValue - Value between 0 and 1
     * @returns {number} Arc angle in radians
     */
    function valueToArcAngle(normalizedValue) {
        const angleRange = GAUGE_CONFIG.END_ARC - GAUGE_CONFIG.START_ARC;
        return GAUGE_CONFIG.START_ARC + (angleRange * normalizedValue);
    }

    /**
     * Convert arc angle to mathematical angle for cos/sin calculations
     * @param {number} thetaArc - Arc angle
     * @returns {number} Mathematical angle
     */
    function arcToMath(thetaArc) {
        return thetaArc - Math.PI / 2;
    }

    /**
     * Calculate angle for tick or needle
     * @param {number} normalizedValue - Value between 0 and 1
     * @returns {number} Angle in radians
     */
    function calculateAngle(normalizedValue) {
        return arcToMath(valueToArcAngle(normalizedValue));
    }

    /**
     * Convert polar coordinates to Cartesian
     * @param {number} radius - Radius
     * @param {number} angleRad - Angle in radians
     * @returns {Object} {x, y} coordinates
     */
    function polarToCartesian(radius, angleRad) {
        return { x: Math.cos(angleRad) * radius, y: Math.sin(angleRad) * radius };
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
     * Render a gauge chart for the Rice Index
     * @param {Object} svgSelection - D3 selection where to append the gauge
     * @param {number} value - Value between 0 and 1
     * @param {number} centerX - X coordinate of the gauge center
     * @param {number} centerY - Y coordinate of the gauge center
     * @param {number} areaW - Available width for the gauge
     * @param {number} areaH - Available height for the gauge
     */
    function renderGaugeChart(svgSelection, value, centerX, centerY, areaW, areaH) {
        const gaugeRadius = Math.min(areaW, areaH) / 2.5;

        // Create a group for the gauge
        const gaugeGroup = svgSelection.append("g")
            .attr("transform", `translate(${centerX}, ${centerY})`);

        // Define color scale for the gauge
        const colorScale = createColorScale();

        // Draw gauge components
        drawGaugeBackground(gaugeGroup, gaugeRadius);
        drawGaugeSections(gaugeGroup, gaugeRadius, colorScale);
        drawValueArc(gaugeGroup, gaugeRadius, value, colorScale);
        drawTickMarks(gaugeGroup, gaugeRadius);
        drawNeedle(gaugeGroup, gaugeRadius, value);
        drawCenterElements(gaugeGroup, value, colorScale);
    }

    // Export to global scope
    global.GaugeChart = {
        render: renderGaugeChart
    };

})(window);

