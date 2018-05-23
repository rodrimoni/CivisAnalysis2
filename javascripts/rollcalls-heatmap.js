function rollCallsHeatmap(){
    var    margin = {top: 120, right: 40, bottom: 20, left: 10};

    var width = 350 - margin.right - margin.left,
        height = 950 - margin.top - margin.bottom,
        buckets = 11,
        colors = ['#a50026','#d73027','#f46d43','#fdae61','#fee090','#ffffbf','#e0f3f8','#abd9e9','#74add1','#4575b4','#313695']; // RdYlBu colorbrewer scale

    function chart(selection) {
        selection.each(function (data) {
            var maxRollCallsPeriod = d3.max(data, function (d) { return d.index; });
            var itemSize = 15;
            //var gridSize = Math.floor(width / maxRollCallsPeriod),
              //  legendElementWidth = gridSize*2;

            //var periods = getUniqueValues(data, "period");

            //var periodsAsKeys = array_flip(periods);

            var x_elements = d3.set(data.map(function( rc ) { return rc.index; } )).values(),
                y_elements = d3.set(data.map(function( rc ) { return rc.period; } )).values();

            var xScale = d3.scale.ordinal()
                .domain(x_elements)
                .rangeBands([0, x_elements.length * itemSize]);

            var xAxis = d3.svg.axis()
                .scale(xScale)
                .orient("top")
                .innerTickSize(-height)
                .outerTickSize(0)
                .tickPadding(10);

            var yScale = d3.scale.ordinal()
                .domain(y_elements)
                .rangeBands([0, y_elements.length * itemSize]);

            var yAxis = d3.svg.axis()
                .scale(yScale)
                .orient("left")
                .innerTickSize(-width)
                .outerTickSize(0)
                .tickPadding(10);

            var svg =  d3.select(this)
                .append("svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", "0 0 " + width + " " + height)
                .classed("rollcalls-heatmap", true)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            /*var periodLabels = svg.selectAll(".periodLabel")
                .data(periods)
                .enter().append("text")
                .text(function (d) { return d; })
                .attr("x", 0)
                .attr("y", function (d, i) { return i * gridSize; })
                .style("text-anchor", "end")
                .attr("transform", "translate(-6," + gridSize / 1.5 + ")")
                .attr("class", "periodLabel mono axis");

            var rollCallLabels = svg.selectAll(".rollcallLabel")
                .data(function () {
                    // Returns an array with its indexes as values.
                    return Array.apply(null, {length: maxRollCallsPeriod+1 }).map(Number.call, Number)
                })
                .enter().append("text")
                .text(function(d) { return d; })
                .attr("x", function(d, i) { return i * gridSize; })
                .attr("y", 0)
                .style("text-anchor", "middle")
                .attr("transform", "translate(" + gridSize / 2 + ", -6)")
                .attr("class", "rollcallLabel mono axis axis");

            var colorScale = d3.scale.quantile()
                .domain([0, buckets - 1, d3.max(data, function (d) { return d.value; })])
                .range(colors);*/

            var colorScale = d3.scale.quantize()
                .domain([-1.0, 1.0])
                .range(d3.range(buckets).map(function(d) {  return colors[d] }));

            var cards = svg.selectAll(".rollCall")
                .data(data);

            cards.append("title");

            cards.enter().append("rect")
                .attr("x", function(d) { return xScale(d.index); })
                .attr("y", function(d) { return yScale(d.period); })
                //.attr("rx", 4)
                //.attr("ry", 4)
                .attr("class", "rollCall bordered")
                .attr("width", itemSize)
                .attr("height", itemSize)
                .style("fill", "grey");

            cards.transition().duration(1000)
                .style("fill", function(d) { return colorScale(d.value); });

            cards.select("title").text(function(d) { return d.value; });

            cards.exit().remove();

            svg.append("g")
                .attr("class", "y axis")
                .call(yAxis)
                .selectAll('text')
                .attr('font-weight', 'normal');

            svg.append("g")
                .attr("class", "x axis")
                .call(xAxis)
                .selectAll('text')
                .attr('font-weight', 'normal')
                .style("text-anchor", "start")
                .attr("dx", ".8em")
                .attr("dy", ".5em")
                .attr("transform", function (d) {
                    return "rotate(-65)";
                });

            /*var legend = svg.selectAll(".legend")
                .data([0].concat(colorScale.quantiles()), function(d) { return d; });

            legend.enter().append("g")
                .attr("class", "legend");

            legend.append("rect")
                .attr("x", function(d, i) { return legendElementWidth * i; })
                .attr("y", MAX_HEIGHT)
                .attr("width", legendElementWidth)
                .attr("height", gridSize / 2)
                .style("fill", function(d, i) { return colors[i]; });

            legend.append("text")
                .attr("class", "mono")
                .text(function(d) { return "≥ " + Math.round(d); })
                .attr("x", function(d, i) { return legendElementWidth * i; })
                .attr("y", height + gridSize);

            legend.exit().remove();*/
        });
    }
    return chart;
}