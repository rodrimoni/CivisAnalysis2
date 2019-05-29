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

function loadNodes(type, selectedTime, callback)
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
            depObj.hovered = false;
            depObj.rate = null;
            depObj.vote = null;

            currentDeputies[depObj.deputyID] = depObj;
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
    var endYear = 2018;

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
    var endYear = 2018;

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
    var deputies = [];

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


function createDeputySimilarityGraph(data_deputies, selectedDeputies) {
    var numDeputies = selectedDeputies.length;
    var graph = {nodes:[], links: []};

    for (var i = 0; i< numDeputies; i++){
        var deputy = selectedDeputies[i]; node = {};
        node.deputyID = deputy.deputyID;
        node.party = deputy.party;
        node.name = deputy.name;
        node.district = deputy.district;
        node.selected = true;
        graph.nodes[deputy.deputyID] = node;
        for (var j = 0; j < i; j++)
        {
            var source = selectedDeputies[i];
            var target = selectedDeputies[j];
            var link = {};
            link.source = source.deputyID;
            link.target = target.deputyID;
            link.value = data_deputies[i][j];
            graph.links.push(link);
        }
    }

    return graph;
}

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
            resultDate = e.datetime >= filter.dateFilter[0] && e.datetime <= filter.dateFilter[1];
        else // The date filter its not setted, so all in period must be selected
            resultDate = true;

        return resultType && resultDate;
    });
}

function getMotion (type,number,year,callback){
    d3.json('data/motions.min/'+type+''+number+''+year+'.json', function(motion) {
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
                deputiesInTheDateRange[vote.deputyID].party = vote.party; // refresh party
            })
    });

    defer(null, true);
}

function updateDataforDateRange(period,callback){
    var text = language === ENGLISH ? "Loading Data" : "Carregando dados";
    $('#loading #msg').text(text);
    // get the data (from db or already loaded in the dataWrapper)
    setDateRange(period[0],period[1], function(arollCallInTheDateRange,adeputiesInTheDateRange){

        rollCallInTheDateRange = [];
        arollCallInTheDateRange.forEach(function(rollCall){ if( (rollCall.votes!==null) && (rollCall.votes!==undefined) )  rollCallInTheDateRange.push(rollCall); })
        deputiesInTheDateRange = adeputiesInTheDateRange;

        //AT THIS POINT rollCallInTheDateRange and deputiesInTheDateRange are updated with the new date range
        console.log("DONE");
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
    var startYear = 1991, endYear = 2018;

    function calcOneYearRecursive(year) {
        console.log('calcThePartyTracesByYear ' + year);
        if(year > endYear){  partyTrace['DEM'] = mergeObjects(partyTrace['PFL'],partyTrace['DEM']);
            partyTrace['PR'] = mergeObjects(partyTrace['PL'],partyTrace['PR']);
            partyTrace['PP'] = mergeObjects(partyTrace['PPB'],partyTrace['PP']);
            partyTrace['Podemos'] = mergeObjects(partyTrace['PTN'],partyTrace['Podemos']);
            partyTrace['MDB'] = mergeObjects(partyTrace['PMDB'],partyTrace['MDB']);

            delete partyTrace['PFL'];
            delete partyTrace['PL'];
            delete partyTrace['PPB'];
            delete partyTrace['PTN'];
            delete partyTrace['PMDB'];
            //delete partyTrace['PPR']; // ??
            //delete partyTrace['PDS']; // ??
            //delete PTN -> PODEMOS?

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
            var matrixDeputiesPerRollCall = createMatrixDeputiesPerRollCall(filteredDeputies);

            // var SVDdata = calcSVD(filteredDeputies,rollCallInTheDateRange);
            calcSVD(matrixDeputiesPerRollCall, function(SVDdata) {
                // Deputies array
                deputyNodes = createDeputyNodes(SVDdata.deputies,filteredDeputies);

                scaleAdjustment().setGovernmentTo3rdQuadrant(d3.values(deputyNodes),period[1]);

                // store parties trace
                var parties = calcPartiesSizeAndCenter(d3.values(deputyNodes));
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

                calcOneYearRecursive(year+periodOfYears);
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
        updateDeputies(key);
    }

    for (var key in rollCallsRates){
        for (var index in rollCallsRates[key])
            rollCallsRates[key][index].selected = true;
        updateRollCalls(key);
    }

    /* Reset the roll calls selection by search */
    $('.searchRollCall.tt-input').each(function () {
       $(this).val('');
    });
    /* Reset the deputies selection by search */
    $('.searchDeputies').tagsinput('removeAll');

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
        updateVisualizations();
    }
    else
        resetSelection();
}

// for each roll call rate how many yes and no it has, in the range [1(yes),-1(no)]
function calcRollCallRate(rollCalls,deputies){
    var mapSelectedDeputies = {};

    for (var key in deputies) {
        var dep = deputies[key];
        mapSelectedDeputies[dep.deputyID]=true;
    }

    $.each(rollCalls, function(d){
        rollCalls[d].rate='noVotes';

        var totalVotes=0, // total of votes
            votes = {};   // sum of each type

        rollCalls[d].votes.forEach( function (vote){
            // if deputy is selected count the vote
            if(mapSelectedDeputies[vote.deputyID]!== undefined){
                if( votes[vote.vote] === undefined )
                    votes[vote.vote]=0;

                votes[vote.vote] ++;
                totalVotes ++;
            }
        });

        if(( (votes['Sim'] ===undefined ) && (votes['Não'] === undefined ) )) {
            rollCalls[d].rate = 'noVotes'
        }
        else {
            if(votes['Sim'] === undefined) votes['Sim']=0;
            if(votes['Não'] === undefined) votes['Não']=0;
            rollCalls[d].rate = (votes['Sim']-votes['Não'])/( votes['Sim']+votes['Não']);
            rollCalls[d].countVotes = [
                {'vote' : 'Sim', 'qtd': votes['Sim']},
                {'vote' : 'Não', 'qtd': votes['Não']}
            ]
        }
    })
}

/// =======================================================================================
/// =======================================================================================
//
//	 FUNCTIONS TO CALC DEPUTIES history , pre-calc
//
// it should have deputies with the constant deputyID  == arrayDeputies
// it should have rollCalls with the constant RollCallID  == arrayRollCalls

function calcPreSetsHistory(type) {
    function calcRecursive(i) {
        console.log(i + " gerado precalc ")

        if (type == 'year') {
            if (i == CONGRESS_DEFINE.endingYear + 1) return;
        }
        else if (type == 'legislature') {
            if (CONGRESS_DEFINE.legislatures.length == i) {
                return;
            }
        }
        else if (type == 'president') {
            if (CONGRESS_DEFINE.presidents.length == i) {
                return;
            }
        }

        var start, end;
        if (type == 'year') {
            start = new Date(i, 0);
            end = new Date(i + 1, 0);
        }
        else if (type == 'legislature') {
            start = CONGRESS_DEFINE.legislatures[i].period[0];
            end = CONGRESS_DEFINE.legislatures[i].period[1];
        }
        else if (type == 'president') {
            start = CONGRESS_DEFINE.presidents[i].period[0];
            end = CONGRESS_DEFINE.presidents[i].period[1];
        }


        updateDataforDateRange([start, end], function () {
            var filteredDeputies = filterDeputies();
            var matrixDeputiesPerRollCall = createMatrixDeputiesPerRollCall(filteredDeputies);

            calcSVD(matrixDeputiesPerRollCall, function (SVDdata) {
                // Deputies array
                deputyNodes = createDeputyNodes(SVDdata.deputies, filteredDeputies);
                // RollCalls array
                // Adjust the SVD result to the political spectrum
                scaleAdjustment().setGovernmentTo3rdQuadrant(d3.values(deputyNodes), end);

                calcRollCallRate(currentRollCalls, currentDeputies);

                // STORE OBJECT - TO SAVE
                var storeCalcObject = {deputyNodes: []};

                // store deputy trace
                deputyNodes.forEach(function (deputy) {
                    deputy.scatterplot[0] = Number(deputy.scatterplot[0].toPrecision(4));
                    deputy.scatterplot[1] = Number(deputy.scatterplot[1].toPrecision(4));

                    var storeDeputyTrace = {
                        deputyID: deputy.deputyID,
                        scatterplot: deputy.scatterplot,
                        party: deputy.party
                    };

                    storeCalcObject.deputyNodes.push(storeDeputyTrace)
                });

                // SAVE!!
                if (type) console.save(storeCalcObject, type + '.' + i + '.json');
                //====================================
                calcRecursive(i+1);
            });
        })

    }
    if(type == 'year') calcRecursive(CONGRESS_DEFINE.startingYear);
    else calcRecursive(0);
}
var translator;
function initDict()
{
    var dict = 
    {
        "Reset all selections": {
          br: "Desfazer todas as seleções"
        },
        "Choose one of the following...": {
         br: "Escolha os estados...",
         en: "Choose one of the following..."  
        },
        "Apply filter":{
            br:" Aplicar filtro"
        },
        "Create a bar chart":{
            br:"Criar um gráfico de barras"
        },
        "Show parties clusters":{
            br:"Mostrar os grupos por partidos"
        },
        "Create a Spectrum of Deputies - Technique: PCA" :{
            br:"Criar um Espectro de Deputados - Técnica: PCA"
        },
        "Create a Spectrum of Deputies - Technique: MDS":{
            br:"Criar um Espectro de Deputados - Técnica: MDS"
        },
        "Create a Spectrum of Deputies - Technique: t-SNE": {
            br:"Criar um Espectro de Deputados - Técnica: t-SNE"
        },
        "Create a Chamber Infographic":{
            br:"Criar um Infográfico da Câmara"
        },
        "Create a Deputies Similarity Graph":{
            br:"Criar um Grafo de Similaridade dos Deputados"
        },
        "Create a Map of Roll Calls":{
            br:"Criar um Mapa de Votações"
        },
        "Create a timeline with selected deputies":{
            br:"Criar uma linha do tempo com os deputados selecionados"
        },
        "Timeline":{
            br: "Linha do tempo"
        },
        "YEARLY POLITICAL SPECTRA":{
            br: "ESPECTRO POLÍTICO ANUAL"
        },
        "max RollCalls/week": {
            br: "máx. Votações/Semana"
        },
        "49th Legislature":{
            br: "49ª Legislatura"
        },
        "50th Legislature":{
            br: "50ª Legislatura"
        },
        "51th Legislature":{
            br: "51ª Legislatura"
        },
        "52th Legislature":{
            br: "52ª Legislatura"
        },
        "53th Legislature":{
            br: "53ª Legislatura"
        },
        "54th Legislature":{
            br: "54ª Legislatura"
        },
        "55th Legislature":{
            br: "55ª Legislatura"
        },
        "FHC (PSDB) 1st Term":{
            br: "FHC (PSDB) 1º Man"
        },
        "FHC (PSDB) 2nd Term":{
            br: "FHC (PSDB) 2º Man"
        },
        "Lula (PT) 1st Term":{
            br: "Lula (PT) 1º Man"
        },
        "Lula (PT) 2nd Term":{
            br: "Lula (PT) 2º Man"
        },
        "Dilma (PT) 1st Term":{
            br: "Dilma (PT) 1º Man"
        },
        "Dilma (PT) 2nd Term":{
            br: "Dilma (PT) 2º Man"
        },
        "elections":{
            br: "eleições"
        },
        "Clustering with K-Means":{
            br: "Clusterização com K-Médias"
        },
        "Select the value of": {
            br: "Selecione um valor para"
        },
        "Value of": {
            br: "Valor para"
        },
        "Select Deputies":{
            br: "Selecione os Deputados"
        },
        "Select the grade of similarity":{
            br:"Selecione o grau de similaridade"
        },
        "Select one Roll Call":{
            br:"Selecione uma votação"
        },
        "Select motion types":{
            br: "Selecione tipos de votação"
        },
        "Select the initial and final date":{
            br:"Selecione a data inicial e final"
        },
        "Roll Calls":{
            br: "Votações"
        },
        "Yes (approved)":{
            br:"Sim (aprovado)"
        },
        "No (not approved)":{
            br:"Não (não aprovado)"
        },
        "YES":{
            br:"SIM"
        },
        "NO":{
            br: "NÃO" 
        },
        "ABSTENTION":{
            br: "ABSTENÇÃO" 
        },
        "OBSTRUCTION":{
            br: "OBSTRUÇÃO" 
        },
        "No Votes":{
            br: "Sem Votos" 
        },
        "VOTE":{
            br: "VOTO" 
        },
        "Map of Roll Calls":{
            br: "Mapa de Votações"
        },
        "to":{
            br: "até"
        },
        "Year":{
            br: "Ano"
        },
        "Feb":{
            br: "Fev"
        },
        "Apr":{
            br: "Abr"
        },
        "May":{
            br: "Maio"
        },
        "Aug":{
            br: "Ago"
        },
        "Sep":{
            br: "Set"
        },
        "Oct": {
            br: "Out"
        },
        "Dec":{
            br: "Dez"
        },
        "Amendment": {
            br: "Emenda"
        }
      }

      if (language === PORTUGUESE)
      {
        translator = $('body').translate({lang: "br", t: dict}); //use BR
        $("button .filter-option").text(translator.get("Choose one of the following..."));
        $("#bar-chart").text(translator.get("Create a bar chart"));
        $("#force-layout").text(translator.get("Show parties clusters"));
        $("#scatter-plot-pca").text(translator.get("Create a Spectrum of Deputies - Technique: PCA"));
        $("#scatter-plot-mds").text(translator.get("Create a Spectrum of Deputies - Technique: MDS"));
        $("#scatter-plot-tsne").text(translator.get("Create a Spectrum of Deputies - Technique: t-SNE"));
        $("#chamber-infographic").text(translator.get("Create a Chamber Infographic"));
        $("#deputies-similarity-force").text(translator.get("Create a Deputies Similarity Graph"));
        $("#rollcalls-heatmap").text(translator.get("Create a Map of Roll Calls"));
        $("#time-line-crop-behavior-selection").text(translator.get("Create a timeline with selected deputies"));
      }
}

(function(console){

    console.save = function(data, filename){

        if(!data) {
            console.error('Console.save: No data')
            return;
        }

        if(!filename) filename = 'console.json'

        if(typeof data === "object"){
            data = JSON.stringify(data, undefined, 4)
        }

        var blob = new Blob([data], {type: 'text/json'}),
            e    = document.createEvent('MouseEvents'),
            a    = document.createElement('a')

        a.download = filename
        a.href = window.URL.createObjectURL(blob)
        a.dataset.downloadurl =  ['text/json', a.download, a.href].join(':')
        e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
        a.dispatchEvent(e)
    }
})(console)