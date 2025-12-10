//===============================================================================================================
//===============================================================================================================
// TIMELINE CHART

if (!d3.chart) d3.chart = {};

d3.chart.timeline = function () {

    var data,
        svg,
        g,
        width, height,
        margin = { top: 20, right: 50, bottom: 30, left: 50 },
        histogramHeight = 30,
        x,
        y = d3.scale.linear().range([histogramHeight, 0]),
        brush = d3.svg.brush(),
        brushDirty,
        dimension,
        group;

    var rangeButtonsHeight = 18;
    var timelineDim = {};
    var partyStepWidth = 15,
        drawingType = 'uncluttered'; // or cluttered || uncluttered

    var dispatch = d3.dispatch(chart, "timelineFilter", 'setAlliances');

    function chart(div, svgwidth, svgheight) {
        width = svgwidth - margin.left - margin.right;
        height = svgheight - margin.top - margin.bottom;

        timelineDim.height = height - 15 - histogramHeight - rangeButtonsHeight * 3;//*0.7;

        g = div.select("g");

        // Create the skeletal chart.
        if (g.empty()) {

            svg = div.append("svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", "0 0 " + svgwidth + " " + svgheight)
                .classed("timeline", true);

            g = svg.append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            svg.append("clipPath")
                .attr("id", "clip-timeline")
                .append("rect")
                .attr("width", "100%")
                .attr("height", timelineDim.height);
        }
    }

    chart.dispatchDatesToCalc = function () {
        dispatch.timelineFilter(brush.extent())
    };

    chart.update = function () {

        if (!group) {
            updateRollCallHistogram();

            appendGreyRangeButtons('years', margin.top + histogramHeight);
            appendGreyRangeButtons('legislatures', margin.top + histogramHeight + 18);
            appendGreyRangeButtons('presidents', margin.top + histogramHeight + 36);

            appendClipedRangeButtons('years', margin.top + histogramHeight);
            appendClipedRangeButtons('legislatures', margin.top + histogramHeight + 18);
            appendClipedRangeButtons('presidents', margin.top + histogramHeight + 36);

            appendElections(margin.top + histogramHeight + rangeButtonsHeight * 3);

            setPartiesTraces(margin.top + 10 + histogramHeight + rangeButtonsHeight * 3 + 10)
        }
    };
    chart.reColorPresidents = function () {
        svg.selectAll(".presidents").style('fill', function (d) { if (d.party !== undefined) { return CONGRESS_DEFINE.getConstantPartyColor(d.party) } })
    };
    chart.resetAlliances = function () {
        dispatch.setAlliances(null);
        setAlliance(null);
        d3.selectAll('#timeline .election').classed('selected', false);
    };
    chart.setDrawingType = function (type) {
        drawingType = type;
        chart.drawParties(drawingType);
    };

    chart.selectPeriodByDatePicker = function (period) {
        // clear date on brush
        svg.selectAll('.dateLabel').remove();
        // clear selected alliance
        dispatch.setAlliances(null);
        setAlliance(null);
        svg.select('.election.selected').classed('selected', false);

        svg.select(".brush")
            .call(brush.extent(period))
            .selectAll(".resize")
            .style("display", null);

        svg.select("#clip-timeline rect")
            .attr("x", x(period[0]))
            .attr("width", x(period[1]) - x(period[0]));

        dispatch.timelineFilter(period);
    }

    function barPath(groups) {
        var path = [],
            i = -1,
            n = groups.length,
            d;

        var minGap = 1; // minimum gap between months in pixels
        var monthsPerYear = 12;

        // Cache year block widths and start positions to avoid recalculating
        var yearBlockWidths = {};
        var yearStartPositions = {};

        while (++i < n) {
            d = groups[i];
            var monthDate = new Date(d.key);
            var year = monthDate.getFullYear();
            var month = monthDate.getMonth();

            // Calculate year block width and start position if not cached
            if (!yearBlockWidths[year]) {
                var yearStartX = x(new Date(year, 0, 1));
                var yearEndX = x(new Date(year + 1, 0, 1));
                yearStartPositions[year] = yearStartX;
                yearBlockWidths[year] = yearEndX - yearStartX;
            }

            var yearBlockWidth = yearBlockWidths[year];
            var yearStartX = yearStartPositions[year];
            var barWidth = Math.max(1, (yearBlockWidth - (minGap * (monthsPerYear - 1))) / monthsPerYear);

            // Calculate position within the year block
            var monthPositionInYear = month;
            var monthX = yearStartX + (monthPositionInYear * (barWidth + minGap)) + (barWidth / 2);

            // Draw bar centered at monthX
            var barStartX = monthX - (barWidth / 2);
            path.push("M", barStartX, ",", histogramHeight, "V", y(d.value), "h", barWidth, "V", histogramHeight);
        }
        return path.join("");
    }

    function resizePath(d) {
        var e = +(d === "e"),
            x = e ? 1 : -1,
            y = histogramHeight / 3;
        return "M" + (.5 * x) + "," + y
            + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
            + "V" + (2 * y - 6)
            + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
            + "Z"
            + "M" + (2.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8)
            + "M" + (4.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8);
    }

    // brush.on("brushstart.chart", function() {
    //   var div = d3.select(this.parentNode.parentNode.parentNode);
    //   div.select(".title a").style("display", null);
    // });

    brush.on("brush.chart", function () {
        var g = d3.select(this.parentNode),
            extent = brush.extent();
        if (round) g.select(".brush")
            .call(brush.extent(extent = extent.map(round)))
            .selectAll(".resize")
            .style("display", null);
        svg.select("#clip-timeline rect")
            .attr("x", x(extent[0]))
            .attr("width", x(extent[1]) - x(extent[0]));

        var labels = svg.selectAll('.dateLabel')
            .data(extent);

        labels.enter()
            .append('text')
            .attr({
                'class': 'dateLabel',
                opacity: 0.8
            });

        labels.transition()
            .attr({
                x: function (d, i) { return ((i) ? margin.left + 10 : margin.left - 80) + x(d); },
                y: function (d, i) { return histogramHeight + 10; }
            })
            .text(function (d) { return d.toLocaleDateString(); })
    });

    brush.on("brushend.chart", function () {
        if (brush.extent()[0].toLocaleDateString() === brush.extent()[1].toLocaleDateString()) {
            svg.selectAll('.dateLabel').remove();
            svg.select("#clip-timeline rect")
                .attr("x", 0)
                .attr("width", 0);
            return;
        }

        if (brush.empty()) {
            //div.select(".title a").style("display", "none");
            //div.select("#clip-timeline rect").attr("x", null).attr("width", "100%");
            //dimension.filterAll();
        }
        // clear selected alliance
        dispatch.setAlliances(null);
        setAlliance(null);
        svg.select('.election.selected').classed('selected', false);
        //!!!!!!!!!!
        dispatch.timelineFilter(brush.extent())
    });

    function getIntersection(time, timespanArray) {
        return timespanArray.filter(function (d) {
            return d.period[0] <= time && time < d.period[1];
        });
    }

    function updateRollCallHistogram() {

        var datetimeList = [];
        data.forEach(function (d) { datetimeList.push(d.datetime) });
        var dateCF = crossfilter(datetimeList);
        dimension = dateCF.dimension(function (d) { return d });
        group = dimension.group(d3.time.month);
        round = d3.time.month.round;

        chart.x(d3.time.scale()
            .domain([new Date(CONGRESS_DEFINE.startingYear, 0, 1), new Date(CONGRESS_DEFINE.endingYear + 1, 0, 1)])
            .rangeRound([margin.left, width - margin.right]));
        //.timelineFilter([new Date(2012, 0, 1), new Date()]);

        y.domain([0, group.top(1)[0].value]);

        // MAX RollCalls/month LINE --------------------------------------------
        g.append('path')
            .attr('pointer', 'none')
            .attr('stroke-dasharray', '5,5,5')
            .attr('stroke', 'grey')
            .attr('stroke-width', '1px')
            .attr('d', 'M' + margin.left + ' ' + y(group.top(1)[0].value) + ' l' + (width - margin.right - margin.left) + ' ' + y(group.top(1)[0].value));

        g.append('text').attr({
            x: margin.left,
            y: y(group.top(1)[0].value) - 2,
            'fill': 'grey',
            'font-size': 11
        }).text('max RollCalls/month:' + group.top(1)[0].value)
            .attr({ 'id': 'maxRollCallsWeek' });
        // MAX RollCalls/month LINE ===========================================


        g.selectAll(".bar")
            .data(["background", "foreground"])
            .enter().append("path")
            .attr("class", function (d) { return d + " bar"; })
            .datum(group.all());

        g.selectAll(".bar").attr("d", barPath);

        g.selectAll(".foreground.bar")
            .attr("clip-path", "url(#clip-timeline)");

        // Initialize the brush component with pretty resize handles.
        gBrush = g.append("g").attr("class", "brush").on("mousedown", function () {
            if (d3.event.button === 2) {
                d3.event.stopImmediatePropagation();
            }
        }).call(brush);
        gBrush.selectAll("rect").attr("height", timelineDim.height + histogramHeight + rangeButtonsHeight * 3 + 40);
        gBrush.selectAll(".resize").append("path").attr("d", resizePath);

        // Only redraw the brush if set externally.
        if (brushDirty) {
            brushDirty = false;
            g.selectAll(".brush").call(brush);
            //div.select(".title a").style("display", brush.empty() ? "none" : null);
            if (brush.empty()) {
                svg.select("#clip-timeline rect")
                    .attr("x", 0)
                    .attr("width", 0);
            } else {
                var extent = brush.extent();
                svg.select("#clip-timeline rect")
                    .attr("x", x(extent[0]))
                    .attr("width", x(extent[1]) - x(extent[0]));
            }
        }
    }

    function scaleX_middleOfBiennial(year) { return x(new Date(year, 12)) }
    function setPartiesTraces(y) {
        var traceMargin = 5;
        var partyTraces = svg.append('g').attr({ id: 'partyTraces', transform: 'translate(' + margin.left + ',' + (y + traceMargin) + ')' });

        // Add the traced (stroke-dasharray) lines from top to bottom
        var biennialColumms = partyTraces.append('g');
        d3.range(CONGRESS_DEFINE.startingYear, CONGRESS_DEFINE.endingYear + 1).forEach(function (year) {
            biennialColumms.append('path').attr({
                d: 'M ' + scaleX_middleOfBiennial(year) + ' ' + 2 + ' V ' + (timelineDim.height + 10),
                stroke: 'grey',
                'stroke-dasharray': "10,10"
            })
        });
        biennialColumms.append('path').attr({
            d: 'M ' + scaleX_middleOfBiennial(1990) + ' ' + timelineDim.height / 2 + ' H ' + scaleX_middleOfBiennial(CONGRESS_DEFINE.endingYear + 1),
            stroke: 'lightgrey',
            'stroke-dasharray': "5,5"
        });

        // governemnt X opposition
        var gg = partyTraces.append('g').style('text-anchor', 'middle');
        gg.append('text')
            .text('YEARLY POLITICAL SPECTRA')
            .attr({
                'class': "partiesLabel trn",
                x: scaleX_middleOfBiennial(1990) + scaleX_middleOfBiennial(CONGRESS_DEFINE.startingYear) / 2 - 80,
                y: timelineDim.height / 2 + 5
            });


        gg.append('text')
            .text('GOVERNMENT')
            .attr({
                x: scaleX_middleOfBiennial(1990) + scaleX_middleOfBiennial(1991) / 2 - 40,
                y: 5,
                'text-anchor': 'start',
                'class': "partiesLabel trn"
            });
        gg.append('text')
            .text('OPPOSITION')
            .attr({
                'class': "partiesLabel trn",
                'text-anchor': 'end',
                x: scaleX_middleOfBiennial(1990) + scaleX_middleOfBiennial(1991) / 2 - 40,
                y: timelineDim.height - 5
            });


        partyTraces.append('g').attr('class', 'parties').attr({ transform: 'translate(0,' + traceMargin + ')' });
        chart.drawParties()
    }

    chart.pixelPercentageToParties = 0.5;
    chart.drawParties = function () {
        calcPartiesStepsUncluttered(timelineDim.height, chart.pixelPercentageToParties);
        calcPartiesStepsCluttered(timelineDim.height, chart.pixelPercentageToParties);
        forceAlgorithmToAproximateTheUnclutteredPositionsToClutteredWithoutOcclusion(timelineDim.height);
        // CALC TRACES
        var parties = d3.entries(CONGRESS_DEFINE.partiesTraces1by1.traces);
        parties.forEach(function (party) {
            var partyAtYear = party.value;
            party.traces = [];
            d3.range(CONGRESS_DEFINE.startingYear, CONGRESS_DEFINE.endingYear + 1, 1).forEach(function (year) {
                if ((partyAtYear[year] !== undefined) && (partyAtYear[year + 1] !== undefined)) {
                    party.traces.push({ first: partyAtYear[year], second: partyAtYear[year + 1], firstDate: year, secondDate: year + 1 });
                }
            });
        });

        var partiesG = svg.select('g.parties')
            .selectAll('.party')
            .data(parties, function (d) { return d.key });

        partiesG.enter().append('g').attr({ 'class': 'party' })
            .on('mouseover', function (d) { var p = {}; p[d.key] = true; chart.partiesMouseover(p); })
            .on('mouseout', chart.partiesMouseout);


        partiesG.exit().transition().attr('opacity', 0).remove();

        drawPartiesSteps(drawingType);
        drawPartiesTraces(drawingType);
    };
    function calcPartiesStepsUncluttered(height, pixelPercentageToParties) {
        // ------------------------------------------------------------
        // get parties for each period (biennial)
        periods = {};
        // for each two years starting from 1991
        for (var i = CONGRESS_DEFINE.startingYear; i < CONGRESS_DEFINE.endingYear + 1; i++) {
            // for each period create an array of parties
            periods[i] = { parties: [] };
            for (party in CONGRESS_DEFINE.partiesTraces1by1.traces) {
                // if the party did not exist(undefined) - do not push in the party array
                if (CONGRESS_DEFINE.partiesTraces1by1.traces[party][i] !== undefined) {
                    CONGRESS_DEFINE.partiesTraces1by1.traces[party][i].party = party; //(garbage)
                    periods[i].parties.push(CONGRESS_DEFINE.partiesTraces1by1.traces[party][i]);
                }
            }
        }
        // for each period
        for (var period in periods) {
            var partiesInPeriod = periods[period].parties;

            // sort parties by their 1D spectrum[1]
            partiesInPeriod.sort(function (a, b) {
                return (b.center[1] + 1) - (a.center[1] + 1);
            });

            // calc the distance between adjacent parties in the 1D
            var distances = [];
            // sum of distances
            var sumDistances = 0;
            // sum deputies
            var sumDeputies = 0;

            for (var i = 0; i < partiesInPeriod.length - 1; i++) {
                // distance in spectrum betwen party i and i+1
                distances[i] = (partiesInPeriod[i].center[1] + 1 - partiesInPeriod[i + 1].center[1] + 1) - 2;

                sumDistances += distances[i];
                sumDeputies += partiesInPeriod[i].size;
            }
            sumDeputies += partiesInPeriod[partiesInPeriod.length - 1].size;
            // save half of the spectrum to show the parties
            var partiesPixels = (sumDeputies / 513) * (pixelPercentageToParties * (height));
            var pixelPerDeputy = (partiesPixels / sumDeputies); // the amount of pixel that each deputy represent ( - 513 deputies in the brazilian camber)

            // remant pixels for the distances between parties
            var remnantPixels = height - partiesPixels;
            // calc the factor in wich should be multiplied the distances to get the sum of pixels == remnantPixels
            var distanceFactor = (remnantPixels / sumDistances);
            // sum(distancesInPixels) == factor*sumDistances == sum(distances[i]*factor)
            var distancesInPixels = distances.map(function (dist) { return dist * distanceFactor });

            var pixelPosition = 0;
            // set the pixels positions
            for (var i = 0; i < partiesInPeriod.length; i++) {
                var party = partiesInPeriod[i];
                party.uncluttered = {};
                party.uncluttered.x0 = pixelPosition;
                party.uncluttered.height = (party.size * pixelPerDeputy);

                pixelPosition += distancesInPixels[i] + party.uncluttered.height;
            }
        }
    }
    function calcPartiesStepsCluttered(height, pixelPercentageToParties) {
        // ------------------------------------------------------------
        // get parties for each period (biennial)
        periods = {};
        // for each two years starting from 1991
        for (var i = CONGRESS_DEFINE.startingYear; i < CONGRESS_DEFINE.endingYear + 1; i++) {
            // for each period create an array of parties
            periods[i] = { parties: [] };
            for (party in CONGRESS_DEFINE.partiesTraces1by1.traces) {
                // if the party did not exist(undefined) - do not push in the party array
                if (CONGRESS_DEFINE.partiesTraces1by1.traces[party][i] !== undefined) {
                    CONGRESS_DEFINE.partiesTraces1by1.traces[party][i].party = party; //(garbage)
                    periods[i].parties.push(CONGRESS_DEFINE.partiesTraces1by1.traces[party][i]);
                }
            }
        }
        // for each period
        // - we need to know the size (in pixels) of the extreme parties of the spectrum
        //   to place them inside the height
        for (var period in periods) {
            var partiesInPeriod = periods[period].parties;
            // sort parties by their 1D spectrum[1]
            partiesInPeriod.sort(function (a, b) {
                return (b.center[1] + 1) - (a.center[1] + 1);
            });

            // sum deputies
            var sumDeputies = 0;

            for (var i = 0; i < partiesInPeriod.length; i++) {
                //console.log(period, partiesInPeriod[i])
                sumDeputies += partiesInPeriod[i].size;
            }
            // save half of the spectrum to show the parties
            var partiesPixels = (sumDeputies / 513) * (pixelPercentageToParties * (height));
            var pixelPerDeputy = (partiesPixels / sumDeputies); // the amount of pixel that each deputy represent ( - 513 deputies in the brazilian camber)

            var scaleParties = d3.scale.linear()
                .domain([
                    // the the political spectrum domain of the period
                    CONGRESS_DEFINE.partiesTraces1by1.extents[period][1],
                    CONGRESS_DEFINE.partiesTraces1by1.extents[period][0]
                ])
                .range([
                    // the (width-height)/2 of first party in the spectrum
                    partiesInPeriod[0].size / 2 * pixelPerDeputy,
                    // height + the (width-height)/2 of last party in the spectrum
                    height - (partiesInPeriod[partiesInPeriod.length - 1].size / 2 * pixelPerDeputy)
                ]);

            // set the pixels positions
            for (var i = 0; i < partiesInPeriod.length; i++) {
                var party = partiesInPeriod[i];
                party.cluttered = {};

                party.cluttered.x0 = scaleParties(party.center[1]) - (party.size * pixelPerDeputy) / 2;
                party.cluttered.height = (party.size * pixelPerDeputy);

                //.attr("y", function (d) { return scaleYearExtents[d.key](d.value.center[1]) - d.value.size/2} )

            }
        }
    }

    // type == ['uncluttered','cluttered']
    function drawPartiesSteps(type) {

        var steps = svg.selectAll('.parties .party')
            .selectAll('.steps')
            .data(function (d) { return [d.value] });

        steps.enter().append('g').attr({ 'class': 'steps' });

        var step = steps.selectAll('.step').data(function (d) { return d3.entries(d) });

        step.enter()
            .append('rect').attr('class', 'step')
            .style('cursor', 'pointer')
            .on('mouseover', function (d) { showToolTip(renderPartyStepTooltipHtml(d)); })
            .on('mousemove', function () { moveToolTip(); })
            .on('mouseout', function () { hideToolTip(); });

        function renderPartyStepTooltipHtml(d) {
            var party = d.value.party;
            var color = CONGRESS_DEFINE.getPartyColor(party);
            var name = (party && CONGRESS_DEFINE.parties[party]) ? CONGRESS_DEFINE.parties[party].name : '';
            return '<div style="min-width: 160px;">' +
                '<div style="font-size:14px;font-weight:700;color:' + color + ';margin-bottom:2px;">' + party + '</div>' +
                '<div style="font-size:12px;color:#666;">' + name + '</div>' +
                '</div>';
        }

        step.transition(3000)
            .attr('class', function (d) {
                return 'step y' + d.key;
            })
            .attr("x", function (d) { return scaleX_middleOfBiennial(Number.parseInt(d.key)) - partyStepWidth })
            .attr("y", function (d) { return d.value[type].x0 })
            .attr("height", function (d) { return d.value[type].height })
            .attr("width", partyStepWidth)
            .attr("opacity", 1)
            .style("fill", function (d) { return CONGRESS_DEFINE.getPartyColor(d.value.party); })
    }

    function drawPartiesTraces(type) {
        var traces = svg.selectAll('.parties .party')
            .selectAll('.traces')
            .data(function (d) { return [d.traces] });

        traces.enter().append('g').attr({ 'class': 'traces' });

        var trace = traces.selectAll('.trace')
            .data(function (d) { return d3.values(d) });

        trace.enter().append('path').attr('class', 'trace');

        trace.transition(3000)
            .attr("d", function (d) { return drawPartyTrace(d, type) })
            .style("fill", function (d) { return CONGRESS_DEFINE.getPartyColor(d.first.party); })
            .attr("opacity", 0.3);

        function drawPartyTrace(trace, type) {

            var lineFunction = d3.svg.line()
                .x(function (d) { return d.x })
                .y(function (d) { return d.y })
                .interpolate("linear");

            var dataPath = [];
            dataPath.push({ x: scaleX_middleOfBiennial(trace.firstDate), y: trace.first[type].x0 });
            dataPath.push({ x: scaleX_middleOfBiennial(trace.secondDate) - partyStepWidth, y: trace.second[type].x0 });
            dataPath.push({ x: scaleX_middleOfBiennial(trace.secondDate) - partyStepWidth, y: trace.second[type].x0 + trace.second[type].height });
            dataPath.push({ x: scaleX_middleOfBiennial(trace.firstDate), y: trace.first[type].x0 + trace.first[type].height });

            return lineFunction(dataPath) + "Z";
        }
    }

    // sort the traces - the hovered parties to front
    chart.partiesMouseover = function (p) {
        if (p !== null) {
            svg.selectAll('.party').sort(function (party, b) { // select the parent and sort the path's
                if (p[party.key] !== undefined) {
                    if (p[party.key]) return 1;  // --> party hovered to front
                    else return -1;
                } else return -1;
            })
                .transition().attr('opacity', function (party) {
                    return (p[party.key] !== undefined) ? 1 : 0.2;
                })
        }
    };
    chart.partiesMouseout = function () {
        svg.selectAll('.party').transition().attr('opacity', 1);
    };

    chart.margin = function (_) {
        if (!arguments.length) return margin;
        margin = _;
        return chart;
    };

    chart.scaleByX = function (_) {
        return x(_);
    };

    chart.invertByX = function (_) {
        return x.invert(_);
    }

    chart.x = function (_) {
        if (!arguments.length) return x;
        x = _;
        brush.x(x);
        return chart;
    };

    chart.y = function (_) {
        if (!arguments.length) return y;
        y = _;
        return chart;
    };

    chart.dimension = function (_) {
        if (!arguments.length) return dimension;
        dimension = _;
        return chart;
    };

    chart.group = function (_) {
        if (!arguments.length) return group;
        group = _;
        return chart;
    };

    chart.round = function (_) {
        if (!arguments.length) return round;
        round = _;
        return chart;
    };

    chart.data = function (value) {
        if (!arguments.length) return data;
        data = value;
        return chart;
    };

    function appendRangeButtons(ranges, y, fillClass) {

        var gb = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + y + ')');

        var gRects = gb.selectAll('g')
            .data(ranges)
            .enter().append("g")
            .classed("period", true);


        gRects.append('rect')
            .attr({
                height: rangeButtonsHeight,
                y: 3,
                x: function (d) { return x(d.period[0]) },
                width: function (d) { return x(d.period[1]) - x(d.period[0]) },
                'class': fillClass,
                stroke: 'white',
                'stroke-width': 1,
                cursor: 'pointer'
            })
            .style('fill', function (d) { if (d.party !== undefined) { return CONGRESS_DEFINE.getConstantPartyColor(d.party) } });

        gRects.append('text')
            .text(function (d) { return d.name })
            .attr({
                class: "trn",
                y: 17,
                x: function (d) { return x(d.period[0]) + (x(d.period[1]) - x(d.period[0])) / 2 },
                fill: "#fff",
                'font-size': function (d) { return Math.log((x(d.period[1]) - x(d.period[0])) / this.getComputedTextLength() * 9) * 5 + "px"; },
                //'font-size': 13,
                cursor: 'pointer'
            }).attr("text-anchor", "middle");

        return gRects;
    }


    function appendGreyRangeButtons(type, y) {
        var ranges = CONGRESS_DEFINE[type];
        var gRects = appendRangeButtons(ranges, y, 'background ' + type);

        gRects
            .on('mouseover', function () {
                d3.select(this).select('rect')
                    .attr('class', 'foreground ' + type)
                    .style('opacity', function (d) { if (d.party !== undefined) { return 1 } })
            })
            .on('mouseout', function () {
                if (d3.select(this))
                    d3.select(this).select('rect').attr('class', 'background ' + type)
                        .style('opacity', function (d) { if (d.party !== undefined) { return 0.5 } })
            })
            .on('click', function (d) { presetDateRangeButtonSelected(d); })
            .select('rect').style('opacity', function (d) { if (d.party !== undefined) { return 0.5 } })


    }

    function appendClipedRangeButtons(type, y) {
        var ranges = CONGRESS_DEFINE[type];
        var gRects = appendRangeButtons(ranges, y, 'foreground ' + type);

        gRects.selectAll('rect').attr("clip-path", "url(#clip-timeline)");
        gRects.selectAll('text').attr("clip-path", "url(#clip-timeline)");

        gRects
            .on('click', function (d) { presetDateRangeButtonSelected(d); })
    }

    function presetDateRangeButtonSelected(d) {
        // clear date on brush
        svg.selectAll('.dateLabel').remove();
        // clear selected alliance
        dispatch.setAlliances(null);
        setAlliance(null);
        svg.select('.election.selected').classed('selected', false);

        var period;
        if (d3?.event?.shiftKey) {
            if (!brush.empty()) {
                if (d.period[0] <= brush.extent()[0])
                    period = [d.period[0], brush.extent()[1]];
                else
                    period = [brush.extent()[0], d.period[1]];
            }
            else
                period = d.period;
        }
        else
            period = d.period;

        svg.select(".brush")
            .call(brush.extent(period))
            .selectAll(".resize")
            .style("display", null);

        svg.select("#clip-timeline rect")
            .attr("x", x(period[0]))
            .attr("width", x(period[1]) - x(period[0]));

        dispatch.timelineFilter(period);
    }

    function appendElections(height) {
        var gb = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + height + ')');


        var allianceIcons = gb.selectAll('g')
            .data($.map(CONGRESS_DEFINE.elections, function (d) { return d }))
            .enter()
            .append('g')
            .attr('class', 'election')
            .style('cursor', 'pointer')
            .on('mouseover', function (d) { showToolTip(electionPopoverHtml(d)); })
            .on('mousemove', function () { moveToolTip(); })
            .on('mouseout', function () { hideToolTip(); });

        allianceIcons.selectAll('.glyphicon')
            .data(function (d) { return [d] })
            .enter()
            .append('text')
            .attr({
                class: "glyphicon",
                x: function (d) { return Math.max(x(d.dates[0]), 0) - 15 },
                y: 20,
                width: 20,
                height: 20
            })
            .text('\ue034');
        //?

        allianceIcons.selectAll('.elec')
            .data(function (d) { return [d] })
            .enter()
            .append('text')
            .attr({
                class: "elec",
                x: function (d) { return Math.max(x(d.dates[0]), 0) },
                y: 15,
                'font-size': 'xx-small'
            })
            .text(function (d) { return d.name });
        allianceIcons.append('text')
            .attr({
                class: "elec trn",
                x: function (d) { return Math.max(x(d.dates[0]), 0) },
                y: 22,
                'font-size': 'xx-small'
            })
            .text('elections');


        function electionPopoverHtml(d) {
            var text = language === ENGLISH ? "Brazilian Presidential Election of " : "Eleições para presidente do Brasil ";
            return '<div style="min-width: 180px;">' +
                '<div style="font-size:14px;font-weight:700;color:#333;">' + text + d.name + '</div>' +
                '</div>';
        }

        // set on/off alliance
        allianceIcons.on('click', function (d) {


            var electionIcon = d3.select(this);

            if (electionIcon.classed('selected')) {
                // if the election is already selected
                // deselect
                electionIcon.classed('selected', false);
                dispatch.setAlliances(null);
                setAlliance(null);
            } else {
                // if the election is not selected
                // first reset previous elections
                gb.selectAll('.election').classed('selected', false);
                dispatch.setAlliances(null);
                setAlliance(null);

                // set the selected election
                electionIcon.classed('selected', true);
                dispatch.setAlliances(d);
                setAlliance(d);

            }
        })

    }

    function setAlliance(d) {
        if (!(svg.select('#partyTraces .alliance-rect').empty())) {
            svg.select('#partyTraces .alliance-rect').remove();
        }

        if (d !== null) {
            var x = scaleX_middleOfBiennial(d.name);
            svg.select('#partyTraces').append('rect').attr({
                'class': 'alliance-rect',
                x: x - partyStepWidth * 0.75,
                y: (histogramHeight - rangeButtonsHeight * 3) + 14,
                height: timelineDim.height + 18,
                width: partyStepWidth * 1.5,
                stroke: 'grey',
                fill: 'none',
                'stroke-dasharray': "5,5"
            })
        }
    }

    function forceAlgorithmToAproximateTheUnclutteredPositionsToClutteredWithoutOcclusion(timelineHeight) {
        d3.range(CONGRESS_DEFINE.startingYear, CONGRESS_DEFINE.endingYear + 1, 1).forEach(function (year) {
            var partiesInPeriod = [];
            for (var party in CONGRESS_DEFINE.partiesTraces1by1.traces) {
                if (CONGRESS_DEFINE.partiesTraces1by1.traces[party][year])
                    partiesInPeriod.push(CONGRESS_DEFINE.partiesTraces1by1.traces[party][year]);
            }
            // d3.selectAll("rect.step.y"+year).data();
            partiesInPeriod.sort(function (a, b) {
                return a.uncluttered.x0 - b.uncluttered.x0;
            });
            var movement;
            do { // repeat this loop til no parties' movment
                movement = false;
                partiesInPeriod.forEach(function (p, i) {
                    var idealPoint = p.cluttered.x0,
                        x0 = p.uncluttered.x0,
                        x1 = x0 + p.uncluttered.height,
                        movUp = idealPoint > x0;

                    if (x0 < 1 || x1 > timelineHeight || Math.abs(idealPoint - x0) < 1) return;
                    var newX0 = Math.max(0, x0 + (movUp ? 1 : -1)),
                        newX1 = Math.max(0, x1 + (movUp ? 1 : -1)),
                        colision = false;

                    if (i !== (partiesInPeriod.length - 1) && movUp && newX1 > partiesInPeriod[i + 1].uncluttered.x0) colision = true;
                    if (i !== 0 && !movUp && newX0 < (partiesInPeriod[i - 1].uncluttered.x0 + partiesInPeriod[i - 1].uncluttered.height)) colision = true;

                    if (!colision) {
                        p.uncluttered.x0 = newX0;
                        movement = true;
                    }
                })
            } while (movement);
        });
    }

    function showToolTip(html) { var div = d3.select(".toolTip"); if (div.empty()) return; div.transition().duration(0); div.style("left", d3.event.pageX + 15 + "px"); div.style("top", d3.event.pageY - 10 + "px"); div.style("display", "inline-block").style("opacity", 1); div.html(html); }
    function moveToolTip() { var div = d3.select(".toolTip"); if (div.empty()) return; div.style("left", d3.event.pageX + 15 + "px"); div.style("top", d3.event.pageY - 10 + "px"); }
    function hideToolTip() { var div = d3.select(".toolTip"); if (div.empty()) return; div.transition().duration(0); div.style("display", "none").style("opacity", 1); }
    //return d3.rebind(chart, brush, "on");
    return d3.rebind(chart, dispatch, "on");
};