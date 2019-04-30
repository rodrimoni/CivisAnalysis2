function rollCallsHeatmap(){


    var outerWidth = MAX_WIDTH,
        outerHeight = MAX_HEIGHT;
    margin = {top: 60, right: 0, bottom: 20, left: 10};

    var legendHeight = 60;

    var width = 750 - margin.right - margin.left - 15,
        height = 750 - margin.top - margin.bottom - legendHeight,
        buckets = 11,
        colors = ['#a50026','#d73027','#f46d43','#fdae61','#fee090','#ffffbf','#e0f3f8','#abd9e9','#74add1','#4575b4','#313695']; // RdYlBu colorbrewer scale

    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    var yearsColors = ["#f0f0f0","#d9d9d9"];
    var singleVotes = {"Sim" : '#313695', "Não":'#a50026'};
    var englishVotes =  {"Sim":"Yes","Não":"No","Abstenção":"Abstention","Obstrução":"Obstruction","Art. 17":"Art.17"};

    var colorScale = d3.scale.quantize()
        .domain([-1.0, 1.0])
        .range(d3.range(buckets).map(function(d) {  return colors[d] }));

    var itemMaxSize = 16;
    var dispatch = d3.dispatch('update');
    var div = d3.select(".toolTip");
    var svg;
    var parentID;
    var panelID;

    var itemWidth, itemHeight;

    function chart(selection) {
        selection.each(function (data) {
            // filter empty, all rollCalls
            var rcs = groupRollCallsByMonth(data, {motionTypeFilter:[], dateFilter:[undefined, undefined]});
            chart.drawRollCallsHeatMap(rcs, this);
        });
    }

    function drawPieChart(votes){
        var width = 170;
        var height = 170;
        var radius = Math.min(width, height) / 2;

        if (votes !== undefined) {
            var tots = d3.sum(votes, function(d) {
                return d.qtd;
            });

            var arc = d3.svg.arc()
                .outerRadius(radius - 10)
                .innerRadius(0);

            var pie = d3.layout.pie()
                .sort(null)
                .value(function(d) { return d.qtd; });

            var svg = d3.select("#tipDiv").append("svg")
                .attr("width", width)
                .attr("height", height)
                .append("g")
                .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

            var g = svg.selectAll(".arc")
                .data(pie(votes))
                .enter().append("g")
                .attr("class", "arc");

            g.append("path")
                .attr("d", arc)
                .style("fill", function(d) { return singleVotes[d.data.vote]});

            function pointIsInArc(pt, ptData, d3Arc) {
                // Center of the arc is assumed to be 0,0
                // (pt.x, pt.y) are assumed to be relative to the center
                var r1 = arc.innerRadius()(ptData),
                    r2 = arc.outerRadius()(ptData),
                    theta1 = arc.startAngle()(ptData),
                    theta2 = arc.endAngle()(ptData);

                var dist = pt.x * pt.x + pt.y * pt.y,
                    angle = Math.atan2(pt.x, -pt.y);

                angle = (angle < 0) ? (angle + Math.PI * 2) : angle;

                return (r1 * r1 <= dist) && (dist <= r2 * r2) &&
                    (theta1 <= angle) && (angle <= theta2);
            }

            g.append("text")
                .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
                .attr("dy", ".35em")
                .style("text-anchor", "middle")
                .text(function(d) { return englishVotes[d.data.vote] + " (" + d3.format("%") (d.data.qtd/tots) + ")"; })
                .call(wrap, 40)
                .each(function (d) {
                    var bb = this.getBBox(),
                        center = arc.centroid(d);

                    var topLeft = {
                        x : center[0] + bb.x,
                        y : center[1] + bb.y
                    };

                    var topRight = {
                        x : topLeft.x + bb.width,
                        y : topLeft.y
                    };

                    var bottomLeft = {
                        x : topLeft.x,
                        y : topLeft.y + bb.height
                    };

                    var bottomRight = {
                        x : topLeft.x + bb.width,
                        y : topLeft.y + bb.height
                    };

                    d.visible = pointIsInArc(topLeft, d, arc) &&
                        pointIsInArc(topRight, d, arc) &&
                        pointIsInArc(bottomLeft, d, arc) &&
                        pointIsInArc(bottomRight, d, arc);

                })
                .style('display', function (d) { return d.visible ? null : "none"; });
        }
        else {
            $('<br><br><p> No votes</p>').appendTo('#tipDiv');
        }
    }

    function wrap(text, width) {
        text.each(function() {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1, // ems
                y = text.attr("y"),
                dy = parseFloat(text.attr("dy")),
                tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                }
            }
        });
    }

    chart.selectRollCallsByFilter = function(panelID)
    {
        var htmlContent = $('#' +panelID + " .panel-body");
        var filter = getFilters(panelID);

        // Remove old svg
        d3.select('#' +panelID + " .rollcalls-heatmap").remove();

        // Load data with all rollCalls
        var data = d3.select('#' +panelID + " .panel-body").data()[0];
        // Group by Month with filter
        var rcs = groupRollCallsByMonth(data, filter);
        chart.drawRollCallsHeatMap(rcs, htmlContent[0]);
    };

    // @param htmlBody = Current panel-body
    chart.drawRollCallsHeatMap = function(data, htmlBody)
    {
        //var maxRollCallsPeriod = d3.max(data, function (d) { return d.index; });
        //var itemSize = 15;
        //  legendElementWidth = gridSize*2;

        //var periods = getUniqueValues(data, "period");

        //var periodsAsKeys = array_flip(periods);

        if (data.length === 0)
            return;

        var x_elements = d3.set(data.map(function( rc ) { return rc.index; } )).values(),
            y_elements = d3.set(data.map(function( rc ) { return rc.period; } )).values();


        itemWidth = Math.floor(width / x_elements.length);
        itemHeight = Math.floor(height / y_elements.length);


        var xScale = d3.scale.ordinal()
            .domain(x_elements)
            .rangeBands([0, width]);

        var xAxis = d3.svg.axis()
            .scale(xScale)
            .orient("top")
            .innerTickSize(-height)
            .outerTickSize(0)
            .tickPadding(10);

        var yScale = d3.scale.ordinal()
            .domain(y_elements)
            .rangeBands([0, height]); // Eliminate the unused space in chart bottom

        var yAxis = d3.svg.axis()
            .scale(yScale)
            .tickValues(y_elements)
            .tickFormat(function(d) { var period = d.split("/"); return monthNames[period[0]];})
            .orient("left");

        panelID = ($(htmlBody).parents('.panel')).attr('id');
        var node = tree.getNode(panelID, tree.traverseBF);
        parentID = node.parent.data;

        svg =  d3.select(htmlBody)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", "0 0 " + (width + 15 + margin.left + margin.right) + " " + (height + margin.top + margin.bottom + legendHeight))
            .classed("rollcalls-heatmap", true)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var initialYear = y_elements[0].split("/")[1]; // Get Year, format is mm/yy

        var hashYears = {};
        y_elements.forEach(function (d) {
            var currentYear = d.split("/")[1];
            if (hashYears[currentYear] === undefined)
            {
                hashYears[currentYear] = [d];
            }
            else
                hashYears[currentYear].push(d);
        });

        console.log(hashYears);

        var yearsLabels = svg.selectAll('.yearLabel')
            .data(d3.keys(hashYears));

        var yearLabelOffset = width+20;

        yearsLabels.enter().append('text')
            .attr('class', 'yearLabel')
            .attr("transform", function (d) {
                var arraySize =  hashYears[d].length;
                var rotate = true;
                var yValue;
                if (arraySize === 1){
                    yValue = yScale(hashYears[d][0]) + 10;
                    rotate = false;
                }
                else
                if ( arraySize  % 2 === 0)
                    yValue = yScale(hashYears[d][arraySize/2]);
                else
                    yValue = yScale(hashYears[d][(arraySize+1)/2]);

                var rotateValue = rotate ? 270 : 0;
                return "translate(" + yearLabelOffset + " ," +
                    yValue + ") rotate(" + rotateValue  + ")";
            })
            .style("text-anchor", "middle")
            .style('font-size', 'small')
            .text(function (d) {
                return d;
            });

        var yearsBg = svg.selectAll(".yearsBg")
            .data(y_elements);

        yearsBg.enter().append("rect")
            .attr("x", 0)
            .attr("y", function(d) { return yScale(d); })
            .attr("rx", 2)
            .attr("ry", 2)
            .attr("class", "yearBg")
            .attr("width", width)
            .attr("height", itemHeight)
            .style("fill", function (d) {
                var year = d.split("/")[1];
                var index = (year - initialYear)  % yearsColors.length;
                return yearsColors[index];
            });

        yearsBg.exit().remove();

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
            .selectAll('text')
            .attr('font-weight', 'normal');

        svg.append("g")
            .attr("class", "x axis")
            .call(xAxis)
            .selectAll('text')
            .attr('font-weight', 'normal')
            .style("text-anchor", "start")
            .attr("dx", "-.4em")
            .attr("dy", ".5em");

        var cards = svg.selectAll(".rollCall")
            .data(data);

        cards.append("title");

        cards.enter().append("rect")
            .attr("x", function(d) { return xScale(d.index); })
            .attr("y", function(d) { return yScale(d.period); })
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("class", function (d) {return (d.selected)? "rollCall bordered selected": ( (d.hovered)? "rollCall bordered hovered" : "rollCall bordered"); })
            .attr("width", itemWidth)
            .attr("height", itemHeight)
            .style("stroke-width", function (d) {
                return (d.hovered) ? "6px" : "2px";
            })
            .style("fill", "grey")
            .on('click', function(d) {
                mouseClickRollCall(d);
            })
            .on("mousemove",  function(d) {
                div.style("left", d3.event.pageX+15+"px");
                div.style("top", d3.event.pageY-25+"px");
                div.style("display", "inline-block");
                div.html(function() {
                        var htmlContent = d.type + ' ' + d.number + '/' + d.year + "<br><br>";
                        if (d.rate !== null) {
                            htmlContent += "<div id='tipDiv'></div><br>";
                        }
                        else
                        if (d.vote !== 'null')
                            htmlContent += '<p>' + englishVotes[d.vote] + '</p>';
                        else
                            htmlContent += '<p>' + 'No Votes' + '</p>';

                        return htmlContent;
                    }
                );

                if (d.rate !== null) {
                    drawPieChart(d.countVotes);
                }

            })
            .on("mouseover", mouseoverRollCall)
            .on("mouseout", function(d){
                mouseoutRollCall(d);
                div.style("display", "none");
            });

        cards.transition().duration(1000)
            .style("fill", function(d) { return setRollCallFill(d); });

        //cards.select("title").text(function(d) { return d.rate; });

        cards.exit().remove();

        // text label for the x axis
        svg.append("text")
            .attr("transform",
                "translate(" + (width/2) + " ," +
                (0 - margin.top/2) + ")")
            .style("text-anchor", "middle")
            .text("Number of Roll Calls");

        var legend = svg.selectAll(".legend")
            .data(colors, function(d) { return d; });

        legend.enter().append("g")
            .attr("class", "legend");

        var totalLegendWidth = 528;
        var centralizeOffset = 96;
        var legendItemWidth = 24;
        var legendItemHeight = 12;

        legend.append("rect")
            .attr("x", function(d, i) { return (legendItemWidth*2) * i + centralizeOffset; })
            .attr("y", height + (legendHeight/2))
            .attr("width", legendItemWidth * 2)
            .attr("height", legendItemHeight)
            .style("fill", function(d, i) { return colors[i]; });

        svg.append('text').text('Yes (approved)')
            .attr({
                dx: totalLegendWidth + centralizeOffset,
                dy: height + (legendHeight/2) + legendItemHeight*2.5,
                //'font-size': 'small',
                fill:'black'
            })
            .style("text-anchor", "end");

        svg.append('text').text('No (not approved)')
            .attr({
                dx: centralizeOffset,
                dy: height + (legendHeight/2) + legendItemHeight*2.5,
                //'font-size': 'small',
                fill:'black'
            })

        /*legend.append("text")
            .attr("class", "mono")
            .text(function(d) { return "≥ " + Math.round(d); })
            .attr("x", function(d, i) { return legendElementWidth * i; })
            .attr("y", height + gridSize);

        legend.exit().remove();*/
    };

    chart.update = function () {
        svg.selectAll(".rollCall")
            .transition(750)
            .style("fill", function(d) { return setRollCallFill(d); })
            .style("stroke-width", function (d) { return (d.hovered) ? "6px" : "2px"; })
            .attr("class", function (d) {return (d.selected)? "rollCall bordered selected": ( (d.hovered)? "rollCall bordered hovered" : "rollCall bordered"); });
    };

    chart.selectRollCallBySearch = function (id)
    {
        rollCallsRates[parentID].forEach(function (rc) {
            if (rc.rollCallID === id)
                rc.selected = true;
            else
                rc.selected = false;
        });

        dispatch.update()
    };

    chart.selectAllRollCalls = function (id)
    {
        rollCallsRates[parentID].forEach(function (rc) {
                rc.selected = true;
        });

        dispatch.update()
    };

    function filterMotions(arr, filter) {
            return arr.filter(function (e) {
                var resultType = false;
                var resultDate = false;

                // Verify if satisfies the motion type
                if (filter.motionTypeFilter.length > 0)
                {
                    if (filter.motionTypeFilter.indexOf(e.type) > -1)
                        resultType = true;
                }
                else // The type filter its not setted, so all types must be selected
                    resultType = true;

                // Verify if are inside the datarange
                if (filter.dateFilter[0] !== undefined && filter.dateFilter[1] !== undefined)
                    resultDate = e.datetime > filter.dateFilter[0] && e.datetime < filter.dateFilter[1];
                else // The date filter its not setted, so all in period must be selected
                    resultDate = true;

                return resultType && resultDate;
            });
    }

    function groupRollCallsByMonth(rcs, filter) {
        var data = [];
        var lastMonth;
        var countRollCalls = 0;
        var areTheSameDate = false;
        console.log(filter);

        if (filter.dateFilter[0] !== undefined && filter.dateFilter[1] !== undefined)
            if (filter.dateFilter[0].getTime() === filter.dateFilter[1].getTime())
                areTheSameDate = true;

        // motionTypeFilter.length == 0, all rollcalls must be selected
        if(filter.motionTypeFilter.length > 0 || (filter.dateFilter[0] !== undefined && filter.dateFilter[1] !== undefined)){
                rcs = filterMotions(rcs, filter);
        }

        rcs.forEach(function (rc) {
            var currentMonth = rc.datetime.getMonth();
            if (lastMonth === undefined)
                lastMonth = currentMonth;
            else
            if (lastMonth !== currentMonth){
                countRollCalls = 0;
                lastMonth = currentMonth;
            }

            var currentYear = rc.datetime.getFullYear();
            var period = currentMonth + "/" + currentYear;
            var obj = rc;
            // new copy without reference
            //obj = Object.assign({}, rc);
            obj.period = period;
            obj.index = countRollCalls;
            if (obj.selected === undefined)
                obj.selected = true;
            if (obj.hovered === undefined)
                obj.hovered = false;
            if (obj.rate !== 'noVotes') {
                data.push(obj);
                countRollCalls++;
            }
        });
        return data;
    }

    function setRollCallFill (d){
        if(d.vote != null){
            return CONGRESS_DEFINE.votoStringToColor[d.vote];
        }
        if(d.rate != null){
            if (d.rate === "noVotes")
                return 'grey';
            else return colorScale(d.rate)
        } else{
            return 'grey';
        }
    }

    function mouseClickRollCall(d)
    {
        var eltInput = $('#' + panelID + ' .searchRollCall.tt-input');
        // Reset the selected RollCall in filter
        eltInput.val('');
        rollCallsRates[parentID].forEach(function (rc) {
           if (rc.rollCallID === d.rollCallID)
               rc.selected = true;
           else
               rc.selected = false;
        });

        dispatch.update()
    }

    function mouseoverRollCall(d) {
        d.hovered = true;
        dispatch.update();
    }

    function mouseoutRollCall(d) {
        d.hovered = false;
        dispatch.update();
    }

    return d3.rebind(chart, dispatch, 'on');
}