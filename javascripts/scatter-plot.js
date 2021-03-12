function scatterPlotChart()
{
    var margin = { top: 30, right: 350, bottom: 20, left: 50 },
        outerWidth = MAX_WIDTH,
        outerHeight = MAX_HEIGHT,
        width = outerWidth - margin.left - margin.right,
        height = outerHeight - margin.top - margin.bottom;
    var padding = 1; // separation between nodes

    var _hasThreshold = false;
    var _threshold = 0;
    var _deputiesByParties;

    var nodeRadius = 10;
    var offSetBigCluster = 0;

    var x = d3.scale.linear()
        .range([width,0]);

    var y = d3.scale.linear()
        .range([0, height]);

    var partyCountByOverlappedGroup = [];
    var svg;
    var panelID;
    var panelToBeRedrawn;
    var checkbox;

    var dispatch = d3.dispatch('update');
    var div = d3.select(".toolTip");
    var brush;
    var isForceLayout = false;

    function chart(selection){
        selection.each(function (data) {
            var nodes = d3.values(data);
            panelID = ($(this).parents('.panel')).attr('id');
            panelToBeRedrawn = this;
            _deputiesByParties = getPartyCountAllScatter(nodes);

            //sorting nodes to compare and find duplicates
            nodes.sort(function (a, b) {
                if (a.scatterplot[0] > b.scatterplot[0]) return 1;
                if (a.scatterplot[0] < b.scatterplot[0]) return -1;

                if (a.scatterplot[1] > b.scatterplot[1]) return 1;
                if (a.scatterplot[1] < b.scatterplot[1]) return -1;
              });

            var groupId = 0;
            var countDuplicates = 0;
            function addInOverlappedGroup(elem)
            {
                if (partyCountByOverlappedGroup[elem.overlapped] === undefined)
                {
                    /*partyCountByOverlappedGroup[elem.overlapped] = {"name": elem.overlapped, "scatX": elem.scatterplot[1], "scatY": elem.scatterplot[0]}
                    partyCountByOverlappedGroup[elem.overlapped]["children"] = [];
                    partyCountByOverlappedGroup[elem.overlapped]["children"][elem.party] = {"name": elem.party, "size": 1};*/

                    partyCountByOverlappedGroup[elem.overlapped] = {"name": elem.overlapped, "parties": []};
                    partyCountByOverlappedGroup[elem.overlapped]["parties"][elem.party] = {"name": elem.party, "elem": elem};
                }
                else
                {
                    /*if (partyCountByOverlappedGroup[elem.overlapped]["children"][elem.party] === undefined)
                        partyCountByOverlappedGroup[elem.overlapped]["children"][elem.party] = {"name": elem.party, "size": 1};
                    else
                        partyCountByOverlappedGroup[elem.overlapped]["children"][elem.party].size += 1;*/
                    if (partyCountByOverlappedGroup[elem.overlapped]["parties"][elem.party] === undefined)
                        partyCountByOverlappedGroup[elem.overlapped]["parties"][elem.party] = {"name": elem.party,  "elem": elem};
                }
            }

            for (let i = 0; i < nodes.length; i++) {
                if (i >= nodes.length - 1) //last element
                {
                    if (Number(nodes[i - 1].scatterplot[0]).toFixed(7) == Number(nodes[i].scatterplot[0]).toFixed(7) && Number(nodes[i - 1].scatterplot[1]).toFixed(7) == Number(nodes[i].scatterplot[1]).toFixed(7)){
                        nodes[i].overlapped = groupId;
                        addInOverlappedGroup(nodes[i]);
                        countDuplicates++;
                    }
                }
                else
                {
                    if (Number(nodes[i + 1].scatterplot[0]).toFixed(7) == Number(nodes[i].scatterplot[0]).toFixed(7) && Number(nodes[i + 1].scatterplot[1]).toFixed(7) == Number(nodes[i].scatterplot[1]).toFixed(7)){
                        nodes[i].overlapped = groupId;
                        addInOverlappedGroup(nodes[i]);
                        countDuplicates++;
                    }
                    else
                    {
                        if (countDuplicates > 0)
                        {   
                            nodes[i].overlapped = groupId;
                            addInOverlappedGroup(nodes[i]);
                            groupId++;
                            countDuplicates = 0;
                        }
                    }
                }
            }
            // getting only values, ignoring the keys
            //var temp = d3.values(partyCountByOverlappedGroup);
            // temp.map(function(e) { e['children'] = d3.values(e['children']); return e; })

            //var packedData = {name: "root", "children": temp};

            var controls = d3.select("#" + panelID).append("label")
                .attr("id", "controls");
            checkbox = controls.append("input")
                .attr("id", "forceLayoutApply")
                .attr("type", "checkbox");
            controls.append("span")
             .text("Show overlapping deputies ");

            drawScatterPlot(nodes, this);
        })
    }

    function drawScatterPlot(nodes, htmlContent)
    {
        offSetBigCluster = 1.10;
        if (partyCountByOverlappedGroup.length > 20)
            offSetBigCluster = 1.35;

        var xMax = d3.max(nodes, function(d) { return d.scatterplot[1]; })  * offSetBigCluster,
            xMin = d3.min(nodes, function(d) { return d.scatterplot[1]; }),
            xMin = xMin > 0 ? 0 : xMin * offSetBigCluster,
            yMax = d3.max(nodes, function(d) { return d.scatterplot[0]; })  * offSetBigCluster,
            yMin = d3.min(nodes, function(d) { return d.scatterplot[0]; }),
            yMin = yMin > 0 ? 0 : yMin * offSetBigCluster;

        x.domain([xMin, xMax]);
        y.domain([yMin, yMax]);

        var zoom = d3.behavior.zoom()
            .scaleExtent([1, 30])
            .on("zoom", zoomed);

        brush = d3.svg.brush()
            .x(x)
            .y(y)
            .on("brushstart", brushstart)
            .on("brush", brushmove)
            .on("brushend", brushend);

        svg = d3.select(htmlContent)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", "0 0 " + MAX_WIDTH + " " + MAX_HEIGHT)
            .classed("scatter-plot", true)
            .append("svg:g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(zoom)

        svg.append("rect")
            .attr("width", width)
            .attr("height", height);

        var objects = svg.append("svg")
            .classed("objects", true)
            .attr("width", width)
            .attr("height", height)
            .append('svg:g');

        objects.append("svg:g").attr("class", "deputiesClusters");

        var deputiesNodesDots   = objects.append("svg:g").attr("class", "deputiesNodesDots");

        var force = d3.layout.force()
            .nodes(nodes)
            .size([width, height])
            .on("tick", tick)
            .charge(-0.1)
            .gravity(0)
            .chargeDistance(20);
        

        // Set initial positions
        nodes.forEach(function(d) {
            d.x = x(d.scatterplot[1]);
            d.y = y(d.scatterplot[0]);
            d.radius = nodeRadius;
        });

        var deputies = deputiesNodesDots.selectAll("circle")
            .data(nodes)
            .enter()
            .append("circle")
            .attr( popoverAttr(deputyPopOver,'top'))
            .attr("class", function (d) {return (d.selected)? "node selected": ( (d.hovered)? "node hovered" : "node"); })
            .attr("r", function(d){ return (d.hovered)? nodeRadius*2 : nodeRadius;})
            .attr("id", function(d) { return panelID + "_deputy-id-" + d.deputyID; })
            .attr("cx", function(d) { return x(d.scatterplot[1]); })
            .attr("cy", function(d) { return y(d.scatterplot[0]); })
            .style("fill", function(d) { return setDeputyFill(d); })
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
            });

        function deputyPopOver(d){
            var deputyTooltipEnglish;
            var deputyTooltipPortuguese;
            deputyTooltipEnglish = '<strong>' + d.name +' ('+d.party+'-'+d.district+")</strong><br><em>Left-Click to select</em><br><em>Right-Click to create new visualizations</em>";
            deputyTooltipPortuguese= '<strong>' + d.name +' ('+d.party+'-'+d.district+")</strong><br><em>Botão esquerdo para selecionar</em><br><em>Botão direito para criar novas vis.</em>";

            if (language === PORTUGUESE)
                return deputyTooltipPortuguese;
            else
                return deputyTooltipEnglish;
        }

        $('.scatter-plot circle.node').popover({ trigger: "hover" });

        $("#" + panelID + " .node")
            .contextMenu({
                menuSelector: "#contextMenuDeputy",
                menuSelected: function (invokedOn, selectedMenu) {
                    handleContextMenuDeputy(invokedOn, selectedMenu);
                }
            });

        updateLegend(nodes, svg);

        d3.select("#forceLayoutApply").on("change", function() {
            if (checkbox.node().checked){
                if (!isForceLayout)
                {
                    force.start();
                    isForceLayout = true;
                }
                else {
                    svg.selectAll('.node')
                        .transition().duration(1000)
                        .attr('cx', function(d){ return d.x; })
                        .attr('cy', function(d){ return d.y; });
                }
            }
            else
            {
                force.stop();
                svg.selectAll('.node')
                    .transition().duration(1000)
                    .attr('cx', function(d){ return x(d.scatterplot[1]); })
                    .attr('cy', function(d){ return y(d.scatterplot[0]); });
                /*$(panelToBeRedrawn).find('svg').remove();
                deputies.each(resetPositions);
                drawScatterPlot(nodes, panelToBeRedrawn, false);*/
            }
        });

        function tick(e) {
            deputies.each(moveTowardDataPosition(e.alpha));
            deputies.each(cluster(10 * e.alpha * e.alpha))
            deputies.each(collide(e.alpha));
            
            deputies.attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });
            
        }

        function resetPositions()
        {
            return function(d){
                d.x = x(d.scatterplot[1]); 
                d.y = y(scatterplot[0]);
            }
        }

        function moveTowardDataPosition(alpha) {
            return function(d) {
                d.x += (x(d.scatterplot[1]) - d.x) * 0.1 * alpha;
                d.y += (y(d.scatterplot[0]) - d.y) * 0.1 * alpha;
            };
        }

        function cluster(alpha)
        {
            return function(d) {
                if (d.overlapped !== null)
                {
                    var cluster = partyCountByOverlappedGroup[d.overlapped].parties[d.party].elem;
                    if (cluster.deputyID === d.deputyID) return;
                    var x = d.x - cluster.x,
                        y = d.y - cluster.y,
                        l = Math.sqrt(x * x + y * y),
                        r = d.radius + cluster.radius;
                    if (l != r) {
                    l = (l - r) / l * alpha;
                    d.x -= x *= l;
                    d.y -= y *= l;
                    cluster.x += x;
                    cluster.y += y;
                    }
                }
            };
        }

        // Resolve collisions between nodes.
        function collide(alpha) {
            var quadtree = d3.geom.quadtree(nodes);
            return function(d) {
            var r = d.radius + nodeRadius + padding,
                nx1 = d.x - r,
                nx2 = d.x + r,
                ny1 = d.y - r,
                ny2 = d.y + r;
            quadtree.visit(function(quad, x1, y1, x2, y2) {
                if (quad.point && (quad.point !== d)) {
                var x = d.x - quad.point.x,
                    y = d.y - quad.point.y,
                    l = Math.sqrt(x * x + y * y),
                    r = d.radius + quad.point.radius + (d.color !== quad.point.color) * padding;
                if (l < r) {
                    l = (l - r) / l * alpha;
                    d.x -= x *= l;
                    d.y -= y *= l;
                    quad.point.x += x;
                    quad.point.y += y;
                }
                }
                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
            };
        }

        function zoomed() {
            objects.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
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
                        clickParty(d);
                    })
                    .on('mouseover', mouseoverParty)
                    .on('mouseout', mouseoutParty);

            enterLegend
                .attr("transform", function(d, i) { if (i % 2 === 0) return "translate(0," + i * 30 + ")"; else return "translate(150," + (i-1) * 30 + ")" ; });

            enterLegend.append("circle")
                .attr("r", 12)
                .attr("cx", width + 20)
                .attr("fill", function (d) {return selColor(d);});

            enterLegend.append("text")
                .attr("x", width + 40)
                .attr("dy", ".45em")
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
                console.log(e);
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

        //https://gist.github.com/peterk87/8441728 Zoom and Panning

        // If the brush is empty, select all circles.
        function brushend() {
            svg.call(d3.behavior.zoom().x(x).y(y).on("zoom", zoom));
            d3.event.target.clear();
            d3.select(this).call(d3.event.target);
            //console.log(d3.event.target);
            //if (brush.empty()) resetSelection();
        }

    };

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
            .style("fill", function(d) { return setDeputyFill(d); })
            .attr("class", function (d) { return (d.selected)? "node selected": (d.hovered)? "node hovered" : "node"; })
            .attr("r", function(d){ return (d.hovered) ? nodeRadius*2 : nodeRadius;});

        svg.selectAll('.legend circle')
            .attr("fill", function (d) { return selColor(d); });
    };

    chart.setThreshold = function (threshold)
    {
        _threshold = threshold;
    }

    chart.setHasTreshold = function(hasTreshold)
    {
        _hasThreshold = hasTreshold;
    }

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
            .style("stroke", "#c4c7c8")
            .style("stroke-width",8)
            .style("stroke-linejoin", "round")
            .style("opacity", .4);


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
                
            }
        }
        dispatch.update();
    }

    function mouseoverParty(d) {
        var deputies = svg.selectAll(".deputiesNodesDots .deputy").filter(function (dep) {
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

        /* Reset the search input */
        $('.searchDeputies').tagsinput('removeAll');

        var deputies = svg.selectAll(".deputiesNodesDots .deputy").filter(function (dep) {
            return dep.party === d;
        }).data();

        if (d3.event.shiftKey){
            deputies.forEach(function (d) {
                updateDeputyNodeInAllPeriods(d.deputyID, "selected", false);
            });
        } else
        if (d3.event.ctrlKey || d3.event.metaKey){
            deputies.forEach(function (d) {
                updateDeputyNodeInAllPeriods(d.deputyID, "selected", true);
            });
        }
        else {
            for (var key in deputyNodes){
                for (var index in deputyNodes[key])
                    deputyNodes[key][index].selected = false;
            }

            deputies.forEach(function (d) {
                updateDeputyNodeInAllPeriods(d.deputyID, "selected", true);
            });
        }

        dispatch.update();
    }

    function setDeputyFill( d ){
        //if (d.overlapped === null)
        //{
            if(d.vote != null){
                return CONGRESS_DEFINE.votoStringToColor[d.vote];
            }
            if(d.rate != null)
            {
                if (d.rate == "noVotes")
                    return 'grey'
                else return CONGRESS_DEFINE.votingColor(d.rate)
            } else
            {
                if (_hasThreshold && _deputiesByParties[d.party] <= _threshold)
                    return 'grey';
                else
                    return CONGRESS_DEFINE.getPartyColor(d.party)
            }
        //}
        //else
            //return '#ecdd06' //yellow;
    }

    function selColor(c){
        if (_hasThreshold && _deputiesByParties[c] <= _threshold)
            return 'grey'; 
        else
            return CONGRESS_DEFINE.partiesArbitraryColor[c]; 
    }

    chart.selectDeputiesBySearch = function (deputies) {
        for (var key in deputyNodes) {
            for (var index in deputyNodes[key])
                deputyNodes[key][index].selected = false;
        }

        deputies.forEach(function(d){
            updateDeputyNodeInAllPeriods(d.deputyID, "selected", true);
        });

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