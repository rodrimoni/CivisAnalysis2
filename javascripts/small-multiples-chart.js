function smallMultiples(chart) {
    // Increase the top margin for more space above the cells
    const margin = ({ top: 50, bottom: 20, right: 10, left: 30 });
    const width = 1200;
    const height = 1000;

    const parseDate = d3v7.timeParse("%Y-%m-%dT%H:%M:%S.%LZ");

    const div = d3.select(".toolTip");

    const getThemeLabel = d => {
        if (language === ENGLISH)
            d = subjectsToEnglish[d]

        return d.length > 20 ? d.slice(0, 20) + '...' : d
    }

    function chart(selection) {
        selection.each(function (data) {

            console.log(data);

            const numRows = 6;
            const numCols = Math.ceil(data.length / numRows);

            // Increase padding between cells
            const row = d3v7.scaleBand()
                .domain(d3v7.range(numRows))
                .range([margin.top, height - margin.bottom])
                .padding(0.3); // Increased padding for more space between rows

            const col = d3v7.scaleBand()
                .domain(d3v7.range(numCols))
                .range([margin.left, width - margin.right])
                .padding(0.2); // Increased padding for more space between columns

            const maxThemeFrequency = d3v7.max(data, theme => d3v7.max(theme.frequency, d => d.count));

            const y = d3v7.scaleLinear()
                .domain([0, maxThemeFrequency])
                .range([row.bandwidth(), 0]);

            const dateExtent = d3v7.extent(data[0].frequency, d => parseDate(d.date));

            const x = d3v7.scaleTime()
                .domain(dateExtent)
                .range([0, col.bandwidth()]);

            // Line generator
            const line = d3v7.line()
                .x(d => x(parseDate(d.date)))
                .y(d => y(d.count));

            const xAxis = d3v7.axisBottom(x)
                .tickSizeOuter(0)
                .ticks(4, "'%y");

            const yAxis = d3v7.axisLeft(y)
                .tickSizeOuter(0)
                .ticks(4);

            // create an SVG element
            const svg = d3v7.select(this).append('svg')
                .attr('width', width)
                .attr('height', height)
                .attr("viewBox", [0, 0, width, height])
                .attr("style", "max-width: 100%; height: auto; overflow: visible; font: 16px sans-serif;");

            // title
            // const format = d3v7.timeFormat('%B %Y');
            // svg.append('text')
            //     .attr('y', margin.top - 20) // Increased top margin for title
            //     .attr('x', width / 2) // Center the title horizontally
            //     .attr('text-anchor', 'middle')
            //     .attr('font-size', 20) // Increased font size for title
            //     .text(`Unemployment Rate, ${format(dateExtent[0])} - ${format(dateExtent[1])}`);

            // add a group for each cell and position it according to its row and column
            const cells = svg.selectAll('g')
                .data(data)
                .join('g')
                .attr('transform', (d, i) => {
                    const r = Math.floor(i / numCols);
                    const c = i % numCols;
                    return `translate(${col(c)}, ${row(r)})`;
                });

            // Add the line to each cell
            cells.append('path')
                .attr('d', d => line(d.frequency))
                .attr('fill', 'none')
                .attr('stroke', 'steelblue')
                .attr('stroke-width', 1.5);

            cells.append('text')
                .attr('font-size', 16) // Adjust font size as needed
                .attr('dominant-baseline', 'middle')
                .attr('x', 5)
                .attr('y', y(maxThemeFrequency) - 12)
                .text(d => getThemeLabel(d.theme)) // Truncate to 10 characters
                .style('cursor', 'pointer')
                .on('mouseover', function (event, d) {
                    // Show the full theme text in the tooltip
                    div.html(language === ENGLISH ? subjectsToEnglish[d.theme] : d.theme)
                        .style("display", "inline-block");
                })
                .on('mousemove', function (event) {
                    // Position the tooltip based on mouse position
                    div.style('top', (event.pageY - 10) + 'px') // Adjust the tooltip's Y position
                        .style('left', (event.pageX + 10) + 'px'); // Adjust the tooltip's X position
                })
                .on('mouseout', function () {
                    // Hide the tooltip when the mouse leaves
                    div.style("display", "none");
                });

            // Axes
            // Add x axes to each chart
            const xAxes = cells.append('g')
                .attr('transform', d => `translate(0,${row.bandwidth()})`)
                .call(xAxis)
                .call(g => g.select('.domain').remove())
                .call(g => g.selectAll('line').attr('stroke', '#c0c0c0'))
                .call(g => g.selectAll('text').style('font-size', '16px')); // Set tick text size for x-axis;

            xAxes.filter((d, i) => i < data.length - numCols)
                .selectAll('text')
                .remove();

            // Add y axes to each chart
            const yAxes = cells.append('g')
                .call(yAxis)
                .call(g => g.select('.domain').remove())
                .call(g => g.selectAll('line').attr('stroke', '#c0c0c0'))
                .call(g => g.selectAll('text').style('font-size', '16px')); // Set tick text size for y-axis;

            yAxes.filter((d, i) => i % numCols !== 0)
                .selectAll('text')
                .remove();
        });
    }

    return chart;
}

// Caso seja necessário reviver o line chart simples

// function lineChart() {
//     // Specify the chart’s dimensions.
//     const width = 928;
//     const height = 600;
//     const marginTop = 20;
//     const marginRight = 20;
//     const marginBottom = 30;
//     const marginLeft = 30;

//     function chart(selection) {
//         selection.each(function (data) {
//             // Create the positional scales.
//             const x = d3v7.scaleUtc()
//                 .domain(d3v7.extent(data, d => d.date))
//                 .range([marginLeft, width - marginRight]);

//             const y = d3v7.scaleLinear()
//                 .domain([0, d3v7.max(data, d => d.value)]).nice()
//                 .range([height - marginBottom, marginTop]);

//             // Create the SVG container.
//             const svg = d3v7.select(this).append("svg")
//                 .attr("width", width)
//                 .attr("height", height)
//                 .attr("viewBox", [0, 0, width, height])
//                 .attr("style", "max-width: 100%; height: auto; overflow: visible; font: 16px sans-serif;");

//             // Add the horizontal axis.
//             svg.append("g")
//                 .attr("transform", `translate(0,${height - marginBottom})`)
//                 .call(d3v7.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

//             // Add the vertical axis.
//             svg.append("g")
//                 .attr("transform", `translate(${marginLeft},0)`)
//                 .call(d3v7.axisLeft(y))
//                 .call(g => g.select(".domain").remove())
//                 .call(g => g.append("text")
//                     .attr("x", -marginLeft)
//                     .attr("y", 10)
//                     .attr("fill", "currentColor")
//                     .attr("text-anchor", "start")
//                     .text("↑ Unemployment (%)"));


//             // Compute the points in pixel space as [x, y, z], where z is the name of the series.
//             const points = data.map((d) => [x(d.date), y(d.value), d.category]);

//             // Group the points by series.
//             const groups = d3v7.rollup(points, v => Object.assign(v, { z: v[0][2] }), d => d[2]);

//             // Draw the lines.
//             const line = d3v7.line();
//             const path = svg.append("g")
//                 .attr("fill", "none")
//                 .attr("stroke", "steelblue")
//                 .attr("stroke-width", 1.5)
//                 .attr("stroke-linejoin", "round")
//                 .attr("stroke-linecap", "round")
//                 .selectAll("path")
//                 .data(groups.values())
//                 .join("path")
//                 .style("mix-blend-mode", "multiply")
//                 .attr("d", line);

//             // Add an invisible layer for the interactive tip.
//             const dot = svg.append("g")
//                 .attr("display", "none");

//             dot.append("circle")
//                 .attr("r", 2.5);

//             dot.append("text")
//                 .attr("text-anchor", "middle")
//                 .attr("y", -8);

//             svg
//                 .on("pointerenter", pointerentered)
//                 .on("pointermove", pointermoved)
//                 .on("pointerleave", pointerleft)
//                 .on("touchstart", event => event.preventDefault());

//             // When the pointer moves, find the closest point, update the interactive tip, and highlight
//             // the corresponding line. Note: we don't actually use Voronoi here, since an exhaustive search
//             // is fast enough.
//             function pointermoved(event) {
//                 const [xm, ym] = d3v7.pointer(event);
//                 const i = d3v7.leastIndex(points, ([x, y]) => Math.hypot(x - xm, y - ym));
//                 const [x, y, k] = points[i];
//                 path.style("stroke", ({ z }) => z === k ? null : "#ddd").filter(({ z }) => z === k).raise();
//                 dot.attr("transform", `translate(${x},${y})`);
//                 dot.select("text").text(k);
//                 svg.property("value", data[i]).dispatch("input", { bubbles: true });
//             }

//             function pointerentered() {
//                 path.style("mix-blend-mode", null).style("stroke", "#ddd");
//                 dot.attr("display", null);
//             }

//             function pointerleft() {
//                 path.style("mix-blend-mode", "multiply").style("stroke", null);
//                 dot.attr("display", "none");
//                 svg.node().value = null;
//                 svg.dispatch("input", { bubbles: true });
//             }
//         });
//     }

//     return chart;
// }
