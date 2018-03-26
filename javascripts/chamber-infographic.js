//TODO: Transitions on hover and selections

function chamberInfographic() {
    var margin = { top: 50, right: 30, bottom: 30, left: 20 },
        outerWidth = 580,
        outerHeight = 260;
        //width = outerWidth - margin.left - margin.right,
        //height = outerHeight - margin.top - margin.bottom;

    var partyBandWidth = 30;
    var nodeRadius = 4;
    var baseWidth = outerWidth - 200, radiusWidth = outerHeight - 30;

    var dispatch = d3.dispatch('update');
    var parties;
    var partiesMap;

    var svg;

    var panelID;

    var radius = 3.7;

    function chart(selection) {
        selection.each(function(data){
            partiesMap = data.partiesMap;
            svg = d3.select(this)
                .append("svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", "0 0 " + outerWidth + " " + outerHeight)
                .classed("chamber-infographic", true)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            svg.append('g').attr('class','infographic-deputies');
            svg.append('g').attr('class','infographic-parties');

            parties = d3.entries(data.partiesMap).sort( function(a,b){
                return (b.value.center[1]+1) - (a.value.center[1]+1);
            });
            parties.forEach(function(d,i){ data.partiesMap[d.key].rank = i });

            console.log(parties);

            data.deputies.sort( function(a,b){
                    return (a.party !== b.party) ?
                        (data.partiesMap[a.party].rank - data.partiesMap[b.party].rank)
                        :
                        ( (b.scatterplot[1]+1) - (a.scatterplot[1]+1) );
            });


            panelID = (d3.select(this.parentNode).attr('id'));

            updateDeputies(data.deputies);
            updateParties();
        })
    }

    function updateDeputies(deputies){

        var circlePerAngle = 9;
        function calcAngle(i){return Math.floor(i / circlePerAngle) / Math.floor( (deputies.length - 1) / circlePerAngle) * Math.PI; }

        var circles = svg
            .select('.infographic-deputies')
            .attr('transform', 'translate(' + (partyBandWidth+4) + ',' + (baseWidth/2 -radiusWidth) + ')')
            .selectAll('circle')
            .data(deputies, function(d){ return d.deputyID});

        circles.enter().append('circle')
            .on("mouseover", mouseoverDeputy)
            .on("mouseout", mouseoutDeputy)
            .on("click", mouseClickDeputy)
            .attr({
                r:0,
                id: function(d) { return panelID + "_deputy-id-" + d.deputyID; }
            });

        circles.exit().transition().attr('r',0).remove();

        var calcAngleX = Math.sin;
        var calcAngleY = Math.cos;

        circles
            .attr({
                cy: function(d,i){ return radiusWidth- (radiusWidth-7 - i % circlePerAngle * radius*2.3) * calcAngleX(calcAngle(i)); },
                cx: function(d,i){ return radiusWidth - (radiusWidth-7 - i % circlePerAngle * radius*2.3) * calcAngleY(calcAngle(i)); },
                class: function (d) { return (d.selected)? "node selected": ( (d.hovered)? "node hovered" : "node");}
            })
            .attr( popoverAttr(renderDeputyTooltip,'top'));

        function renderDeputyTooltip (d){
            return d.name +' ('+d.party+'-'+d.district+")<br /><em>Click to select</em>"; ;
        }
        $('.chamber-infographic .infographic-deputies .node').popover({ trigger: "hover" });

        circles
            .attr({r: 4})
            .style('fill',function(d){
                    return CONGRESS_DEFINE.getPartyColor(d.party)
            });

        circles.order(); // sort elements in the svg
    }

    function updateParties(){

        var arc = d3.svg.arc()
            .outerRadius(radiusWidth+partyBandWidth)
            .innerRadius(radiusWidth);

        var innerArc = d3.svg.arc()
            .outerRadius(radiusWidth+partyBandWidth-2)
            .innerRadius(radiusWidth+2);

        var pie = d3.layout.pie()
            .sort(null)
            .value(function(d) { return d.value.size; })
            .startAngle(-Math.PI/2 -0.01)
            .endAngle(Math.PI/2 +0.01);

        var arcs = svg
            .select('.infographic-parties')
            .attr("transform", "translate(" + (radiusWidth+partyBandWidth+4) +"," + (baseWidth/2)  + ")")
            .selectAll(".arc")
            .data(pie(parties), function(d){return d.data.key});

        arcs.enter().append("g")
            .attr("class", "arc")
            .attr( {
                id: function(d){return d.data.key},
                cursor : 'pointer'
            })
            .on("mouseover", mouseoverParty)
            .on("mouseout", mouseoutParty)
            .on("click", clickParty)
            .attr( popoverAttr(renderPartyTooltip,'top'));

        arcs.exit().remove();

        $('.chamber-infographic .infographic-parties .arc').popover({ trigger: "hover" });

        var paths = arcs.selectAll('path.main')
            .data( function(d){ return [d] });

        paths.enter().append('path').attr('class','main');

        paths.transition().delay(100).duration(1000)
            .attr("d", arc);

        paths.style("fill", function(d) {
                return CONGRESS_DEFINE.getPartyColor(d.data.key);
        });


        var innerPaths = arcs.selectAll('path.inner')
            .data( function(d){ return [d] });
        innerPaths.enter().append('path').attr('class','inner');

        innerPaths.transition().delay(100).duration(1000)
            .attr("d", function(d){
                var newD = {
                    startAngle: d.startAngle - ( (d.startAngle - d.endAngle) * (d.data.value.selected/d.data.value.size) +0.01 ),
                    endAngle: (d.endAngle +0.01)
                };
                return innerArc(newD);
            })
            .attr("opacity", 0.8)
            .attr('visibility', function (d) {	return ( (d.data.value.selected/d.data.value.size)!==1 )? 'visible' : 'hidden';  })
            .style("fill", 'white');


        var texts = arcs.selectAll('text')
            .data( function(d){ return [d] });

        texts.enter().append('text')
            .attr("dy", ".35em")
            .style("text-anchor", "middle")
            .style("font-size", "11px")
            .text(function(d) { return (d.data.value.size > 10 )? d.data.key : ''; });

        texts.transition().delay(100).duration(1000)
            .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; });
    }

    function renderPartyTooltip (party){
        party = party.data;
        var selectedRate =
            (party.value.selected === party.value.size)?
                party.value.size+' Deputies'
                :
                (((party.value.selected/party.value.size)*100).toFixed(1) +"% selected ("+ party.value.selected +'/'+party.value.size)+')';

        return party.key+"<br/><em>"+ selectedRate +"</em><br/><em>Click to select</em>"
    }

    // mouse OVER circle deputy
    function mouseoverDeputy(d) {
        updateDeputyNodeInAllPeriods(d.deputyID, "hovered", true);
        dispatch.update();
    }

    // mouse OUT circle deputy
    function mouseoutDeputy(d){
        updateDeputyNodeInAllPeriods(d.deputyID, "hovered", false);
        dispatch.update();
    }

    function mouseClickDeputy(d){
        /* Reset the search input */
        $('.searchDeputies').tagsinput('removeAll');

        d3.event.preventDefault();

        if (d3.event.shiftKey){
            // using the shiftKey deselect the deputy
            updateDeputyNodeInAllPeriods(d.deputyID, "selected", false);
        } else
        if (d3.event.ctrlKey || d3.event.metaKey){
            // using the ctrlKey add deputy to selection
            updateDeputyNodeInAllPeriods(d.deputyID, "selected", true);
        }
        else {
            // a left click without any key pressed -> select only the deputy (deselect others)
            for (var key in deputyNodes){
                for (var index in deputyNodes[key])
                    deputyNodes[key][index].selected = false;
            }
            updateDeputyNodeInAllPeriods(d.deputyID, "selected", true);
            selectionOn = true;
        }
        dispatch.update()
    }

    function mouseoverParty(d){
        d = d.data;

        var deputies = svg.selectAll(".node").filter(function (dep) {
            return dep.party === d.key;
        }).data();

        deputies.forEach(function (d) {
            updateDeputyNodeInAllPeriods(d.deputyID, "hovered", true);
        });

        // update popover
        d3.select(this).attr( popoverAttr(renderPartyTooltip));
        // update vis
        dispatch.update();
    }

    function mouseoutParty(){
        for (var key in deputyNodes){
            for (var index in deputyNodes[key])
                deputyNodes[key][index].hovered = false;
        }
        dispatch.update();
    }

    function clickParty(d) {
        /* Reset the search input */
        $('.searchDeputies').tagsinput('removeAll');

        d = d.data;

        for (var key in deputyNodes){
            for (var index in deputyNodes[key])
                deputyNodes[key][index].selected = false;
        }

        var deputies = svg.selectAll(".node").filter(function (dep) {
            return dep.party === d.key;
        }).data();

        deputies.forEach(function (d) {
            updateDeputyNodeInAllPeriods(d.deputyID, "selected", true);
        });

        selectionOn = true;

        dispatch.update();
    }

    chart.update = function () {
        svg.selectAll(".node")
            .attr("class", function (d) {return (d.selected)? "node selected": ( (d.hovered)? "node hovered" : "node"); })
            .attr("r", function(d){ return (d.hovered)? nodeRadius*2 : nodeRadius;});

        var selectedDeputies = svg.selectAll(".node.selected").data();

        for( var party in partiesMap) partiesMap[party].selected = 0;

        selectedDeputies.forEach(function (deputy){
            partiesMap[deputy.party].selected++;
        });

        var innerArc = d3.svg.arc()
            .outerRadius(radiusWidth+partyBandWidth-2)
            .innerRadius(radiusWidth+2);

        svg.selectAll('path.inner')
            .transition().delay(100).duration(1000)
            .attr("d", function(d){
                var newD = {
                    startAngle: d.startAngle - ( (d.startAngle - d.endAngle) * (d.data.value.selected/d.data.value.size) +0.01 ),
                    endAngle: (d.endAngle +0.01)
                };
                return innerArc(newD);
            })
            .attr("opacity", 0.8)
            .attr('visibility', function (d) {	return ( (d.data.value.selected/d.data.value.size)!==1 )? 'visible' : 'hidden';  })
            .style("fill", 'white');
    };

    chart.selectDeputiesBySearch = function (deputies) {
        for (var key in deputyNodes) {
            for (var index in deputyNodes[key])
                deputyNodes[key][index].selected = false;
        }

        deputies.forEach(function(d){
            updateDeputyNodeInAllPeriods(d.deputyID, "selected", true);
        });

        selectionOn = true;
        dispatch.update();
    };

    return d3.rebind(chart, dispatch, 'on');
}