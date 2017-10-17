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
    //console.log(JSON.stringify(d3.select('#panel-2-1 .panel-body').data()[0]));
    //console.log(JSON.stringify(deputyNodes[0]));
    d3.json('data/precalc/'+type+'.'+selectedTime +'.json', function (precalc) {
        // SET THE precalc DEPUTIES to their constant object in the app
        precalc.deputyNodes.forEach( function(precalcDeputy){
            var deputy = deputiesArray[precalcDeputy.deputyID], depObj = {};
            depObj.name = deputy.name;
            depObj.district = deputy.district;
            depObj.deputyID = precalcDeputy.deputyID;
            depObj.party = precalcDeputy.party;
            depObj.scatterplot  = precalcDeputy.scatterplot;
            deputyNodes.push(depObj);
        });
        callback();
    });
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
        //depObj.scatterplot[0] = depObj.scatterplot[0] * (-1);
        deputies.push(depObj);
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

function createMatrixDeputiesPerRollCall (){
    // -------------------------------------------------------------------------------------------------------------------
    // Create the matrix [ Deputy ] X [ RollCall ] => table[Deputy(i)][RollCall(j)] = vote of deputy(i) in the rollCall(j)
    console.log("create matrix deputy X rollCall!!");
    var deputies = deputiesInTheDateRange;
    var rollCalls = rollCallInTheDateRange;

    var tableDepXRollCall = numeric.rep([ Object.keys(deputies).length, Object.keys(rollCalls).length],0);

    // How the votes will be represented in the matrix for the calc of SVD
    var votoStringToInteger = {"Sim":1,"N�o":-1,"Absten��o":0,"Obstru��o":0,"Art. 17":0,"Branco":0};

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
    $.each(deputiesInTheDateRange, function(deputy){    deputiesInTheDateRange[deputy].numVotes = 0;  })

    rollCallInTheDateRange.forEach( function( rollCall ){
        rollCall.votes.forEach( function(vote){
            deputiesInTheDateRange[vote.deputyID].numVotes++;
        })
    })
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

        updateDataforDateRange( period , function(){
            filteredDeputies = filterDeputies();
            matrixDeputiesPerRollCall = createMatrixDeputiesPerRollCall();

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

                    partyTrace[party][year]={}
                    partyTrace[party][year].center = this.center;
                    partyTrace[party][year].size = this.size;

                })
                yearPartyExtent[year] = d3.extent( d3.entries(parties), function(d){ return d.value.center[1] });

                calcOneYearRecursive(year+periodOfYears);
            })
        })

    };

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
    if(deputies==null) return null;

    var parties = {};

    deputies.forEach(function(deputy){

        if(parties[deputy.party] === undefined) parties[deputy.party] = {size:0, selected:0, center:[0,0], stdev:[0,0]};
        parties[deputy.party].size++;
        if(deputy.selected) parties[deputy.party].selected++;
        // sum of values
        parties[deputy.party].center[0] += deputy.scatterplot[0];
        parties[deputy.party].center[1] += deputy.scatterplot[1];
        // sum of values�
        parties[deputy.party].stdev[0] += Math.pow(deputy.scatterplot[0], 2);
        parties[deputy.party].stdev[1] += Math.pow(deputy.scatterplot[1], 2);
    })

    $.each(parties, function(party){
        // calc stdev
        parties[party].stdev[0] = Math.sqrt(  ( parties[party].stdev[0] - Math.pow(parties[party].center[0],2)/parties[party].size) / (parties[party].size -1) )
        parties[party].stdev[1] = Math.sqrt(  ( parties[party].stdev[1] - Math.pow(parties[party].center[1],2)/parties[party].size) / (parties[party].size -1) )
        // calc mean
        parties[party].center[0] = parties[party].center[0]/parties[party].size;
        parties[party].center[1] = parties[party].center[1]/parties[party].size;
    })

    return parties;
}