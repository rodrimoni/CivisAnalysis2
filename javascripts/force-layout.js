function forceLayout() {
    var width = MAX_WIDTH,
        height = MAX_HEIGHT,
        margin_right = 150;
    padding = 1.5, // separation between same-color nodes
        clusterPadding = 6; // separation between different-color nodes

    var div = d3.select(".toolTip");
    var dispatch = d3.dispatch('update');
    var svg;
    var panelID;

    function chart(selection) {
        selection.each(function (data) {
            console.log(data);
            var hasLegend = data.legend;

            if (hasLegend)
                width = $(this).width() - margin_right;
            else
                width = $(this).width();

            height = $(this).height();

            var m = getPartyCount(data.nodes).length; // number of distinct clusters

            // The largest node for each cluster.
            var clusters = new Array(m);

            var nodes = data.nodes.map(function (e) {
                var i = e.party,
                    r = 10,
                    d = { cluster: i, radius: r, name: e.name, district: e.district, deputyID: e.deputyID, selected: e.selected, hovered: e.hovered };
                if (!clusters[i] || (r > clusters[i].radius)) clusters[i] = d;
                return d;
            });

            // Use the pack layout to initialize node positions.
            var pack = d3.layout.pack()
                .sort(null)
                .size([width, height])
                .children(function (d) { return d.values; })
                .value(function (d) { return d.radius * d.radius; })
                .nodes({
                    values: d3.nest()
                        .key(function (d) { return d.cluster; })
                        .entries(nodes)
                });

            var force = d3.layout.force()
                .nodes(nodes)
                .size([width, height])
                .gravity(.02)
                .charge(0)
                .on("tick", tick)
                .start();

            var viewBoxX = hasLegend ? 0 : -100;

            svg = d3.select(this)
                .append("svg")
                .classed("force-layout", true)
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", viewBoxX + " 0 " + 800 + " " + 400);

            if (hasLegend) {
                svg.append("rect")
                    .attr("width", width)
                    .attr("height", height);
            }

            var objects = svg.append("svg")
                .classed("objects", true)
                .attr("width", width)
                .attr("height", height);

            //$(this).on("resize", resize);

            panelID = ($(this).parents('.panel')).attr('id');

            var node = objects.selectAll("circle")
                .data(nodes)
                .enter().append("circle")
                .attr("class", function (d) { return (d.selected) ? "node selected" : (d.hovered) ? "node hovered" : "node"; })
                .attr("id", function (d) { return panelID + "_deputy-id-" + d.deputyID; })
                .style("fill", function (d) { return CONGRESS_DEFINE.getPartyColor(d.cluster); })
                .on('mousedown', function (d) {
                    mouseClickDeputy(d);
                })
                .on("mouseover", function (d) { showToolTip(renderDeputyTooltipHtml(d)); })
                .on("mousemove", function () { moveToolTip(); })
                .on("mouseout", function () { hideToolTip(); });

            node.transition()
                .duration(750)
                .delay(function (d, i) { return i * 5; })
                .attrTween("r", function (d) {
                    var i = d3.interpolate(0, d.radius);
                    return function (t) { return d.radius = i(t); };
                });

            if (hasLegend)
                updateLegend(nodes, svg);

            function renderDeputyTooltipHtml(d) {
                var color = CONGRESS_DEFINE.getPartyColor(d.cluster);
                var en = '<div style="min-width: 180px;">' +
                    '<div style="font-size:14px;font-weight:600;color:' + color + ';margin-bottom:4px;">' + d.name + ' (' + d.cluster + '-' + d.district + ')</div>' +
                    '<div style="margin-top:6px;font-size:11px;color:#666;\"><em>Left-Click to select</em><br><em>Right-Click to create new visualizations</em></div>' +
                    '</div>';
                var pt = '<div style="min-width: 180px;">' +
                    '<div style="font-size:14px;font-weight:600;color:' + color + ';margin-bottom:4px;">' + d.name + ' (' + d.cluster + '-' + d.district + ')</div>' +
                    '<div style="margin-top:6px;font-size:11px;color:#666;\"><em>Botão esquerdo para selecionar</em><br><em>Botão direito para criar novas vis.</em></div>' +
                    '</div>';
                return (language === PORTUGUESE) ? pt : en;
            }

            function showToolTip(html) { if (div.empty()) return; div.transition().duration(0); div.style("left", d3.event.pageX + 15 + "px"); div.style("top", d3.event.pageY - 10 + "px"); div.style("display", "inline-block").style("opacity", 1); div.html(html); }
            function moveToolTip() { if (div.empty()) return; div.style("left", d3.event.pageX + 15 + "px"); div.style("top", d3.event.pageY - 10 + "px"); }
            function hideToolTip() { if (div.empty()) return; div.transition().duration(0); div.style("display", "none").style("opacity", 1); }

            function updateLegend(data, svg) {
                var legend = svg.selectAll(".legend")
                    .data(data);

                var updateCircles = svg.selectAll('.legend circle');

                updateCircles
                    .attr("fill", function (d) { return CONGRESS_DEFINE.getPartyColor(d.cluster); });

                var enterLegend =
                    legend.enter().append("g")
                        .classed("legend", true)
                        /*.on('click', function(d) {
                            clickParty(d);
                        })
                        .on('mouseover', mouseoverParty)
                        .on('mouseout', mouseoutParty)*/;


                enterLegend
                    .attr("transform", function (d, i) {
                        if (i % 2 === 0) {
                            if (nodes.length > 70) {
                                y = i * 5;
                                y = y - 70;
                            }
                            else
                                y = i * 7;
                            return "translate(0," + y + ")";
                        }
                        else {
                            if (nodes.length > 70) {
                                y = (i - 1) * 5;
                                y = y - 70;
                            }
                            else
                                y = (i - 1) * 7;

                            return "translate(200," + y + ")";
                        }
                    });

                enterLegend.append("circle")
                    .attr("r", 3)
                    .attr("cx", width + 10)
                    .attr("fill", function (d) { return CONGRESS_DEFINE.getPartyColor(d.cluster); });

                enterLegend.append("text")
                    .attr("x", width + 20)
                    .attr("dy", ".45em")
                    .text(function (d) { return d.name });

            }

            function tick(e) {
                node
                    .each(cluster(10 * e.alpha * e.alpha))
                    .each(collide(.5))
                    .attr("cx", function (d) { return d.x; })
                    .attr("cy", function (d) { return d.y; });
            }

            function mouseClickDeputy(d) {
                var deputyNodes = state.getDeputyNodes();
                d3.event.preventDefault();
                if (d3.event.shiftKey) {
                    // using the shiftKey deselect the deputy
                    updateDeputyNodeInAllPeriods(d.deputyID, "selected", false);
                } else
                    if (d3.event.ctrlKey || d3.event.metaKey) {
                        // using the ctrlKey add deputy to selection
                        updateDeputyNodeInAllPeriods(d.deputyID, "selected", !d.selected);
                    }
                    else {
                        // a left click without any key pressed and
                        // a right click in a deputy unselected
                        // -> select only the deputy (deselect others)
                        if (d3.event.which === 1 || (d3.event.which === 3 && !d.selected)) {
                            for (var key in deputyNodes) {
                                for (var index in deputyNodes[key])
                                    deputyNodes[key][index].selected = false;
                            }
                            updateDeputyNodeInAllPeriods(d.deputyID, "selected", true);

                        }
                    }
                dispatch.update();
            }

            function resize() {
                width = $(this).width() - margin_right, height = $(this).height();
                objects.attr("width", width).attr("height", height);
                force.size([width, height]).resume();
            }

            // Move d to be adjacent to the cluster node.
            function cluster(alpha) {
                return function (d) {
                    var cluster = clusters[d.cluster];
                    if (cluster === d) return;
                    var x = d.x - cluster.x,
                        y = d.y - cluster.y,
                        l = Math.sqrt(x * x + y * y),
                        r = d.radius + cluster.radius;
                    if (l !== r) {
                        l = (l - r) / l * alpha;
                        d.x -= x *= l;
                        d.y -= y *= l;
                        cluster.x += x;
                        cluster.y += y;
                    }
                };
            }

            // Resolves collisions between d and all other circles.
            function collide(alpha) {
                var quadtree = d3.geom.quadtree(nodes);
                return function (d) {
                    var r = d.radius * 3 + Math.max(padding, clusterPadding),
                        nx1 = d.x - r,
                        nx2 = d.x + r,
                        ny1 = d.y - r,
                        ny2 = d.y + r;
                    quadtree.visit(function (quad, x1, y1, x2, y2) {
                        if (quad.point && (quad.point !== d)) {
                            var x = d.x - quad.point.x,
                                y = d.y - quad.point.y,
                                l = Math.sqrt(x * x + y * y),
                                r = d.radius + quad.point.radius + (d.cluster === quad.point.cluster ? padding : clusterPadding);
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
        })
    }

    chart.update = function () {
        var tree = state.getTree();
        var deputyNodes = state.getDeputyNodes();
        var node = tree.getNode(panelID, tree.traverseBF);
        if (node !== null) {
            parentID = node.parent.data;
            svg.selectAll(".node")
                .transition()
                .attr("class", function (d) { return (deputyNodes[parentID][d.deputyID].selected) ? "node selected" : (deputyNodes[parentID][d.deputyID].hovered) ? "node hovered" : "node"; })
                .style("fill", function (d) { return CONGRESS_DEFINE.getPartyColor(d.cluster); })
        }
    };

    return d3.rebind(chart, dispatch, 'on');
}