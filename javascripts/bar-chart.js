function barChart() {
    var axisMargin = 20,
        margin = 50,
        width = MAX_WIDTH,
        height = MAX_HEIGHT;

        var div = d3.select("body").append("div").attr("class", "toolTip");

        function chart(selection){
            selection.each(function (data) {
                var max = d3.max(data, function(d) { return d.number; });
                var labelWidth = 0;
                var valueMargin = 8;

                var barHeight = (height-axisMargin-margin*2)* 0.4/data.length,
                    barPadding = (height-axisMargin-margin*2)*0.6/data.length;

                var svg = d3.select(this)
                    .append("svg")
                    .attr("width", "100%")
                    .attr("height", "100%")
                    .attr("viewBox", "0 0 1000 620 ")
                    .classed("bar-chart", true);

                var bar = svg.selectAll("g")
                    .data(data)
                    .enter()
                    .append("g");

                bar.attr("class", "bar")
                    .attr("cx",0)
                    .attr("transform", function(d, i) {
                        return "translate(" + margin + "," + (i * (barHeight + barPadding) + barPadding) + ")";
                    });

                bar.append("text")
                    .attr("class", "label")
                    .attr("y", barHeight / 2)
                    .attr("dy", ".35em") //vertical align middle
                    .text(function(d){
                        return d.party;
                    }).each(function() {
                        labelWidth = Math.ceil(Math.max(labelWidth, this.getBBox().width));
                    });

                scale = d3.scale.linear()
                    .domain([0, max])
                    .range([0, width - margin*2 - labelWidth]);

                xAxis = d3.svg.axis()
                    .scale(scale)
                    .tickSize(-height + 2*margin )
                    .orient("bottom");

                bar.append("rect")
                    .attr("transform", "translate("+labelWidth+", 0)")
                    .attr("height", barHeight)
                    .attr("width", function(d){
                        return scale(d.number);
                    });

                bar.append("text")
                    .attr("class", "value")
                    .attr("y", barHeight / 2)
                    .attr("dx", -valueMargin + labelWidth) //margin right
                    .attr("dy", ".35em") //vertical align middle
                    .attr("text-anchor", "end")
                    .text(function(d){
                        return (d.number+"%");
                    })
                    .attr("x", function(d){
                        var width = this.getBBox().width;
                        return Math.max(width + valueMargin, scale(d.number));
                    });

                bar
                    .on("mousemove", function(d){
                        div.style("left", d3.event.pageX+10+"px");
                        div.style("top", d3.event.pageY-25+"px");
                        div.style("display", "inline-block");
                        div.html((d.party)+"<br>"+(d.number)+"%");
                    });
                bar
                    .on("mouseout", function(d){
                        div.style("display", "none");
                    });

                svg.insert("g",":first-child")
                    .attr("class", "axisHorizontal")
                    .attr("transform", "translate(" + (margin + labelWidth) + ","+ (height - axisMargin - margin)+")")
                    .call(xAxis);

            });
    }

    chart.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return chart;
    };

    chart.width = function(_) {
        if (!arguments.length) return width;
        width = _;
        return chart;
    };

    chart.height = function(_) {
        if (!arguments.length) return height;
        height = _;
        return chart;
    };

    chart.outerWidth = function(_) {
        if (!arguments.length) return outerWidth;
        outerWidth = _;
        return chart;
    };

    chart.outerHeight = function(_) {
        if (!arguments.length) return outerHeight;
        outerHeight = _;
        return chart;
    };

    return chart;
}