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
function loadNodes(type, selectedTime, callback, technique) {
    var deputiesArray = state.getDeputiesArray();
    var currentDeputies = state.getCurrentDeputies();

    var basePath = 'data/precalc/pca/';
    if (technique === 'W-NOMINATE') {
        basePath = 'data/precalc/w-nominate/';
    }
    d3.json(basePath + type + '.' + selectedTime + '.json', function (precalc) {
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
 * @param {Function} callback - Callback function with motion data (null when
 *                              the motion could not be loaded after retries)
 */
function getMotion(type, number, year, callback) {
    var url = 'data/motions.min/' + type + '' + number + '' + year + '.json';
    fetchJsonWithRetry(url, 1, function (motion) {
        if (motion === null || motion === undefined) {
            console.log('Could not load DB getMotion/' + type + '/' + number + '/' + year);
            recordMotionFailure(type, number, year);
            callback(null);
            return;
        }
        callback(motion);
    }, function () {
        console.log('Could not load DB getMotion/' + type + '/' + number + '/' + year);
        recordMotionFailure(type, number, year);
        callback(null);
    });
}

// Tuning for static hosts with request rate limiting (HTTP 429). A whole
// legislature means hundreds of small motion files; bursting them at high
// concurrency trips server-side limits, so we stay polite and retry.
var MOTION_LOAD_CONCURRENCY = 4;
var MOTION_LOAD_MAX_ATTEMPTS = 6;
var MOTION_LOAD_BASE_DELAY_MS = 600;
var MOTION_LOAD_MAX_DELAY_MS = 15000;
var MOTION_LOAD_REQUEST_TIMEOUT_MS = 30000;

// Keys of motions that failed even after all retries, reset on every range load.
var motionLoadFailures = [];

function recordMotionFailure(type, number, year) {
    var key = type + number + year;
    if (motionLoadFailures.indexOf(key) === -1) motionLoadFailures.push(key);
}

function isRetryableStatus(status) {
    return status === 0 || status === 408 || status === 429 ||
        status === 502 || status === 503 || status === 504;
}

function retryDelayMs(attempt, jqXHR) {
    if (jqXHR && jqXHR.status === 429 && typeof jqXHR.getResponseHeader === 'function') {
        try {
            var retryAfter = parseInt(jqXHR.getResponseHeader('Retry-After'), 10);
            if (!isNaN(retryAfter) && retryAfter >= 0 && retryAfter <= 120) {
                return retryAfter * 1000 + Math.floor(Math.random() * MOTION_LOAD_BASE_DELAY_MS);
            }
        } catch (e) { /* fall through to exponential backoff */ }
    }
    var backoff = MOTION_LOAD_BASE_DELAY_MS * Math.pow(2, attempt - 1);
    var jitter = Math.floor(Math.random() * MOTION_LOAD_BASE_DELAY_MS);
    return Math.min(backoff, MOTION_LOAD_MAX_DELAY_MS) + jitter;
}

function motionLoadingNotice(text) {
    try {
        if (typeof $ !== 'undefined') $('#loading #msg').text(text);
    } catch (e) { /* overlay may not exist in every context */ }
}

function retryNoticeText(attempt, maxAttempts) {
    var language = (typeof state !== 'undefined' && state.getLanguage) ? state.getLanguage() : null;
    if (language === ENGLISH) return 'Server is busy, retrying (' + attempt + '/' + maxAttempts + ')...';
    return 'Servidor ocupado, tentando de novo (' + attempt + '/' + maxAttempts + ')...';
}

/**
 * Fetch JSON with retries for rate limiting (429) and transient errors.
 * Honors the server's Retry-After header, otherwise backs off exponentially.
 */
function fetchJsonWithRetry(url, attempt, onSuccess, onFailure) {
    $.ajax({ url: url, dataType: 'json', cache: true, timeout: MOTION_LOAD_REQUEST_TIMEOUT_MS })
        .done(function (data) { onSuccess(data); })
        .fail(function (jqXHR, textStatus) {
            var status = jqXHR ? jqXHR.status : 0;
            if (isRetryableStatus(status) && attempt < MOTION_LOAD_MAX_ATTEMPTS) {
                var delay = retryDelayMs(attempt, jqXHR);
                console.log('fetchJsonWithRetry: ' + url + ' failed with ' + status +
                    ' (' + textStatus + '), retry ' + (attempt + 1) + '/' +
                    MOTION_LOAD_MAX_ATTEMPTS + ' in ' + delay + 'ms');
                motionLoadingNotice(retryNoticeText(attempt + 1, MOTION_LOAD_MAX_ATTEMPTS));
                setTimeout(function () {
                    fetchJsonWithRetry(url, attempt + 1, onSuccess, onFailure);
                }, delay);
            } else {
                onFailure(status);
            }
        });
}

// Variables for motion loading (module-level scope)
var rollCallInTheDateRange = [];
var deputiesInTheDateRange = {};
var motions = {};

// Motions still waiting for data in the current range load. Module-level so
// the bundle fast path and the per-file fallback share (and shrink) it.
var motionsToLoadPending = {};

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
    motionsToLoadPending = {};
    rollCallInTheDateRange.forEach(function (d) {
        if (motions[d.type + d.number + d.year] === undefined) {
            motionsToLoadPending[d.type + d.number + d.year] = d;
        }
    });

    // Low concurrency on purpose: hundreds of motion files in a burst trips
    // rate limiting (HTTP 429) on shared static hosts. Retries hold their
    // queue slot while backing off, which further spaces out requests.
    motionLoadFailures = [];

    // Fast path: one bundle per year turns hundreds of files into a handful
    // of requests. Years come from the roll calls' own UTC dates — the same
    // basis the bundles were built on. Whatever is left falls back to
    // per-file loading below, so a missing bundle never breaks the load.
    var yearsToLoad = {};
    rollCallInTheDateRange.forEach(function (d) {
        yearsToLoad[d.datetime.getUTCFullYear()] = true;
    });
    var bundleQueue = queue(2);
    Object.keys(yearsToLoad).forEach(function (year) {
        bundleQueue.defer(loadMotionBundle, year);
    });
    bundleQueue.awaitAll(loadRemainingMotions);

    function loadRemainingMotions() {
        var loadMotionsQueue = queue(MOTION_LOAD_CONCURRENCY);

        $.each(motionsToLoadPending, function (motion) {
            motions[motion] = {};
            loadMotionsQueue.defer(
                loadMotion,
                motionsToLoadPending[motion].type,
                motionsToLoadPending[motion].number,
                motionsToLoadPending[motion].year
            )
        });

        loadMotionsQueue.awaitAll(function () { defer(null, true); }) // return to setDateRange()
    }
}

/**
 * Load one yearly bundle (data/bundles/motions-YYYY.json) and ingest every
 * entry still pending in motionsToLoadPending. Missing/failed bundles are
 * fine: those motions stay pending and load per-file afterwards.
 * @param {string|number} year - The bundle year
 * @param {Function} done - Queue callback
 */
function loadMotionBundle(year, done) {
    var url = 'data/bundles/motions-' + year + '.json';
    fetchJsonWithRetry(url, 1, function (bundle) {
        if (bundle !== null && bundle !== undefined) {
            Object.keys(bundle).forEach(function (key) {
                if (motionsToLoadPending[key] !== undefined) {
                    var d = motionsToLoadPending[key];
                    motions[key] = {};
                    ingestMotion(d.type, d.number, d.year, bundle[key]);
                    delete motionsToLoadPending[key];
                }
            });
        }
        done(null, true);
    }, function () {
        console.log('loadMotionBundle: ' + url + ' unavailable, falling back to per-file');
        done(null, true);
    });
}

/**
 * Load a single motion
 * @param {string} type - Motion type
 * @param {string|number} number - Motion number
 * @param {string|number} year - Motion year
 * @param {Function} defer - Deferred callback
 */
function loadMotion(type, number, year, defer) {
    getMotion(type, number, year, function (motion) {
        // Null means the file failed even after all retries: skip it so the
        // queue always finishes instead of hanging, and report it at the end.
        if (motion === null || motion === undefined) {
            defer(null, true);
            return;
        }
        ingestMotion(type, number, year, motion);
        defer(null, true)
    })
}

/**
 * Merge a motion's roll calls and votes into the app state. Shared by the
 * per-file path and the yearly-bundle fast path.
 * @param {string} type - Motion type
 * @param {string|number} number - Motion number
 * @param {string|number} year - Motion year
 * @param {Object} motion - Motion data with rollCalls
 */
function ingestMotion(type, number, year, motion) {
    var deputiesArray = state.getDeputiesArray();
    var arrayRollCalls = state.getArrayRollCalls();

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
            rollCall.theme = Array.isArray(motion?.theme) ? motion.theme[0] : motion?.theme;

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

        if (motionLoadFailures.length > 0) {
            console.warn('updateDataforDateRange: ' + motionLoadFailures.length +
                ' motion(s) could not be loaded: ' + motionLoadFailures.slice(0, 10).join(', ') +
                (motionLoadFailures.length > 10 ? ', ...' : ''));
            if (language === ENGLISH) {
                alert(motionLoadFailures.length + ' motion file(s) could not be loaded (server rate limit). Results may be incomplete — try selecting the period again.');
            } else {
                alert(motionLoadFailures.length + ' arquivo(s) de proposição não puderam ser carregados (limite do servidor). Os resultados podem estar incompletos — tente selecionar o período de novo.');
            }
        }

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
