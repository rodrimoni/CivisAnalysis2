/* Rice Index Calculation Types */
const RICE_TYPE_CLASSIC = 0;  // Only considers Yes/No
const RICE_TYPE_BRAZIL = 1;   // Considers Yes/No/Obstruction


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
    var nodesData; // Store nodes data for hull calculations
    var originalXDomain; // Store original x scale domain before zoom
    var originalYDomain; // Store original y scale domain before zoom
    // Parties picked in the legend. Drives the distribution hulls and gates the
    // alignment control, which only means anything within a chosen party.
    var selectedParties = [];

    var dispatch = d3.dispatch('update');
    var div = d3.select(".toolTip");
    var brush;
    var isForceLayout = false;
    var showAlignmentOpacity = false;
    var showPartyEnvelope = false;

    // Assigned by drawScatterPlot, which owns the force simulation and the
    // pre-force scales these need. No-ops until the plot has been drawn.
    var toggleOverlapping = function () { };
    var toggleEnvelope = function () { };

    // Layers the reader can switch on, as toggles rather than checkboxes: the
    // filled state reads at a glance and the strip stays on one line. Same
    // shape as the histogram's controls, so the two charts behave alike.
    var pills = {};
    var infoOpen = false, infoPanel = null, infoBtn = null;

    // Selected deputies already sit at full CSS opacity while the rest are
    // faded, so fill-opacity is free to carry alignment on top of that.
    var MIN_ALIGNMENT_OPACITY = 0.15;

    function pillText(key) {
        var pt = (language === PORTUGUESE);
        if (key === 'overlapping') return pt ? 'Deputados sobrepostos' : 'Overlapping deputies';
        if (key === 'envelope') return pt ? 'Área de distribuição dos partidos' : 'Party distribution area';
        return pt ? 'Alinhamento deputado-partido' : 'Deputy-party alignment';
    }

    function pillHint(key) {
        var pt = (language === PORTUGUESE);
        if (key === 'overlapping') {
            return pt
                ? 'Afasta os deputados que caíram no mesmo ponto, para dar para contá-los'
                : 'Pushes apart deputies that landed on the same point, so they can be counted';
        }
        if (key === 'envelope') {
            return pt
                ? 'Desenha a área que cada partido selecionado ocupa no espectro'
                : 'Outlines the area each selected party occupies in the spectrum';
        }
        return pt
            ? 'Escurece quem mais votou com o próprio partido, comparado ao restante da seleção'
            : 'Darkens whoever voted most with their own party, compared to the rest of the selection';
    }

    function buildControlBar(container) {
        var bar = d3.select(container).append("div").attr("class", "chart-control-bar");
        var row = bar.append("div").attr("class", "chart-control-row");

        addPill(row, 'overlapping', function (on) { toggleOverlapping(on); });
        addPill(row, 'envelope', function (on) { toggleEnvelope(on); });
        addPill(row, 'alignment', function (on) { toggleAlignment(on); });

        infoBtn = row.append("button")
            .attr("type", "button")
            .attr("class", "chart-info-toggle")
            .attr("aria-expanded", "false")
            .attr("title", language === PORTUGUESE ? 'Sobre estas camadas' : 'About these layers')
            .text("i")
            .on("click", function () {
                d3.event.stopPropagation();
                infoOpen = !infoOpen;
                renderInfo();
            });

        infoPanel = bar.append("div").attr("class", "chart-info-panel").style("display", "none");

        refreshAlignmentControl();
        return bar;
    }

    function addPill(row, key, onToggle) {
        var btn = row.append("button")
            .attr("type", "button")
            .attr("class", "chart-pill")
            .attr("aria-pressed", "false")
            .attr("title", pillHint(key))
            .on("click", function () {
                d3.event.stopPropagation();
                setPill(key, !pills[key].on);
                onToggle(pills[key].on);
            });
        btn.append("span").attr("class", "chart-pill-label").text(pillText(key));
        // Says which parties the alignment is being stretched over, so the
        // scale never looks like it covers the whole chamber.
        btn.append("span").attr("class", "chart-pill-note");
        pills[key] = { btn: btn, on: false };
        return btn;
    }

    function setPill(key, on) {
        var p = pills[key];
        if (!p) return;
        p.on = on;
        p.btn.classed("is-on", on).attr("aria-pressed", on ? "true" : "false");
    }

    /**
     * The alignment layer only exists while at least one party is picked in the
     * legend, because the scale is stretched across the picked deputies. With
     * nothing picked there is no set to compare within, so the control is taken
     * away rather than left to produce a meaningless ramp.
     */
    function refreshAlignmentControl() {
        var p = pills.alignment;
        if (!p) return;

        var available = selectedParties.length > 0;
        p.btn.style("display", available ? null : "none");
        p.btn.select(".chart-pill-note")
            .text(available ? " · " + selectedParties.join(", ") : "");

        if (!available && p.on) {
            setPill('alignment', false);
            showAlignmentOpacity = false;
            applyAlignmentOpacity();
        }
        if (infoOpen) renderInfo();
    }

    /**
     * Maps alignment onto opacity across the CURRENT SELECTION rather than the
     * full 0–1 range.
     *
     * Alignment is a deputy's own record against their own party, so the value
     * itself does not depend on who else is on screen — but whether it can be
     * seen does. Party discipline is high: inside PT the whole spread is
     * 0.95–1.00, which the absolute scale turns into opacity 0.96–1.00 and the
     * eye reads as flat. Stretching the scale over the selection is what makes
     * the channel carry anything at all.
     *
     * @returns {Function|null} alignment -> opacity, or null when nothing is selected
     */
    function selectedAlignmentScale() {
        if (!svg) return null;
        var values = [];
        svg.selectAll('.node').each(function (d) {
            if (d && d.selected && typeof d.alignment === 'number') values.push(d.alignment);
        });
        if (!values.length) return null;

        return alignmentOpacityScale(values, MIN_ALIGNMENT_OPACITY);
    }

    function applyAlignmentOpacity(animate) {
        if (!svg) return;
        var scale = currentAlignmentScale();
        var nodes = svg.selectAll('.node');
        var target = (animate === false) ? nodes : nodes.transition().duration(400);
        target.style("fill-opacity", function (d) { return alignmentOpacityFor(d, scale); });
    }

    /**
     * The scale for one render pass. Building it walks every node, so it must
     * be hoisted out of the per-datum callback that uses it.
     */
    function currentAlignmentScale() {
        return showAlignmentOpacity ? selectedAlignmentScale() : null;
    }

    function alignmentOpacityFor(d, scale) {
        if (!scale) return 1;
        // Unselected deputies are outside the comparison and are already faded
        // by the stylesheet; dimming them again would only muddy the contrast.
        if (!d || !d.selected || typeof d.alignment !== 'number') return 1;
        return scale(d.alignment);
    }

    function toggleAlignment(on) {
        showAlignmentOpacity = on;
        applyAlignmentOpacity();
        if (infoOpen) renderInfo();
    }

    function infoLines() {
        var pt = (language === PORTUGUESE);
        var lines = [
            [pillText('overlapping'), pillHint('overlapping')],
            [pillText('envelope'), pillHint('envelope')]
        ];
        if (selectedParties.length) {
            lines.push([pillText('alignment'),
            pt
                ? 'A escala é esticada entre o menos e o mais alinhado da seleção — sem isso, um partido disciplinado sairia todo com a mesma opacidade. Alinhamento é a fração dos votos do deputado que seguiram a maioria do próprio partido.'
                : 'The scale is stretched between the least and the most aligned of the selection — without that, a disciplined party would come out uniformly opaque. Alignment is the share of a deputy\'s votes that followed their own party\'s majority.']);
        } else {
            lines.push([pillText('alignment'),
            pt
                ? 'Disponível ao escolher um partido ou mais na legenda, já que a comparação acontece dentro da seleção.'
                : 'Available once you pick one or more parties in the legend, since the comparison happens within the selection.']);
        }
        return lines;
    }

    function renderInfo() {
        if (!infoPanel) return;
        infoPanel.style("display", infoOpen ? "block" : "none");
        infoBtn.classed("is-on", infoOpen).attr("aria-expanded", infoOpen ? "true" : "false");
        if (!infoOpen) return;

        var rows = infoPanel.selectAll("div.chart-info-row").data(infoLines());
        rows.enter().append("div").attr("class", "chart-info-row");
        rows.exit().remove();
        rows.html(function (d) { return "<strong>" + d[0] + ":</strong> " + d[1]; });
    }

    function chart(selection) {
        selection.each(function (data) {
            panelID = ($(this).parents('.panel')).attr('id');

            buildControlBar(this);

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

        // Remove old svg
        d3.select('#' + panelID + " .scatter-plot").remove();

        // reset globals
        isForceLayout = false;
        showAlignmentOpacity = false;
        showPartyEnvelope = false;
        partyCountByOverlappedGroup = [];
        selectedParties = [];
        Object.keys(pills).forEach(function (k) { setPill(k, false); });

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
            .attr("class", function (d) { return (d.selected) ? "node selected" : ((d.hovered) ? "node hovered" : "node"); })
            .attr("r", function (d) { return (d.hovered) ? nodeRadius * 2 : nodeRadius; })
            .attr("id", function (d) { return panelID + "_deputy-id-" + d.deputyID; })
            .attr("cx", function (d) { return x(d.scatterplot[1]); })
            .attr("cy", function (d) { return y(d.scatterplot[0]); })
            .style("fill", function (d) { return setDeputyFill(d); })
            .style("fill-opacity", (function () {
                var scale = currentAlignmentScale();
                return function (d) { return alignmentOpacityFor(d, scale); };
            })())
            .on('mousedown', function (d) {
                mouseClickDeputy(d);
            })
            .on('mouseup', function () {
                $('.searchDeputies').tagsinput('removeAll');
            })
            .on("mouseover", function (d) {
                mouseoverDeputy(d);
                showToolTip(renderDeputyTooltipHtml(d));
            })
            .on("mousemove", function () {
                moveToolTip();
            })
            .on("mouseout", function (d) {
                hideToolTip();
                mouseoutDeputy(d);
            });

        function renderDeputyTooltipHtml(d) {
            var alignmentPercentage = d.alignment ? Math.round(d.alignment * 100) : 0;
            var color = CONGRESS_DEFINE.getPartyColor(d.party);
            var english =
                '<div style="min-width: 180px;">' +
                '<div style="font-size: 14px; font-weight: 600; color: ' + color + '; margin-bottom: 4px;">' + d.name + ' (' + d.party + '-' + d.district + ')</div>' +
                '<div style="font-size: 13px; color: #666;">Party Alignment: <span style="font-weight:600; color:' + color + ';">' + alignmentPercentage + '%</span></div>' +
                '<div style="margin-top:6px; font-size: 11px; color: #666;">' +
                '<em>Left-Click to select</em><br><em>Right-Click to create new visualizations</em>' +
                '</div>' +
                '</div>';

            var portuguese =
                '<div style="min-width: 180px;">' +
                '<div style="font-size: 14px; font-weight: 600; color: ' + color + '; margin-bottom: 4px;">' + d.name + ' (' + d.party + '-' + d.district + ')</div>' +
                '<div style="font-size: 13px; color: #666;">Alinhamento Partidário: <span style="font-weight:600; color:' + color + ';">' + alignmentPercentage + '%</span></div>' +
                '<div style="margin-top:6px; font-size: 11px; color: #666;">' +
                '<em>Botão esquerdo para selecionar</em><br><em>Botão direito para criar novas vis.</em>' +
                '</div>' +
                '</div>';

            return (typeof language !== 'undefined' && language === PORTUGUESE) ? portuguese : english;
        }

        function showToolTip(html) {
            if (div.empty()) return;
            div.transition().duration(0);
            div.style("left", d3.event.pageX + 15 + "px");
            div.style("top", d3.event.pageY - 10 + "px");
            div.style("display", "inline-block").style("opacity", 1);
            div.html(html);
        }

        function moveToolTip() {
            if (div.empty()) return;
            div.style("left", d3.event.pageX + 15 + "px");
            div.style("top", d3.event.pageY - 10 + "px");
        }

        function hideToolTip() {
            if (div.empty()) return;
            div.transition().duration(0);
            div.style("display", "none").style("opacity", 1);
        }

        $("#" + panelID + " .node")
            .contextMenu({
                menuSelector: "#contextMenuDeputy",
                menuSelected: function (invokedOn, selectedMenu) {
                    handleContextMenuDeputy(invokedOn, selectedMenu);
                }
            });

        updateLegend(nodes, svg);

        // The pill drives this; the body needs `force` and the original scales,
        // which only exist inside this closure.
        toggleOverlapping = function (on) {
            if (on) {
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
        };

        toggleEnvelope = function (on) {
            showPartyEnvelope = on;

            if (showPartyEnvelope) {
                // Show hulls for currently selected parties
                if (selectedParties.length > 0) {
                    chart.showConvexHullOfParties(selectedParties);
                }
            } else {
                // Hide all hulls but keep the party selection
                svg.selectAll(".party-hull").remove();
            }
        };

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
                    .on('mouseover', legendMouseover)
                    .on('mousemove', function () { moveToolTip(); })
                    .on('mouseout', legendMouseout);

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

            function computeRiceIndexPercentForParty(rcs, party, type) {
                if (!rcs || !rcs.length) return null;

                var weightedSum = 0;
                var totalVotes = 0;

                rcs.forEach(function (rc) {
                    if (!rc || !rc.votes) return;
                    var partyVotes = rc.votes.filter(function (v) { return v.party === party; });

                    var S = 0, N = 0, total = 0;
                    if (type === RICE_TYPE_BRAZIL) {
                        var validVotesBR = partyVotes.filter(function (v) { return v.vote === 'Sim' || v.vote === 'Não' || v.vote === 'Obstrução'; });
                        validVotesBR.forEach(function (v) { if (v.vote === 'Sim') S++; else if (v.vote === 'Não' || v.vote === 'Obstrução') N++; });
                        total = S + N;
                    } else {
                        var validVotesCL = partyVotes.filter(function (v) { return v.vote === 'Sim' || v.vote === 'Não'; });
                        validVotesCL.forEach(function (v) { if (v.vote === 'Sim') S++; else if (v.vote === 'Não') N++; });
                        total = S + N;
                    }

                    if (total === 0) return;
                    var rice = Math.abs(S - N) / total;
                    weightedSum += rice * total;
                    totalVotes += total;
                });

                if (totalVotes === 0) return null;
                return Math.round((weightedSum / totalVotes) * 100);
            }

            // Precompute Classic Rice Index (Cohesion) once per party
            var partyCohesionByParty = {};
            var rcsForCohesion = (typeof state !== 'undefined' && state.getCurrentRollCalls) ? state.getCurrentRollCalls() : null;
            var partyKeys = d3.map(data, function (d) { return d.party; }).keys();
            partyKeys.forEach(function (party) {
                partyCohesionByParty[party] = computeRiceIndexPercentForParty(rcsForCohesion, party, RICE_TYPE_CLASSIC);
            });

            function renderPartyLegendTooltipHtml(party) {
                var ricePercent = (partyCohesionByParty && partyCohesionByParty.hasOwnProperty(party)) ? partyCohesionByParty[party] : null;

                var english =
                    '<div style="min-width: 160px;">' +
                    '<div style="font-size: 14px; font-weight: 700; color: ' + CONGRESS_DEFINE.getPartyColor(party) + '; margin-bottom: 2px;">' + party + '</div>' +
                    '<div style="font-size: 13px; color: #666;">Cohesion: <span style="font-weight:600; color:#333;">' + (ricePercent !== null ? ricePercent + '%' : '—') + '</span></div>' +
                    '<div style="margin-top:6px; font-size: 11px; color: #666;">' +
                    '<em>Left-Click to select</em><br><em>Right-Click to create new visualizations</em>' +
                    '</div>' +
                    '</div>';

                var portuguese =
                    '<div style="min-width: 160px;">' +
                    '<div style="font-size: 14px; font-weight: 700; color: ' + CONGRESS_DEFINE.getPartyColor(party) + '; margin-bottom: 2px;">' + party + '</div>' +
                    '<div style="font-size: 13px; color: #666;">Coesão: <span style="font-weight:600; color:#333;">' + (ricePercent !== null ? ricePercent + '%' : '—') + '</span></div>' +
                    '<div style="margin-top:6px; font-size: 11px; color: #666;">' +
                    '<em>Botão esquerdo para selecionar</em><br><em>Botão direito para criar novas vis.</em>' +
                    '</div>' +
                    '</div>';

                return (typeof language !== 'undefined' && language === PORTUGUESE) ? portuguese : english;
            }

            function legendMouseover(party) {
                mouseoverParty(party);
                showToolTip(renderPartyLegendTooltipHtml(party));
            }
            function legendMouseout() {
                hideToolTip();
                mouseoutParty();
            }
            // Add context menu to legend items
            $("#" + panelID + " .legend")
                .contextMenu({
                    menuSelector: "#contextMenuPartyLegend",
                    menuSelected: function (invokedOn, selectedMenu) {
                        handleContextMenuPartyLegend(invokedOn, selectedMenu);
                    }
                });

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
        var updateScale = currentAlignmentScale();
        svg.selectAll(".deputiesNodesDots .node")
            .transition()
            .style("fill", function (d) { return setDeputyFill(d); })
            .style("fill-opacity", function (d) { return alignmentOpacityFor(d, updateScale); })
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
                    return { location: t.location, deputyID: t.deputyID };
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

        // When "show overlapping" (force layout) is active, deputies are rendered at the
        // jittered positions stored in d.x / d.y. Build a lookup so the hull wraps those
        // displayed positions instead of the original (un-jittered) scatterplot coordinates.
        var nodeById = {};
        if (isForceLayout && nodesData) {
            nodesData.forEach(function (n) { nodeById[n.deputyID] = n; });
        }

        var hullPoint = function (p) {
            if (isForceLayout) {
                var node = nodeById[p.deputyID];
                if (node && typeof node.x === "number" && typeof node.y === "number")
                    return [node.x, node.y];
            }
            return [xOriginal(p.location[1]), yOriginal(p.location[0])];
        };

        var groupPath = function (d) {
            return "M" +
                d3.geom.hull(d.points.map(hullPoint))
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
            // Remove party from hull selection
            togglePartyHull(d, 'remove');
        } else
            if (d3.event.ctrlKey || d3.event.metaKey) {
                deputies.forEach(function (d) {
                    updateDeputyNodeInAllPeriods(d.deputyID, "selected", true);
                });
                // Add party to hull selection (multi-select)
                togglePartyHull(d, 'add');
            }
            else {
                for (var key in deputyNodes) {
                    for (var index in deputyNodes[key])
                        deputyNodes[key][index].selected = false;
                }

                deputies.forEach(function (d) {
                    updateDeputyNodeInAllPeriods(d.deputyID, "selected", true);
                });
                // Select only this party's hull
                togglePartyHull(d, 'single');
            }

        dispatch.update();
    }

    function togglePartyHull(party, mode) {
        var index = selectedParties.indexOf(party);

        if (mode === 'add') {
            // Multi-select mode: add if not present
            if (index === -1) {
                selectedParties.push(party);
            }
        } else if (mode === 'remove') {
            // Remove mode: remove if present
            if (index > -1) {
                selectedParties.splice(index, 1);
            }
        } else if (mode === 'single') {
            // Single-select mode: replace with this party only
            selectedParties = [party];
        }

        // Only redraw the hulls when that layer is switched on
        if (showPartyEnvelope) {
            if (selectedParties.length > 0) {
                chart.showConvexHullOfParties(selectedParties);
            } else {
                chart.hideConvexHulls();
            }
        }

        // Always update visual indicators on legend
        updateLegendHullIndicators();

        // The alignment layer is scoped to the selection, so both its
        // availability and its scale change whenever the selection does.
        refreshAlignmentControl();
        applyAlignmentOpacity();
    }

    function updateLegendHullIndicators() {
        if (!svg) return;

        svg.selectAll('.legend circle')
            .style('stroke', function (d) {
                return selectedParties.indexOf(d) > -1
                    ? '#000'
                    : 'none';
            })
            .style('stroke-width', function (d) {
                return selectedParties.indexOf(d) > -1
                    ? '3px'
                    : '0';
            });
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

        // Update visual indicators on legend
        updateLegendHullIndicators();

        dispatch.update();
        return hulls;
    };

    chart.hideConvexHulls = function () {
        if (!svg) return;

        // Clear internal state
        selectedParties = [];

        // Remove hulls from visualization
        svg.selectAll(".party-hull").remove();

        // Update visual indicators on legend
        updateLegendHullIndicators();

        dispatch.update();
    };

    chart.getSelectedPartiesForHulls = function () {
        return selectedParties.slice();
    };

    return d3.rebind(chart, dispatch, 'on');
}