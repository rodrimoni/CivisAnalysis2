function barChart(typeChart) {
    var axisMargin = 20;
    var marginX = 150;
    var marginY = 20;
    var width = MAX_WIDTH;
    var height = MAX_HEIGHT;

    var div = d3.select(".toolTip");

    let panelID = "";

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
            // Add the checkbox for sorting
            var checkboxContainer = d3.select(this)
                .append("div")
                .attr("class", "checkbox-container")
                .attr("style", "margin-top:20px; margin-left: 20px; position: absolute");

            checkboxContainer.append("label")
                .text("Sort Alphabetically")
                .append("input")
                .attr("type", "checkbox")
                .attr("class", "sortCheckbox");

            // Store original data for sorting reference
            var originalData = data.slice();

            panelID = ($(this).parents('.panel')).attr('id');

            function render(sortedData) {
                // Clear previous chart if it exists
                d3.select("#" + panelID + " .bar-chart").remove();

                var max = d3.max(sortedData, function (d) { return d.frequency });
                var labelWidth = 0;
                var valueMargin = 2;

                var barHeight = (height - axisMargin - marginY * 2) * 0.6 / sortedData.length;
                var barPadding = (height - axisMargin - marginY * 2) * 0.4 / sortedData.length;

                var svg = d3.select(selection.node())
                    .append("svg")
                    .attr("width", "100%")
                    .attr("height", "100%")
                    .attr("viewBox", "0 0 " + width + " " + height)
                    .classed("bar-chart", true);

                var bar = svg.selectAll("g")
                    .data(sortedData)
                    .enter()
                    .append("g");

                bar.attr("class", "bar")
                    .attr("fill", function (d) { return getCategoryColor(d.category); })
                    .attr("transform", function (d, i) {
                        return "translate(" + marginX + "," + (i * (barHeight + barPadding) + barPadding) + ")";
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
                    .domain([0, max])
                    .range([0, width - marginX * 2 - labelWidth]);

                var xAxis = d3.svg.axis()
                    .scale(scale)
                    .tickSize(-height + 2 * marginY)
                    .orient("bottom");

                bar.append("rect")
                    .attr("transform", "translate(" + labelWidth + ", 0)")
                    .attr("height", barHeight)
                    .attr("width", function (d) {
                        return scale(d.frequency);
                    });

                bar.append("text")
                    .attr("class", "value")
                    .attr("y", barHeight / 2)
                    .attr("dx", labelWidth + 10)
                    .attr("dy", ".35em")
                    .attr("text-anchor", "start")
                    .text(function (d) {
                        return d.frequency;
                    })
                    .attr("x", function (d) {
                        var width = this.getBBox().width;
                        return Math.max(width + valueMargin, scale(d.frequency));
                    })
                    .style("pointer-events", "none");

                bar.on("mousemove", function (d) {
                    div.style("left", d3.event.pageX + 10 + "px");
                    div.style("top", d3.event.pageY - 25 + "px");
                    div.style("display", "inline-block");
                    div.html(getCategoryLabel(d.category) + "<br>" + d.frequency);
                });

                bar.on("mouseout", function () {
                    div.style("display", "none");
                });

                svg.insert("g", ":first-child")
                    .attr("class", "axisHorizontal")
                    .attr("transform", "translate(" + (marginX + labelWidth) + "," + (height - axisMargin - marginY) + ")")
                    .call(xAxis);
            }

            // Initial render with unsorted data
            render(data);

            // Handle checkbox change event for sorting
            d3.select("#" + panelID + " .sortCheckbox").on("change", function () {
                if (this.checked) {
                    // Sort data alphabetically
                    var sortedData = data.slice().sort(function (a, b) {
                        if (language === ENGLISH) {
                            return d3.ascending(subjectsToEnglish[a.category], subjectsToEnglish[b.category]);
                        }
                        return d3.ascending(a.category, b.category);
                    });
                    render(sortedData);
                } else {
                    // Use the original data order
                    render(originalData);
                }
            });
        });
    }

    return chart;
}
