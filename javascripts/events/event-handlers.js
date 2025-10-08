/*
 * Event Handlers Module
 * Handles context menu events and user interactions
 */

/**
 * Handle context menu for scatter plot
 * @param {Object} invokedOn - Element that invoked the menu
 * @param {Object} selectedMenu - Selected menu item
 */
function handleContextMenuScatterPlot(invokedOn, selectedMenu) {
    var panelID = invokedOn.parents(".panel").attr('id');
    var clusterID = invokedOn.attr('id').replace('cluster_id_', '');
    var tree = state.getTree();
    var clusterData = tree.getNode(panelID, tree.traverseBF);
    var chartData;

    if (clusterData !== null)
        chartData = clusterData.chart;

    console.log(chartData.clusters);

    var title = "", prettyTitle = "";
    var chartObj = {};

    if (selectedMenu.context.id === "bar-chart") {
        prettyTitle = 'Bar Chart: Cluster ' + clusterID;
        title = "<span>" + prettyTitle + "</span>";
        var partyCountData = getPartyCount(chartData.clusters[clusterID].points);
        const args = { 'typeBarChart': PARTIES_BAR_CHART }
        chartObj = { 'chartID': BAR_CHART, 'data': partyCountData, 'title': title, "prettyTitle": prettyTitle, "args": args };
        createNewChild(panelID, chartObj);
    }
    else if (selectedMenu.context.id === "force-layout") {
        prettyTitle = 'Force Layout: Cluster ' + clusterID;
        title = "<span>" + prettyTitle + "</span>";
        chartObj = { 'chartID': FORCE_LAYOUT, 'data': { 'nodes': chartData.clusters[clusterID].points }, 'legend': false, 'title': title, 'prettyTitle': prettyTitle };
        createNewChild(panelID, chartObj);
    }
}

/**
 * Set up scatter plot data and create visualization
 * @param {Array} filteredData - Filtered data range
 * @param {string} dimensionalReductionTechnique - Technique (PCA, MDS, t-SNE, UMAP)
 * @param {number} type - Chart type constant
 */
function setUpScatterPlotData(filteredData, dimensionalReductionTechnique, type) {
    var panelClass, title, prettyTitle, args = { 'filteredData': filteredData, 'dimensionalReductionTechnique': dimensionalReductionTechnique };

    state.setCurrentDeputies([]);
    state.setCurrentRollCalls([]);

    var dataRange = setNewDateRange(filteredData);
    var matrixDistanceDeputies;
    var similarityGraph;

    if (type === CHAMBER_INFOGRAPHIC) {
        var createChamberInfographic = function () {
            state.setCurrentRollCalls(rollCallInTheDateRange);
            var currentRollCalls = state.getCurrentRollCalls();
            var currentDeputies = state.getCurrentDeputies();
            calcRollCallRate(currentRollCalls, currentDeputies);

            var nodesValues = d3.values(currentDeputies);
            var parties = calcPartiesSizeAndCenter(nodesValues);
            var data = { 'deputies': nodesValues, 'partiesMap': parties };
            var chartObj = { 'chartID': CHAMBER_INFOGRAPHIC, 'data': data, 'title': title, 'prettyTitle': prettyTitle, 'panelClass': panelClass, 'args': args };
            createNewChild('panel-1-1', chartObj);
        };
    }
    else if (type === DEPUTIES_SIMILARITY_FORCE) {
        var createDeputiesSimilarityForce = function () {
            var chartObj = {
                'chartID': DEPUTIES_SIMILARITY_FORCE,
                'data': similarityGraph,
                'title': title,
                'prettyTitle': prettyTitle,
                'panelClass': panelClass,
                'args': args
            };
            createNewChild('panel-1-1', chartObj);
        };
    }
    else if (type === SCATTER_PLOT) {
        var createScatterPlot = function () {
            state.setCurrentRollCalls(rollCallInTheDateRange);
            var currentRollCalls = state.getCurrentRollCalls();
            var currentDeputies = state.getCurrentDeputies();
            calcRollCallRate(currentRollCalls, currentDeputies);
            currentRollCalls.map(function (e) {
                e.rollCallName = e.type + " " + e.number + " " + e.year;
            });

            args = { ...args, rcs: currentRollCalls };

            var chartObj = {
                'chartID': SCATTER_PLOT,
                'data': currentDeputies,
                'title': title,
                'prettyTitle': prettyTitle,
                'panelClass': panelClass,
                'args': args
            };
            createNewChild('panel-1-1', chartObj);
        };
    }
    else if (type === ROLLCALLS_HEATMAP) {
        var createRollCallsHeatMap = function () {
            state.setCurrentRollCalls(rollCallInTheDateRange);
            var currentRollCalls = state.getCurrentRollCalls();
            var currentDeputies = state.getCurrentDeputies();
            calcRollCallRate(currentRollCalls, currentDeputies);
            currentRollCalls.map(function (e) {
                e.rollCallName = e.type + " " + e.number + " " + e.year;
            });

            var data = {}
            data.rcs = currentRollCalls;
            data.deputies = {};

            var chartObj = {
                'chartID': ROLLCALLS_HEATMAP,
                'data': data,
                'title': title,
                'prettyTitle': prettyTitle,
                'panelClass': panelClass,
                'args': args
            }
            createNewChild('panel-1-1', chartObj);
        }
    }

    $('#loading').css('visibility', 'visible');

    updateDataforDateRange(filteredData, function () {
        if ((!dataRange.found && dimensionalReductionTechnique === "PCA") || dimensionalReductionTechnique !== "PCA") {
            var filteredDeputies = filterDeputies();
            var matrixDeputiesPerRollCall = createMatrixDeputiesPerRollCall(filteredDeputies);

            if (matrixDeputiesPerRollCall.length > 0 && matrixDeputiesPerRollCall[0].length > 0) {
                if (dimensionalReductionTechnique === "MDS")
                    matrixDistanceDeputies = createMatrixDistanceDeputies(matrixDeputiesPerRollCall);

                function calcCallback(twoDimData) {
                    if (dataRange.found) {
                        if (dataRange.type !== "year") {
                            title = "<span><span class ='trn'>" + CONGRESS_DEFINE[dataRange.type + "s"][dataRange.id].name + "</span>";
                            prettyTitle = CONGRESS_DEFINE[dataRange.type + "s"][dataRange.id].name;
                        }
                        else {
                            title = "<span><span class ='trn'>Year</span>: " + dataRange.id;
                            prettyTitle = "Year: " + dataRange.id;
                        }
                        if (type !== CHAMBER_INFOGRAPHIC) {
                            title += " (" + dimensionalReductionTechnique + ")" + "</span>";
                            prettyTitle += " (" + dimensionalReductionTechnique + ")";
                        }
                        else
                            title += "</span>";

                        var subtitle = "<br><span class='panel-subtitle'>" + filteredData[0].toLocaleDateString() + " <span class='trn'>to</span> " + filteredData[1].toLocaleDateString() + "</span>";
                        title += subtitle;
                        panelClass = dataRange.type + '-' + dataRange.id;
                    }
                    else {
                        title = '<span>' + filteredData[0].toLocaleDateString() + " <span class='trn'>to</span> " + filteredData[1].toLocaleDateString() + "</span>";
                        prettyTitle = filteredData[0].toLocaleDateString() + " to " + filteredData[1].toLocaleDateString();
                        panelClass = "period-" + filteredData[0].getFullYear() + "-" + filteredData[1].getFullYear();
                    }

                    if (type === CHAMBER_INFOGRAPHIC)
                        createChart = createChamberInfographic;
                    else if (type === SCATTER_PLOT)
                        createChart = createScatterPlot;
                    else if (type === ROLLCALLS_HEATMAP)
                        createChart = createRollCallsHeatMap;

                    state.setCurrentDeputies(createDeputyNodes(twoDimData.deputies, filteredDeputies));
                    var currentDeputies = state.getCurrentDeputies();
                    scaleAdjustment().setGovernmentTo3rdQuadrant(d3.values(currentDeputies), filteredData[1]);

                    state.setCurrentRollCalls(rollCallInTheDateRange);
                    var currentRollCalls = state.getCurrentRollCalls();
                    calcRollCallRate(currentRollCalls, currentDeputies);

                    $('#loading').css('visibility', 'hidden');
                    createChart();
                }

                if (dimensionalReductionTechnique === "PCA") {
                    var text = language === ENGLISH ? "Generating Political Spectra by PCA" : "Gerando Espectro Político por PCA";
                    $('#loading #msg').text(text);
                    setTimeout(function () {
                        calcSVD(matrixDeputiesPerRollCall, calcCallback)
                    }, 10);
                }
                else if (dimensionalReductionTechnique === "MDS") {
                    if (type === DEPUTIES_SIMILARITY_FORCE) {
                        similarityGraph = createDeputySimilarityGraph(matrixDistanceDeputies, filteredDeputies);
                        state.setCurrentDeputies(similarityGraph.nodes);
                        var currentDeputies = state.getCurrentDeputies();

                        state.setCurrentRollCalls(rollCallInTheDateRange);
                        var currentRollCalls = state.getCurrentRollCalls();
                        calcRollCallRate(currentRollCalls, currentDeputies);

                        if (dataRange.found) {
                            if (dataRange.type !== "year") {
                                title = "<span class ='trn'>" + CONGRESS_DEFINE[dataRange.type + "s"][dataRange.id].name + "</span>";
                                prettyTitle = CONGRESS_DEFINE[dataRange.type + "s"][dataRange.id].name;
                            }
                            else {
                                title = "<span><span class ='trn'>Year</span>: " + dataRange.id + "</span>";
                                prettyTitle = "Year: " + dataRange.id;
                            }
                            var subtitle = "<br><span class='panel-subtitle'>" + filteredData[0].toLocaleDateString() + " <span class='trn'>to</span> " + filteredData[1].toLocaleDateString() + "</span>";
                            title += subtitle;
                            panelClass = dataRange.type + '-' + dataRange.id;
                        }
                        else {
                            title = "<span>" + filteredData[0].toLocaleDateString() + " <span class='trn'>to</span> " + filteredData[1].toLocaleDateString() + "</span>";
                            prettyTitle = filteredData[0].toLocaleDateString() + " to " + filteredData[1].toLocaleDateString();
                            panelClass = "period-" + filteredData[0].getFullYear() + "-" + filteredData[1].getFullYear()
                        }
                        $('#loading').css('visibility', 'hidden');
                        createDeputiesSimilarityForce();
                    }
                    else {
                        var text = language === ENGLISH ? "Generating Political Spectra by MDS" : "Gerando Espectro Político por MDS";
                        $('#loading #msg').text(text);
                        setTimeout(function () {
                            calcMDS(matrixDistanceDeputies, calcCallback)
                        }, 10);
                    }
                }
                else if (dimensionalReductionTechnique === "t-SNE") {
                    var text = language === ENGLISH ? "Generating Political Spectra by t-SNE" : "Gerando Espectro Político por t-SNE";
                    $('#loading #msg').text(text);
                    calcTSNE(matrixDeputiesPerRollCall, calcCallback);
                }
                else if (dimensionalReductionTechnique === "UMAP") {
                    var text = language === ENGLISH ? "Generating Political Spectra by UMAP" : "Gerando Espectro Político por UMAP";
                    $('#loading #msg').text(text);
                    calcUMAP(matrixDeputiesPerRollCall, calcCallback);
                }
            }
        }
        else {
            if (dataRange.type !== "year") {
                title = "<span><span class ='trn'>" + CONGRESS_DEFINE[dataRange.type + "s"][dataRange.id].name + "</span>";
                prettyTitle = CONGRESS_DEFINE[dataRange.type + "s"][dataRange.id].name;
            }
            else {
                title = "<span><span class ='trn'>Year</span>: " + dataRange.id;
                prettyTitle = "Year: " + dataRange.id;
            }
            panelClass = dataRange.type + '-' + dataRange.id;

            var createChart;

            if (type === CHAMBER_INFOGRAPHIC)
                createChart = createChamberInfographic;
            else if (type === ROLLCALLS_HEATMAP)
                createChart = createRollCallsHeatMap;
            else {
                title += " (" + dimensionalReductionTechnique + ")" + "</span>";
                prettyTitle += " (" + dimensionalReductionTechnique + ")";
                createChart = createScatterPlot;
            }

            title += "</span>";

            var subtitle = "<br><span class='panel-subtitle'>" + filteredData[0].toLocaleDateString() + " <span class='trn'>to</span> " + filteredData[1].toLocaleDateString() + "</span>";
            title += subtitle;

            if (dimensionalReductionTechnique === "PCA") {
                loadNodes(dataRange.type, dataRange.id, createChart);
                $('#loading').css('visibility', 'hidden');
            }
        }
    });
}

/**
 * Reload scatter plot data with new filters
 * @param {Array} filteredData - Filtered date range
 * @param {string} dimensionalReductionTechnique - DR technique
 * @param {string} panelID - Panel ID
 * @param {Array} subjects - Selected subjects
 */
function reloadScatterPlotData(filteredData, dimensionalReductionTechnique, panelID, subjects) {
    $('#loading').css('visibility', 'visible');

    state.setCurrentDeputies([]);
    state.setCurrentRollCalls([]);

    var tree = state.getTree();
    const chart = tree.getNode(panelID, tree.traverseBF).chart;

    updateDataforDateRange(filteredData, function () {
        if (!!subjects.length)
            rollCallInTheDateRange = rollCallInTheDateRange.filter(rollCall => {
                const theme = language === ENGLISH ? subjectsToEnglish[rollCall.theme] : rollCall.theme;
                return subjects.includes(theme)
            });

        var filteredDeputies = filterDeputies();
        var matrixDeputiesPerRollCall = createMatrixDeputiesPerRollCall(filteredDeputies);

        if (matrixDeputiesPerRollCall.length > 0 && matrixDeputiesPerRollCall[0].length > 0) {
            if (dimensionalReductionTechnique === "MDS")
                matrixDistanceDeputies = createMatrixDistanceDeputies(matrixDeputiesPerRollCall);

            function calcCallback(twoDimData) {
                state.setCurrentDeputies(createDeputyNodes(twoDimData.deputies, filteredDeputies));
                var currentDeputies = state.getCurrentDeputies();
                scaleAdjustment().setGovernmentTo3rdQuadrant(d3.values(currentDeputies), filteredData[1]);

                state.setCurrentRollCalls(rollCallInTheDateRange);
                var currentRollCalls = state.getCurrentRollCalls();
                calcRollCallRate(currentRollCalls, currentDeputies);

                state.addDeputyNode(panelID, currentDeputies);
                state.addRollCallRate(panelID, currentRollCalls);

                chart.reloadScatterPlotChart(currentDeputies, panelID);

                $('#loading').css('visibility', 'hidden');
            }

            if (dimensionalReductionTechnique === "PCA") {
                var text = language === ENGLISH ? "Generating Political Spectra by PCA" : "Gerando Espectro Político por PCA";
                $('#loading #msg').text(text);
                setTimeout(function () {
                    calcSVD(matrixDeputiesPerRollCall, calcCallback)
                }, 10);
            }
            else if (dimensionalReductionTechnique === "MDS") {
                var text = language === ENGLISH ? "Generating Political Spectra by MDS" : "Gerando Espectro Político por MDS";
                $('#loading #msg').text(text);
                setTimeout(function () {
                    calcMDS(matrixDistanceDeputies, calcCallback)
                }, 10);
            }
            else if (dimensionalReductionTechnique === "t-SNE") {
                var text = language === ENGLISH ? "Generating Political Spectra by t-SNE" : "Gerando Espectro Político por t-SNE";
                $('#loading #msg').text(text);
                calcTSNE(matrixDeputiesPerRollCall, calcCallback);
            }
            else if (dimensionalReductionTechnique === "UMAP") {
                var text = language === ENGLISH ? "Generating Political Spectra by UMAP" : "Gerando Espectro Político por UMAP";
                $('#loading #msg').text(text);
                calcUMAP(matrixDeputiesPerRollCall, calcCallback);
            }
        }
    });
}

/**
 * Handle timeline context menu
 * @param {Object} invokedOn - Element that invoked the menu
 * @param {Object} selectedMenu - Selected menu item
 * @param {Array} filteredData - Filtered data
 */
function handleContextMenuTimeline(invokedOn, selectedMenu, filteredData) {
    var panelID = invokedOn.parents(".panel").attr('id');

    if (selectedMenu.context.id === "scatter-plot-pca") {
        setUpScatterPlotData(filteredData, "PCA", SCATTER_PLOT);
    }
    else if (selectedMenu.context.id === "chamber-infographic")
        setUpScatterPlotData(filteredData, "PCA", CHAMBER_INFOGRAPHIC);
    else if (selectedMenu.context.id === "scatter-plot-mds")
        setUpScatterPlotData(filteredData, "MDS", SCATTER_PLOT);
    else if (selectedMenu.context.id === 'scatter-plot-tsne')
        setUpScatterPlotData(filteredData, "t-SNE", SCATTER_PLOT);
    else if (selectedMenu.context.id === 'scatter-plot-umap')
        setUpScatterPlotData(filteredData, "UMAP", SCATTER_PLOT);
    else if (selectedMenu.context.id === 'deputies-similarity-force')
        setUpScatterPlotData(filteredData, "MDS", DEPUTIES_SIMILARITY_FORCE);
    else if (selectedMenu.context.id === 'rollcalls-heatmap')
        setUpScatterPlotData(filteredData, "PCA", ROLLCALLS_HEATMAP);
}

/**
 * Handle deputy context menu
 * @param {Object} invokedOn - Element that invoked the menu
 * @param {Object} selectedMenu - Selected menu item
 */
function handleContextMenuDeputy(invokedOn, selectedMenu) {
    var title, prettyTitle, data = {};
    var chartObj = {};

    var panelID = invokedOn.parents('.panel').attr("id");
    var period = invokedOn.parents('.panel').data().typePeriod;

    if (selectedMenu.context.id === 'time-line-crop-behavior-selection') {
        var periodID = period.split("-");
        var type, id, periodData, subtitle, panelClass, firstYear, lastYear;

        if (periodID.length <= 2) {
            type = periodID[0];
            id = periodID[1];
            periodData = CONGRESS_DEFINE[type + "s"][id];
            title = "<span class ='trn'>" + periodData.name + "</span>";
            prettyTitle = periodData.name;
            subtitle = "<br><span class='panel-subtitle'>" + periodData.period[0].toLocaleDateString() + " <span class='trn'>to</span> " + periodData.period[1].toLocaleDateString() + "</span>";
            title += subtitle;
            panelClass = type + '-' + id;
            data.period = [periodData.period[0], periodData.period[1]];
        }
        else {
            type = periodID[0];
            firstYear = periodID[1];
            lastYear = periodID[2];
            title = + "</span>" + firstYear + " <span class='trn'>to</span> " + lastYear + "</span>";
            prettyTitle = firstYear + " to " + lastYear
            panelClass = type + "-" + firstYear + "-" + lastYear;
            data.period = [new Date(firstYear, 0, 1), new Date(lastYear, 0, 1)];
        }

        var deputies = [];
        $("#" + panelID + " .node.selected").each(function () {
            var deputyID = this.id.split('-')[4];
            var deputiesNodesByYear = state.getDeputiesNodesByYear();
            deputies.push(deputiesNodesByYear[deputyID]);
        });

        data.deputies = deputies;
        chartObj = { 'chartID': TIME_LINE_CROP, 'data': data, 'title': title, 'prettyTitle': prettyTitle, 'panelClass': panelClass };

        createNewChild(panelID, chartObj);
    }
    else if (selectedMenu.context.id === 'rollcalls-heatmap') {
        var periodID = period.split("-");
        var id, periodData, subtitle, panelClass, firstYear, lastYear;

        if (periodID.length <= 2) {
            type = periodID[0];
            id = periodID[1];
            if (type !== 'year') {
                periodData = CONGRESS_DEFINE[type + "s"][id];
                title = "<span><span class='trn'>Map of Roll Calls</span>: <span class='trn'>" + periodData.name + "</span></span>";
                prettyTitle = "Map of Roll Calls: " + periodData.name;
                subtitle = "<br><span class='panel-subtitle'>" + periodData.period[0].toLocaleDateString() + " <span class='trn'>to</span> " + periodData.period[1].toLocaleDateString() + "</span>";
                title += subtitle;
            }
            else {
                title = "<span><span class='trn'>Map of Roll Calls</span>: " + "<span class='trn'>Year</span> " + id + "</span>";
                prettyTitle = "Map of Roll Calls: Year " + id;
            }
            panelClass = type + '-' + id;
        }
        else {
            firstYear = periodID[1];
            lastYear = periodID[2];
            title = "<span><span class='trn'>Map of Roll Calls</span>: " + firstYear + " <span class='trn'>to</span> " + lastYear + "</span>";
            prettyTitle = "Map of Roll Calls: " + firstYear + " to " + lastYear;
            panelClass = type + "-" + firstYear + "-" + lastYear;
        }

        var selectedDeputies = [];
        var hoveredDeputies = [];
        var data = {};

        var deputyNodes = state.getDeputyNodes();
        var rollCallsRates = state.getRollCallsRates();
        deputyNodes[panelID].forEach(function (deputy) {
            if (deputy.selected) selectedDeputies.push(deputy);
        });

        setVotesForSelectedDeputies(panelID);
        var rcs = rollCallsRates[panelID];
        rcs.map(function (e) {
            e.rollCallName = e.type + " " + e.number + " " + e.year;
        });

        data.rcs = rcs;
        data.deputies = selectedDeputies;

        chartObj = { 'chartID': STATIC_ROLLCALLS_HEATMAP, 'data': data, 'title': title, 'prettyTitle': prettyTitle, 'panelClass': panelClass };
        createNewChild(panelID, chartObj);
    }
}

/**
 * Handle themes button click
 * @param {string} panelID - Panel ID
 * @param {Object} data - Chart data
 * @param {number} chartID - Chart type ID
 */
function handleButtonThemes(panelID, data, chartID) {
    const period = $("#" + panelID).data().typePeriod;
    var periodID = period.split("-");
    var id, periodData, subtitle, panelClass, firstYear, lastYear;

    if (periodID.length <= 2) {
        type = periodID[0];
        id = periodID[1];
        if (type !== 'year') {
            periodData = CONGRESS_DEFINE[type + "s"][id];
            title = "<span><span class='trn'>Subjects</span>: <span class='trn'>" + periodData.name + "</span></span>";
            prettyTitle = "Subjects: " + periodData.name;
            subtitle = "<br><span class='panel-subtitle'>" + periodData.period[0].toLocaleDateString() + " <span class='trn'>to</span> " + periodData.period[1].toLocaleDateString() + "</span>";
            title += subtitle;
        }
        else {
            title = "<span><span class='trn'>Subjects</span>: " + "<span class='trn'>Year</span> " + id + "</span>";
            prettyTitle = "Subjects: Year " + id;
        }
        panelClass = type + '-' + id;
    }
    else {
        firstYear = periodID[1];
        lastYear = periodID[2];
        title = "<span><span class='trn'>Subjects</span>: " + firstYear + " <span class='trn'>to</span> " + lastYear + "</span>";
        prettyTitle = "Subjects: " + firstYear + " to " + lastYear;
        panelClass = type + "-" + firstYear + "-" + lastYear;
    }

    let args = {}

    if (chartID === BAR_CHART)
        args = { "typeBarChart": THEMES_BAR_CHART }

    chartObj = { 'chartID': chartID, 'data': data, 'title': title, 'prettyTitle': prettyTitle, 'panelClass': panelClass, "args": args };
    createNewChild(panelID, chartObj);
}

/**
 * Check period for timeline crop
 * @param {Event} event - Mouse event
 * @param {Object} deputy - Deputy object
 */
function checkPeriodTimeLineCrop(event, deputy) {
    var panelID = deputy.id.split("_")[0];
    var contextMenuTimeLineCropSelection = $("#time-line-crop-behavior-selection");

    if (event.which === 3) {
        var period = $("#" + panelID).data().typePeriod;
        if (period !== undefined) {
            var periodType = period.split("-")[0];
            if (periodType === 'year') {
                contextMenuTimeLineCropSelection.addClass("disabled");
            }
            else {
                if (periodType === 'period') {
                    var years = period.split("-");
                    var firstYear = years[1];
                    var lastYear = years[2];

                    if (lastYear - firstYear <= 1)
                        contextMenuTimeLineCropSelection.addClass("disabled");
                    else
                        contextMenuTimeLineCropSelection.removeClass("disabled");
                }
                else
                    contextMenuTimeLineCropSelection.removeClass("disabled");
            }
        }
        else {
            contextMenuTimeLineCropSelection.addClass("disabled");
        }
    }
}

/**
 * Enable brush for all scatter plots
 */
function enableBrushForAllScatterPlots() {
    if (d3.event.shiftKey) {
        state.setShiftKey(true);
        var tree = state.getTree();
        tree.traverseBF(function (n) {
            if (n.typeChart === SCATTER_PLOT)
                n.chart.enableBrush();
        })
    }
}

/**
 * Disable brush for all scatter plots
 */
function disableBrushForAllScatterPlots() {
    if (!d3.event.shiftKey) {
        state.setShiftKey(false);
        var tree = state.getTree();
        tree.traverseBF(function (n) {
            if (n.typeChart === SCATTER_PLOT)
                n.chart.disableBrush();
        })
    }
}

/**
 * Check children of scatter plot
 */
function checkChildrenScatterPlot() {
    var panelID = $(this).parents(".panel").attr("id");
    var tree = state.getTree();
    var node = tree.getNode(panelID, tree.traverseBF);

    if (node.children.length > 0)
        alert("Caution! If you change the value of K the panel's children will be deleted.");
}

