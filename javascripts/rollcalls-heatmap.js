function rollCallsHeatmap(){


    var outerWidth = MAX_WIDTH,
        outerHeight = MAX_HEIGHT;
    margin = {top: 60, right: 0, bottom: 20, left: 20};

    var legendHeight = 60;

    var width = 750 - margin.right - margin.left,
        height = 750 - margin.top - margin.bottom - legendHeight,
        buckets = 11,
        colors = ['#a50026','#d73027','#f46d43','#fdae61','#fee090','#ffffbf','#e0f3f8','#abd9e9','#74add1','#4575b4','#313695']; // RdYlBu colorbrewer scale

    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    function chart(selection) {
        selection.each(function (data) {
            //var maxRollCallsPeriod = d3.max(data, function (d) { return d.index; });
            //var itemSize = 15;
              //  legendElementWidth = gridSize*2;

            //var periods = getUniqueValues(data, "period");

            //var periodsAsKeys = array_flip(periods);

            var x_elements = d3.set(data.map(function( rc ) { return rc.index; } )).values(),
                y_elements = d3.set(data.map(function( rc ) { return rc.period; } )).values();

            var itemWidth = Math.floor(width / x_elements.length);
            var itemHeight = Math.floor(height / y_elements.length);

            var xScale = d3.scale.ordinal()
                .domain(x_elements)
                .rangeBands([0, itemWidth * x_elements.length]);

            var xAxis = d3.svg.axis()
                .scale(xScale)
                .orient("top")
                .innerTickSize(-height)
                .outerTickSize(0)
                .tickPadding(10);

            var yScale = d3.scale.ordinal()
                .domain(y_elements)
                .rangeBands([0, itemHeight * (y_elements.length + 2)]); // Eliminate the unused space in chart bottom

            var yAxis = d3.svg.axis()
                .scale(yScale)
                .tickValues(y_elements)
                .tickFormat(function(d) { var period = d.split("/"); return monthNames[period[0]] + "/" + period[1];})
                .orient("left");

            var svg =  d3.select(this)
                .append("svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom + legendHeight))
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
                .attr("dx", "-.4em")
                .attr("dy", ".5em");

            var colorScale = d3.scale.quantize()
                .domain([-1.0, 1.0])
                .range(d3.range(buckets).map(function(d) {  return colors[d] }));

            var cards = svg.selectAll(".rollCall")
                .data(data);

            cards.append("title");

            cards.enter().append("rect")
                .attr("x", function(d) { return xScale(d.index); })
                .attr("y", function(d) { return yScale(d.period); })
                .attr("rx", 4)
                .attr("ry", 4)
                .attr("class", "rollCall bordered")
                .attr("width", itemWidth)
                .attr("height", itemHeight)
                .style("fill", "grey");

            cards.transition().duration(1000)
                .style("fill", function(d) { return colorScale(d.value); });

            cards.select("title").text(function(d) { return d.value; });

            cards.exit().remove();

            // text label for the x axis
            svg.append("text")
                .attr("transform",
                    "translate(" + (width/2) + " ," +
                    (0 - margin.top/2) + ")")
                .style("text-anchor", "middle")
                .text("Number of Roll Calls");

            var legend = svg.selectAll(".legend")
                .data(colors, function(d) { return d; });

            legend.enter().append("g")
                .attr("class", "legend");

            var totalElementsWidth = x_elements.length * itemWidth;
            var totalLegendWidth = colors.length * (itemWidth*2);
            var centralizeOffset = (totalElementsWidth/2) - (totalLegendWidth/2);

            legend.append("rect")
                .attr("x", function(d, i) { return (itemWidth*2) * i + centralizeOffset; })
                .attr("y", height + (legendHeight/2))
                .attr("width", itemWidth * 2)
                .attr("height", itemHeight/2)
                .style("fill", function(d, i) { return colors[i]; });

            svg.append('text').text('Approves')
                .attr({
                    dx: totalLegendWidth + centralizeOffset,
                    dy: height + (legendHeight/2) + itemHeight*2,
                    //'font-size': 'small',
                    fill:'black',
                })
                .style("text-anchor", "end");

            svg.append('text').text('Disapproves')
                .attr({
                    dx: centralizeOffset,
                    dy: height + (legendHeight/2) + itemHeight*2,
                    //'font-size': 'small',
                    fill:'black',
                })

            /*legend.append("text")
                .attr("class", "mono")
                .text(function(d) { return "≥ " + Math.round(d); })
                .attr("x", function(d, i) { return legendElementWidth * i; })
                .attr("y", height + gridSize);

            legend.exit().remove();*/
        });
    }
    return chart;
}