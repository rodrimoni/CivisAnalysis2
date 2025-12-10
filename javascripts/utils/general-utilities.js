/*
 * General Utilities Module
 * General-purpose utility functions
 */

/**
 * Create multi-dimensional array
 * @param {number} length - Array length
 * @returns {Array} Multi-dimensional array
 */
function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while (i--) arr[length - 1 - i] = createArray.apply(this, args);
    }

    return arr;
}

/**
 * Flip keys and values in an object
 * @param {Object} trans - Object to flip
 * @returns {Object} Flipped object
 */
function array_flip(trans) {
    var key, tmp_ar = {};

    for (key in trans) {
        if (trans.hasOwnProperty(key)) {
            tmp_ar[trans[key]] = key;
        }
    }

    return tmp_ar;
}

/**
 * Merge two objects
 * @param {Object} obj1 - First object
 * @param {Object} obj2 - Second object
 * @returns {Object} Merged object
 */
function mergeObjects(obj1, obj2) {
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
}

/**
 * Get popover attributes for hover trigger
 * @param {string} htmlContent - Popover content
 * @param {string} placement - Placement position (default: 'bottom')
 * @returns {Object} Popover attributes
 */
function popoverAttr(htmlContent, placement) {
    return {
        cursor: 'pointer',
        href: "#",
        'data-container': 'body',
        'data-content': htmlContent,
        'data-html': true,
        rel: "popover",
        'data-placement': (placement) ? placement : 'bottom',
        'data-trigger': "hover",
        'data-viewport': 'body'
    }
}

/**
 * Get popover attributes for focus trigger
 * @param {Function|string} htmlContent - Popover content or function
 * @param {string} placement - Placement position (default: 'bottom')
 * @returns {Object} Popover attributes
 */
function popoverAttrFocus(htmlContent, placement) {
    return {
        cursor: 'pointer',
        href: "javascript:",
        'data-container': 'body',
        'data-content': htmlContent,
        'data-html': true,
        rel: "popover",
        'data-placement': (placement) ? placement : 'bottom',
        'data-trigger': "focus",
    }
}

/**
 * Calculate opacity based on party alignment value
 * Maps alignment (0-1) to opacity range (0.2-1.0) for better visibility
 * @param {number} alignment - Alignment value between 0 and 1
 * @returns {number} Opacity value between 0.2 and 1.0 (or 0.7 if alignment is null/undefined)
 */
function getAlignmentOpacity(alignment) {
    return alignment ? 0.2 + (alignment * 0.8) : 0.7;
}

/**
 * Initialize system
 */
function initSystem() {
    loadDeputies();
    loadDeputiesNodesByYear();
    loadRollCalls(function () {
        createNewChild(TIME_LINE, {});
        // This functions are used to update data in System, keep commented.
        //createTraces1by1();
        //calculatePrecalc('year');
        //calculatePrecalc('legislature');
        //calculatePrecalc('president');
        //calcExtentValuesByYear();
        //loadScatterPlotDataByYear();
    });
}

/**
 * Console.save functionality for downloading data
 */
(function (console) {
    console.save = function (data, filename) {
        if (!data) {
            console.error('Console.save: No data')
            return;
        }

        if (!filename) filename = 'console.json'

        if (typeof data === "object") {
            data = JSON.stringify(data, undefined, 4)
        }

        var blob = new Blob([data], { type: 'text/json' }),
            e = document.createEvent('MouseEvents'),
            a = document.createElement('a')

        a.download = filename
        a.href = window.URL.createObjectURL(blob)
        a.dataset.downloadurl = ['text/json', a.download, a.href].join(':')
        e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
        a.dispatchEvent(e)
    }
})(console)

/**
 * Localize theme name (shared utility)
 * Mirrors logic used across modules to translate subject names to English
 * when language is ENGLISH and mapping exists in subjectsToEnglish
 * @param {string} theme - Theme name
 * @returns {string} Localized theme string
 */
function localizedTheme(theme) {
    if (typeof subjectsToEnglish !== 'undefined' && typeof language !== 'undefined' && language === ENGLISH && subjectsToEnglish[theme]) {
        return subjectsToEnglish[theme];
    }
    return theme;
}

function calcThePartyTracesByYear(periodOfYears) {
    var startYear = CONGRESS_DEFINE.startingYear, endYear = CONGRESS_DEFINE.endingYear;

    function calcOneYearRecursive(year) {
        console.log('calcThePartyTracesByYear ' + year);
        if (year > endYear) {
            partyTrace['DEM'] = mergeObjects(partyTrace['PFL'], partyTrace['DEM']);
            partyTrace['União'] = mergeObjects(partyTrace['DEM'], partyTrace['União']);
            partyTrace['PR'] = mergeObjects(partyTrace['PL'], partyTrace['PR']);
            partyTrace['PP'] = mergeObjects(partyTrace['PPB'], partyTrace['PP']);
            partyTrace['Podemos'] = mergeObjects(partyTrace['PTN'], partyTrace['Podemos']);
            partyTrace['MDB'] = mergeObjects(partyTrace['PMDB'], partyTrace['MDB']);
            partyTrace['CIDADANIA'] = mergeObjects(partyTrace['PPS'], partyTrace['CIDADANIA']);

            delete partyTrace['DEM'];
            delete partyTrace['PFL'];
            delete partyTrace['PL'];
            delete partyTrace['PPB'];
            delete partyTrace['PTN'];
            delete partyTrace['PMDB'];
            delete partyTrace['PPS'];
            //delete partyTrace['PPR']; // ??
            //delete partyTrace['PDS']; // ??
            //delete PTN -> PODEMOS?

            var saveTrace = {
                "extents": yearPartyExtent,
                "traces": partyTrace
            };

            console.log(JSON.stringify(saveTrace));
            return;
        }

        var period = [];
        period[0] = new Date(year, 0, 1);
        period[1] = new Date(year + periodOfYears, 0, 1);

        console.log(period);

        updateDataforDateRange(period, function () {
            var filteredDeputies = filterDeputies();
            var matrixDeputiesPerRollCall = createMatrixDeputiesPerRollCall(filteredDeputies);

            // var SVDdata = calcSVD(filteredDeputies,rollCallInTheDateRange);
            calcSVD(matrixDeputiesPerRollCall, function (SVDdata) {
                // Deputies array
                deputyNodes = createDeputyNodes(SVDdata.deputies, filteredDeputies);

                scaleAdjustment().setGovernmentTo3rdQuadrant(d3.values(deputyNodes), period[1]);

                // store parties trace
                var parties = calcPartiesSizeAndCenter(d3.values(deputyNodes));
                // $.each(parties, function(party){
                // 	if(filter[party] === undefined) { delete parties[party] }
                // });

                //console.log(parties)
                $.each(parties, function (party) {
                    if (partyTrace[party] === undefined) partyTrace[party] = {};

                    partyTrace[party][year] = {};
                    partyTrace[party][year].center = this.center;
                    partyTrace[party][year].size = this.size;

                });
                yearPartyExtent[year] = d3.extent(d3.entries(parties), function (d) { return d.value.center[1] });

                calcOneYearRecursive(year + periodOfYears);
            })
        })

    }

    calcOneYearRecursive(startYear);

}

function createTraces1by1() {
    calcThePartyTracesByYear(1); // calc by two years
}