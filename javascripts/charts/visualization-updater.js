/*
 * Visualization Updater Module
 * Observer pattern for coordinating updates across multiple visualizations
 */

/**
 * Update roll calls visualization
 * @param {string} panelId - Panel ID
 */
function updateRollCalls(panelId) {
    var selectedRollCalls = [];
    var hoveredRollCalls = [];
    var tree = state.getTree();
    var node = tree.getNode(panelId, tree.traverseBF);
    var rollCallsRates = state.getRollCallsRates();
    var deputyNodes = state.getDeputyNodes();

    rollCallsRates[panelId].forEach(function (rollCall) {
        if (rollCall.selected) selectedRollCalls.push(rollCall);
        if (rollCall.hovered) hoveredRollCalls.push(rollCall);
    });

    if ((selectedRollCalls.length === rollCallsRates[panelId].length) && (hoveredRollCalls.length === 0)) {
        // reset deputies
        deputyNodes[panelId].forEach(function (deputy) { deputy.rate = null; deputy.vote = null; });

        if (node.typeChart === CHAMBER_INFOGRAPHIC) {
            node.chart.resetParties();
        }
    }
    else {
        // ONLY ONE ROLL CALL SELECTED || HOVER
        if ((hoveredRollCalls.length === 1) || (selectedRollCalls.length === 1)) {

            deputyNodes[panelId].forEach(function (deputy) {
                deputy.vote = 'null';
            });

            var rollCall = (hoveredRollCalls.length === 1) ? hoveredRollCalls[0] : selectedRollCalls[0];

            // set the deputy votes
            rollCall.votes.forEach(function (deputyVote) {
                var allDeputyNodes = state.getDeputyNodes();
                for (var key in allDeputyNodes) {
                    if (allDeputyNodes[key][deputyVote.deputyID])
                        allDeputyNodes[key][deputyVote.deputyID].vote = deputyVote.vote;
                }
            });

            if (node.typeChart === CHAMBER_INFOGRAPHIC) {
                node.chart.updateParties(rollCall);
            }
        }
    }

    updateVisualizations();
}

/**
 * Set votes for selected deputies
 * @param {string} panelID - Panel ID
 */
function setVotesForSelectedDeputies(panelID) {
    var selectedDeputies = [];
    var hoveredDeputies = [];
    var deputyNodes = state.getDeputyNodes();
    var rollCallsRates = state.getRollCallsRates();

    deputyNodes[panelID].forEach(function (deputy) {
        if (deputy.selected) selectedDeputies.push(deputy);
        if (deputy.hovered) hoveredDeputies.push(deputy);
    });

    // Update Roll Calls Votes accordingly deputies individual votes
    rollCallsRates[panelID].forEach(function (rollCall) {
        rollCall.vote = null;
        rollCall.rate = null;
    });

    // show the votes of one deputy
    if ((hoveredDeputies.length === 1) || (selectedDeputies.length === 1)) {
        // get the deputy id
        var deputy = (hoveredDeputies.length === 1) ? hoveredDeputies[0] : selectedDeputies[0];
        // set the deputy vote for each rollCall
        rollCallsRates[panelID].forEach(function (rollCall) {
            rollCall.vote = 'null';
            rollCall.votes.forEach(function (vote) {
                if (vote.deputyID === deputy.deputyID) {
                    rollCall.vote = vote.vote;
                }
            })
        });
    } else {
        calcRollCallRate(rollCallsRates[panelID], selectedDeputies);
    }
}

/**
 * Update deputies across all panels
 * @param {string} panelID - Panel ID
 */
function updateDeputies(panelID) {
    var tree = state.getTree();
    tree.traverseBF(function (value) {
        if (value.typeChart === ROLLCALLS_HEATMAP) {
            setVotesForSelectedDeputies(panelID);
        }
    });

    updateVisualizations();
}

/**
 * Update all visualizations in the tree
 */
function updateVisualizations() {
    var tree = state.getTree();
    tree.traverseBF(function (n) {
        if (n.typeChart === SCATTER_PLOT ||
            n.typeChart === CHAMBER_INFOGRAPHIC ||
            n.typeChart === ROLLCALLS_HEATMAP ||
            n.typeChart === DEPUTIES_SIMILARITY_FORCE ||
            n.typeChart === FORCE_LAYOUT)
            n.chart.update();
    })
}

/**
 * Update deputy node in all periods
 * @param {string|number} deputyID - Deputy ID
 * @param {string} attr - Attribute to update
 * @param {*} value - New value
 */
function updateDeputyNodeInAllPeriods(deputyID, attr, value) {
    var deputyNodes = state.getDeputyNodes();
    for (var key in deputyNodes) {
        var deputy = deputyNodes[key][deputyID];
        if (deputy !== undefined)
            deputy[attr] = value;
    }
}

/**
 * Reset all selections
 */
function resetSelection() {
    var deputyNodes = state.getDeputyNodes();
    var rollCallsRates = state.getRollCallsRates();

    for (var key in deputyNodes) {
        for (var index in deputyNodes[key])
            deputyNodes[key][index].selected = true;
        updateDeputies(key);
    }

    for (var key in rollCallsRates) {
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

/**
 * Select deputies by states
 */
function selectByStates() {
    var states = $('select[id="selStates"]').val();
    var deputyNodes = state.getDeputyNodes();

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

