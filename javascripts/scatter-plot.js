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

function scatterPlotChart()
{
    var margin = { top: 30, right: 200, bottom: 30, left: 50 },
        outerWidth = MAX_WIDTH,
        outerHeight = MAX_HEIGHT,
        width = outerWidth - margin.left - margin.right,
        height = outerHeight - margin.top - margin.bottom;

    var nodeRadius = 4;

    var x = d3.scale.linear()
        .range([width,0]).nice();

    var y = d3.scale.linear()
        .range([0, height]).nice();

    var clusters = [];
    var svg;

    var dispatch = d3.dispatch('update');
    var div = d3.select(".toolTip");
    var brush;

    function chart(selection){
        selection.each(function (data) {
            var nodes = d3.values(data);
            var xMax = d3.max(nodes, function(d) { return d.scatterplot[1]; })  * 1.05,
                xMin = d3.min(nodes, function(d) { return d.scatterplot[1]; }),
                xMin = xMin > 0 ? 0 : xMin* 1.05,
                yMax = d3.max(nodes, function(d) { return d.scatterplot[0]; })  * 1.05,
                yMin = d3.min(nodes, function(d) { return d.scatterplot[0]; }),
                yMin = yMin > 0 ? 0 : yMin* 1.05;

            x.domain([xMin, xMax]);
            y.domain([yMin, yMax]);

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

            var panelID = (d3.select(this.parentNode).attr('id'));

            brush = d3.svg.brush()
                .x(x)
                .y(y)
                .on("brushstart", brushstart)
                .on("brush", brushmove)
                .on("brushend", brushend);

            svg = d3.select(this)
                .append("svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", "0 0 " + MAX_WIDTH + " " + MAX_HEIGHT)
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

            deputiesNodesDots.selectAll("circle")
                .data(nodes)
                .enter()
                .append("circle")
                .attr("class", function (d) {return (d.selected)? "node selected": ( (d.hovered)? "node hovered" : "node"); })
                .attr("r", function(d){ return (d.hovered)? nodeRadius*2 : nodeRadius;})
                .attr("id", function(d) { return panelID + "_deputy-id-" + d.deputyID; })
                .attr("transform", function(d) {return "translate(" + x(d.scatterplot[1]) + "," + y(d.scatterplot[0]) + ")";})
                .style("fill", function(d) { return selColor(d.party); })
                .on("mousemove", function(d){
                    div.style("left", d3.event.pageX+10+"px");
                    div.style("top", d3.event.pageY-25+"px");
                    div.style("display", "inline-block");
                    div.html(d.name + " (" + d.party + "-" + d.district + ") ");
                })
                .on('mousedown', function(d) {
                    mouseClickDeputy(d);
                })
                .on('mouseup', function(){
                    $('.searchDeputies').tagsinput('removeAll');
                })
                .on("mouseover",
                    //mouseOverDeputy(d.deputyID, this);
                    mouseoverDeputy
                )
                .on("mouseout", function(d){
                    div.style("display", "none");
                    mouseoutDeputy(d);
                    highlightMatchesDeputies();
                });


            $("#" + panelID + " .node")
                .contextMenu({
                    menuSelector: "#contextMenuDeputy",
                    menuSelected: function (invokedOn, selectedMenu) {
                        handleContextMenuDeputy(invokedOn, selectedMenu);
                    }
                });

            updateLegend(nodes, svg);


            highlightMatchesDeputies();

            function zoom() {

                hideToolTipCluster();

                svg.select(".x.axis").call(xAxis);
                svg.select(".y.axis").call(yAxis);

                svg.selectAll(".node")
                    .attr("transform", function(d) {return "translate(" + x(d.scatterplot[1]) + "," + y(d.scatterplot[0]) + ")";});

                var groupPath = function(d) {
                    return "M" +
                        d3.geom.hull(d.points.map(function(i) { return [x(i[1]), y(i[0])]; }))
                            .join("L")
                        + "Z";
                };

                svg.selectAll(".hull")
                    .attr("d", groupPath);
            }

            function updateLegend(data, svg) {
                var legend = svg.selectAll(".legend")
                    .data(d3.map(data, function(d){return d.party;}).keys());

                var updateCircles = svg.selectAll('.legend circle');

                updateCircles
                    .attr("fill", function (d) {return selColor(d);});

                var enterLegend =
                    legend.enter().append("g")
                        .classed("legend", true)
                        .on('click', function(d) {
                            /* Reset the search input */
                            $('.searchDeputies').tagsinput('removeAll');
                            clickParty(d);
                        })
                        .on('mouseover', mouseoverParty)
                        .on('mouseout', function () { mouseoutParty(); highlightMatchesDeputies();});

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

            var brushScatter;

            function brushstart(p) {
                if (brushScatter !== this) {
                    d3.select(brushScatter).call(brush.clear());
                    brushScatter = this;
                }
            }

            // Highlight the selected circles.
            function brushmove() {
                if (SHIFTKEY) {
                    svg = svg.call(d3.behavior.zoom().on("zoom", null));
                    var e = brush.extent();
                    var deps = svg.selectAll(".node").filter(function(d) {
                        return e[0][0] < d.scatterplot[1] && d.scatterplot[1] < e[1][0]
                            && e[0][1] < d.scatterplot[0] && d.scatterplot[0] < e[1][1];
                    }).data();
                    chart.selectDeputiesBySearch(deps);
                }
                else {
                    d3.event.target.clear();
                    d3.select(this).call(d3.event.target);
                }
            }

            //TODO: https://gist.github.com/peterk87/8441728 Zoom and Panning

            // If the brush is empty, select all circles.
            function brushend() {
                svg.call(d3.behavior.zoom().x(x).y(y).on("zoom", zoom));
                d3.event.target.clear();
                d3.select(this).call(d3.event.target);
                //console.log(d3.event.target);
                //if (brush.empty()) resetSelection();
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

    chart.update = function () {
        svg.selectAll(".deputiesNodesDots .node")
            .transition()
            .attr("class", function (d) {return (d.selected)? "node selected": ( (d.hovered)? "node hovered" : "node"); })
            .attr("r", function(d){ return (d.hovered)? nodeRadius*2 : nodeRadius;});
    };

    chart.getClusters = function (k, data, id) {
        console.log(data);
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

        var clustersPoints = [];

        this.clusters.forEach(function (cluster, index) {
            clustersPoints.push({"cluster": index, "points" : cluster.points.map(function (t) { return t.location; })});
        });

        //updateHulls(hullSets, id);
        updateHullsTest(clustersPoints, id);
    };

    function updateHullsTest(data, id)
    {
        var groupPath = function(d) {
            return "M" +
                d3.geom.hull(d.points.map(function(i) { return [x(i[1]), y(i[0])]; }))
                    .join("L")
                + "Z";
        };

        var col = d3.scale.category10();
        var deputiesClusters = "#" + id + " .deputiesClusters";
        var svg = d3.select(deputiesClusters);

        var toolTipCluster = d3.select('.toolTipCluster');

        var objects = svg.selectAll(".hull")
            .data(data, function(d){return d;});

        objects
            .attr("d", groupPath)
            .style("fill", "#ffffff")
            .style("stroke", "#000000")
            .style("stroke-width",8)
            .style("stroke-linejoin", "round")
            .style("opacity", .2);


        var enterObjects = objects
            .data(data)
            .enter();

        enterObjects
            .append("a")
            .attr("xlink:href", "javascript:;")
            .on("click", function(d){
                toolTipCluster.style("left", d3.event.pageX + 10 + "px");
                toolTipCluster.style("top", d3.event.pageY - 25 + "px");
                toolTipCluster.style("display", "inline-block");
                toolTipCluster.html("Cluster " + d.cluster);
            })
            .on("blur", hideToolTipCluster)
            .append("path")
            .classed("hull", true)
            .attr("id", function(d) { return "cluster_id_" + d.cluster; })
            .attr("d", groupPath)
            .style("fill", "#ffffff")
            .style("stroke", "#c4c7c8")
            .style("stroke-width", 8)
            .style("stroke-linejoin", "round")
            .style("opacity", .4);


        $(deputiesClusters)
            .contextMenu({
                menuSelector: "#contextMenuScatterPlot",
                menuSelected: function (invokedOn, selectedMenu) {
                    handleContextMenuScatterPlot(invokedOn, selectedMenu);
                }
            });

        objects.exit().remove();

    }

    // mouse OVER circle deputy
    function mouseoverDeputy(d) {
        updateDeputyNodeInAllPeriods(d.deputyID, "hovered", true);
        dispatch.update();
    }

    // mouse OUT circle deputy
    function mouseoutDeputy(d){
        updateDeputyNodeInAllPeriods(d.deputyID, "hovered", false);
        dispatch.update();
    }

    function mouseClickDeputy(d){
        d3.event.preventDefault();

        if (d3.event.shiftKey){
            // using the shiftKey deselect the deputy
            updateDeputyNodeInAllPeriods(d.deputyID, "selected", false);
        } else
        if (d3.event.ctrlKey || d3.event.metaKey){
            // using the ctrlKey add deputy to selection
            updateDeputyNodeInAllPeriods(d.deputyID, "selected", !d.selected);
            selectionOn = true;
        }
        else {
            // a left click without any key pressed and
            // a right click in a deputy unselected
            // -> select only the deputy (deselect others)
            if (d3.event.which === 1 || (d3.event.which ===3 && !d.selected)) {
                for (var key in deputyNodes) {
                    for (var index in deputyNodes[key])
                        deputyNodes[key][index].selected = false;
                }
                updateDeputyNodeInAllPeriods(d.deputyID, "selected", true);
                selectionOn = true;
            }
        }
        dispatch.update();
    }

    function mouseoverParty(d) {
        var deputies = svg.selectAll(".deputiesNodesDots .node").filter(function (dep) {
            return dep.party === d;
        }).data();

        deputies.forEach(function (d) {
            updateDeputyNodeInAllPeriods(d.deputyID, "hovered", true);
        });

        dispatch.update();

    }

    function mouseoutParty(){
        for (var key in deputyNodes){
            for (var index in deputyNodes[key])
                deputyNodes[key][index].hovered = false;
        }
        dispatch.update();
    }

    function clickParty(d) {
        for (var key in deputyNodes){
            for (var index in deputyNodes[key])
                deputyNodes[key][index].selected = false;
        }

        var deputies = svg.selectAll(".deputiesNodesDots .node").filter(function (dep) {
            return dep.party === d;
        }).data();

        deputies.forEach(function (d) {
            updateDeputyNodeInAllPeriods(d.deputyID, "selected", true);
        });

        selectionOn = true;

        dispatch.update();
    }

    chart.selectDeputiesBySearch = function (deputies) {
        for (var key in deputyNodes) {
            for (var index in deputyNodes[key])
                deputyNodes[key][index].selected = false;
        }

        deputies.forEach(function(d){
            updateDeputyNodeInAllPeriods(d.deputyID, "selected", true);
        });

        selectionOn = true;
        dispatch.update();
    };

    chart.enableBrush = function(){
        svg.select(".objects").append("g")
            .attr("class", "brush")
            .call(brush);
    };

    chart.disableBrush = function(){
        svg.select(".brush").remove();
    };

    return d3.rebind(chart, dispatch, 'on');
}