/*
 * State Manager
 * Singleton pattern for managing global application state
 */

var StateManager = (function () {
    var instance;

    function createInstance() {
        // Private state
        var state = {
            // Global variable to handle deputies selections
            selectionOn: false,

            // Global variable to store all deputies with an ID
            deputiesArray: [],

            // Global variable to store all deputies with Scatter Plot Values by Year
            deputiesNodesByYear: [],

            // Global variable to store all rollcalls
            arrayRollCalls: [],

            // Global variable to store the scatter plot nodes
            deputyNodes: [],

            // Global variable to store roll calls cards
            rollCallsRates: [],

            // Global variable to handle with loaded Deputies
            currentDeputies: [],

            // Global variable to handle with loaded rollCalls
            currentRollCalls: [],

            // Creating the tree with the first node
            tree: new Tree('panel-1-1'),

            // Language of system
            language: ENGLISH,

            // Constant to keep the value of ShiftKey
            SHIFTKEY: false,

            // Variables to check if the chart was instantiate before
            firstScatterPlot: true,
            firstBarChart: true,
            firstForceLayout: true,
            firstTimelineCrop: true,
            firstChamberInfographic: true,
            firstRollCallHeatMap: true,
            firstDeputiesSimilarity: true,
            firstThemesBubbleChart: true
        };

        return {
            // Getters
            getSelectionOn: function () { return state.selectionOn; },
            getDeputiesArray: function () { return state.deputiesArray; },
            getDeputiesNodesByYear: function () { return state.deputiesNodesByYear; },
            getArrayRollCalls: function () { return state.arrayRollCalls; },
            getDeputyNodes: function () { return state.deputyNodes; },
            getRollCallsRates: function () { return state.rollCallsRates; },
            getCurrentDeputies: function () { return state.currentDeputies; },
            getCurrentRollCalls: function () { return state.currentRollCalls; },
            getTree: function () { return state.tree; },
            getLanguage: function () { return state.language; },
            getShiftKey: function () { return state.SHIFTKEY; },

            // First time flags
            isFirstScatterPlot: function () { return state.firstScatterPlot; },
            isFirstBarChart: function () { return state.firstBarChart; },
            isFirstForceLayout: function () { return state.firstForceLayout; },
            isFirstTimelineCrop: function () { return state.firstTimelineCrop; },
            isFirstChamberInfographic: function () { return state.firstChamberInfographic; },
            isFirstRollCallHeatMap: function () { return state.firstRollCallHeatMap; },
            isFirstDeputiesSimilarity: function () { return state.firstDeputiesSimilarity; },
            isFirstThemesBubbleChart: function () { return state.firstThemesBubbleChart; },

            // Setters
            setSelectionOn: function (value) { state.selectionOn = value; },
            setLanguage: function (value) { state.language = value; },
            setShiftKey: function (value) { state.SHIFTKEY = value; },
            setCurrentDeputies: function (value) { state.currentDeputies = value; },
            setCurrentRollCalls: function (value) { state.currentRollCalls = value; },
            setDeputiesArray: function (value) { state.deputiesArray = value; },

            // First time flag setters
            setFirstScatterPlot: function (value) { state.firstScatterPlot = value; },
            setFirstBarChart: function (value) { state.firstBarChart = value; },
            setFirstForceLayout: function (value) { state.firstForceLayout = value; },
            setFirstTimelineCrop: function (value) { state.firstTimelineCrop = value; },
            setFirstChamberInfographic: function (value) { state.firstChamberInfographic = value; },
            setFirstRollCallHeatMap: function (value) { state.firstRollCallHeatMap = value; },
            setFirstDeputiesSimilarity: function (value) { state.firstDeputiesSimilarity = value; },
            setFirstThemesBubbleChart: function (value) { state.firstThemesBubbleChart = value; },

            // Array operations
            addDeputyNode: function (id, data) { state.deputyNodes[id] = data; },
            removeDeputyNode: function (id) { delete state.deputyNodes[id]; },
            addRollCallRate: function (id, data) { state.rollCallsRates[id] = data; },
            removeRollCallRate: function (id) { delete state.rollCallsRates[id]; },

            // Utility methods
            resetState: function () {
                state.currentDeputies = [];
                state.currentRollCalls = [];
            }
        };
    }

    return {
        getInstance: function () {
            if (!instance) {
                instance = createInstance();
            }
            return instance;
        }
    };
})();

// Export singleton instance as global for easy access
var state = StateManager.getInstance();

