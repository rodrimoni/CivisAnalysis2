function similarityForce()
{
    var margin = { top: 50, right: 0, bottom: 0, left: 0 },
        outerWidth = 1075,
        outerHeight = 780,
        width = outerWidth - margin.left - margin.right,
        height = outerHeight - margin.top - margin.bottom;

    var svg;
    var panelID;
    var dispatch = d3.dispatch('update');
    var div = d3.select(".toolTip");
    var simulation;

    function drag(simulation)
    {
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

        const links = data.links.map(function (d){ return Object.create(d)});
        const nodes = data.nodes.map(function(d){return Object.create(d)});

        simulation = d3v4.forceSimulation(nodes)
            .force("link", d3v4.forceLink(links).id(function(d) {return d.id;}))
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
            .attr("r", 5)
            .attr("fill", function (d) {
                return CONGRESS_DEFINE.partiesArbitraryColor[d.party];
            });
            //.call(drag(simulation));

        node.append("title")
            .text(function (d) { return d.name + " - " + d.party;});

        simulation.on("tick", function() {
            link.attr("x1", function(d) {return d.source.x; })
                .attr("y1", function (d) {return  d.source.y})
                .attr("x2", function (d) {return d.target.x})
                .attr("y2", function (d) { return d.target.y});

            node
                .attr("cx", function (d) {return d.x;})
                .attr("cy", function(d) {return d.y});
        });
    }

    function filterEdges(data, similarity) {
        var result = {};

        result.links =  data.links.filter(function (d) {
            return d.value >= similarity;
        });

        result.nodes = data.nodes;

        return result;
    }

    function chart(selection) {
        selection.each(function (data) {
            panelID = ($(this).parents('.panel')).attr('id');
            var panel = this;

            $("#"+ panelID + " .panel-body")
                .append('Select the value of %: <input id= "slider-similarity-' + panelID+  '" type="text" data-slider-min="1" data-slider-max="10" data-slider-step="1" data-slider-value="5"/>');

            var mySlider = $("#slider-similarity-" + panelID).bootstrapSlider({
                    tooltip_position: 'bottom'
                });

            mySlider.on("slideStop", function(slideEvt) {
                var similarity = 80 + slideEvt.value;
                simulation.stop();
                $(panel).find('svg').remove();
                var newData = filterEdges(data, similarity);
                update(newData, panel);
            });

            var newData =  filterEdges(data, 85);
            console.log(newData);
            update(newData, this);
        })
    }

    return d3.rebind(chart, dispatch, 'on');
}