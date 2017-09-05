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

function loadDeputies(deputiesArray)
{
    d3.json('data/deputies.json', function(a_deputiesArray) {
        a_deputiesArray.forEach( function(deputy,i){
            deputy.deputyID = i;
            deputiesArray.push(deputy)
        });
    });
}

function loadRollCalls(arrayRollCalls, callback) {
    d3.json('data/arrayRollCalls.json', function (a_arrayRollCalls) {
        a_arrayRollCalls.forEach(
            function (rollCall, i) {
                rollCall.datetime = new Date(rollCall.datetime);
                rollCall.rollCallID = i;
                arrayRollCalls.push(rollCall)
            }
        );
        callback();
    });
}

function loadNodes(type, selectedTime, callback)
{
    //console.log(JSON.stringify(d3.select('#panel-2-1 .panel-body').data()[0]));
    //console.log(JSON.stringify(deputiesNodes[0]));
    d3.json('data/precalc/'+type+'.'+selectedTime +'.json', function (precalc) {
        // SET THE precalc DEPUTIES to their constant object in the app
        precalc.deputyNodes.forEach( function(precalcDeputy){
            var deputy = deputiesArray[precalcDeputy.deputyID], depObj = {};
            depObj.name = deputy.name;
            depObj.district = deputy.district;
            depObj.deputyID = precalcDeputy.deputyID;
            depObj.party = precalcDeputy.party;
            depObj.scatterplot  = precalcDeputy.scatterplot;
            deputiesNodes.push(depObj);
        });

        callback();
        //console.log(JSON.stringify(deputiesNodes[0]));
       // console.log(JSON.stringify(d3.select('#panel-2-1 .panel-body').data()[0]));

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
    var margin = { top: 50, right: 200, bottom: 50, left: 50 },
        outerWidth = MAX_WIDTH,
        outerHeight = MAX_HEIGHT,
        width = outerWidth - margin.left - margin.right,
        height = outerHeight - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .range([0, width]).nice();

    var y = d3.scale.linear()
        .range([height, 0]).nice();

    var clusters = [];


    var div = d3.select(".toolTip");

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

            var svg = d3.select(this)
                .append("svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", "0 0 1000 620 ")
                .classed("scatter-plot", true)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                .call(zoomBeh);

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

            objects.append("g").attr("class", "deputiesClusters");

            var deputiesNodesDots   = objects.append("g").attr("class", "deputiesNodesDots");

            deputiesNodesDots.selectAll(".dot")
                .data(data)
                .enter()
                .append("circle")
                .classed("dot", true)
                .attr("r", 4)
                //.attr("id", function(d) { return "deputy_id_" + d.deputyID; })
                .attr("transform", function(d) {return "translate(" + x(d.scatterplot[1]) + "," + y(d.scatterplot[0]) + ")";})
                .style("fill", function(d) { return selColor(d.party); })
                .on("mousemove", function(d){
                    div.style("left", d3.event.pageX+10+"px");
                    div.style("top", d3.event.pageY-25+"px");
                    div.style("display", "inline-block");
                    div.html(d.name + " (" + d.party + "-" + d.district + ") ");
                })
                .on("mouseout", function(){
                    div.style("display", "none");
                });

            updateLegend(data, svg);

            function zoom() {

                hideToolTipCluster();

                svg.select(".x.axis").call(xAxis);
                svg.select(".y.axis").call(yAxis);

                svg.selectAll(".dot")
                    .attr("transform", function(d) {return "translate(" + x(d.scatterplot[1]) + "," + y(d.scatterplot[0]) + ")";});
                svg.selectAll(".hull")
                .attr("d", function(d) {
                        var points = "M";
                        points += x(d.points[0][1]) + " " + y(d.points[0][0]) + " ";
                        for (var i = 1; i < d.points.length; i++) {
                            points += "L" + x(d.points[i][1]) + " " + y(d.points[i][0]) + " ";
                        }

                        points += "Z";
                        return points;
                    }
                )
            }

            function updateLegend(data, svg) {
                var legend = svg.selectAll(".legend")
                    .data(d3.map(data, function(d){return d.party;}).keys());

                var updateCircles = svg.selectAll('.legend circle');

                updateCircles
                    .attr("fill", function (d) {return selColor(d);});

                var enterLegend =
                    legend.enter().append("g")
                        .classed("legend", true);

                enterLegend
                    .attr("transform", function(d, i) { if (i % 2 === 0) return "translate(0," + i * 20 + ")"; else return "translate(80," + (i-1) * 20 + ")" ; });

                enterLegend.append("circle")
                    .attr("r", 8)
                    .attr("cx", width + 20)
                    .attr("fill", function (d) {return selColor(d);});

                enterLegend.append("text")
                    .attr("x", width + 30)
                    .attr("dy", ".35em")
                    .text(function(d) { return d });

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

    chart.partyCount = function(_) {
        if (!arguments.length) return partyCount;
        partyCount = _;
        return chart;
    };

    chart.getClusters = function (k, data, id) {
        //number of clusters, defaults to undefined
        clusterMaker.k(k);

        //number of iterations (higher number gives more time to converge), defaults to 1000
        clusterMaker.iterations(750);

        //data from which to identify clusters, defaults to []
        clusterMaker.data(data);

        //console.log(clusterMaker.clusters());
        this.clusters = clusterMaker.clusters();
        var hullSets = [];

        this.clusters.forEach(function(cluster, index){
            hullSets.push( {"cluster" : index, "points" : hull(cluster.points.map(function(e) {return e.location; }), 20)} );
        });


        updateHulls(hullSets, id);
    };

    function updateHulls (data,id)
    {
        var col = d3.scale.category10();
        var deputiesClusters = "#" + id + " .deputiesClusters";
        var svg = d3.select(deputiesClusters);

        var toolTipCluster = d3.select('.toolTipCluster');

        var objects = svg.selectAll(".hull")
            .data(data, function(d){return d;});

        objects
            .attr("d", function(d) {
                    var points = "M";
                    points += x(d.points[0][1]) + " " + y(d.points[0][0]) + " ";
                    for (var i = 1; i < d.points.length; i++) {
                        points += "L" + x(d.points[i][1]) + " " + y(d.points[i][0]) + " ";
                    }

                    points += "Z";
                    console.log(points);
                    return points;
                }
            )
            .attr("fill", function(d) { return col(d.cluster); })
            .style("fill-opacity", 0.05)
            .attr("stroke-width", "2px")
            .attr("stroke", function(d) { return col(d.cluster); });

        var enterObjects = objects
            .data(data)
            .enter();

        enterObjects
            .append("path")
            .classed("hull", true)
            .attr("id", function(d) { return "cluster_id_" + d.cluster; })
            .attr("d", function(d) {
                    var points = "M";
                    points += x(d.points[0][1]) + " " + y(d.points[0][0]) + " ";
                    for (var i = 1; i < d.points.length; i++) {
                        points += "L" + x(d.points[i][1]) + " " + y(d.points[i][0]) + " ";
                    }

                    points += "Z";
                    return points;
                }
            )
            .attr("fill", function(d) { return col(d.cluster); })
            .style("fill-opacity", 0.05)
            .attr("stroke-width", "1px")
            .attr("stroke", function(d) { return col(d.cluster); })
            .on("click", function(d){
                //if (toolTipCluster.style("display") === 'none') {
                    toolTipCluster.style("left", d3.event.pageX + 10 + "px");
                    toolTipCluster.style("top", d3.event.pageY - 25 + "px");
                    toolTipCluster.style("display", "inline-block");
                    toolTipCluster.html("Cluster " + d.cluster);
                })
                //else
                .on("blur", hideToolTipCluster);


        /* Bind context menu at clusters */
        $(deputiesClusters)
            .contextMenu({
                menuSelector: "#contextMenuScatterPlot",
                menuSelected: function (invokedOn, selectedMenu) {
                    handleContextMenuScatterPlot(invokedOn, selectedMenu);
                }
            });

        objects.exit().remove();
    }

    return chart;
}