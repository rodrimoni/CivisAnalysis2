function barChart(typeChart) {
    var axisMargin = 20;
    var marginX = 150;
    var marginY = 20;
    var width = MAX_WIDTH;
    var height = MAX_HEIGHT;

    var div = d3.select(".toolTip");

    let panelID = "";

    var APPROVED_COLOR = '#313695'; // "Sim"
    var REJECTED_COLOR = '#a50026'; // "Não"

    // Approval visuals apply only to the subjects histogram; the parties bar
    // chart reuses this factory with {category, frequency} only.
    var isThemes = (typeChart === THEMES_BAR_CHART);

    const getCategoryColor = d => {
        if (typeChart === THEMES_BAR_CHART) {
            return CONGRESS_DEFINE.subjectsToColor[d];
        }
        return CONGRESS_DEFINE.getPartyColor(d);
    };

    const getCategoryLabel = d => {
        if (typeChart === THEMES_BAR_CHART) {
            return language === ENGLISH ? subjectsToEnglish[d] : d;
        }
        return d;
    };

    function chart(selection) {
        selection.each(function (data) {
            // Controls row (top-left): checkboxes with proper spacing
            var controls = d3.select(this)
                .append("div")
                .attr("class", "bar-chart-controls")
                .style("position", "absolute")
                .style("top", "14px")
                .style("left", "20px")
                .style("display", "flex")
                .style("align-items", "center")
                .style("gap", "22px")
                .style("font-size", "13px");

            function addCheckbox(cls, text) {
                var lbl = controls.append("label")
                    .style("display", "inline-flex")
                    .style("align-items", "center")
                    .style("gap", "7px")
                    .style("margin", "0")
                    .style("font-weight", "normal")
                    .style("cursor", "pointer");
                lbl.append("input").attr("type", "checkbox").attr("class", cls);
                lbl.append("span").text(text);
            }

            addCheckbox("sortCheckbox", "Sort Alphabetically");
            if (isThemes) addCheckbox("rateCheckbox", "Approval rate");

            // Legend (top-right); content is set per view mode by updateLegend()
            var legend = null;
            if (isThemes) {
                legend = d3.select(this)
                    .append("div")
                    .attr("class", "approval-legend")
                    .style("position", "absolute")
                    .style("top", "14px")
                    .style("right", "22px")
                    .style("display", "flex")
                    .style("align-items", "center")
                    .style("gap", "6px")
                    .style("font-size", "12px");
            }

            function updateLegend(rateMode) {
                if (!legend) return;
                legend.selectAll("*").remove();
                function swatch(color, op) {
                    legend.append("span")
                        .style("display", "inline-block")
                        .style("width", "11px").style("height", "11px")
                        .style("background", color).style("opacity", op)
                        .style("border-radius", "2px");
                }
                function caption(t) { legend.append("span").text(t).style("color", "#666"); }
                function label(t) { legend.append("span").text(t); }
                if (rateMode) {
                    caption("votes (n):");
                    swatch(APPROVED_COLOR, 0.35); label("few");
                    swatch(APPROVED_COLOR, 1); label("many");
                } else {
                    swatch(APPROVED_COLOR, 1); label("approved");
                    swatch(REJECTED_COLOR, 1); label("rejected");
                }
            }

            panelID = ($(this).parents('.panel')).attr('id');

            function render(sortedData) {
                // Clear previous chart if it exists
                d3.select("#" + panelID + " .bar-chart").remove();

                // Fit the viewBox height to the panel's real aspect ratio so the chart
                // fills the vertical space instead of letterboxing. Width stays at
                // MAX_WIDTH so text/label scale is unchanged; only the height adapts.
                var containerNode = selection.node();
                var cw = containerNode.clientWidth || MAX_WIDTH;
                var ch = containerNode.clientHeight || MAX_HEIGHT;
                height = Math.round(MAX_WIDTH * ch / cw);

                var rateMode = isThemes && d3.select("#" + panelID + " .rateCheckbox").property("checked") === true;
                updateLegend(rateMode);
                var max = d3.max(sortedData, function (d) { return d.frequency });
                var opacity = d3.scale.linear().domain([0, max || 1]).range([0.35, 1]);
                var labelWidth = 0;
                var topMargin = 140;                // breathing room below the controls row
                var bottomMargin = 70;              // room for the x-axis tick labels
                var valueLabelSpace = 120;          // reserved room on the right for value labels
                var axisY = height - bottomMargin;
                var bandHeight = axisY - marginY - topMargin;

                var barHeight = bandHeight * 0.6 / sortedData.length;
                var barPadding = bandHeight * 0.4 / sortedData.length;

                var svg = d3.select(selection.node())
                    .append("svg")
                    .attr("width", "100%")
                    .attr("height", "100%")
                    .attr("viewBox", "0 0 " + width + " " + height)
                    .attr("preserveAspectRatio", "xMidYMin meet")
                    .classed("bar-chart", true);

                var bar = svg.selectAll("g.bar")
                    .data(sortedData)
                    .enter()
                    .append("g");

                bar.attr("class", "bar")
                    .attr("transform", function (d, i) {
                        return "translate(" + marginX + "," + (topMargin + i * (barHeight + barPadding) + barPadding) + ")";
                    });

                bar.append("text")
                    .attr("class", "label")
                    .attr("y", barHeight / 2)
                    .attr("dy", ".35em")
                    .text(function (d) {
                        return getCategoryLabel(d.category);
                    }).each(function () {
                        labelWidth = Math.ceil(Math.max(labelWidth, this.getBBox().width));
                    })
                    .style("pointer-events", "none");

                var scale = d3.scale.linear()
                    .domain(rateMode ? [0, 1] : [0, max])
                    .range([0, width - marginX * 2 - labelWidth - valueLabelSpace]);

                var xAxis = d3.svg.axis()
                    .scale(scale)
                    .tickSize(-(axisY - topMargin))
                    .orient("bottom");
                if (rateMode) xAxis.tickFormat(d3.format(".0%"));

                if (rateMode) {
                    // approval-rate bar, opacity proportional to volume
                    bar.append("rect")
                        .attr("transform", "translate(" + labelWidth + ", 0)")
                        .attr("height", barHeight)
                        .attr("width", function (d) { return scale(d.rate); })
                        .attr("fill", APPROVED_COLOR)
                        .attr("opacity", function (d) { return opacity(d.frequency); });
                } else if (isThemes) {
                    // count mode: stacked approved + rejected
                    bar.append("rect")
                        .attr("transform", "translate(" + labelWidth + ", 0)")
                        .attr("height", barHeight)
                        .attr("width", function (d) { return scale(d.approved); })
                        .attr("fill", APPROVED_COLOR);
                    bar.append("rect")
                        .attr("transform", function (d) { return "translate(" + (labelWidth + scale(d.approved)) + ", 0)"; })
                        .attr("height", barHeight)
                        .attr("width", function (d) { return scale(d.rejected); })
                        .attr("fill", REJECTED_COLOR);
                } else {
                    // parties (non-themes) bar chart: single bar colored by category
                    bar.append("rect")
                        .attr("transform", "translate(" + labelWidth + ", 0)")
                        .attr("height", barHeight)
                        .attr("width", function (d) { return scale(d.frequency); })
                        .attr("fill", function (d) { return getCategoryColor(d.category); });
                }

                bar.append("text")
                    .attr("class", "value")
                    .attr("y", barHeight / 2)
                    .attr("dy", ".35em")
                    .attr("text-anchor", "start")
                    .text(function (d) {
                        return rateMode ? (Math.round(d.rate * 100) + "%  n=" + d.frequency) : d.frequency;
                    })
                    .attr("x", function (d) {
                        return labelWidth + scale(rateMode ? d.rate : d.frequency) + 6;
                    })
                    .style("pointer-events", "none");

                bar.on("mousemove", function (d) {
                    var pct = d.frequency ? Math.round(100 * d.approved / d.frequency) : 0;
                    div.style("left", d3.event.pageX + 10 + "px");
                    div.style("top", d3.event.pageY - 25 + "px");
                    div.style("display", "inline-block");
                    var subject = "<strong>" + getCategoryLabel(d.category) + "</strong>";
                    var html;
                    if (rateMode) html = subject + "<br>" + pct + "% approved · n=" + d.frequency;
                    else if (isThemes) html = subject + "<br>" + d.frequency + " total · " + d.approved + " approved (" + pct + "%)";
                    else html = subject + "<br>" + d.frequency;
                    div.html(html);
                });

                bar.on("mouseout", function () {
                    div.style("display", "none");
                });

                svg.insert("g", ":first-child")
                    .attr("class", "axisHorizontal")
                    .attr("transform", "translate(" + (marginX + labelWidth) + "," + axisY + ")")
                    .call(xAxis);
            }

            // Compute the data order for the current checkbox state.
            function getSortedData() {
                var alpha = d3.select("#" + panelID + " .sortCheckbox").property("checked");
                var rate = isThemes && d3.select("#" + panelID + " .rateCheckbox").property("checked") === true;
                var arr = data.slice();

                if (isThemes) arr.forEach(function (d) { d.rate = d.frequency ? d.approved / d.frequency : 0; });

                if (alpha) {
                    arr.sort(function (a, b) {
                        if (language === ENGLISH && typeChart === THEMES_BAR_CHART) {
                            return d3.ascending(subjectsToEnglish[a.category], subjectsToEnglish[b.category]);
                        }
                        return d3.ascending(a.category, b.category);
                    });
                } else if (rate) {
                    arr.sort(function (a, b) { return d3.descending(a.rate, b.rate); });
                } else {
                    arr.sort(function (a, b) { return b.frequency - a.frequency; });
                }
                return arr;
            }

            function rerender() { render(getSortedData()); }

            // Initial render
            rerender();

            d3.select("#" + panelID + " .sortCheckbox").on("change", rerender);
            d3.select("#" + panelID + " .rateCheckbox").on("change", rerender);
        });
    }

    return chart;
}
