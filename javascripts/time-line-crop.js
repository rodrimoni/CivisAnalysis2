function timeLineCrop() {
    var outerWidth = MAX_WIDTH,
        outerHeight = MAX_HEIGHT,
        margin = { top: 30, right: 15, bottom: 30, left: 15 },
        width = outerWidth - margin.left - margin.right,
        height = outerHeight - margin.top - margin.bottom;


    var x;
    var svg;
    var rangeButtonsHeight = 30;
    var timelineDim = {};
    var partyStepWidth = 40;
    var drawingType = 'uncluttered'; // or cluttered || uncluttered
    var pixelPercentageToParties = 0.5;

    var ranges;
    var years;

    //TODO: improve this part, wrong use of globals, temporary solution
    var scaleParties = [];
    var pixelPerDeputy = [];

    var div = d3.select(".toolTip");

    function chart(selection) {
        selection.each(function (data) {
            timelineDim.height = height - 15 - rangeButtonsHeight;//*0.7;

            svg = d3.select(this)
                .append("svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", "0 0 " + outerWidth + " " + outerHeight)
                .classed("timeline-crop", true);

            appendGreyRangeButtons(data.period, 0);
            setPartiesTraces(10 + rangeButtonsHeight + 10);
            drawDeputy(data.deputies);
        })
    }

    function appendGreyRangeButtons(data, y) {
        ranges = data;
        years = $.map(d3.range(ranges[0].getFullYear(), ranges[1].getFullYear()),
            function (d) {
                return { name: d, period: [new Date(d, 0, 1), new Date(d + 1, 0, 1)] };
            });

        x = d3.time.scale()
            .domain([ranges[0], ranges[1]])
            .rangeRound([margin.left, width - margin.right]);

        var gRects = appendRangeButtons(years, y, 'foreground years');

    }

    function appendRangeButtons(years, y, fillClass) {

        var gb = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + y + ')');

        var gRects = gb.selectAll('g')
            .data(years)
            .enter().append("g");


        gRects.append('rect')
            .attr({
                height: rangeButtonsHeight,
                y: 3,
                x: function (d) { return x(d.period[0]) },
                width: function (d) { return x(d.period[1]) - x(d.period[0]) },
                'class': fillClass,
                stroke: 'white',
                'stroke-width': 3
            });

        gRects.append('text')
            .text(function (d) { return d.name })
            .attr({
                y: 25,
                x: function (d) { return x(d.period[0]) + (x(d.period[1]) - x(d.period[0])) / 2 },
                fill: "#fff",
                'font-size': function (d) { return Math.log((x(d.period[1]) - x(d.period[0])) / this.getComputedTextLength() * 9) * 5 + "px"; },
                //'font-size': 13,
            }).attr("text-anchor", "middle");

        return gRects;
    }

    function scaleX_middleOfBiennial(year) {
        return x(new Date(year, 12));
    }

    function setPartiesTraces(y) {
        var traceMargin = 5;
        var partyTraces = svg.append('g').attr({ id: 'partyTraces', transform: 'translate(' + margin.left + ',' + (y + traceMargin) + ')' });

        // Add the traced (stroke-dasharray) lines from top to bottom
        var yearlyColumms = partyTraces.append('g');
        var firstYear = ranges[0].getFullYear();
        var lastYear = ranges[1].getFullYear();
        console.log(firstYear);
        console.log(lastYear);

        d3.range(firstYear, lastYear).forEach(function (year) {
            yearlyColumms.append('path').attr({
                d: 'M ' + scaleX_middleOfBiennial(year) + ' ' + 2 + ' V ' + (timelineDim.height + 10),
                stroke: 'grey',
                'stroke-dasharray': "15,15"
            })
        });
        yearlyColumms.append('path').attr({
            d: 'M ' + scaleX_middleOfBiennial(firstYear - 1) + ' ' + timelineDim.height / 2 + ' H ' + scaleX_middleOfBiennial(lastYear),
            stroke: 'lightgrey',
            'stroke-dasharray': "10,10"
        });

        // governemnt X opposition
        var gg = partyTraces.append('g').style('text-anchor', 'middle');
        gg.append('text')
            .text('YEARLY POLITICAL SPECTRA')
            .attr({
                'class': "partiesLabel trn",
                x: scaleX_middleOfBiennial(firstYear - 1) + scaleX_middleOfBiennial(firstYear) / 2 - 100,
                y: timelineDim.height / 2 + 5
            });

        gg.append('text')
            .text('GOVERNMENT')
            .attr({
                x: scaleX_middleOfBiennial(firstYear - 1) + scaleX_middleOfBiennial(firstYear) / 2,
                y: 10,
                'text-anchor': 'start',
                'class': "partiesLabel trn"
            });

        gg.append('text')
            .text('OPPOSITION')
            .attr({
                'class': "partiesLabel trn",
                'text-anchor': 'end',
                x: scaleX_middleOfBiennial(firstYear - 1) + scaleX_middleOfBiennial(firstYear) / 2,
                y: timelineDim.height - 5
            });

        partyTraces.append('g').attr('class', 'parties').attr({ transform: 'translate(0,' + traceMargin + ')' });
        partyTraces.append('g').attr('class', 'deputies').attr({ transform: 'translate(0,' + traceMargin + ')' });
        drawParties();
    }

    function drawParties() {
        calcPartiesStepsUncluttered(timelineDim.height, pixelPercentageToParties);
        calcPartiesStepsCluttered(timelineDim.height, pixelPercentageToParties);
        forceAlgorithmToAproximateTheUnclutteredPositionsToClutteredWithoutOcclusion(timelineDim.height);

        // CALC TRACES
        var parties = d3.entries(CONGRESS_DEFINE.partiesTraces1by1.traces);

        parties.forEach(function (party) {
            var partyAtYear = party.value;
            party.traces = [];
            d3.range(1991, 2023, 1).forEach(function (year) {
                if ((partyAtYear[year] !== undefined) && (partyAtYear[year + 1] !== undefined)) {
                    party.traces.push({ first: partyAtYear[year], second: partyAtYear[year + 1], firstDate: year, secondDate: year + 1 });
                }
            });
        });

        var partiesG = svg.select('g.parties')
            .selectAll('.party')
            .data(parties, function (d) { return d.key });

        partiesG.enter().append('g').attr({ 'class': 'party' })
            .on('mouseover', function (d) { var p = {}; p[d.key] = true; partiesMouseover(p); })
            .on('mouseout', partiesMouseout);


        partiesG.exit().transition().attr('opacity', 0).remove();

        drawPartiesSteps(drawingType);
        drawPartiesTraces(drawingType);
    }

    function calcPartiesStepsUncluttered(height, pixelPercentageToParties) {
        // ------------------------------------------------------------
        // get parties for each period (biennial)
        periods = {};

        // for each year starting from first year
        for (var i = 1991; i < 2023; i++) {
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

        // for each year starting from first year
        for (var i = 1991; i < 2023; i++) {
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
            pixelPerDeputy[period] = (partiesPixels / sumDeputies); // the amount of pixel that each deputy represent ( - 513 deputies in the brazilian camber)
            console.log(period);
            scaleParties[period] = d3.scale.linear()
                .domain([
                    // the the political spectrum domain of the period
                    CONGRESS_DEFINE.timelineCropExtent[period][1],
                    CONGRESS_DEFINE.timelineCropExtent[period][0]
                ])
                .range([
                    // the (width-height)/2 of first party in the spectrum
                    partiesInPeriod[0].size / 2 * pixelPerDeputy[period],
                    // height + the (width-height)/2 of last party in the spectrum
                    height - (partiesInPeriod[partiesInPeriod.length - 1].size / 2 * pixelPerDeputy[period])
                ]);

            // set the pixels positions
            for (var i = 0; i < partiesInPeriod.length; i++) {
                var party = partiesInPeriod[i];
                party.cluttered = {};

                party.cluttered.x0 = scaleParties[period](party.center[1]) - (party.size * pixelPerDeputy[period]) / 2;
                party.cluttered.height = (party.size * pixelPerDeputy[period]);

                //.attr("y", function (d) { return scaleYearExtents[d.key](d.value.center[1]) - d.value.size/2} )

            }
        }
    }

    function forceAlgorithmToAproximateTheUnclutteredPositionsToClutteredWithoutOcclusion(timelineHeight) {
        d3.range(1991, 2023, 1).forEach(function (year) {
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

    function drawDeputySteps() {
        var steps = svg.selectAll('.deputies .deputy')
            .selectAll('.deputy-steps')
            .data(function (d) { return [d.steps]; });

        steps.enter().append('g').attr({ 'class': 'deputy-steps' });

        var step = steps.selectAll('.deputy-step').data(function (d) { return d; });

        var deputiesArray = state.getDeputiesArray();

        step
            .enter()
            .append('path')
            .attr('class', function (d) {
                return 'deputy-step y' + d.year;
            })
            .style('cursor', 'pointer')
            .on('mouseover', function (d) {
                var associatedParty;
                switch (d.party) {
                    case 'PPB': associatedParty = "PP";
                        break;
                    case 'PFL': associatedParty = "DEM";
                        break;
                    case 'PMDB': associatedParty = "MDB";
                        break;
                    case 'PL': associatedParty = "PR";
                        break;
                    case 'PRONA': associatedParty = "PR";
                        break;
                    default: associatedParty = d.party;
                        break;
                }
                var p = {}; p[d.deputyID] = true;
                p[associatedParty] = true;
                deputiesMouseover(p);
            })
            .attr('d', function (d) {
                return 'M ' + (scaleX_middleOfBiennial(Number.parseInt(d.year)) - partyStepWidth / 2) + ' ' + d.x0 + ' L ' +
                    (scaleX_middleOfBiennial(Number.parseInt(d.year)) + partyStepWidth / 2) + ' ' + d.x0;
            })
            //.attr("x", function (d) { return scaleX_middleOfBiennial(Number.parseInt(d.year)) -partyStepWidth/2} )
            //.attr("y", function (d) { return d.x0 })
            //.attr("height", 20)
            //.attr("width", partyStepWidth )
            .attr("stroke-width", 10)
            .attr("opacity", 1)
            .style("stroke", function (d) { return CONGRESS_DEFINE.getPartyColor(d.party); })
            .on("mousemove", function (d) {
                div.style("left", d3.event.pageX + 10 + "px");
                div.style("top", d3.event.pageY - 25 + "px");
                div.style("display", "inline-block");
                div.html(deputiesArray[d.deputyID].name + " (" + d.party + "-" + deputiesArray[d.deputyID].district + ") ");
            })
            .on("mouseout", function () {
                partiesMouseout();
                div.style("display", "none");
            });

    }

    function drawDeputyTraces() {
        console.log("traces");
        var traces = svg.selectAll('.deputies .deputy')
            .selectAll('.deputy-traces')
            .data(function (d) { return [d.traces] });

        traces.enter().append('g').attr({ 'class': 'deputy-traces' });

        var trace = traces.selectAll('.deputy-trace')
            .data(function (d) { return d; });

        var parties = [];

        /*deputy.forEach(function (t) {
            var party;
            switch(t.first.party){
                case 'PPB': party = "PP";
                    break;
                case 'PFL': party = "DEM";
                    break;
                case 'PL': party = "PR";
                    break;
                case 'PRONA':  party = "PR";
                    break;
                default:     party = t.first.party;
                    break;
            }
           if  (parties.indexOf(party) === -1){
               parties.push(party);
           }
        });*/


        var numberOfPathsEachDeputy = years.length;

        var enterData = trace.enter();

        var path = enterData
            .append('path')
            .classed('deputy-trace', true)
            .style('cursor', 'pointer')
            .attr("d", function (d) {
                return 'M ' + (scaleX_middleOfBiennial(Number.parseInt(d.firstDate)) + partyStepWidth / 2) + ' ' + d.first.x0 + ' L ' +
                    (scaleX_middleOfBiennial(Number.parseInt(d.secondDate)) - partyStepWidth / 2) + ' ' + d.second.x0;
            })
            .style("stroke", function (d) { return CONGRESS_DEFINE.getPartyColor(d.first.party); })
            .attr("stroke-width", 4)
            .attr("opacity", 0.5)
            .on('mouseover', function (d) {
                var associatedParty;
                switch (d.first.party) {
                    case 'PPB': associatedParty = "PP";
                        break;
                    case 'PFL': associatedParty = "DEM";
                        break;
                    case 'PMDB': associatedParty = "MDB";
                        break;
                    case 'PL': associatedParty = "PR";
                        break;
                    case 'PRONA': associatedParty = "PR";
                        break;
                    default: associatedParty = d.first.party;
                        break;
                }
                var p = {}; p[d.first.deputyID] = true;
                p[associatedParty] = true;
                deputiesMouseover(p);
            })
            .on("mouseout", function () {
                partiesMouseout();
                div.style("display", "none");
            });

        path
            .attr("stroke-dasharray", function () { var length = this.getTotalLength(); return length + " " + length; })
            .attr("stroke-dashoffset", function () { var length = this.getTotalLength(); return length; })
            .transition("createPath")
            .duration(800)
            .ease("linear")
            .delay(function (d, i) { return i % numberOfPathsEachDeputy * 900; })
            .attr("stroke-dashoffset", 0);



        svg.selectAll('.deputy-trace').data().forEach(function (t) {
            var party;
            //TODO: Transform this in a function
            switch (t.first.party) {
                case 'PPB': party = "PP";
                    break;
                case 'PFL': party = "DEM";
                    break;
                case 'PMDB': party = "MDB";
                    break;
                case 'PL': party = "PR";
                    break;
                case 'PRONA': party = "PR";
                    break;
                default: party = t.first.party;
                    break;
            }
            if (parties.indexOf(party) === -1) {
                parties.push(party);
            }
        });

        svg.selectAll('.party')
            .transition()
            .attr('opacity', function (d) {
                if (parties.indexOf(d.key) === -1)
                    return 0.1;
                else {
                    return 1;
                }
            });

    }

    function drawPartiesSteps(type) {

        var firstYear = ranges[0].getFullYear();
        var lastYear = ranges[1].getFullYear();

        var steps = svg.selectAll('.parties .party')
            .selectAll('.steps')
            .data(function (d) { return [d.value] });

        steps.enter().append('g').attr({ 'class': 'steps' });

        var step = steps.selectAll('.step').data(function (d) { return d3.entries(d).filter(function (e) { return e.key >= firstYear && e.key <= lastYear }) });

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
            .attr("x", function (d) { return scaleX_middleOfBiennial(Number.parseInt(d.key)) - partyStepWidth / 2 })
            .attr("y", function (d) { return d.value[type].x0 })
            .attr("height", function (d) { return d.value[type].height })
            .attr("width", partyStepWidth)
            .attr("opacity", 1)
            .style("fill", function (d) { return CONGRESS_DEFINE.getPartyColor(d.value.party); })
    }

    function drawPartiesTraces(type) {

        var firstYear = ranges[0].getFullYear();
        var lastYear = ranges[1].getFullYear();

        var traces = svg.selectAll('.parties .party')
            .selectAll('.traces')
            .data(function (d) { return [d.traces] });

        traces.enter().append('g').attr({ 'class': 'traces' });

        var trace = traces.selectAll('.trace')
            .data(function (d) { return d3.values(d).filter(function (e) { return e.firstDate >= firstYear && e.secondDate <= lastYear }) });

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
            dataPath.push({ x: scaleX_middleOfBiennial(trace.firstDate) + partyStepWidth / 2, y: trace.first[type].x0 });
            dataPath.push({ x: scaleX_middleOfBiennial(trace.secondDate) - partyStepWidth / 2, y: trace.second[type].x0 });
            dataPath.push({ x: scaleX_middleOfBiennial(trace.secondDate) - partyStepWidth / 2, y: trace.second[type].x0 + trace.second[type].height });
            dataPath.push({ x: scaleX_middleOfBiennial(trace.firstDate) + partyStepWidth / 2, y: trace.first[type].x0 + trace.first[type].height });

            return lineFunction(dataPath) + "Z";
        }
    }

    function deputiesMouseover(p) {
        if (p !== null) {
            svg.selectAll('.party').sort(function (party, b) { // select the parent and sort the path's
                var associatedParty;
                switch (p[party.key]) {
                    case 'PPB': associatedParty = "PP";
                        break;
                    case 'PFL': associatedParty = "DEM";
                        break;
                    case 'PMDB': associatedParty = "MDB";
                        break;
                    case 'PL': associatedParty = "PR";
                        break;
                    case 'PRONA': associatedParty = "PR";
                        break;
                    default: associatedParty = p[party.key];
                        break;
                }
                if (p[associatedParty] !== undefined) {
                    if (p[associatedParty]) return 1;  // --> party hovered to front
                    else return -1;
                } else return -1;
            })
                .transition().attr('opacity', function (party) {
                    return (p[party.key] !== undefined) ? 1 : 0.2;
                });

            svg.selectAll('.deputy-trace')
                .transition()
                .attr('opacity', function (d) {
                    return (p[d.first.deputyID] !== undefined) ? 0.5 : 0.2;
                });

            svg.selectAll('.deputy-step')
                .transition()
                .attr('opacity', function (d) {
                    return (p[d.deputyID] !== undefined) ? 1 : 0.2;
                });

        }
    }

    function partiesMouseover(p) {
        if (p !== null) {
            svg.selectAll('.party').sort(function (party, b) { // select the parent and sort the path's
                if (p[party.key] !== undefined) {
                    if (p[party.key]) return 1;  // --> party hovered to front
                    else return -1;
                } else return -1;
            })
                .transition().attr('opacity', function (party) {
                    return (p[party.key] !== undefined) ? 1 : 0.2;
                });

            svg.selectAll('.deputy-trace')
                .transition()
                .attr('opacity', function (d) {
                    var party;
                    switch (d.first.party) {
                        case 'PPB': party = "PP";
                            break;
                        case 'PFL': party = "DEM";
                            break;
                        case 'PMDB': party = "MDB";
                            break;
                        case 'PL': party = "PR";
                            break;
                        case 'PRONA': party = "PR";
                            break;
                        default: party = d.first.party;
                            break;
                    }
                    return (p[party] !== undefined) ? 0.5 : 0.2;
                });

            svg.selectAll('.deputy-step')
                .transition()
                .attr('opacity', function (d) {
                    var party;
                    switch (d.party) {
                        case 'PPB': party = "PP";
                            break;
                        case 'PFL': party = "DEM";
                            break;
                        case 'PMDB': party = "MDB";
                            break;
                        case 'PL': party = "PR";
                            break;
                        case 'PRONA': party = "PR";
                            break;
                        default: party = d.party;
                            break;
                    }
                    return (p[party] !== undefined) ? 1 : 0.2;
                });

        }
    }

    function partiesMouseout() {
        var deputiesSteps = svg.selectAll('.deputy-step').data();
        var parties = [];

        if (deputiesSteps.length > 0) {
            deputiesSteps.forEach(function (value) {
                var party;
                switch (value.party) {
                    case 'PPB': party = "PP";
                        break;
                    case 'PFL': party = "DEM";
                        break;
                    case 'PMDB': party = "MDB";
                        break;
                    case 'PL': party = "PR";
                        break;
                    case 'PRONA': party = "PR";
                        break;
                    default: party = value.party;
                        break;
                }
                if (parties.indexOf(party) === -1) {
                    parties.push(party);
                }
            });

            svg.selectAll('.party')
                .transition()
                .attr('opacity', function (d) {
                    if (parties.indexOf(d.key) === -1)
                        return 0.2;
                    else {
                        return 1;
                    }
                });

            svg.selectAll('.deputy-trace')
                .transition()
                .attr('opacity', 0.5);

            svg.selectAll('.deputy-step')
                .transition()
                .attr('opacity', 1);
        }
        else
            svg.selectAll('.party').transition().attr('opacity', 1);
    }

    function drawDeputy(deputies) {

        var firstYear = ranges[0].getFullYear();
        var lastYear = ranges[1].getFullYear();

        var deputiesSteps = [];

        deputies.forEach(function (d) {
            d.steps = [];
            for (var year = firstYear; year < lastYear; year++) {
                d.nodes.forEach(function (value) {
                    if (value.year === year) {
                        var step = {};
                        var lastDeputy = d.steps[d.steps.length - 1];
                        if (lastDeputy !== undefined) {
                            if (year - lastDeputy.year > 1) {
                                console.log(lastDeputy);
                                step.deputyID = lastDeputy.deputyID;
                                step.x0 = lastDeputy.x0;
                                step.party = lastDeputy.party;
                                step.year = lastDeputy.year + 1;
                                d.steps.push(step);
                            }
                        }
                        step = {};
                        //cluttered position - ideal position
                        step.deputyID = d.deputyID;
                        console.log(scaleParties);
                        step.x0 = scaleParties[year](value.scatterplot[1]) - (pixelPerDeputy[year]) / 2;
                        step.party = value.party;
                        step.year = value.year;
                        d.steps.push(step);
                    }
                });

            }
        });

        var deputiesTraces = [];

        deputies.forEach(function (d) {
            d.traces = [];
            d.steps.forEach(function (t, i) {
                if (d.steps[i + 1] !== undefined) {
                    if (d.steps[i + 1].year === d.steps[i].year + 1) {
                        var dep = {};
                        dep.first = d.steps[i];
                        dep.firstDate = d.steps[i].year;
                        dep.second = d.steps[i + 1];
                        dep.secondDate = d.steps[i + 1].year;
                        d.traces.push(dep);
                    }
                }
            });
        });


        var deputiesG = svg.select('g.deputies')
            .selectAll('.deputy')
            .data(deputies, function (d) { return d.deputyID });

        deputiesG.enter().append('g').attr({ 'class': 'deputy' });

        drawDeputySteps();
        drawDeputyTraces();
    };

    function showToolTip(html) { if (div.empty()) return; div.transition().duration(0); div.style("left", d3.event.pageX + 15 + "px"); div.style("top", d3.event.pageY - 10 + "px"); div.style("display", "inline-block").style("opacity", 1); div.html(html); }
    function moveToolTip() { if (div.empty()) return; div.style("left", d3.event.pageX + 15 + "px"); div.style("top", d3.event.pageY - 10 + "px"); }
    function hideToolTip() { if (div.empty()) return; div.transition().duration(0); div.style("display", "none").style("opacity", 1); }
    return chart;

}