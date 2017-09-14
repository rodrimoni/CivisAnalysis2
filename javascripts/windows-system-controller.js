var rollCallInTheDateRange =[];
var deputiesInTheDateRange ={};
var motions = {};


function loadDeputies(deputiesArray)
{
    d3.json('data/deputies.json', function(a_deputiesArray) {
        a_deputiesArray.forEach( function(deputy,i){
            deputy.deputyID = i;
            deputiesArray.push(deputy)
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
        depObj.scatterplot[1] = depObj.scatterplot[1] * (-1);
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