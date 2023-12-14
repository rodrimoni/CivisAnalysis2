(function() {
    function scaleAdjustment() {



        /*var numSamples =100;
        var samples = [];
        function getSamples(){ return samples};

        function setSampling (OLDdeputiesInTheDateRange){
            numSamples = (numSamples > Object.size(OLDdeputiesInTheDateRange) )? Object.size(OLDdeputiesInTheDateRange) : 100;
            samples = [];
            if((OLDdeputiesInTheDateRange === null) || (Object.size(OLDdeputiesInTheDateRange) ==0) ){

            } else{
                var deputiesArray = $.map(OLDdeputiesInTheDateRange, function(d){ return d})

                var scale0 = d3.extent(deputiesArray, function(d){ return d.scatterplot[0]}),
                    scale1 = d3.extent(deputiesArray, function(d){ return d.scatterplot[1]});

                var bisector0 =  scale0[0]+ (scale0[1] - scale0[0])/2 ,
                    bisector1 =  scale1[0]+ (scale1[1] - scale1[0])/2 ;

                function sector(value,bisector){ return (value > bisector)? 1 : -1;  }


                for (var i = 0; i < numSamples; i++) {
                    var deputy = deputiesArray[Math.floor(Math.random() * deputiesArray.length)];

                    samples.push({
                        ideCadastro: deputy.ideCadastro,
                        sector: [
                            sector(deputy.scatterplot[0],bisector0),
                            sector(deputy.scatterplot[1],bisector1),
                        ]
                    })
                };
            }
        }

        function testSampling (newDeputiesInTheDateRange){
            if(samples.length == 0){
                setSampling(newDeputiesInTheDateRange);
            } else{
                var deputiesArray = $.map(newDeputiesInTheDateRange, function(d){ return d})

                var scale0 = d3.extent(deputiesArray, function(d){ return d.scatterplot[0]}),
                    scale1 = d3.extent(deputiesArray, function(d){ return d.scatterplot[1]});

                var bisector0 =  scale0[0]+ (scale0[1] - scale0[0])/2 ,
                    bisector1 =  scale1[0]+ (scale1[1] - scale1[0])/2 ;

                function sector(value,bisector){ return (value > bisector)? 1 : -1;  }

                var change = {x:0,y:0};

                samples.forEach( function(sample){
                    if(newDeputiesInTheDateRange[sample.ideCadastro] != undefined){
                        var deputy = newDeputiesInTheDateRange[sample.ideCadastro];

                        if(sample.sector[0] != sector(deputy.scatterplot[0],bisector0))
                            change.x++;

                        if(sample.sector[1] != sector(deputy.scatterplot[1],bisector1))
                            change.y++
                    }
                })

                console.log('detected '+change.x+' in X ---- '+change.y+' in Y')

                change.x = (change.x >= numSamples/3)? -1 : 1;
                change.y = (change.y >= numSamples/3)? -1 : 1;

                $.each(deputiesInTheDateRange, function(d){
                    deputiesInTheDateRange[d].scatterplot[0] *= change.x;
                    deputiesInTheDateRange[d].scatterplot[1] *= change.y;
                })
            }
        }

        return scAdj = {
                setSampling :    setSampling,
                testSampling:    testSampling
                //getSamples     :    getSamples
        };*/

        // adjust the scale of the spectrum by the government axis
        function setGovernmentTo3rdQuadrant(deputyNodes, endDate){
            //console.log(deputyNodes)

            // get party of the president elected in the endDate
            var governmentParty;
            CONGRESS_DEFINE.legislatures.forEach( function(d){if( (d.period[0] < endDate) && (d.period[1] >= endDate ) ) governmentParty = d.regimeParty; } )
            console.log(governmentParty)

            //console.log(governmentParty)
            // calc the 3rd quadrant in the 2d plot
            var extentX = d3.extent(deputyNodes, function(d){ return d.scatterplot[0]}),
                extentY = d3.extent(deputyNodes, function(d){ return d.scatterplot[1]});
            var bisectorX =  extentX[0]+ (extentX[1] - extentX[0])/2 ,
                bisectorY =  extentY[0]+ (extentY[1] - extentY[0])/2 ;

            // calc the average of the government party in the 2d plot
            var partyPositionAverage = [0,0];
            var count = 0;

            deputyNodes.forEach( function(d){
                if(d.party === governmentParty){
                    count++;
                    partyPositionAverage[0] += d.scatterplot[0];
                    partyPositionAverage[1] += d.scatterplot[1];
                }
            })
            partyPositionAverage[0]/=count;
            partyPositionAverage[1]/=count;

            // multiply one dimension by -1 if necessary to set the government in the 3rd quadrant
            var scaleX =1,
                scaleY =1;
            //function isInQuadrant3rd(x,y){ return ((y > bisectorY) && ( x < bisectorX))? 1 : 0;  }
            // if(governmentParty == 'PT'){ // to set PSDB--PT spectrum
            // 	if(partyPositionAverage[0] < bisectorX) scaleX=-1;
            // 	if(partyPositionAverage[1] < bisectorY) scaleY=-1;
            // } else {
            // to set Gov-Opos spectrum
            if(partyPositionAverage[0] > bisectorX) scaleX=-1;
            if(partyPositionAverage[1] < bisectorY) scaleY=-1;
            // }

            // multiply
            deputyNodes.forEach( function(d){
                d.scatterplot[0]*=scaleX;
                d.scatterplot[1]*=scaleY;
            })

        }

        return scAdj = {
            setGovernmentTo3rdQuadrant : setGovernmentTo3rdQuadrant
        };

    }
    if (typeof define === "function" && define.amd) define(function() { return scaleAdjustment; });
    else if (typeof module === "object" && module.exports) module.exports = scaleAdjustment;
    else this.scaleAdjustment = scaleAdjustment;
})();