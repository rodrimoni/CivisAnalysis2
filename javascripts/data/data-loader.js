/*
 * Data Loader Module
 * Handles all data loading operations from external sources
 */

/**
 * Load deputies data from JSON file
 */
function loadDeputies() {
    d3.json('data/deputies.json', function (a_deputiesArray) {
        state.setDeputiesArray(a_deputiesArray);
        console.log(state.getDeputiesArray());
    });
}

/**
 * Load deputies nodes by year data
 */
function loadDeputiesNodesByYear() {
    var deputiesNodesByYear = state.getDeputiesNodesByYear();
    d3.json('data/deputiesNodesByYear.json', function (a_deputiesArray) {
        a_deputiesArray.forEach(function (deputy) {
            deputiesNodesByYear.push(deputy)
        });
    });
}

/**
 * Load roll calls data
 * @param {Function} callback - Callback function to execute after loading
 */
function loadRollCalls(callback) {
    var arrayRollCalls = state.getArrayRollCalls();
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

/**
 * Load pre-calculated nodes for a specific period
 * @param {string} type - Type of period (year, legislature, president)
 * @param {string|number} selectedTime - The specific time period
 * @param {Function} callback - Callback function to execute after loading
 */
function loadNodes(type, selectedTime, callback) {
    var deputiesArray = state.getDeputiesArray();
    var currentDeputies = state.getCurrentDeputies();

    d3.json('data/precalc/' + type + '.' + selectedTime + '.json', function (precalc) {
        // SET THE precalc DEPUTIES to their constant object in the app
        precalc.deputyNodes.forEach(function (precalcDeputy) {
            var deputy = deputiesArray[precalcDeputy.deputyID], depObj = {};
            depObj.name = deputy.name;
            depObj.district = deputy.district;
            depObj.deputyID = precalcDeputy.deputyID;
            depObj.party = precalcDeputy.party;
            depObj.scatterplot = precalcDeputy.scatterplot;
            depObj.alignment = precalcDeputy.alignment;

            depObj.selected = true;
            depObj.hovered = false;
            depObj.overlapped = null;
            depObj.rate = null;
            depObj.vote = null;

            currentDeputies[depObj.deputyID] = depObj;
        });
        callback();
    });
}

/**
 * Get a specific motion from the database
 * @param {string} type - Motion type
 * @param {string|number} number - Motion number
 * @param {string|number} year - Motion year
 * @param {Function} callback - Callback function with motion data
 */
function getMotion(type, number, year, callback) {
    d3.json('data/motions.min/' + type + '' + number + '' + year + '.json', function (motion) {
        if (motion === null) console.log('Could not load DB getMotion/' + type + '/' + number + '/' + year);
        callback(motion);
    })
}

// Variables for motion loading (module-level scope)
var rollCallInTheDateRange = [];
var deputiesInTheDateRange = {};
var motions = {};

/**
 * Load motions within a date range
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @param {Function} defer - Deferred callback for queue
 */
function loadMotionsInDateRange(start, end, defer) {
    var arrayRollCalls = state.getArrayRollCalls();

    // get the list of rollCalls of the period [start,end]
    rollCallInTheDateRange = arrayRollCalls.filter(function (rollCall) {
        return (start <= rollCall.datetime) && (rollCall.datetime <= end)
    });

    // check if the motion is already loaded AND reduce repeated motions(with the map{})
    var motionsToLoad = {};
    rollCallInTheDateRange.forEach(function (d) {
        if (motions[d.type + d.number + d.year] === undefined) {
            motionsToLoad[d.type + d.number + d.year] = d;
        }
    });

    var loadMotionsQueue = queue(20);

    $.each(motionsToLoad, function (motion) {
        motions[motion] = {};
        loadMotionsQueue.defer(
            loadMotion,
            motionsToLoad[motion].type,
            motionsToLoad[motion].number,
            motionsToLoad[motion].year
        )
    });

    loadMotionsQueue.awaitAll(function () { defer(null, true); }) // return to setDateRange()
}

/**
 * Load a single motion
 * @param {string} type - Motion type
 * @param {string|number} number - Motion number
 * @param {string|number} year - Motion year
 * @param {Function} defer - Deferred callback
 */
function loadMotion(type, number, year, defer) {
    var deputiesArray = state.getDeputiesArray();
    var arrayRollCalls = state.getArrayRollCalls();

    getMotion(type, number, year, function (motion) {
        motions[type + number + year] = motion;

        motion.rollCalls.forEach(function (rollCall) {
            if (rollCall.votes !== undefined) {
                rollCall.votes.forEach(function (vote) {
                    vote.vote = CONGRESS_DEFINE.integerToVote[vote.vote];
                    try {
                        let name = deputiesArray[vote.deputyID].name;
                        vote.name = name
                    }
                    catch {
                        console.log(vote);
                    }
                    vote.district = deputiesArray[vote.deputyID].district;
                    if (vote.party === 'Solidaried') vote.party = 'SDD';
                    if (vote.party === 'S.Part.') vote.party = 'NoParty';
                })
            }

            // assign motion theme to roll call
            rollCall.theme = !!motion?.theme?.length ? motion?.theme[0] : undefined;

            // create the Date obj
            rollCall.datetime = new Date(rollCall.datetime);

            // find the arrayRollCalls
            var dtRollCall = arrayRollCalls.filter(function (d) { return (d.datetime.toUTCString() === rollCall.datetime.toUTCString()) })

            if (dtRollCall.length === 0) {
                console.log(type + number + year, 'rollCall', rollCall)
            }
            // set rollCall to the arrayRollCalls entry
            else {
                for (var atribute in rollCall) dtRollCall[0][atribute] = rollCall[atribute];
                rollCall.rollCallID = dtRollCall[0].rollCallID;
                rollCall = dtRollCall[0];
            }
        });

        defer(null, true)
    })
}

/**
 * Set date range and load corresponding data
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @param {Function} callback - Callback with loaded data
 */
function setDateRange(start, end, callback) {
    rollCallInTheDateRange = [];
    deputiesInTheDateRange = {};

    var q = queue(1);
    q
        .defer(loadMotionsInDateRange, start, end)
        .defer(refreshDeputies);

    q.awaitAll(function () {
        callback(rollCallInTheDateRange, deputiesInTheDateRange)
    });
}

/**
 * Refresh deputies data based on loaded roll calls
 * @param {Function} defer - Deferred callback
 */
function refreshDeputies(defer) {
    var deputiesArray = state.getDeputiesArray();

    rollCallInTheDateRange.forEach(function (rollCall) {
        if (rollCall.votes === undefined) {
            console.log('withoutVotes', rollCall)
        }
        else {
            rollCall.votes.forEach(function (vote) {
                deputiesInTheDateRange[vote.deputyID] = deputiesArray[vote.deputyID];
                deputiesInTheDateRange[vote.deputyID].party = vote.party; // refresh party
            })
        }
    });

    defer(null, true);
}

/**
 * Update data for a specific date range
 * @param {Array} period - [startDate, endDate]
 * @param {Function} callback - Callback after data is updated
 */
function updateDataforDateRange(period, callback) {
    var language = state.getLanguage();
    var text = language === ENGLISH ? "Loading Data" : "Carregando dados";
    $('#loading #msg').text(text);

    setDateRange(period[0], period[1], function (arollCallInTheDateRange, adeputiesInTheDateRange) {
        rollCallInTheDateRange = [];
        arollCallInTheDateRange.forEach(function (rollCall) {
            if ((rollCall.votes !== null) && (rollCall.votes !== undefined))
                rollCallInTheDateRange.push(rollCall);
        })
        deputiesInTheDateRange = adeputiesInTheDateRange;

        console.log("DONE");
        callback();
    });
}

function calculatePrecalc(type) {
    function calcRecursive(i) {
        console.log(i + " gerando precalc ")

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

            const deputiesAligment = calculateDeputiesAligment(matrixDeputiesPerRollCall, filteredDeputies);

            calcSVD(matrixDeputiesPerRollCall, function (SVDdata) {
                // Deputies array
                deputyNodes = createDeputyNodes(SVDdata.deputies, filteredDeputies, deputiesAligment);
                // RollCalls array
                // Adjust the SVD result to the political spectrum
                scaleAdjustment().setGovernmentTo3rdQuadrant(d3.values(deputyNodes), end);

                var currentRollCalls = state.getCurrentRollCalls();
                var currentDeputies = state.getCurrentDeputies();

                calcRollCallRate(currentRollCalls, currentDeputies);

                // STORE OBJECT - TO SAVE
                var storeCalcObject = { deputyNodes: [] };

                // store deputy trace
                deputyNodes.forEach(function (deputy) {
                    deputy.scatterplot[0] = Number(deputy.scatterplot[0].toPrecision(4));
                    deputy.scatterplot[1] = Number(deputy.scatterplot[1].toPrecision(4));

                    var storeDeputyTrace = {
                        deputyID: deputy.deputyID,
                        scatterplot: deputy.scatterplot,
                        party: deputy.party,
                        alignment: deputy.alignment
                    };

                    storeCalcObject.deputyNodes.push(storeDeputyTrace)
                });

                // SAVE!!
                if (type) console.save(storeCalcObject, type + '.' + i + '.json');
                //====================================
                calcRecursive(i + 1);
            });
        })

    }
    if (type == 'year') calcRecursive(CONGRESS_DEFINE.startingYear);
    else calcRecursive(0);
}
