var SCATTER_PLOT = 1;
var parties = [];
var partyCount  = [];
var chart;
var partiesArbitraryColor = {"DEM":"LightCoral", "PFL":"LightCoral", // PFL ==> DEM
    "PSDB":"#1f77b4",
    "PP":"#008000", "PPB": "#008000", // PPB ==> PP
    "PL":"#ffbb78", "PR":"#ffbb78",   // PL + PRONA ==> PR
    "PMDB":"#393b79",
    "PT":"#d62728",
    "PDT":"LimeGreen", "PSB":"LightGreen",
    "PTB":"#9467bd",
    "PSD":"#660000",
    "PSOL":"#FFCC00",
    "PV":"#e377c2",
    "PPS":"#666",
    "PCdoB":"Brown",
    "SDD":"DarkOrange",
    "Solidaried":"DarkOrange ",
    "PROS":"Orange",
    "PRONA": "DarkOrange",
    "PRN": "#8c564b","PSC":"#8c564b"
};

function selColor(c){ return partiesArbitraryColor[c]; }

// A $( document ).ready() block.
$( document ).ready(function() {
    $("body").on('click', '#applyKmeans', function(){
        var k = $("#kVariable").val();
        getClusters(k, deputyNodes);
    });
});

function loadDeputies(deputiesArray)
{
    d3.json('data/deputies.json', function(a_deputiesArray) {
        a_deputiesArray.forEach( function(deputy,i){
            deputy.deputyID = i;
            deputiesArray.push(deputy)
        });
    });
}

function loadNodes(type, selectedTime, deputiesArray, deputiesNodes)
{
    d3.json('data/precalc/'+type+'.'+selectedTime +'.json', function (precalc) {
        // SET THE precalc DEPUTIES to their constant object in the app
        precalc.deputyNodes.map( function(precalcDeputy){
            var depObj = deputiesArray[precalcDeputy.deputyID];
            depObj.party = precalcDeputy.party;
            depObj.scatterplot  = precalcDeputy.scatterplot;
            deputiesNodes.push(depObj);
        });

        initChart(SCATTER_PLOT);
        /*chart = scatterPlotChart();

        d3.select("#scatter")
            .datum(deputyNodes)
            .call(chart);

        $("#countParties").append("# of parties: <span id= 'count'>" + Object.keys(parties).length + "</span>").show();
        */
    });
}

function scatterPlotChart()
{
    var margin = { top: 50, right: 300, bottom: 50, left: 50 },
        outerWidth = 1050,
        outerHeight = 600,
        width = outerWidth - margin.left - margin.right,
        height = outerHeight - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .range([0, width]).nice();

    var y = d3.scale.linear()
        .range([height, 0]).nice();

    function chart(selection){
        selection.each(function (data) {
            var xMax = d3.max(data, function(d) { return d.scatterplot[1]; }),
                xMin = d3.min(data, function(d) { return d.scatterplot[1]; }),
                xMin = xMin > 0 ? 0 : xMin,
                yMax = d3.max(data, function(d) { return d.scatterplot[0]; }),
                yMin = d3.min(data, function(d) { return d.scatterplot[0]; }),
                yMin = yMin > 0 ? 0 : yMin;

            x.domain([xMin - 0.02, xMax + 0.02]);
            y.domain([yMin - 0.02, yMax + 0.02 ]);

            var xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom")
                .tickSize(-height)
                .tickFormat("");

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient("left")
                .tickSize(-width)
                .tickFormat("");

            var zoomBeh = d3.behavior.zoom()
                .x(x)
                .y(y)
                .scaleExtent([0, 500])
                .on("zoom", zoom);

            var tip = d3.tip()
                .attr('class', 'd3-tip')
                .attr('id', 'tooltip')
                .offset([-10, 0])
                .html(function(d) {
                    return d.name + " (" + d.party + "-" + d.district + ") ";
                });


            var svg = d3.select(this)
                .append("svg")
                .attr("width", outerWidth)
                .attr("height", outerHeight)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                .call(zoomBeh);

            svg.call(tip);

            svg.append("rect")
                .attr("width", width)
                .attr("height", height);

            svg.append("g")
                .classed("x axis", true)
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis);

            svg.append("g")
                .classed("y axis", true)
                .call(yAxis);

            var objects = svg.append("svg")
                .classed("objects", true)
                .attr("width", width)
                .attr("height", height);

            objects.append("svg:line")
                .classed("axisLine hAxisLine", true)
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", width)
                .attr("y2", 0)
                .attr("transform", "translate(0," + height + ")");

            objects.append("svg:line")
                .classed("axisLine vAxisLine", true)
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", 0)
                .attr("y2", height);

            var clusters        = objects.append("g").attr("id", "deputiesClusters");
            var deputiesNodes   = objects.append("g").attr("id", "deputiesNodes");

            deputiesNodes.selectAll(".dot")
                .data(data)
                .enter().append("circle")
                .classed("dot", true)
                .attr("r", 3.7)
                .attr("id", function(d) { return "deputy_id_" + d.deputyID; })
                .attr("transform", function(d) {return "translate(" + x(d.scatterplot[1]) + "," + y(d.scatterplot[0]) + ")";})
                .style("fill", function(d) { return selColor(d.party); })
                .on("mouseover", tip.show)
                .on("mouseout", tip.hide);

            updateLegend(data, svg);

            function zoom() {
                svg.select(".x.axis").call(xAxis);
                svg.select(".y.axis").call(yAxis);

                svg.selectAll(".dot")
                    .attr("transform", function(d) {return "translate(" + x(d.scatterplot[1]) + "," + y(d.scatterplot[0]) + ")";});
                svg.selectAll(".hull")
                    .attr("points", function(d) { var  points = ""; d.points.forEach(function(e) { points += x(e[1]) + "," + y(e[0]) + " "  }); return points; } )
            }

            function updateLegend(data, svg) {
                var legend = svg.selectAll(".legend")
                    .data(d3.map(data, function(d){return d.party;}).keys());

                var t = d3.transition();

                legend
                    .transition(t).duration(750)
                    .attr("transform", function(d, i) { if (i % 2 === 0) return "translate(0," + i * 20 + ")"; else return "translate(80," + (i-1) * 20 + ")" ; });

                var updateCircles = d3.selectAll('.legend circle');

                updateCircles
                    .attr("fill", function (d) {return selColor(d);})

                var enterLegend =
                    legend.enter().append("g")
                        .classed("legend", true)

                enterLegend
                    .attr("transform", function(d, i) { if (i % 2 === 0) return "translate(150," + i * 20 + ")"; else return "translate(230," + (i-1) * 20 + ")" ; })
                    .transition(t).duration(750)
                    .attr("transform", function(d, i) { if (i % 2 === 0) return "translate(0," + i * 20 + ")"; else return "translate(80," + (i-1) * 20 + ")" ; });

                enterLegend.append("circle")
                    .attr("r", 4)
                    .attr("cx", width + 20)
                    .attr("fill", function (d) {return selColor(d);})
                    .on("mouseover", function (d) {
                        var resp = "";
                        partyCount[d].forEach(function(e){
                            resp += e.party + ":" + e.number + " || " + d3.format("%") (e.number/partyCount[d].total) + "<br>";
                        })
                        //console.log(resp);
                        tooltipTest.transition()
                            .duration(200)
                            .style("opacity", .9);
                        tooltipTest .html(resp)
                            .style("left", (d3.event.pageX) + "px")
                            .style("top", (d3.event.pageY +20) + "px");
                    })
                    .on("mouseout", function(d) {
                        tooltipTest.transition()
                            .duration(500)
                            .style("opacity", 0);
                    });

                enterLegend.append("text")
                    .attr("x", width + 26)
                    .attr("dy", ".35em")
                    .text(function(d) { return d });

                legend
                    .exit()
                    .transition(t).duration(750)
                    .style("fill-opacity", 1e-6)
                    .attr("transform", function(d, i) { if (i % 2 === 0) return "translate(150," + i * 20 + ")"; else return "translate(230," + (i-1) * 20 + ")" ; })
                    .remove();
            }
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

    chart.updateHulls = function (data)
    {
        var col = d3.scale.category10();

        var svg = d3.select("#deputiesClusters");

        var objects = svg.selectAll(".hull")
            .data(data, function(d){return d;});


        objects
            .attr("points", function(d) { var  points = ""; d.points.forEach(function(e) { points += x(e[1]) + "," + y(e[0]) + " "  }); return points; } )
            .attr("fill", function(d) { return col(d.cluster); })
            .style("fill-opacity", 0.05)
            .attr("stroke-width", "2px")
            .attr("stroke", function(d) { return col(d.cluster); });

        objects
            .data(data)
            .enter().append("polyline")
            .classed("hull", true)
            .attr("id", function(d) { return "cluster_id_" + d.cluster; })
            .attr("points", function(d) { var  points = ""; d.points.forEach(function(e) { points += x(e[1]) + "," + y(e[0]) + " "  }); return points; } )
            .attr("fill", function(d) { return col(d.cluster); })
            .style("fill-opacity", 0.05)
            .attr("stroke-width", "3px")
            .attr("stroke", function(d) { return col(d.cluster); });

        objects.exit().remove();
    };

    return chart;
}

function getClusters(k, data)
{
    //number of clusters, defaults to undefined
    clusterMaker.k(k);

    //number of iterations (higher number gives more time to converge), defaults to 1000
    clusterMaker.iterations(750);

    //data from which to identify clusters, defaults to []
    clusterMaker.data(data);

    //console.log(clusterMaker.clusters());
    var allClusters = clusterMaker.clusters();
    var hullSets = [];

    partyCount = [];

    allClusters.forEach(function(cluster, index){
        cluster.points.forEach(function(deputy, i){
            /*$("#"+deputy)[0].stylesheets["fill"] = color(index);*/
            if (partyCount[index] === undefined)
            {
                partyCount[index] = [{"party" : deputy.party, "number": 1}];
            }
            else
            {
                var result = $.grep(partyCount[index], function(e){ return e.party === deputy.party; });
                if (result.length == 0) {
                    partyCount[index].push({"party" : deputy.party, "number": 1});
                }
                else
                if (result.length == 1) {
                    result[0].number += 1;
                }
            }
            //d3.select("#deputy_id_" + deputy.deputyID).transition().stylesheets("fill", col(index)).duration(900);
        })
        hullSets.push( {"cluster" : index, "points" : hull(cluster.points.map(function(e) {return e.location; }), 20)} );
    })

    partyCount.forEach (function(e){
        var count = 0;
        e.sort(function(x,y){
            return d3.descending(x.number, y.number);
        })
        e.forEach(function(d){
            count += +d.number;
        })
        e.total = count;
    })

    chart.updateHulls (hullSets);
}