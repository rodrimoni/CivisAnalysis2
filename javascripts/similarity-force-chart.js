function similarityForce() {
    var margin = { top: 50, right: 0, bottom: 0, left: 0 },
        outerWidth = 1075,
        outerHeight = 780,
        width = outerWidth - margin.left - margin.right,
        height = outerHeight - margin.top - margin.bottom;

    var svg;
    var panelID;
    var panelNode;
    var dispatch = d3.dispatch('update');
    var div = d3.select(".toolTip");
    var simulation;
    var nodeRadius = 5;

    // View state: the full graph plus the two cuts applied to it before drawing.
    var currentData;
    var currentSimilarity = 80;
    var selectedParties = [];

    function drag(simulation) {
        function dragstarted(d) {
            if (!d3v4.event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(d) {
            d.fx = d3v4.event.x;
            d.fy = d3v4.event.y;
        }

        function dragended(d) {
            if (!d3v4.event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return d3v4.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }

    function update(data, hmtlContent) {

        svg = d3v4.select(hmtlContent)
            .classed("svg-container", true) //container class to make it responsive
            .append("svg")
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", [-outerWidth / 2, -outerHeight / 2 + 50, outerWidth, outerHeight])
            //class to make it responsive
            .classed("svg-content-responsive", true)
            .classed("similarity-force", true)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const links = data.links.map(function (d) { return Object.create(d) });
        const nodes = data.nodes.map(function (d) { return Object.create(d) });

        simulation = d3v4.forceSimulation(nodes)
            .force("link", d3v4.forceLink(links).id(function (d) { return d.deputyID; }))
            .force("charge", d3v4.forceManyBody())
            .force("x", d3v4.forceX())
            .force("y", d3v4.forceY());


        const link = svg.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(links)
            .enter()
            .append('line')
            .attr("stroke-width", 1);

        const node = svg.append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .selectAll("circle")
            .data(nodes)
            .enter()
            .append('circle')
            .attr("class", function (d) { return (d.selected) ? "node selected" : ((d.hovered) ? "node hovered" : "node"); })
            .attr("r", function (d) { return (d.hovered) ? nodeRadius * 2 : nodeRadius; })
            .attr("id", function (d) { return panelID + "_deputy-id-" + d.deputyID; })
            .attr("fill", setDeputyFill)
            /*.on("mousemove", function(d){
                div.style("left", d3v4.event.pageX+10+"px");
                div.style("top", d3v4.event.pageY-25+"px");0
                div.style("display", "inline-block");
                div.html(d.name + " (" + d.party + "-" + d.district + ") ");
            })*/
            .on('mousedown', function (d) {
                mouseClickDeputy(d);
            })
            .on('mouseup', function () {
                $('.searchDeputies').tagsinput('removeAll')
            })
            .on("mouseover", function (d) { mouseoverDeputy(d); showToolTip(renderDeputyTooltipHtml(d)); })
            .on("mousemove", function () { moveToolTip(); })
            .on("mouseout", function (d) { hideToolTip(); mouseoutDeputy(d); });

        function renderDeputyTooltipHtml(d) {
            var color = CONGRESS_DEFINE.getPartyColor(d.party);
            var en = '<div style="min-width: 180px;">' +
                '<div style="font-size:14px;font-weight:600;color:' + color + ';margin-bottom:4px;">' + d.name + ' (' + d.party + '-' + d.district + ')</div>' +
                '<div style="margin-top:6px;font-size:11px;color:#666;\"><em>Left-Click to select</em><br><em>Right-Click to create new visualizations</em></div>' +
                '</div>';
            var pt = '<div style="min-width: 180px;">' +
                '<div style="font-size:14px;font-weight:600;color:' + color + ';margin-bottom:4px;">' + d.name + ' (' + d.party + '-' + d.district + ')</div>' +
                '<div style="margin-top:6px;font-size:11px;color:#666;\"><em>Botão esquerdo para selecionar</em><br><em>Botão direito para criar novas vis.</em></div>' +
                '</div>';
            return (language === PORTUGUESE) ? pt : en;
        }

        function showToolTip(html) { if (div.empty()) return; div.transition().duration(0); div.style("left", d3v4.event.pageX + 15 + "px"); div.style("top", d3v4.event.pageY - 10 + "px"); div.style("display", "inline-block").style("opacity", 1); div.html(html); }
        function moveToolTip() { if (div.empty()) return; div.style("left", d3v4.event.pageX + 15 + "px"); div.style("top", d3v4.event.pageY - 10 + "px"); }
        function hideToolTip() { if (div.empty()) return; div.transition().duration(0); div.style("display", "none").style("opacity", 1); }

        simulation.on("tick", function () {
            link.attr("x1", function (d) { return d.source.x; })
                .attr("y1", function (d) { return d.source.y })
                .attr("x2", function (d) { return d.target.x })
                .attr("y2", function (d) { return d.target.y });

            node
                .attr("cx", function (d) { return d.x; })
                .attr("cy", function (d) { return d.y });
        });

        $("#" + panelID + " .node")
            .contextMenu({
                menuSelector: "#contextMenuDeputy",
                menuSelected: function (invokedOn, selectedMenu) {
                    handleContextMenuDeputy(invokedOn, selectedMenu);
                }
            });
    }

    /**
     * Build the subgraph to draw: edges at or above the similarity cut and,
     * when parties are selected, only deputies from those parties. Edges that
     * lost an endpoint must go too — forceLink throws on a missing node.
     * Party membership never changes a pairwise similarity value, so pruning
     * here is equivalent to recomputing with fewer deputies, and free.
     * Re-runnable because update() draws copies (Object.create), leaving raw
     * deputyIDs on currentData's link source/target.
     */
    function applyFilters(data, similarity, parties) {
        var nodes = d3.values(data.nodes);

        if (parties.length)
            nodes = nodes.filter(function (d) { return parties.indexOf(d.party) !== -1; });

        var kept = {};
        nodes.forEach(function (d) { kept[d.deputyID] = true; });

        var links = data.links.filter(function (d) {
            return d.value >= similarity && kept[d.source] && kept[d.target];
        });

        return { nodes: nodes, links: links };
    }

    /**
     * Redraw the SVG from currentData under the current cuts. The slider lives
     * in .panel-body outside the SVG, so its value survives untouched.
     */
    function render() {
        if (simulation) simulation.stop();
        $(panelNode).find('svg').remove();
        update(applyFilters(currentData, currentSimilarity, selectedParties), panelNode);
    }

    function chart(selection) {
        selection.each(function (data) {
            panelID = ($(this).parents('.panel')).attr('id');
            panelNode = this;
            currentData = data;

            $("#" + panelID + " .panel-body")
                .append('<div style="padding:10px;"><span class ="trn">Select the grade of similarity</span>: <b>50%</b> <input id= "slider-similarity-' + panelID + '" type="text" data-slider-min="50" data-slider-max="100" data-slider-step="1" data-slider-value="80"/> <b>100%</b></div>');

            var mySlider = $("#slider-similarity-" + panelID).bootstrapSlider({
                tooltip_position: 'bottom',
                formatter: function (value) {
                    return value + "%";
                }
            });

            mySlider.on("slideStop", function (slideEvt) {
                currentSimilarity = slideEvt.value;
                render();
            });

            render();
        })
    }

    function setDeputyFill(d) {
        if (d.vote != null) {
            return CONGRESS_DEFINE.votoStringToColor[d.vote];
        }
        if (d.rate != null) {
            if (d.rate == "noVotes")
                return 'grey';
            else return CONGRESS_DEFINE.votingColor(d.rate)
        } else {
            return CONGRESS_DEFINE.getPartyColor(d.party)
        }
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
        var deputyNodes = state.getDeputyNodes();
        d3v4.event.preventDefault();

        if (d3v4.event.shiftKey) {
            // using the shiftKey deselect the deputy
            updateDeputyNodeInAllPeriods(d.deputyID, "selected", false);
        } else
            if (d3v4.event.ctrlKey || d3v4.event.metaKey) {
                // using the ctrlKey add deputy to selection
                updateDeputyNodeInAllPeriods(d.deputyID, "selected", !d.selected);
            }
            else {
                // a left click without any key pressed and
                // a right click in a deputy unselected
                // -> select only the deputy (deselect others)
                if (d3v4.event.which === 1 || (d3v4.event.which === 3 && !d.selected)) {
                    for (var key in deputyNodes) {
                        for (var index in deputyNodes[key])
                            deputyNodes[key][index].selected = false;
                    }
                    updateDeputyNodeInAllPeriods(d.deputyID, "selected", true);
                }
            }
        dispatch.update();
    }

    chart.update = function () {
        svg.selectAll(".node")
            .transition()
            .style("fill", setDeputyFill)
            .attr("class", function (d) { return (d.selected) ? "node selected" : ((d.hovered) ? "node hovered" : "node"); })
            .attr("r", function (d) { return (d.hovered) ? nodeRadius * 2 : nodeRadius; });
    };

    chart.setPartyFilter = function (parties) {
        selectedParties = parties || [];
        render();
    };

    chart.reloadSimilarityGraph = function (data) {
        currentData = data;
        render();
    };

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

    return d3.rebind(chart, dispatch, 'on');
}