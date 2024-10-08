function rollCallsHeatmap() {
    margin = { top: 60, right: 0, bottom: 20, left: 10 };

    var legendHeight = 60;

    var width = 750 - margin.right - margin.left - 15,
        height = 750 - margin.top - margin.bottom - legendHeight,
        buckets = 11,
        colors = ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee090', '#ffffbf', '#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695']; // RdYlBu colorbrewer scale

    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    var yearsColors = ["#f0f0f0", "#d9d9d9"];
    var singleVotes = { "Sim": '#313695', "Não": '#a50026' };
    var englishVotes = { "Sim": "Yes", "Não": "No", "Abstenção": "Abstention", "Obstrução": "Obstruction", "Art. 17": "Art.17" };

    var colorScale = d3.scale.quantize()
        .domain([-1.0, 1.0])
        .range(d3.range(buckets).map(function (d) { return colors[d] }));

    var itemMaxSize = 16;
    var dispatch = d3.dispatch('update');
    var div = d3.select(".toolTipHeatMap");
    var svg;
    var parentID;
    var panelID;
    var heatMapDeputies = [];

    var itemWidth, itemHeight;
    let themesCount = null;

    function chart(selection) {
        selection.each(function (data) {
            // filter empty, all rollCalls
            chart.heatMapDeputies(data.deputies);
            var rcs = groupRollCallsByMonth(data.rcs, { motionTypeFilter: [], motionThemeFilter: [], dateFilter: [undefined, undefined] });

            const controls = d3.select(this)
                .append("div")
                .classed("heat-map-controls", true)

            // Create the dropdown
            const dropdown = controls
                .append("select")
                .attr("class", "themeDropdown")
                .attr("style", "position:absolute; left:60%;") // Adjust position as needed
                .on("click", function () {
                    d3.event.stopPropagation(); // avoid ui to navigate to panel
                })

            // Add options to the dropdown
            const options = [
                { value: "default", text: "Select..." }, // Placeholder option
                { value: "bubble", text: "Proportion" },
                { value: "bar", text: "Histogram" },
                { value: "line", text: "Trends" },
                // Add more options here if needed
            ];

            dropdown.selectAll("option")
                .data(options)
                .enter()
                .append("option")
                .attr("value", d => d.value)
                .text(d => d.text);

            // Keep the original button
            const button = controls
                .append("button")
                .attr("id", "showRollCallsTheme")
                .attr("style", "position:absolute; left:75%;")
                .text("Show subjects")
                .on("click", function () {
                    const selectedValue = d3.select("#" + panelID + " .themeDropdown").property("value");
                    let chartData, chartID;

                    switch (selectedValue) {
                        case "bubble":
                            chartData = calculateThemesOcurrency(data.rcs);
                            chartID = THEMES_BUBBLE_CHART
                            break;
                        case "bar":
                            chartData = calculateThemesOcurrency(data.rcs);
                            chartID = BAR_CHART
                            break;
                        case "line":
                            chartData = calculateSmallMultiplesData(data.rcs);
                            chartID = SMALL_MULTIPLES_CHART
                            break;
                        default:
                            return;
                    }

                    handleButtonThemes(panelID, chartData, chartID);
                    // Prevent any default behavior
                    d3.event.stopPropagation();
                });

            chart.drawRollCallsHeatMap(rcs, this);
        });
    }

    function drawPieChart(votes) {
        var width = 170;
        var height = 170;
        var radius = Math.min(width, height) / 2;

        if (votes !== undefined) {
            var tots = d3.sum(votes, function (d) {
                return d.qtd;
            });

            var arc = d3.svg.arc()
                .outerRadius(radius - 10)
                .innerRadius(0);

            var pie = d3.layout.pie()
                .sort(null)
                .value(function (d) { return d.qtd; });

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
                .style("fill", function (d) { return singleVotes[d.data.vote] });

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
                .attr("transform", function (d) { return "translate(" + arc.centroid(d) + ")"; })
                .attr("dy", ".35em")
                .style("text-anchor", "middle")
                .text(function (d) {
                    var vote = language === PORTUGUESE ? d.data.vote : englishVotes[d.data.vote];
                    return vote + " (" + d3.format("%")(d.data.qtd / tots) + ")";
                })
                .call(wrap, 40)
                .each(function (d) {
                    var bb = this.getBBox(),
                        center = arc.centroid(d);

                    var topLeft = {
                        x: center[0] + bb.x,
                        y: center[1] + bb.y
                    };

                    var topRight = {
                        x: topLeft.x + bb.width,
                        y: topLeft.y
                    };

                    var bottomLeft = {
                        x: topLeft.x,
                        y: topLeft.y + bb.height
                    };

                    var bottomRight = {
                        x: topLeft.x + bb.width,
                        y: topLeft.y + bb.height
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
        text.each(function () {
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

    // @param htmlBody = Current panel-body
    chart.drawRollCallsHeatMap = function (data, htmlBody) {
        //var maxRollCallsPeriod = d3.max(data, function (d) { return d.index; });
        //var itemSize = 15;
        //  legendElementWidth = gridSize*2;

        //var periods = getUniqueValues(data, "period");

        //var periodsAsKeys = array_flip(periods);

        if (data.length === 0)
            return;

        var x_elements = d3.set(data.map(function (rc) { return rc.index; })).values(),
            y_elements = d3.set(data.map(function (rc) { return rc.period; })).values();


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
            .tickFormat(function (d) { var period = d.split("/"); return monthNames[period[0]]; })
            .orient("left");

        panelID = ($(htmlBody).parents('.panel')).attr('id');
        var node = tree.getNode(panelID, tree.traverseBF);
        parentID = node.parent.data;

        svg = d3.select(htmlBody)
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
            if (hashYears[currentYear] === undefined) {
                hashYears[currentYear] = [d];
            }
            else
                hashYears[currentYear].push(d);
        });

        var yearsLabels = svg.selectAll('.yearLabel')
            .data(d3.keys(hashYears));

        var yearLabelOffset = width + 20;

        yearsLabels.enter().append('text')
            .attr('class', 'yearLabel')
            .attr("transform", function (d) {
                var arraySize = hashYears[d].length;
                var rotate = true;
                var yValue;
                if (arraySize === 1) {
                    yValue = yScale(hashYears[d][0]) + 10;
                    rotate = false;
                }
                else
                    if (arraySize % 2 === 0)
                        yValue = yScale(hashYears[d][arraySize / 2]);
                    else
                        yValue = yScale(hashYears[d][(arraySize + 1) / 2]);

                var rotateValue = rotate ? 270 : 0;
                return "translate(" + yearLabelOffset + " ," +
                    yValue + ") rotate(" + rotateValue + ")";
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
            .attr("y", function (d) { return yScale(d); })
            .attr("rx", 2)
            .attr("ry", 2)
            .attr("class", "yearBg")
            .attr("width", width)
            .attr("height", itemHeight)
            .style("fill", function (d) {
                var year = d.split("/")[1];
                var index = (year - initialYear) % yearsColors.length;
                return yearsColors[index];
            });

        yearsBg.exit().remove();

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
            .selectAll('text')
            .attr({ 'font-weight': 'normal', 'class': 'trn' });

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
            .attr("x", function (d) { return xScale(d.index); })
            .attr("y", function (d) { return yScale(d.period); })
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("class", function (d) {
                let classes = "rollCall bordered";
                if (d.selected) classes += " selected";
                if (d.hovered) classes += " hovered";
                return classes;
            })
            .attr("width", itemWidth)
            .attr("height", itemHeight)
            .style("fill", "grey")
            .on('click', function (d) {
                mouseClickRollCall(d);
            })
            .on("mousemove", function (d) {
                div.style("left", d3.event.pageX + 15 + "px");
                div.style("top", d3.event.pageY - 25 + "px");
                div.style("display", "inline-block");
                div.html(function () {
                    var htmlContent = "<div class ='text-center'><strong>" + d.type + ' ' + d.number + '/' + d.year + "</strong></div><br>";
                    htmlContent += "<strong><span class='trn'>Amendment</span></strong>:  " + motions[d.type + d.number + d.year].amendment.trim() + "<br><br>";
                    const theme = motions[d.type + d.number + d.year]?.theme
                    if (!!theme && theme.length) {
                        const subject = language === PORTUGUESE ? theme[0].trim() : subjectsToEnglish[theme[0].trim()]; // Pode ter mais de um tema, pegar sempre o primeiro
                        htmlContent += "<strong><span class='trn'>Subject</span></strong>:  " + subject + "<br><br>";
                    }
                    if (d.summary !== "")
                        htmlContent += "<strong>Status: </strong>" + d.summary.trim() + "<br>";
                    if (d.rate !== null) {
                        htmlContent += "<div id='tipDiv' class = 'text-center'></div><br>";
                    }
                    else
                        if (d.vote !== 'null')
                            htmlContent += '<br><div class="text-center"><strong><span class="trn">VOTE</span>: <span class="trn">' + englishVotes[d.vote].toUpperCase() + '</span><strong></div>';
                        else
                            htmlContent += '<br><div class="text-center"><strong><span class="trn">No Votes</span><strong></p>';

                    return htmlContent;
                }
                );

                if (d.rate !== null) {
                    drawPieChart(d.countVotes);
                }
                if (language === PORTUGUESE)
                    translator.lang('br');
            })
            .on("mouseover", mouseoverRollCall)
            .on("mouseout", function (d) {
                mouseoutRollCall(d);
                div.style("display", "none");
            });

        cards.transition().duration(1000)
            .style("fill", function (d) { return setRollCallFill(d); });

        //cards.select("title").text(function(d) { return d.rate; });

        cards.exit().remove();

        // text label for the x axis
        svg.append("text")
            .attr("transform",
                "translate(" + (width / 2) + " ," +
                (0 - margin.top / 2) + ")")
            .style("text-anchor", "middle")
            .text("Roll Calls")
            .attr({ 'class': 'trn' });

        var legend = svg.selectAll(".legend")
            .data(colors, function (d) { return d; });

        legend.enter().append("g")
            .attr("class", "legend");

        var totalLegendWidth = 528;
        var centralizeOffset = 96;
        var legendItemWidth = 24;
        var legendItemHeight = 12;

        legend.append("rect")
            .attr("x", function (d, i) { return (legendItemWidth * 2) * i + centralizeOffset; })
            .attr("y", height + (legendHeight / 2))
            .attr("width", legendItemWidth * 2)
            .attr("height", legendItemHeight)
            .style("fill", function (d, i) { return colors[i]; });

        svg.append('text').text('Yes (approved)')
            .attr({
                class: 'trn',
                dx: totalLegendWidth + centralizeOffset,
                dy: height + (legendHeight / 2) + legendItemHeight * 2.5,
                //'font-size': 'small',
                fill: 'black'
            })
            .style("text-anchor", "end");

        svg.append('text').text('No (not approved)')
            .attr({
                class: 'trn',
                dx: centralizeOffset,
                dy: height + (legendHeight / 2) + legendItemHeight * 2.5,
                //'font-size': 'small',
                fill: 'black'
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
            .style("fill", function (d) { return setRollCallFill(d); })
            .attr("class", function (d) {
                let classes = "rollCall bordered";
                if (d.selected) classes += " selected";
                if (d.hovered) classes += " hovered";
                return classes;
            })
    };

    chart.heatMapDeputies = function (_) {
        if (!arguments.length) return heatMapDeputies;
        heatMapDeputies = _;
        return chart;
    };

    chart.selectRollCallBySearch = function (id) {
        rollCallsRates[panelID].forEach(function (rc) {
            if (rc.rollCallID === id)
                rc.selected = true;
            else
                rc.selected = false;
        });

        dispatch.update()
    };

    chart.selectAllRollCalls = function (id) {
        rollCallsRates[panelID].forEach(function (rc) {
            rc.selected = true;
        });

        dispatch.update()
    };

    chart.selectRollCallsByFilter = function (panelID) {
        var htmlContent = $('#' + panelID + " .panel-body");
        var filter = getFilters(panelID);

        // Remove old svg
        d3.select('#' + panelID + " .rollcalls-heatmap").remove();

        // Load data with all rollCalls
        var data = d3.select('#' + panelID + " .panel-body").data()[0];
        // Group by Month with filter
        var rcs = groupRollCallsByMonth(data.rcs, filter);
        chart.drawRollCallsHeatMap(rcs, htmlContent[0]);
    };

    function groupRollCallsByMonth(rcs, filter) {
        var data = [];
        var lastMonth;
        var countRollCalls = 1;

        // motionTypeFilter.length == 0, all rollcalls must be selected
        if (filter.motionTypeFilter.length > 0 || filter.motionThemeFilter.length > 0 || (filter.dateFilter[0] !== undefined && filter.dateFilter[1] !== undefined)) {
            rcs = filterMotions(rcs, filter);
        }

        rcs.forEach(function (rc) {
            var currentMonth = rc.datetime.getMonth();
            if (lastMonth === undefined)
                lastMonth = currentMonth;
            else
                if (lastMonth !== currentMonth) {
                    countRollCalls = 1;
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

    function setRollCallFill(d) {
        if (d.vote != null) {
            return CONGRESS_DEFINE.votoStringToColor[d.vote];
        }
        if (d.rate != null) {
            if (d.rate === "noVotes")
                return 'grey';
            else return colorScale(d.rate)
        } else {
            return 'grey';
        }
    }

    function mouseClickRollCall(d) {
        var eltInput = $('#' + panelID + ' .searchRollCall.tt-input');
        // Reset the selected RollCall in filter
        eltInput.val('');
        rollCallsRates[panelID].forEach(function (rc) {
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

    function calculateThemesOcurrency(rcs) {
        // Count the themes
        const themeCounts = rcs.reduce((acc, curr) => {
            if (curr.theme !== undefined) { // Check if theme is not undefined
                if (acc[curr.theme]) {
                    acc[curr.theme]++;
                } else {
                    acc[curr.theme] = 1;
                }
            }
            return acc;
        }, {});

        // Convert the result to an array of objects with {category, frequency}
        const result = Object.entries(themeCounts).map(([category, frequency]) => ({ category, frequency }));

        // Sort the array by frequency in descending order
        return result.sort((a, b) => b.frequency - a.frequency);
    }

    function calculateSmallMultiplesData(rcs) {
        const [startYear, endYear] = d3.extent(rcs, d => new Date(d.datetime).getFullYear());
        const themes = subjectsNames();

        // Initialize the base structure
        const baseStructure = themes.map(theme => {
            const frequency = [];

            // Create frequency entries for each month from startYear to endYear
            for (let year = startYear; year <= endYear; year++) {
                for (let month = 0; month < 12; month++) {
                    const date = new Date(year, month, 1);
                    frequency.push({ date: date.toISOString(), count: 0 });
                }
            }

            return {
                theme: theme,
                frequency: frequency,
                average: null
            };
        });

        // Populate the base structure with data
        rcs.forEach(entry => {
            const themeIndex = baseStructure.findIndex(item => item.theme === entry.theme);
            if (themeIndex !== -1) {
                const date = new Date(entry.datetime);
                const year = date.getFullYear();
                const month = date.getMonth(); // 0-11 for January-December

                if (year >= startYear && year <= endYear) {
                    baseStructure[themeIndex].frequency[(year - startYear) * 12 + month].count += 1;
                }
            }
        });

        // Calculate averages for each theme
        baseStructure.forEach(item => {
            const totalCount = item.frequency.reduce((sum, freq) => sum + freq.count, 0);
            const totalMonths = item.frequency.length;
            item.average = totalCount / totalMonths;
        });

        const result = baseStructure
            .filter(item => item.average > 0)
            .sort((a, b) => b.average - a.average);

        return result;
    }

    // Caso seja necessário reviver o line chart simples

    // function calculateThemesSeries(rcs) {
    //     // Transform the data to count theme frequency by month and year
    //     const frequencyMap = {};

    //     // Populate frequency map
    //     for (const item of rcs) {
    //         if (item.theme === undefined) continue;
    //         const date = item.datetime;
    //         const year = date.getFullYear();
    //         const key = `${year}-${item.theme}`;

    //         frequencyMap[key] = (frequencyMap[key] || 0) + 1;
    //     }

    //     // Transform map to desired array format
    //     const transformedData = Object.keys(frequencyMap).map(key => {
    //         const [year, theme] = key.split('-');
    //         return { date: new Date(year, 0, 1), category: theme, value: frequencyMap[key] };
    //     });

    //     console.log(transformedData);

    //     return transformedData;
    // }

    return d3.rebind(chart, dispatch, 'on');
}