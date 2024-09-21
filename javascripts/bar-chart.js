function barChart(typeChart) {
    var axisMargin = 20;
    var marginX = 150;
    var marginY = 20;
    var width = MAX_WIDTH;
    var height = MAX_HEIGHT;

    const numberOfCategories = 10

    var div = d3.select(".toolTip");

    const getCategoryColor = d => {
        if (typeChart === THEMES_BAR_CHART) {
            return CONGRESS_DEFINE.subjectsToColor[d]
        }

        return CONGRESS_DEFINE.getPartyColor(d);
    }

    const getCategoryLabel = d => {
        if (typeChart === THEMES_BAR_CHART) {
            return language === ENGLISH ? subjectsToEnglish[d] : d
        }

        return d;
    }

    const getChartTitle = () => {
        return typeChart === THEMES_BAR_CHART ? 'Most Discussed Subjects' : 'Largest Political Parties';
    }

    function chart(selection) {
        selection.each(function (data) {
            data = data.slice(0, numberOfCategories); // pegar somente um determinado numero de categorias

            var max = d3.max(data, function (d) { return d.frequency });
            var labelWidth = 0;
            var valueMargin = 2;

            var barHeight = (height - axisMargin - marginY * 2) * 0.4 / data.length,
                barPadding = (height - axisMargin - marginY * 2) * 0.6 / data.length;

            var svg = d3.select(this)
                .append("svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", "0 0 " + width + " " + height)
                .classed("bar-chart", true);

            // Add title to the chart
            svg.append("text")
                .attr("x", width / 2)   // Center the title
                .attr("y", -100)  // Position slightly below the top margin
                .attr("text-anchor", "middle")
                .style("font-size", "35px")  // Adjust the font size as needed
                .style("font-weight", "bold")
                .text(getChartTitle);  // Set the chart title

            var bar = svg.selectAll("g")
                .data(data)
                .enter()
                .append("g");

            bar.attr("class", "bar")
                .attr("cx", 0)
                .attr("fill", function (d) { return getCategoryColor(d.category); })
                .attr("transform", function (d, i) {
                    return "translate(" + marginX + "," + (i * (barHeight + barPadding) + barPadding) + ")";
                });

            bar.append("text")
                .attr("class", "label")
                .attr("y", barHeight / 2)
                .attr("dy", ".35em") //vertical align middle
                .text(function (d) {
                    return getCategoryLabel(d.category);
                }).each(function () {
                    labelWidth = Math.ceil(Math.max(labelWidth, this.getBBox().width));
                })
                .style("pointer-events", "none");  // Disable pointer events for text;

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
                .attr("dx", labelWidth + 10) //margin right
                .attr("dy", ".35em") //vertical align middle
                .attr("text-anchor", "start")
                .text(function (d) {
                    return d.frequency
                })
                .attr("x", function (d) {
                    var width = this.getBBox().width;
                    return Math.max(width + valueMargin, scale(d.frequency));
                })
                .style("pointer-events", "none");  // Disable pointer events for text;

            bar
                .on("mousemove", function (d) {
                    div.style("left", d3.event.pageX + 10 + "px");
                    div.style("top", d3.event.pageY - 25 + "px");
                    div.style("display", "inline-block");
                    div.html(getCategoryLabel(d.category) + "<br>" + d.frequency);
                });
            bar
                .on("mouseout", function () {
                    div.style("display", "none");
                });

            svg.insert("g", ":first-child")
                .attr("class", "axisHorizontal")
                .attr("transform", "translate(" + (marginX + labelWidth) + "," + (height - axisMargin - marginY) + ")")
                .call(xAxis);

        });
    }

    return chart;
}