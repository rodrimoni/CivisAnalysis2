function themesBubbleChart() {
    const margin = { top: 30, right: 30, bottom: 30, left: 30 };
    const width = MAX_WIDTH - margin.left - margin.right;
    const height = MAX_HEIGHT - margin.top - margin.bottom;
    var padding = 5; // separation between nodes
    var dispatch = d3.dispatch('update');
    const names = d => {
        const name = language === ENGLISH ? subjectsToEnglish[d] : d
        return name.split(" ")
    };

    function chart(selection) {
        selection.each(function (data) {
            drawBubbleChart(data, this);
        });
    }

    function drawBubbleChart(data, htmlContent) {
        // Create the color scale
        const colorScale = d3v4.scaleOrdinal()
            .domain(data.map(d => d.theme))
            .range(d3v4.schemeCategory20);

        // Create the pack layout
        const pack = d3v4.pack()
            .size([width - padding, height - padding])
            .padding(padding);

        // Create the hierarchy from the data
        const hierarchy = d3v4.hierarchy({ children: data })
            .sum(d => d.count);

        // Compute the pack layout
        const root = pack(hierarchy);

        // Create the SVG element
        const svg = d3v4.select(htmlContent)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `250 0 1300 1000`)
            .classed("bubble-chart", true)
            .attr("style", "max-width: 100%; height: auto; font: 30px sans-serif;")
            .attr("text-anchor", "middle");

        // Create the bubbles
        const bubbles = svg.selectAll(".bubble")
            .data(root.descendants().slice(1))
            .enter()
            .append("g")
            .attr("class", "bubble")
            .attr("transform", d => `translate(${d.x + padding}, ${d.y + padding})`);

        // Add the circles to the bubbles
        bubbles.append("circle")
            .attr("r", d => d.r)
            .attr("fill", d => colorScale(d.data.theme))
            .each(function (d) {
                const attrs = popoverAttr(themePopOver(d), 'top');
                Object.entries(attrs).forEach(([key, value]) => {
                    d3.select(this).attr(key, value);
                });
            });

        $('.bubble-chart circle').popover({ trigger: "hover" });

        // Add a label.
        const text = bubbles.filter(d => d.r > 60)
            .append("text")
            .attr("clip-path", d => `circle(${d.r})`)
            .style("font-size", d => `${Math.min(d.r / 4, 25)}px`)  // Font size is a fraction of the radius, with a max limit
            .style("pointer-events", "none");  // Disable pointer events for text

        // Add a tspan for each CamelCase-separated word.
        text.selectAll("tspan")
            .filter(d => d.r > 60)
            .data(d => names(d.data.theme))
            .enter()
            .append("tspan")
            .attr("x", 0)
            .attr("y", (d, i, nodes) => `${i - nodes.length / 2 + 0.35}em`)
            .text(d => d);

        // Add a tspan for the node’s value.
        text.append("tspan")
            .attr("x", 0)
            .attr("y", d => `${names(d.data.theme).length / 2 + 0.35}em`)
            .attr("fill-opacity", 0.5)
            .text(d => `(${d.data.count})`);

    }

    function themePopOver(d) {
        var subjectTooltipEnglish;
        var subjectTooltipPortuguese;
        subjectTooltipEnglish = '<strong>' + subjectsToEnglish[d.data.theme] + ' (' + d.data.count + ")</strong><br><em>Left-Click to select</em>";
        subjectTooltipPortuguese = '<strong>' + d.data.theme + ' (' + d.data.count + ")</strong><br><em>Botão esquerdo para selecionar</em>";

        if (language === PORTUGUESE)
            return subjectTooltipPortuguese;
        else
            return subjectTooltipEnglish;
    }


    return d3.rebind(chart, dispatch, 'on');
}
