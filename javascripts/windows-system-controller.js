var rollCallInTheDateRange =[];
var deputiesInTheDateRange ={};
var motions = {};
var yearPartyExtent ={};
var partyTrace = {};


function loadDeputies(deputiesArray)
{
    d3.json('data/deputies.json', function(a_deputiesArray) {
        a_deputiesArray.forEach( function(deputy,i){
            deputy.deputyID = i;
            deputiesArray.push(deputy)
        });
        console.log(deputiesArray);
    });
}

function loadDeputiesNodesByYear(deputiesNodesByYear) {
    d3.json('data/deputiesNodesByYear.json', function(a_deputiesArray) {
        a_deputiesArray.forEach( function(deputy){
            deputiesNodesByYear.push(deputy)
        });
    });
}

function loadRollCalls(arrayRollCalls, callback) {
    d3.json('data/arrayRollCalls.json', function (a_arrayRollCalls) {
        a_arrayRollCalls.forEach(
            function (rollCall, i) {
                rollCall.datetime = new Date(rollCall.datetime);
                rollCall.rollCallID = i;
                arrayRollCalls.push(rollCall)
            }
        );
        callback();
    });
}

function loadNodes(type, selectedTime, index, callback)
{
    d3.json('data/precalc/'+type+'.'+selectedTime +'.json', function (precalc) {
        // SET THE precalc DEPUTIES to their constant object in the app
        precalc.deputyNodes.forEach( function(precalcDeputy){
            var deputy = deputiesArray[precalcDeputy.deputyID], depObj = {};
            depObj.name = deputy.name;
            depObj.district = deputy.district;
            depObj.deputyID = precalcDeputy.deputyID;
            depObj.party = precalcDeputy.party;
            depObj.scatterplot  = precalcDeputy.scatterplot;

            depObj.selected = true;

            deputyNodes[index][depObj.deputyID] = depObj;
        });
        callback();
    });
}

function checkSelectedValue(id) {
    var selectValue = true;
    var deputyNodesLength = Object.keys(deputyNodes).length;
    var cont = 0;

    if (selectionOn)
    {
        if ( deputyNodesLength > 1) {
            for (var key in deputyNodes){
                if (cont < deputyNodesLength - 1){
                    var dep = deputyNodes[key][id];
                    if (dep !== undefined){
                        selectValue = dep.selected;
                        if (selectValue)
                            break;
                    }
                    else
                        selectValue = false;
                }
                cont++;
            }
        }
    }

    return selectValue;
}

function loadScatterPlotDataByYear() {
    var startYear = 1991;
    var endYear = 2016;

    var deputiesNodesYearsArray = [];

    calcScatterDataRecursive(startYear);

    function calcScatterDataRecursive(year) {
        if (year > endYear) {
            console.log(JSON.stringify(deputiesNodesYearsArray));
            return;
        }

        console.log(year);

        d3.json('data/precalc/year.'+ year +'.json', function (precalc) {
            precalc.deputyNodes.forEach( function(precalcDeputy){
                if (deputiesNodesYearsArray[precalcDeputy.deputyID] === undefined) {
                    deputiesNodesYearsArray[precalcDeputy.deputyID] = {};
                    deputiesNodesYearsArray[precalcDeputy.deputyID].deputyID = precalcDeputy.deputyID;
                    deputiesNodesYearsArray[precalcDeputy.deputyID].name =deputiesArray[precalcDeputy.deputyID].name;
                }
                if (deputiesNodesYearsArray[precalcDeputy.deputyID].nodes) {
                    deputiesNodesYearsArray[precalcDeputy.deputyID].nodes.push({
                        year: year,
                        party : precalcDeputy.party,
                        scatterplot: precalcDeputy.scatterplot
                    })
                }
                else{
                    deputiesNodesYearsArray[precalcDeputy.deputyID].nodes = [];
                    deputiesNodesYearsArray[precalcDeputy.deputyID].nodes.push({
                        year: year,
                        party : precalcDeputy.party,
                        scatterplot: precalcDeputy.scatterplot
                    })
                }
            });
            calcScatterDataRecursive(year + 1)
        })
    }
}

function calcExtentValuesByYear() {
    var startYear = 1991;
    var endYear = 2016;

    var extentValuesArray = {};

    calcExtentRecursive(startYear);

    function calcExtentRecursive(year) {
        if (year > endYear) {
            console.log(JSON.stringify(extentValuesArray));
            return;
        }

        console.log(year);

        d3.json('data/precalc/year.'+ year +'.json', function (precalc) {
            extentValuesArray[year] = d3.extent(precalc.deputyNodes, function(d) { return d.scatterplot[1]; });
            calcExtentRecursive(year + 1);
        })
    }
}

function createDeputyNodes(data_deputies, selecteddeputies){
    var deputies = {};

    for (var i = 0; i < selecteddeputies.length; i++) {
        var deputy = selecteddeputies[i]; depObj = {};
        depObj.name = deputy.name;
        depObj.district = deputy.district;
        depObj.deputyID = deputy.deputyID;
        depObj.party = deputy.party;
        depObj.scatterplot  = data_deputies[i];
        depObj.selected = true;
        deputies[depObj.deputyID] = depObj;
    }

    return deputies;
}


function getMotion (type,number,year,callback){
    d3.json('data/motions.min/'+type+''+number+''+year, function(motion) {
        if(motion === null) console.log('Could not load DB getMotion/'+type+'/'+number+'/'+year);
        callback(motion);
    })
}

function setNewDateRange(period)
{
    // find if there is an pre calc of this period
    var precalc = {found:false, id:''};

    CONGRESS_DEFINE.years.forEach( function(yearObj){
        if(yearObj.period === period){
            precalc.found = true;
            precalc.id = yearObj.name;
            precalc.type = 'year';
            console.log('YEAR - preCALC!!'); }
    });

    if(!precalc.found)
        CONGRESS_DEFINE.legislatures.forEach( function(legislatureObj,i){
            if(legislatureObj.period === period){
                precalc.found = true;
                precalc.id = i;
                precalc.type = 'legislature';
                console.log('LEGISLATURE - preCALC!!'); }
        });

    if(!precalc.found)
        CONGRESS_DEFINE.presidents.forEach( function(presidentObj,i){
            if(presidentObj.period === period){
                precalc.found = true;
                precalc.id = i;
                precalc.type = 'president';
                console.log('PRESIDENT - preCALC!!'); }
        });

    return precalc;
}

function refreshDeputies(defer){

    rollCallInTheDateRange.forEach( function( rollCall ){
        if(rollCall.votes === undefined){ console.log('withoutVotes',rollCall) }
        else
            rollCall.votes.forEach( function(vote){
                deputiesInTheDateRange[vote.deputyID] = deputiesArray[vote.deputyID];
                deputiesInTheDateRange[vote.deputyID].party 		= vote.party; // refresh party
            })
    });

    defer(null, true);
}

function updateDataforDateRange(period,callback){
    $('#loading #msg').text('Loading Data');
    // get the data (from db or already loaded in the dataWrapper)
    setDateRange(period[0],period[1], function(arollCallInTheDateRange,adeputiesInTheDateRange){

        rollCallInTheDateRange = [];
        arollCallInTheDateRange.forEach(function(rollCall){ if( (rollCall.votes!==null) && (rollCall.votes!==undefined) )  rollCallInTheDateRange.push(rollCall); })
        deputiesInTheDateRange = adeputiesInTheDateRange;

        //AT THIS POINT rollCallInTheDateRange and deputiesInTheDateRange are updated with the new date range

        callback();
    });
}

function setDateRange(start,end, callback){

    rollCallInTheDateRange =[];
    deputiesInTheDateRange ={};

    var q = queue(1);
    q
        .defer(loadMotionsInDateRange,start,end) // new queue(20) of load motions
        .defer(refreshDeputies); // new queue(20) of load motions

    // wait for all loading and call the app function
    q.awaitAll(function(){
        callback(rollCallInTheDateRange,deputiesInTheDateRange)

    });
}

function loadMotionsInDateRange(start,end,defer){
    // get the list of rollCalls of the period [start,end]
    rollCallInTheDateRange = arrayRollCalls.filter( function(rollCall){
        return (start <= rollCall.datetime) && (rollCall.datetime <= end)
    });
    //console.log("rollCallInTheDateRange",rollCallInTheDateRange)

    // check if the motion is already loaded AND reduce repeated motions(with the map{})
    var motionsToLoad = {};
    rollCallInTheDateRange.forEach( function(d){
        if(motions[d.type+d.number+d.year] === undefined){
            motionsToLoad[d.type+d.number+d.year] = d;
        }
    });

    //console.log("motionsToLoad",motionsToLoad)
    var loadMotionsQueue = queue(20);

    $.each(motionsToLoad, function(motion) {
        motions[motion]={};
        loadMotionsQueue.defer(
            loadMotion,
            motionsToLoad[motion].type,
            motionsToLoad[motion].number,
            motionsToLoad[motion].year
        )

    });

    loadMotionsQueue.awaitAll(function(){ defer(null, true);} ) // return to setDateRange()
}

function loadMotion(type,number,year,defer){
    getMotion(type,number,year, function(motion){
        motions[type+number+year] = motion;

        motion.rollCalls.forEach( function(rollCall){
            if(rollCall.votes !== undefined){
                rollCall.votes.forEach( function(vote){
                    vote.vote = CONGRESS_DEFINE.integerToVote[vote.vote];
                    vote.name = deputiesArray[vote.deputyID].name;
                    vote.district = deputiesArray[vote.deputyID].district; // assuming the distric does not change for the congressman
                    if(vote.party === 'Solidaried') vote.party = 'SDD';
                    if(vote.party === 'S.Part.') vote.party = 'NoParty';
                })
            }

            // create the Date obj
            rollCall.datetime = new Date(rollCall.datetime);

            // find the arrayRollCalls
            var dtRollCall = arrayRollCalls.filter(function(d){ return (d.datetime.toUTCString() === rollCall.datetime.toUTCString() ) } )
            // console.log(dtRollCall)
            if(dtRollCall.length === 0) {
                console.log(type+number+year,'rollCall',rollCall)
            }
            // set rollCall to the arrayRollCalls entry
            else {
                for( var atribute in rollCall) dtRollCall[0][atribute] = rollCall[atribute];
                rollCall.rollCallID = dtRollCall[0].rollCallID;
                rollCall = dtRollCall[0];
            }
        });

        defer(null, true)
    })
}

function createMatrixDeputiesPerRollCall (deputies){
    // -------------------------------------------------------------------------------------------------------------------
    // Create the matrix [ Deputy ] X [ RollCall ] => table[Deputy(i)][RollCall(j)] = vote of deputy(i) in the rollCall(j)
    console.log("create matrix deputy X rollCall!!");
    var rollCalls = rollCallInTheDateRange;

    var tableDepXRollCall = numeric.rep([ Object.keys(deputies).length, Object.keys(rollCalls).length],0);

    // How the votes will be represented in the matrix for the calc of SVD
    var votoStringToInteger = {"Sim":1,"Não":-1,"Abstenção":0,"Obstrução":0,"Art. 17":0,"Branco":0};

    // for each rollCall
    rollCalls.forEach( function( rollCallEntry, rollCallKey ){


        if(rollCallEntry.votes.length === 0) console.log("NO VOTES('secret')! -"+rollCallEntry.obj);
        else{
            // for each vote in the roll call
            rollCallEntry.votes.forEach( function(vote){

                var svdKey = deputiesInTheDateRange[vote.deputyID].svdKey;
                if(svdKey !== null){
                    //if(votoStringToInteger[vote.vote]===undefined) console.log("'"+vote.vote+"'");
                    tableDepXRollCall[svdKey][rollCallKey]=votoStringToInteger[vote.vote];
                }
            })
        }
    });
    return tableDepXRollCall;
}

// calc how many votes each congressman made in the period
function calcNumVotes(deputiesInTheDateRange){
    $.each(deputiesInTheDateRange, function(deputy){    deputiesInTheDateRange[deputy].numVotes = 0;  });

    rollCallInTheDateRange.forEach( function( rollCall ){
        rollCall.votes.forEach( function(vote){
            deputiesInTheDateRange[vote.deputyID].numVotes++;
        })
    });
}

function filterDeputies () {

    // calc the number of votes for each congressman
    calcNumVotes(deputiesInTheDateRange);

    // select only congressmans who votead at least one third 1/3 of all roll calls in the selected period
    function filterDeputiesWhoVotedAtLeastOneThirdOfVotes(){
        var svdKey =0;
        var dep = $.map(deputiesInTheDateRange, function(deputy){

            if(deputy.numVotes > (rollCallInTheDateRange.length/3) ){

                deputy.svdKey = svdKey++;
                //deputy.selected = true;
                return deputy;

            }
            else{
                deputy.scatterplot = null;
                deputy.svdKey= null;
            }
        });
        return dep;
    }

    // select 513 deputies, deputies with more present in votings.
    function filter513DeputiesMorePresent(){
        var deputies = $.map(deputiesInTheDateRange, function(deputy){
            return deputy;
        });
        deputies = deputies.sort(function(a,b){ return b.numVotes - a.numVotes});

        // get the first 513nd deputies
        var selectedDeputies = deputies.splice(0, ((deputies.lenght < 513)? deputies.lenght : 513) );

        // set selected
        var svdKey =0;
        selectedDeputies.forEach( function(deputy,i){
            deputy.svdKey = svdKey++;
        });

        // reset non selected
        deputies.forEach( function(deputy){
            deputy.scatterplot = null;
            deputy.svdKey= null;
        });

        return selectedDeputies;
    }
    // -------------------------------------------------------------------------------------------------------------------
    var filterFunction = filter513DeputiesMorePresent;
    return filterFunction();
}

function createMatrixDistanceDeputies(matrixDeputiesPerRollCall) {
    var numberOfDeputies = matrixDeputiesPerRollCall.length;
    var numberOfRollCalls = matrixDeputiesPerRollCall[0].length;

    var matrixMatches   = createArray(numberOfDeputies,numberOfDeputies);
    var matrixDistances = createArray(numberOfDeputies,numberOfDeputies);

    for (var i = 0; i < numberOfDeputies; i++)
        for (var j = 0; j < numberOfDeputies; j++)
            matrixMatches[i][j] = 0;

    for (var d = 0; d < numberOfDeputies; d++)
        for (var r = 0; r < numberOfRollCalls; r++)
            for (var compareDeputy = d+1; compareDeputy < numberOfDeputies; compareDeputy++)
                if (matrixDeputiesPerRollCall[d][r] === matrixDeputiesPerRollCall[compareDeputy][r]) {
                    matrixMatches[d][compareDeputy] += 1;
                    matrixMatches[compareDeputy][d] += 1;
                }

    for (var i = 0; i < numberOfDeputies; i++)
        for (var j = 0; j < numberOfDeputies; j++)
            if (matrixMatches[i][j] !== 0)
                matrixDistances[i][j] = 100 - (matrixMatches[i][j] * 100) / numberOfRollCalls ;
                //matrixDistances[i][j] = numberOfRollCalls - matrixMatches[i][j];
            else
                matrixDistances[i][j] = 0;

    return matrixDistances;
}

function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    }

    return arr;
}

function getPartyCount(cluster) {

    var currentPartyCount = [];

    cluster.points.forEach(function(deputy){
        var result = $.grep(currentPartyCount, function(e){ return e.party === deputy.party; });
        if (result.length === 0) {
            currentPartyCount.push({"party" : deputy.party, "number": 1});
        }
        else
        if (result.length === 1) {
            result[0].number += 1;
        }
    });

    /* Sort and count the number of deputies per party*/
    currentPartyCount.sort(function(x,y){
        return d3.descending(x.number, y.number);
    });

    return currentPartyCount;
}

function calcThePartyTracesByYear( periodOfYears ){
    var startYear = 1991, endYear = 2016;

    function calcOneYearRecursive(year) {
        console.log('calcThePartyTracesByYear ' + year);
        if(year > endYear){  partyTrace['DEM'] = mergeObjects(partyTrace['PFL'],partyTrace['DEM']);
            partyTrace['PR'] = mergeObjects(partyTrace['PL'],partyTrace['PR']);
            partyTrace['PP'] = mergeObjects(partyTrace['PPB'],partyTrace['PP']);

            delete partyTrace['PFL'];
            delete partyTrace['PL'];
            delete partyTrace['PPB'];
            //delete partyTrace['PPR']; // ??
            //delete partyTrace['PDS']; // ??

            var saveTrace = {
                "extents": yearPartyExtent,
                "traces": partyTrace
            };

            console.log(JSON.stringify(saveTrace)); return; }
        var period = [];
        period[0] = new Date(year,0,1);
        period[1] = new Date(year+periodOfYears,0,1);

        console.log(period);

        updateDataforDateRange( period , function(){
            var filteredDeputies = filterDeputies();
            var matrixDeputiesPerRollCall = createMatrixDeputiesPerRollCall();
            console.log(matrixDeputiesPerRollCall);

            // var SVDdata = calcSVD(filteredDeputies,rollCallInTheDateRange);
            calcSVD(matrixDeputiesPerRollCall, function(SVDdata) {
                // Deputies array
                deputyNodes = createDeputyNodes(SVDdata.deputies,filteredDeputies);

                scaleAdjustment().setGovernmentTo3rdQuadrant(deputyNodes,period[1]);

                // store parties trace
                var parties = calcPartiesSizeAndCenter(deputyNodes);
                // $.each(parties, function(party){
                // 	if(filter[party] === undefined) { delete parties[party] }
                // });

                //console.log(parties)
                $.each(parties, function(party){
                    if(partyTrace[party] === undefined) partyTrace[party] = {};

                    partyTrace[party][year]={};
                    partyTrace[party][year].center = this.center;
                    partyTrace[party][year].size = this.size;

                });
                yearPartyExtent[year] = d3.extent( d3.entries(parties), function(d){ return d.value.center[1] });

                //calcOneYearRecursive(year+periodOfYears);
            })
        })

    }

    calcOneYearRecursive(startYear);

}

function createTraces1by1 (){
    calcThePartyTracesByYear(1); // calc by two years
}


function mergeObjects(obj1,obj2){
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
}

function calcPartiesSizeAndCenter( deputies ){
    if(deputies===null) return null;

    var parties = {};

    deputies.forEach(function(deputy){

        if(parties[deputy.party] === undefined) parties[deputy.party] = {size:0, selected:0, center:[0,0], stdev:[0,0]};
        parties[deputy.party].size++;
        if(deputy.selected) parties[deputy.party].selected++;
        // sum of values
        parties[deputy.party].center[0] += deputy.scatterplot[0];
        parties[deputy.party].center[1] += deputy.scatterplot[1];
        // sum of values?
        parties[deputy.party].stdev[0] += Math.pow(deputy.scatterplot[0], 2);
        parties[deputy.party].stdev[1] += Math.pow(deputy.scatterplot[1], 2);
    });

    $.each(parties, function(party){
        // calc stdev
        parties[party].stdev[0] = Math.sqrt(  ( parties[party].stdev[0] - Math.pow(parties[party].center[0],2)/parties[party].size) / (parties[party].size -1) )
        parties[party].stdev[1] = Math.sqrt(  ( parties[party].stdev[1] - Math.pow(parties[party].center[1],2)/parties[party].size) / (parties[party].size -1) )
        // calc mean
        parties[party].center[0] = parties[party].center[0]/parties[party].size;
        parties[party].center[1] = parties[party].center[1]/parties[party].size;
    });

    return parties;
}

function popoverAttr(htmlContent,placement){
    return {
        cursor : 'pointer',
        href:"#",
        'data-container':'body',
        'data-content': htmlContent,
        'data-html': true,
        rel:"popover",
        'data-placement': (placement)?placement:'bottom',
        'data-trigger':"hover",
        'data-viewport': 'body'
    }
}

function resetSelection(){
    for (var key in deputyNodes){
        for (var index in deputyNodes[key])
            deputyNodes[key][index].selected = true;
    }

    /* Reset the deputies selection by search */
    $('.searchDeputies').tagsinput('removeAll');

    selectionOn = false;
    updateVisualizations();
}

function updateDeputyNodeInAllPeriods(deputyID, attr, value ) {
    for (var key in deputyNodes) {
        var deputy = deputyNodes[key][deputyID];
        if (deputy !== undefined)
            deputy[attr] = value;
    }
}

function selectByStates (){

    var states = $('select[id="selStates"]').val();

    if (states !== null) {
        for (var key in deputyNodes) {
            for (var index in deputyNodes[key]) {
                var deputy = deputyNodes[key][index];
                if (deputy.selected)
                    if (states.indexOf(deputy.district) === -1)
                        deputy.selected = false;
            }
        }
        selectionOn = true;
        updateVisualizations();
    }
    else
        resetSelection();
}