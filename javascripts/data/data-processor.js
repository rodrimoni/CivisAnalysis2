/*
 * Data Processor Module
 * Handles data transformation, filtering, and calculations
 */

// Module-level variables
var yearPartyExtent = {};
var partyTrace = {};

/**
 * Create deputy nodes from SVD data
 * @param {Array} data_deputies - SVD calculated deputy positions
 * @param {Array} selecteddeputies - Selected deputies data
 * @returns {Array} Array of deputy node objects
 */
function createDeputyNodes(data_deputies, selecteddeputies) {
    var deputies = [];

    for (var i = 0; i < selecteddeputies.length; i++) {
        var deputy = selecteddeputies[i]; depObj = {};
        depObj.name = deputy.name;
        depObj.district = deputy.district;
        depObj.deputyID = deputy.deputyID;
        depObj.party = deputy.party;
        depObj.scatterplot = data_deputies[i];
        depObj.selected = true;
        depObj.overlapped = null;
        deputies[depObj.deputyID] = depObj;
    }

    return deputies;
}

/**
 * Create deputy similarity graph from distance matrix
 * @param {Array} data_deputies - Distance matrix
 * @param {Array} selectedDeputies - Selected deputies
 * @returns {Object} Graph with nodes and links
 */
function createDeputySimilarityGraph(data_deputies, selectedDeputies) {
    var numDeputies = selectedDeputies.length;
    var graph = { nodes: [], links: [] };

    for (var i = 0; i < numDeputies; i++) {
        var deputy = selectedDeputies[i]; node = {};
        node.deputyID = deputy.deputyID;
        node.party = deputy.party;
        node.name = deputy.name;
        node.district = deputy.district;
        node.selected = true;
        graph.nodes[deputy.deputyID] = node;

        for (var j = 0; j < i; j++) {
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

/**
 * Filter motions based on criteria
 * @param {Array} arr - Array of motions
 * @param {Object} filter - Filter criteria
 * @returns {Array} Filtered motions
 */
function filterMotions(arr, filter) {
    return arr.filter(function (e) {
        var resultType = false;
        var resultTheme = false;
        var resultDate = false;

        // Verify if satisfies the motion type
        if (filter.motionTypeFilter.length > 0) {
            if (filter.motionTypeFilter.indexOf(e.type) > -1)
                resultType = true;
        }
        else
            resultType = true;

        // Verify if satisfies the motion theme
        if (filter.motionThemeFilter.length > 0) {
            const theme = language === ENGLISH ? subjectsToEnglish[e.theme] : e.theme
            if (filter.motionThemeFilter.indexOf(theme) > -1)
                resultTheme = true;
        }
        else
            resultTheme = true;

        // Verify if are inside the datarange
        if (filter.dateFilter[0] !== undefined && filter.dateFilter[1] !== undefined)
            resultDate = e.datetime >= filter.dateFilter[0] && e.datetime <= filter.dateFilter[1];
        else
            resultDate = true;

        return resultType && resultDate && resultTheme;
    });
}

/**
 * Create matrix of deputies x roll calls
 * @param {Array} deputies - Array of deputies
 * @returns {Array} Matrix with vote data
 */
function createMatrixDeputiesPerRollCall(deputies) {
    console.log("create matrix deputy X rollCall!!");
    var rollCalls = rollCallInTheDateRange;

    var tableDepXRollCall = numeric.rep([Object.keys(deputies).length, Object.keys(rollCalls).length], 0);

    // How the votes will be represented in the matrix
    var votoStringToInteger = { "Sim": 1, "Não": -1, "Abstenção": 0, "Obstrução": 0, "Art. 17": 0, "Branco": 0 };

    rollCalls.forEach(function (rollCallEntry, rollCallKey) {
        if (rollCallEntry.votes.length === 0) {
            console.log("NO VOTES('secret')! -" + rollCallEntry.obj);
        }
        else {
            rollCallEntry.votes.forEach(function (vote) {
                var svdKey = deputiesInTheDateRange[vote.deputyID].svdKey;
                if (svdKey !== null) {
                    tableDepXRollCall[svdKey][rollCallKey] = votoStringToInteger[vote.vote];
                }
            })
        }
    });

    return tableDepXRollCall;
}

/**
 * Calculate number of votes for each deputy
 * @param {Object} deputiesInTheDateRange - Deputies in date range
 */
function calcNumVotes(deputiesInTheDateRange) {
    $.each(deputiesInTheDateRange, function (deputy) {
        deputiesInTheDateRange[deputy].numVotes = 0;
    });

    rollCallInTheDateRange.forEach(function (rollCall) {
        rollCall.votes.forEach(function (vote) {
            deputiesInTheDateRange[vote.deputyID].numVotes++;
        })
    });
}

/**
 * Filter deputies based on voting participation
 * @returns {Array} Filtered deputies
 */
function filterDeputies() {
    calcNumVotes(deputiesInTheDateRange);

    function filterDeputiesWhoVotedAtLeastOneThirdOfVotes() {
        var svdKey = 0;
        var dep = $.map(deputiesInTheDateRange, function (deputy) {
            if (deputy.numVotes > (rollCallInTheDateRange.length / 3)) {
                deputy.svdKey = svdKey++;
                return deputy;
            }
            else {
                deputy.scatterplot = null;
                deputy.svdKey = null;
            }
        });
        return dep;
    }

    function filter513DeputiesMorePresent() {
        var deputies = $.map(deputiesInTheDateRange, function (deputy) {
            return deputy;
        });
        deputies = deputies.sort(function (a, b) { return b.numVotes - a.numVotes });

        var selectedDeputies = deputies.splice(0, ((deputies.lenght < 513) ? deputies.lenght : 513));

        var svdKey = 0;
        selectedDeputies.forEach(function (deputy, i) {
            deputy.svdKey = svdKey++;
        });

        deputies.forEach(function (deputy) {
            deputy.scatterplot = null;
            deputy.svdKey = null;
        });

        return selectedDeputies;
    }

    var filterFunction = filter513DeputiesMorePresent;
    return filterFunction();
}

/**
 * Create distance matrix between deputies
 * @param {Array} matrixDeputiesPerRollCall - Deputies per roll call matrix
 * @returns {Array} Distance matrix
 */
function createMatrixDistanceDeputies(matrixDeputiesPerRollCall) {
    var numberOfDeputies = matrixDeputiesPerRollCall.length;
    var numberOfRollCalls = matrixDeputiesPerRollCall[0].length;

    var matrixMatches = createArray(numberOfDeputies, numberOfDeputies);
    var matrixDistances = createArray(numberOfDeputies, numberOfDeputies);

    for (var i = 0; i < numberOfDeputies; i++)
        for (var j = 0; j < numberOfDeputies; j++)
            matrixMatches[i][j] = 0;

    for (var d = 0; d < numberOfDeputies; d++)
        for (var r = 0; r < numberOfRollCalls; r++)
            for (var compareDeputy = d + 1; compareDeputy < numberOfDeputies; compareDeputy++)
                if (matrixDeputiesPerRollCall[d][r] === matrixDeputiesPerRollCall[compareDeputy][r]) {
                    matrixMatches[d][compareDeputy] += 1;
                    matrixMatches[compareDeputy][d] += 1;
                }

    for (var i = 0; i < numberOfDeputies; i++)
        for (var j = 0; j < numberOfDeputies; j++)
            if (matrixMatches[i][j] !== 0)
                matrixDistances[i][j] = 100 - (matrixMatches[i][j] * 100) / numberOfRollCalls;
            else
                matrixDistances[i][j] = 0;

    return matrixDistances;
}

/**
 * Get party count from cluster
 * @param {Array} cluster - Cluster of deputies
 * @returns {Array} Party count data
 */
function getPartyCount(cluster) {
    var currentPartyCount = [];
    cluster.forEach(function (deputy) {
        var result = $.grep(currentPartyCount, function (e) { return e.category === deputy.party; });
        if (result.length === 0) {
            currentPartyCount.push({ "category": deputy.party, "frequency": 1 });
        }
        else if (result.length === 1) {
            result[0].frequency += 1;
        }
    });

    currentPartyCount.sort(function (x, y) {
        return d3.descending(x.frequency, y.frequency);
    });

    return currentPartyCount;
}

/**
 * Get party count from all scatter plot nodes
 * @param {Array} nodes - Deputy nodes
 * @returns {Object} Party count map
 */
function getPartyCountAllScatter(nodes) {
    var currentPartyCount = {};
    nodes.forEach(function (deputy) {
        if (currentPartyCount[deputy.party] === undefined)
            currentPartyCount[deputy.party] = 1
        else
            currentPartyCount[deputy.party] += 1
    });

    return currentPartyCount;
}

/**
 * Calculate parties size and center positions
 * @param {Array} deputies - Deputy data
 * @returns {Object} Parties data with size and center
 */
function calcPartiesSizeAndCenter(deputies) {
    if (deputies === null) return null;

    var parties = {};

    deputies.forEach(function (deputy) {
        if (parties[deputy.party] === undefined)
            parties[deputy.party] = { size: 0, selected: 0, center: [0, 0], stdev: [0, 0] };

        parties[deputy.party].size++;
        if (deputy.selected) parties[deputy.party].selected++;

        parties[deputy.party].center[0] += deputy.scatterplot[0];
        parties[deputy.party].center[1] += deputy.scatterplot[1];

        parties[deputy.party].stdev[0] += Math.pow(deputy.scatterplot[0], 2);
        parties[deputy.party].stdev[1] += Math.pow(deputy.scatterplot[1], 2);
    });

    $.each(parties, function (party) {
        // calc stdev
        parties[party].stdev[0] = Math.sqrt((parties[party].stdev[0] - Math.pow(parties[party].center[0], 2) / parties[party].size) / (parties[party].size - 1))
        parties[party].stdev[1] = Math.sqrt((parties[party].stdev[1] - Math.pow(parties[party].center[1], 2) / parties[party].size) / (parties[party].size - 1))
        // calc mean
        parties[party].center[0] = parties[party].center[0] / parties[party].size;
        parties[party].center[1] = parties[party].center[1] / parties[party].size;
    });

    return parties;
}

/**
 * Calculate roll call rate based on selected deputies
 * @param {Array} rollCalls - Roll calls data
 * @param {Array} deputies - Deputies data
 */
function calcRollCallRate(rollCalls, deputies) {
    var mapSelectedDeputies = {};

    for (var key in deputies) {
        var dep = deputies[key];
        mapSelectedDeputies[dep.deputyID] = true;
    }

    $.each(rollCalls, function (d) {
        rollCalls[d].rate = 'noVotes';

        var totalVotes = 0,
            votes = {};

        rollCalls[d].votes.forEach(function (vote) {
            if (mapSelectedDeputies[vote.deputyID] !== undefined) {
                if (votes[vote.vote] === undefined)
                    votes[vote.vote] = 0;

                votes[vote.vote]++;
                totalVotes++;
            }
        });

        if (((votes['Sim'] === undefined) && (votes['Não'] === undefined))) {
            rollCalls[d].rate = 'noVotes'
        }
        else {
            if (votes['Sim'] === undefined) votes['Sim'] = 0;
            if (votes['Não'] === undefined) votes['Não'] = 0;
            rollCalls[d].rate = (votes['Sim'] - votes['Não']) / (votes['Sim'] + votes['Não']);
            rollCalls[d].countVotes = [
                { 'vote': 'Sim', 'qtd': votes['Sim'] },
                { 'vote': 'Não', 'qtd': votes['Não'] }
            ]
        }
    })
}

/**
 * Check if period is pre-calculated
 * @param {Array} period - Date period [start, end]
 * @returns {Object} Precalc info
 */
function setNewDateRange(period) {
    var precalc = { found: false, id: '' };

    CONGRESS_DEFINE.years.forEach(function (yearObj) {
        if (yearObj.period[0].getTime() === period[0].getTime() && yearObj.period[1].getTime() === period[1].getTime()) {
            precalc.found = true;
            precalc.id = yearObj.name;
            precalc.type = 'year';
            console.log('YEAR - preCALC!!');
        }
    });

    if (!precalc.found)
        CONGRESS_DEFINE.legislatures.forEach(function (legislatureObj, i) {
            if (legislatureObj.period[0].getTime() === period[0].getTime() && legislatureObj.period[1].getTime() === period[1].getTime()) {
                precalc.found = true;
                precalc.id = i;
                precalc.type = 'legislature';
                console.log('LEGISLATURE - preCALC!!');
            }
        });

    if (!precalc.found)
        CONGRESS_DEFINE.presidents.forEach(function (presidentObj, i) {
            if (presidentObj.period[0].getTime() === period[0].getTime() && presidentObj.period[1].getTime() === period[1].getTime()) {
                precalc.found = true;
                precalc.id = i;
                precalc.type = 'president';
                console.log('PRESIDENT - preCALC!!');
            }
        });

    return precalc;
}

/**
 * Check if deputy value is selected across panels
 * @param {string|number} id - Deputy ID
 * @returns {boolean} Selected status
 */
function checkSelectedValue(id) {
    var selectValue = true;
    var deputyNodes = state.getDeputyNodes();
    var selectionOn = state.getSelectionOn();
    var deputyNodesLength = Object.keys(deputyNodes).length;
    var cont = 0;

    if (selectionOn) {
        if (deputyNodesLength > 1) {
            for (var key in deputyNodes) {
                if (cont < deputyNodesLength - 1) {
                    var dep = deputyNodes[key][id];
                    if (dep !== undefined) {
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

