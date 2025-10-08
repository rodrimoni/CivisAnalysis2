function scatterPlotChart() {
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
        .range([width, 0]);

    var y = d3.scale.linear()
        .range([0, height]);

    var partyCountByOverlappedGroup = [];
    var svg;
    var panelID;
    var panelToBeRedrawn;
    var checkbox;
    var alignmentCheckbox;
    var nodesData; // Store nodes data for hull calculations
    var originalXDomain; // Store original x scale domain before zoom
    var originalYDomain; // Store original y scale domain before zoom

    var dispatch = d3.dispatch('update');
    var div = d3.select(".toolTip");
    var brush;
    var isForceLayout = false;
    var showAlignmentOpacity = false;

    function chart(selection) {
        selection.each(function (data) {
            panelID = ($(this).parents('.panel')).attr('id');

            // Add the checkbox container for controls
            var checkboxContainer = d3.select(this)
                .append("div")
                .attr("class", "checkbox-container")
                .attr("style", "margin-top:20px; margin-left: 20px; position: absolute");

            // Overlapping deputies checkbox
            var label1 = checkboxContainer.append("label");
            label1.append("input")
                .attr("type", "checkbox")
                .attr("id", panelID + "-forceLayoutApply")
                .attr("class", "forceLayoutCheckbox")
                .each(function () { checkbox = d3.select(this); });
            label1.append("span")
                .text(language === PORTUGUESE ? "Mostrar deputados sobrepostos" : "Show overlapping deputies");

            // Party alignment opacity checkbox
            var label2 = checkboxContainer.append("label");
            label2.append("input")
                .attr("type", "checkbox")
                .attr("id", panelID + "-alignmentOpacity")
                .attr("class", "alignmentOpacityCheckbox")
                .each(function () { alignmentCheckbox = d3.select(this); });
            label2.append("span")
                .text(language === PORTUGUESE ? "Mostrar opacidade por alinhamento partidário" : "Show party alignment opacity");

            chart.createScatterPlotChart(data, this);

        })
    }

    chart.createScatterPlotChart = function (data, htmlBody) {
        var nodes = d3.values(data);
        panelToBeRedrawn = htmlBody;
        _deputiesByParties = getPartyCountAllScatter(nodes);

        preProcessOverlappingData(nodes);
        drawScatterPlot(nodes, htmlBody);
    }

    chart.reloadScatterPlotChart = function (data, panelID) {
        var htmlContent = $('#' + panelID + " .panel-body");

        // Remove old checkbox container and svg
        d3.select('#' + panelID + " .checkbox-container").remove();
        d3.select('#' + panelID + " .scatter-plot").remove();

        // reset globals
        isForceLayout = false;
        showAlignmentOpacity = false;
        partyCountByOverlappedGroup = []

        chart.createScatterPlotChart(data, htmlContent[0]);
    };

    function preProcessOverlappingData(nodes) {
        //sorting nodes to compare and find duplicates
        nodes.sort(function (a, b) {
            if (a.scatterplot[0] > b.scatterplot[0]) return 1;
            if (a.scatterplot[0] < b.scatterplot[0]) return -1;

            if (a.scatterplot[1] > b.scatterplot[1]) return 1;
            if (a.scatterplot[1] < b.scatterplot[1]) return -1;
        });

        var groupId = 0;
        var countDuplicates = 0;
        function addInOverlappedGroup(elem) {
            if (partyCountByOverlappedGroup[elem.overlapped] === undefined) {
                /*partyCountByOverlappedGroup[elem.overlapped] = {"name": elem.overlapped, "scatX": elem.scatterplot[1], "scatY": elem.scatterplot[0]}
                partyCountByOverlappedGroup[elem.overlapped]["children"] = [];
                partyCountByOverlappedGroup[elem.overlapped]["children"][elem.party] = {"name": elem.party, "size": 1};*/

                partyCountByOverlappedGroup[elem.overlapped] = { "name": elem.overlapped, "parties": [] };
                partyCountByOverlappedGroup[elem.overlapped]["parties"][elem.party] = { "name": elem.party, "elem": elem };
            }
            else {
                /*if (partyCountByOverlappedGroup[elem.overlapped]["children"][elem.party] === undefined)
                    partyCountByOverlappedGroup[elem.overlapped]["children"][elem.party] = {"name": elem.party, "size": 1};
                else
                    partyCountByOverlappedGroup[elem.overlapped]["children"][elem.party].size += 1;*/
                if (partyCountByOverlappedGroup[elem.overlapped]["parties"][elem.party] === undefined)
                    partyCountByOverlappedGroup[elem.overlapped]["parties"][elem.party] = { "name": elem.party, "elem": elem };
            }
        }

        for (let i = 0; i < nodes.length; i++) {
            if (i >= nodes.length - 1) //last element
            {
                if (Number(nodes[i - 1].scatterplot[0]).toFixed(7) == Number(nodes[i].scatterplot[0]).toFixed(7) && Number(nodes[i - 1].scatterplot[1]).toFixed(7) == Number(nodes[i].scatterplot[1]).toFixed(7)) {
                    nodes[i].overlapped = groupId;
                    addInOverlappedGroup(nodes[i]);
                    countDuplicates++;
                }
            }
            else {
                if (Number(nodes[i + 1].scatterplot[0]).toFixed(7) == Number(nodes[i].scatterplot[0]).toFixed(7) && Number(nodes[i + 1].scatterplot[1]).toFixed(7) == Number(nodes[i].scatterplot[1]).toFixed(7)) {
                    nodes[i].overlapped = groupId;
                    addInOverlappedGroup(nodes[i]);
                    countDuplicates++;
                }
                else {
                    if (countDuplicates > 0) {
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
    }

    function drawScatterPlot(nodes, htmlContent) {
        nodesData = nodes; // Store nodes for later use
        offSetBigCluster = 1.10;
        if (partyCountByOverlappedGroup.length > 20)
            offSetBigCluster = 1.35;

        var xMax = d3.max(nodes, function (d) { return d.scatterplot[1]; }) * offSetBigCluster,
            xMin = d3.min(nodes, function (d) { return d.scatterplot[1]; }),
            xMin = xMin > 0 ? 0 : xMin * offSetBigCluster,
            yMax = d3.max(nodes, function (d) { return d.scatterplot[0]; }) * offSetBigCluster,
            yMin = d3.min(nodes, function (d) { return d.scatterplot[0]; }),
            yMin = yMin > 0 ? 0 : yMin * offSetBigCluster;

        x.domain([xMin, xMax]);
        y.domain([yMin, yMax]);

        // Store original domains before zoom modifies them
        originalXDomain = x.domain().slice(); // Create a copy
        originalYDomain = y.domain().slice(); // Create a copy

        var zoom = d3.behavior.zoom()
            .x(x)
            .y(y)
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

        var deputiesNodesDots = objects.append("svg:g").attr("class", "deputiesNodesDots");

        var force = d3.layout.force()
            .nodes(nodes)
            .size([width, height])
            .on("tick", tick)
            .charge(-0.1)
            .gravity(0)
            .chargeDistance(20);


        // Create scales with original domains for force layout calculations
        var xOriginalForce = d3.scale.linear()
            .domain(originalXDomain)
            .range(x.range());

        var yOriginalForce = d3.scale.linear()
            .domain(originalYDomain)
            .range(y.range());

        // Set initial positions using original scales
        nodes.forEach(function (d) {
            d.x = xOriginalForce(d.scatterplot[1]);
            d.y = yOriginalForce(d.scatterplot[0]);
            d.radius = nodeRadius;
        });

        var deputies = deputiesNodesDots.selectAll("circle")
            .data(nodes)
            .enter()
            .append("circle")
            .attr(popoverAttr(deputyPopOver, 'top'))
            .attr("class", function (d) { return (d.selected) ? "node selected" : ((d.hovered) ? "node hovered" : "node"); })
            .attr("r", function (d) { return (d.hovered) ? nodeRadius * 2 : nodeRadius; })
            .attr("id", function (d) { return panelID + "_deputy-id-" + d.deputyID; })
            .attr("cx", function (d) { return x(d.scatterplot[1]); })
            .attr("cy", function (d) { return y(d.scatterplot[0]); })
            .style("fill", function (d) { return setDeputyFill(d); })
            .style("fill-opacity", function (d) {
                if (!showAlignmentOpacity) return 1.0; // Fully opaque when disabled
                return getAlignmentOpacity(d.alignment);
            })
            .on('mousedown', function (d) {
                mouseClickDeputy(d);
            })
            .on('mouseup', function () {
                $('.searchDeputies').tagsinput('removeAll');
            })
            .on("mouseover",
                //mouseOverDeputy(d.deputyID, this);
                mouseoverDeputy
            )
            .on("mouseout", function (d) {
                div.style("display", "none");
                mouseoutDeputy(d);
            });

        function deputyPopOver(d) {
            var deputyTooltipEnglish;
            var deputyTooltipPortuguese;

            // Convert alignment to percentage (0-1 → 0-100%)
            var alignmentPercentage = d.alignment ? Math.round(d.alignment * 100) : 0;

            deputyTooltipEnglish = '<strong>' + d.name + ' (' + d.party + '-' + d.district + ")</strong><br>" +
                '<span style="color: #666;">Party Alignment: ' + alignmentPercentage + '%</span><br>' +
                "<em>Left-Click to select</em><br>" +
                "<em>Right-Click to create new visualizations</em>";

            deputyTooltipPortuguese = '<strong>' + d.name + ' (' + d.party + '-' + d.district + ")</strong><br>" +
                '<span style="color: #666;">Alinhamento Partidário: ' + alignmentPercentage + '%</span><br>' +
                "<em>Botão esquerdo para selecionar</em><br>" +
                "<em>Botão direito para criar novas vis.</em>";

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

        d3.select("#" + panelID + "-forceLayoutApply").on("change", function () {
            if (checkbox.node().checked) {
                if (!isForceLayout) {
                    force.start();
                    isForceLayout = true;
                }
                else {
                    svg.selectAll('.node')
                        .transition().duration(1000)
                        .attr('cx', function (d) { return d.x; })
                        .attr('cy', function (d) { return d.y; });
                }
            }
            else {
                force.stop();
                svg.selectAll('.node')
                    .transition().duration(1000)
                    .attr('cx', function (d) { return xOriginalForce(d.scatterplot[1]); })
                    .attr('cy', function (d) { return yOriginalForce(d.scatterplot[0]); });
                /*$(panelToBeRedrawn).find('svg').remove();
                deputies.each(resetPositions);
                drawScatterPlot(nodes, panelToBeRedrawn, false);*/
            }
        });

        // Party alignment opacity toggle
        d3.select("#" + panelID + "-alignmentOpacity").on("change", function () {
            showAlignmentOpacity = alignmentCheckbox.node().checked;

            // Update all node opacities with smooth transition
            svg.selectAll('.node')
                .transition()
                .duration(500)
                .style("fill-opacity", function (d) {
                    if (!showAlignmentOpacity) return 1.0; // Fully opaque when disabled
                    // Map alignment (0-1) to opacity range (0.4-1.0) for better visibility
                    return d.alignment ? 0.4 + (d.alignment * 0.6) : 0.7;
                });
        });

        function tick(e) {
            deputies.each(moveTowardDataPosition(e.alpha));
            deputies.each(cluster(10 * e.alpha * e.alpha))
            deputies.each(collide(e.alpha));

            deputies.attr("cx", function (d) { return d.x; })
                .attr("cy", function (d) { return d.y; });

        }

        function resetPositions() {
            return function (d) {
                d.x = xOriginalForce(d.scatterplot[1]);
                d.y = yOriginalForce(d.scatterplot[0]);
            }
        }

        function moveTowardDataPosition(alpha) {
            return function (d) {
                d.x += (xOriginalForce(d.scatterplot[1]) - d.x) * 0.1 * alpha;
                d.y += (yOriginalForce(d.scatterplot[0]) - d.y) * 0.1 * alpha;
            };
        }

        function cluster(alpha) {
            return function (d) {
                if (d.overlapped !== null) {
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
            return function (d) {
                var r = d.radius + nodeRadius + padding,
                    nx1 = d.x - r,
                    nx2 = d.x + r,
                    ny1 = d.y - r,
                    ny2 = d.y + r;
                quadtree.visit(function (quad, x1, y1, x2, y2) {
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
                .data(d3.map(data, function (d) { return d.party; }).keys());

            var updateCircles = svg.selectAll('.legend circle');

            updateCircles
                .attr("fill", function (d) { return selColor(d); });

            var enterLegend =
                legend.enter().append("g")
                    .classed("legend", true)
                    .on('click', function (d) {
                        clickParty(d);
                    })
                    .on('mouseover', mouseoverParty)
                    .on('mouseout', mouseoutParty);

            enterLegend
                .attr("transform", function (d, i) { if (i % 2 === 0) return "translate(0," + i * 30 + ")"; else return "translate(150," + (i - 1) * 30 + ")"; });

            enterLegend.append("circle")
                .attr("r", 6)
                .attr("cx", width + 20)
                .attr("fill", function (d) { return selColor(d); });

            enterLegend.append("text")
                .attr("x", width + 40)
                .attr("dy", ".45em")
                .text(function (d) { return d });

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
            var SHIFTKEY = state.getShiftKey();
            if (SHIFTKEY) {
                // Temporarily disable zoom during brushing
                svg.on(".zoom", null);
                var e = brush.extent();
                console.log(e);
                var deps = svg.selectAll(".node").filter(function (d) {
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
            // Re-enable zoom after brushing
            svg.call(zoom);
            d3.event.target.clear();
            d3.select(this).call(d3.event.target);
            //console.log(d3.event.target);
            //if (brush.empty()) resetSelection();
        }

    };

    chart.margin = function (_) {
        if (!arguments.length) return margin;
        margin = _;
        return chart;
    };

    chart.width = function (_) {
        if (!arguments.length) return width;
        width = _;
        return chart;
    };

    chart.height = function (_) {
        if (!arguments.length) return height;
        height = _;
        return chart;
    };

    chart.outerWidth = function (_) {
        if (!arguments.length) return outerWidth;
        outerWidth = _;
        return chart;
    };

    chart.outerHeight = function (_) {
        if (!arguments.length) return outerHeight;
        outerHeight = _;
        return chart;
    };

    chart.partyCount = function (_) {
        if (!arguments.length) return partyCount;
        partyCount = _;
        return chart;
    };

    chart.update = function () {
        svg.selectAll(".deputiesNodesDots .node")
            .transition()
            .style("fill", function (d) { return setDeputyFill(d); })
            .style("fill-opacity", function (d) {
                if (!showAlignmentOpacity) return 1.0; // Fully opaque when disabled
                return getAlignmentOpacity(d.alignment);
            })
            .attr("class", function (d) { return (d.selected) ? "node selected" : (d.hovered) ? "node hovered" : "node"; })
            .attr("r", function (d) { return (d.hovered) ? nodeRadius * 2 : nodeRadius; });

        svg.selectAll('.legend circle')
            .attr("fill", function (d) { return selColor(d); });
    };

    chart.setThreshold = function (threshold) {
        _threshold = threshold;
    }

    chart.setHasTreshold = function (hasTreshold) {
        _hasThreshold = hasTreshold;
    }

    chart.getClusters = function (k, data, id) {
        console.log(data);
        //number of clusters, defaults to undefined
        clusterMaker.k(k);

        //number of iterations (higher number gives more time to converge), defaults to 1000
        clusterMaker.iterations(750);

        //data from which to identify clusters, defaults to []
        clusterMaker.data(data);

        this.clusters = clusterMaker.clusters();
        var clustersPoints = [];

        this.clusters.forEach(function (cluster, index) {
            clustersPoints.push({
                "cluster": index, "points": cluster.points.map(function (t) {
                    return t.location;
                })
            });
        });

        console.log(this.clusters);

        //updateHulls(hullSets, id);
        updateHullsTest(clustersPoints, id);
    };

    function updateHullsTest(data, id) {
        // Create temporary scales with original domains for hull calculation
        var xOriginal = d3.scale.linear()
            .domain(originalXDomain)
            .range(x.range());

        var yOriginal = d3.scale.linear()
            .domain(originalYDomain)
            .range(y.range());

        var groupPath = function (d) {
            return "M" +
                d3.geom.hull(d.points.map(function (i) { return [xOriginal(i[1]), yOriginal(i[0])]; }))
                    .join("L")
                + "Z";
        };

        var col = d3.scale.category10();
        var deputiesClusters = "#" + id + " .deputiesClusters";
        var svg = d3.select(deputiesClusters);

        var toolTipCluster = d3.select('.toolTipCluster');

        var objects = svg.selectAll(".hull")
            .data(data, function (d) { return d; });

        objects
            .attr("d", groupPath)
            .style("fill", "#ffffff")
            .style("stroke", "#c4c7c8")
            .style("stroke-width", 8)
            .style("stroke-linejoin", "round")
            .style("opacity", .4);


        var enterObjects = objects
            .data(data)
            .enter();

        enterObjects
            .append("a")
            .attr("xlink:href", "javascript:;")
            .on("click", function (d) {
                toolTipCluster.style("left", d3.event.pageX + 10 + "px");
                toolTipCluster.style("top", d3.event.pageY - 25 + "px");
                toolTipCluster.style("display", "inline-block");
                toolTipCluster.html("Cluster " + d.cluster);
            })
            .on("blur", hideToolTipCluster)
            .append("path")
            .classed("hull", true)
            .attr("id", function (d) { return "cluster_id_" + d.cluster; })
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
        dispatch.update();

    }

    // mouse OVER circle deputy
    function mouseoverDeputy(d) {
        updateDeputyNodeInAllPeriods(d.deputyID, "hovered", true);
        dispatch.update();
    }

    // mouse OUT circle deputy
    function mouseoutDeputy(d) {
        updateDeputyNodeInAllPeriods(d.deputyID, "hovered", false);
        dispatch.update();
    }

    function mouseClickDeputy(d) {
        d3.event.preventDefault();
        var deputyNodes = state.getDeputyNodes();

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

    function mouseoverParty(d) {
        var deputies = svg.selectAll(".deputiesNodesDots .node").filter(function (dep) {
            return dep.party === d;
        }).data();

        deputies.forEach(function (d) {
            updateDeputyNodeInAllPeriods(d.deputyID, "hovered", true);
        });

        dispatch.update();

    }

    function mouseoutParty() {
        var deputyNodes = state.getDeputyNodes();
        for (var key in deputyNodes) {
            for (var index in deputyNodes[key])
                deputyNodes[key][index].hovered = false;
        }
        dispatch.update();
    }

    function clickParty(d) {
        var deputyNodes = state.getDeputyNodes();

        /* Reset the search input */
        $('.searchDeputies').tagsinput('removeAll');

        var deputies = svg.selectAll(".deputiesNodesDots .node").filter(function (dep) {
            return dep.party === d;
        }).data();

        if (d3.event.shiftKey) {
            deputies.forEach(function (d) {
                updateDeputyNodeInAllPeriods(d.deputyID, "selected", false);
            });
        } else
            if (d3.event.ctrlKey || d3.event.metaKey) {
                deputies.forEach(function (d) {
                    updateDeputyNodeInAllPeriods(d.deputyID, "selected", true);
                });
            }
            else {
                for (var key in deputyNodes) {
                    for (var index in deputyNodes[key])
                        deputyNodes[key][index].selected = false;
                }

                deputies.forEach(function (d) {
                    updateDeputyNodeInAllPeriods(d.deputyID, "selected", true);
                });
            }

        dispatch.update();
    }

    function setDeputyFill(d) {
        if (d.vote != null) {
            return CONGRESS_DEFINE.votoStringToColor[d.vote];
        }
        if (d.rate != null) {
            if (d.rate == "noVotes")
                return 'grey'
            else return CONGRESS_DEFINE.votingColor(d.rate)
        } else {
            if (_hasThreshold && _deputiesByParties[d.party] <= _threshold)
                return 'grey';
            else
                return CONGRESS_DEFINE.getPartyColor(d.party)
        }

    }

    function selColor(c) {
        if (_hasThreshold && _deputiesByParties[c] <= _threshold)
            return 'grey';
        else
            return CONGRESS_DEFINE.partiesArbitraryColor[c];
    }

    chart.selectDeputiesBySearch = function (deputies) {
        var deputyNodes = state.getDeputyNodes();
        for (var key in deputyNodes) {
            for (var index in deputyNodes[key])
                deputyNodes[key][index].selected = false;
        }

        deputies.forEach(function (d) {
            updateDeputyNodeInAllPeriods(d.deputyID, "selected", true);
        });

        dispatch.update();
    };

    chart.enableBrush = function () {
        svg.select(".objects").append("g")
            .attr("class", "brush")
            .call(brush);
    };

    chart.disableBrush = function () {
        svg.select(".brush").remove();
    };

    chart.showConvexHullOfParties = function (parties) {
        if (!nodesData || !svg || !parties || parties.length === 0) {
            console.warn("Cannot show convex hulls: missing data, svg, or parties");
            return;
        }

        // Create temporary scales with original domains for hull calculation
        var xOriginal = d3.scale.linear()
            .domain(originalXDomain)
            .range(x.range());

        var yOriginal = d3.scale.linear()
            .domain(originalYDomain)
            .range(y.range());

        // Prepare data for each party
        var partyHullData = [];

        parties.forEach(function (party) {
            // Filter deputies by party
            var partyDeputies = nodesData.filter(function (d) {
                return d.party === party;
            });

            // Need at least 3 points to create a hull
            if (partyDeputies.length >= 3) {
                partyHullData.push({
                    party: party,
                    deputies: partyDeputies,
                    color: CONGRESS_DEFINE.getPartyColor(party)
                });
            }
        });

        // Function to create hull path using ORIGINAL scales
        var groupPath = function (d) {
            var points = d.deputies.map(function (deputy) {
                return [xOriginal(deputy.scatterplot[1]), yOriginal(deputy.scatterplot[0])];
            });

            var hull = d3.geom.hull(points);
            return "M" + hull.join("L") + "Z";
        };

        var deputiesClusters = svg.select(".deputiesClusters");

        // Remove existing party hulls
        deputiesClusters.selectAll(".party-hull").remove();

        // Draw hulls - use insert to place them at the beginning (bottom of z-order)
        var hulls = deputiesClusters.selectAll(".party-hull")
            .data(partyHullData)
            .enter()
            .insert("path", ":first-child")
            .attr("class", "party-hull")
            .attr("d", groupPath)
            .style("fill", function (d) { return d.color; })
            .style("fill-opacity", 0.5)
            .style("stroke", function (d) { return d.color; })
            .style("stroke-width", 2)
            .style("stroke-linejoin", "round")
            .style("pointer-events", "none"); // Allow mouse events to pass through to deputies

        dispatch.update();
        return hulls;
    };

    chart.hideConvexHulls = function () {
        if (!svg) return;
        svg.selectAll(".party-hull").remove();
        dispatch.update();
    };

    return d3.rebind(chart, dispatch, 'on');
}