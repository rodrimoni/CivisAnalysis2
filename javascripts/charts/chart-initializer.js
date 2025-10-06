/*
 * Chart Initializer Module
 * Strategy pattern for initializing different chart types
 */

/**
 * Initialize chart based on type
 * @param {string} newID - Panel ID
 * @param {Object} chartObj - Chart configuration
 * @returns {Object} Initialized chart instance
 */
function initializeChart(newID, chartObj) {
    var chart;

    switch (chartObj.chartID) {
        case SCATTER_PLOT:
            chart = initializeScatterPlot(newID, chartObj);
            break;

        case BAR_CHART:
            chart = initializeBarChart(newID, chartObj);
            break;

        case FORCE_LAYOUT:
            chart = initializeForceLayout(newID, chartObj);
            break;

        case TIME_LINE_CROP:
            chart = initializeTimelineCrop(newID, chartObj);
            break;

        case CHAMBER_INFOGRAPHIC:
            chart = initializeChamberInfographic(newID, chartObj);
            break;

        case ROLLCALLS_HEATMAP:
            chart = initializeRollCallsHeatmap(newID, chartObj, false);
            break;

        case STATIC_ROLLCALLS_HEATMAP:
            chart = initializeRollCallsHeatmap(newID, chartObj, true);
            break;

        case DEPUTIES_SIMILARITY_FORCE:
            chart = initializeDeputiesSimilarityForce(newID, chartObj);
            break;

        case THEMES_BUBBLE_CHART:
            chart = initializeThemesBubbleChart(newID, chartObj);
            break;

        case SMALL_MULTIPLES_CHART:
            chart = initializeSmallMultiples(newID, chartObj);
            break;

        default:
            break;
    }

    $('#' + newID + ' .panel-title').append(getChartIconTitle(chartObj.chartID));
    $('#' + newID + ' .panel-title').append(chartObj.title);

    if ($('#' + newID + ' .panel-subtitle').length >= 1)
        $("#" + newID + " .panel-title span.title-icon").css("top", "15px");

    return chart;
}

/**
 * Initialize Scatter Plot chart
 * @param {string} newID - Panel ID
 * @param {Object} chartObj - Chart configuration
 * @returns {Object} Chart instance
 */
function initializeScatterPlot(newID, chartObj) {
    var chart = scatterPlotChart();

    deputyNodes[newID] = currentDeputies;
    rollCallsRates[newID] = currentRollCalls;

    addConfigMenu(newID, 'scatterplot', false);
    addClusteringMenu(newID);

    var deputies = [];
    for (var key in chartObj.data) {
        deputies.push(chartObj.data[key])
    }
    addSearchDeputyMenu(newID, deputies);
    addThemeSearchScatterPlot(newID, chartObj.args.rcs)
    addPartySizeFilter(newID, chart);
    addEditTitleInput(newID);

    initializeSlider(newID, chart);
    $('#' + newID).attr('data-type-period', chartObj.panelClass);

    chart.on('update', function () {
        updateDeputies(newID)
    });

    return chart;
}

/**
 * Initialize Bar Chart
 * @param {string} newID - Panel ID
 * @param {Object} chartObj - Chart configuration
 * @returns {Object} Chart instance
 */
function initializeBarChart(newID, chartObj) {
    const { typeBarChart } = chartObj.args
    var chart = barChart(typeBarChart);
    addConfigMenu(newID, 'barChart', false);
    addEditTitleInput(newID);
    return chart;
}

/**
 * Initialize Force Layout chart
 * @param {string} newID - Panel ID
 * @param {Object} chartObj - Chart configuration
 * @returns {Object} Chart instance
 */
function initializeForceLayout(newID, chartObj) {
    var chart = forceLayout();
    addConfigMenu(newID, 'forceLayout', false);
    addEditTitleInput(newID);
    chart.on('update', function () {
        updateDeputies(newID)
    });
    return chart;
}

/**
 * Initialize Timeline Crop chart
 * @param {string} newID - Panel ID
 * @param {Object} chartObj - Chart configuration
 * @returns {Object} Chart instance
 */
function initializeTimelineCrop(newID, chartObj) {
    var chart = timeLineCrop();
    addConfigMenu(newID, 'timeLineCrop', false);
    addEditTitleInput(newID);
    $('#' + newID).attr('data-type-period', chartObj.panelClass);
    return chart;
}

/**
 * Initialize Chamber Infographic
 * @param {string} newID - Panel ID
 * @param {Object} chartObj - Chart configuration
 * @returns {Object} Chart instance
 */
function initializeChamberInfographic(newID, chartObj) {
    var chart = chamberInfographic();

    deputyNodes[newID] = currentDeputies;
    rollCallsRates[newID] = currentRollCalls;

    addConfigMenu(newID, 'chamberInfographic', false);
    addSearchDeputyMenu(newID, chartObj.data.deputies);
    addEditTitleInput(newID);

    $('#' + newID).attr('data-type-period', chartObj.panelClass);

    chart.on('update', function () {
        updateDeputies(newID)
    });

    return chart;
}

/**
 * Initialize Roll Calls Heatmap
 * @param {string} newID - Panel ID
 * @param {Object} chartObj - Chart configuration
 * @param {boolean} isStatic - Whether heatmap is static
 * @returns {Object} Chart instance
 */
function initializeRollCallsHeatmap(newID, chartObj, isStatic) {
    var chart = rollCallsHeatmap();

    deputyNodes[newID] = currentDeputies;
    rollCallsRates[newID] = currentRollCalls;
    setVotesForSelectedDeputies(newID);

    addConfigMenu(newID, 'rollCallsHeatmap', false);
    addSearchRollCallMenu(newID, chartObj.data.rcs);
    addFilterMotionTypeMenu(newID, chartObj.data.rcs);
    addThemeFilter(newID, chartObj.data.rcs);
    addFilterDateRollCallMenu(newID, chartObj.data.rcs);
    addEditTitleInput(newID);

    $('#' + newID).attr('data-type-period', chartObj.panelClass);

    if (!isStatic) {
        chart.on('update', function () {
            updateRollCalls(newID);
        });
    } else {
        updateRollCalls(newID);
    }

    return chart;
}

/**
 * Initialize Deputies Similarity Force chart
 * @param {string} newID - Panel ID
 * @param {Object} chartObj - Chart configuration
 * @returns {Object} Chart instance
 */
function initializeDeputiesSimilarityForce(newID, chartObj) {
    var chart = similarityForce();

    deputyNodes[newID] = currentDeputies;
    rollCallsRates[newID] = currentRollCalls;

    addConfigMenu(newID, 'similarity-force', false);
    addSearchDeputyMenu(newID, d3.values(chartObj.data.nodes));
    addEditTitleInput(newID);

    $('#' + newID).attr('data-type-period', chartObj.panelClass);

    chart.on('update', function () {
        updateDeputies(newID)
    });

    return chart;
}

/**
 * Initialize Themes Bubble Chart
 * @param {string} newID - Panel ID
 * @param {Object} chartObj - Chart configuration
 * @returns {Object} Chart instance
 */
function initializeThemesBubbleChart(newID, chartObj) {
    var chart = themesBubbleChart();
    addConfigMenu(newID, 'themes-bubble-chart', false);
    addEditTitleInput(newID);
    $('#' + newID).attr('data-type-period', chartObj.panelClass);
    return chart;
}

/**
 * Initialize Small Multiples Chart
 * @param {string} newID - Panel ID
 * @param {Object} chartObj - Chart configuration
 * @returns {Object} Chart instance
 */
function initializeSmallMultiples(newID, chartObj) {
    var chart = smallMultiples();
    addConfigMenu(newID, 'line-chart', false);
    addEditTitleInput(newID);
    $('#' + newID).attr('data-type-period', chartObj.panelClass);
    return chart;
}

