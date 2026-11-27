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
 * The real [start, end] date range a panel shows. Root panels store the
 * selection they were opened with; children inherit their parent's
 * (panel-manager.js, createNewChild).
 * @param {string} panelID
 * @returns {Date[]|null}
 */
function panelRange(panelID) {
    var tree = state.getTree();
    var node = tree.getNode(panelID, tree.traverseBF);
    return (node && node.periodRange) ? node.periodRange : null;
}

/**
 * Key stored in data-type-period for a free selection. The last year is the
 * last one the selection reaches: the end is exclusive, so 01/01/2027 closes
 * 2026 while 01/10/2026 still covers part of 2026.
 * @param {Date[]} range
 * @returns {string}
 */
function periodKey(range) {
    return "period-" + range[0].getFullYear() + "-" + new Date(range[1].getTime() - 1).getFullYear();
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
    var titleView = {};
    titleView[SCATTER_PLOT] = 'spectrum';
    titleView[CHAMBER_INFOGRAPHIC] = 'infographic';
    titleView[DEPUTIES_SIMILARITY_FORCE] = 'similarity';
    titleView[ROLLCALLS_HEATMAP] = 'map';
    var titles = panelTitle(titleView[type], filteredData,
        { technique: type === SCATTER_PLOT ? dimensionalReductionTechnique : null });
    title = titles.title;
    prettyTitle = titles.prettyTitle;
    panelClass = dataRange.found ? dataRange.type + '-' + dataRange.id : periodKey(filteredData);
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
            // The gear menu's subject/type filters need the period's roll calls,
            // the same way createScatterPlot supplies them.
            args = { ...args, rcs: state.getCurrentRollCalls() };

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
        // Deterministic techniques have precalc files for the standard periods
        // (data/precalc/<technique>/). t-SNE is always computed on demand, and
        // the similarity graph needs the full distance matrix, not positions.
        var hasPrecalc = dimensionalReductionTechnique === "PCA" ||
            dimensionalReductionTechnique === "W-NOMINATE" ||
            dimensionalReductionTechnique === "UMAP" ||
            (dimensionalReductionTechnique === "MDS" && type !== DEPUTIES_SIMILARITY_FORCE);
        if ((!dataRange.found && hasPrecalc) || !hasPrecalc) {
            var filteredDeputies = filterDeputies();
            var matrixDeputiesPerRollCall = createMatrixDeputiesPerRollCall(filteredDeputies);
            const deputiesAligment = calculateDeputiesAligment(filteredDeputies);

            if (matrixDeputiesPerRollCall.length > 0 && matrixDeputiesPerRollCall[0].length > 0) {
                if (dimensionalReductionTechnique === "MDS")
                    matrixDistanceDeputies = createMatrixDistanceDeputies(matrixDeputiesPerRollCall);

                function calcCallback(twoDimData) {

                    if (type === CHAMBER_INFOGRAPHIC)
                        createChart = createChamberInfographic;
                    else if (type === SCATTER_PLOT)
                        createChart = createScatterPlot;
                    else if (type === ROLLCALLS_HEATMAP)
                        createChart = createRollCallsHeatMap;

                    state.setCurrentDeputies(createDeputyNodes(twoDimData.deputies, filteredDeputies, deputiesAligment));
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
                else if (dimensionalReductionTechnique === "W-NOMINATE") {
                    var text = language === ENGLISH ? "Generating Political Spectra by W-NOMINATE" : "Gerando Espectro Político por W-NOMINATE";
                    $('#loading #msg').text(text);
                    setTimeout(function () {
                        calcWNominate(matrixDeputiesPerRollCall, calcCallback);
                    }, 10);
                }
            }
        }
        else {
            var createChart;

            if (type === CHAMBER_INFOGRAPHIC)
                createChart = createChamberInfographic;
            else if (type === ROLLCALLS_HEATMAP)
                createChart = createRollCallsHeatMap;
            else
                createChart = createScatterPlot;
            loadNodes(dataRange.type, dataRange.id, createChart, dimensionalReductionTechnique);
            $('#loading').css('visibility', 'hidden');
        }
    });
}

/**
 * Narrow the period's roll calls by subject and motion type, in place.
 * Both filters are optional; with both given the result is the intersection
 * (subject AND type). Shared by the scatter plot and the deputies similarity
 * graph reload paths so the two cannot drift apart.
 * @param {Array} subjects - Selected subjects (already localized), may be empty
 * @param {Array} types - Selected motion types, may be empty
 */
function applyRollCallFilters(subjects, types) {
    if (subjects && subjects.length)
        rollCallInTheDateRange = rollCallInTheDateRange.filter(function (rollCall) {
            var theme = language === ENGLISH ? subjectsToEnglish[rollCall.theme] : rollCall.theme;
            return subjects.includes(theme);
        });

    if (types && types.length)
        rollCallInTheDateRange = rollCallInTheDateRange.filter(function (rollCall) {
            return types.includes(rollCall.type);
        });
}

/**
 * Reload scatter plot data with new filters
 * @param {Array} filteredData - Filtered date range
 * @param {string} dimensionalReductionTechnique - DR technique
 * @param {string} panelID - Panel ID
 * @param {Array} subjects - Selected subjects
 */
function reloadScatterPlotData(filteredData, dimensionalReductionTechnique, panelID, subjects, types) {
    $('#loading').css('visibility', 'visible');

    state.setCurrentDeputies([]);
    state.setCurrentRollCalls([]);

    var tree = state.getTree();
    const chart = tree.getNode(panelID, tree.traverseBF).chart;

    updateDataforDateRange(filteredData, function () {
        applyRollCallFilters(subjects, types);

        var filteredDeputies = filterDeputies();
        var matrixDeputiesPerRollCall = createMatrixDeputiesPerRollCall(filteredDeputies);
        const deputiesAligment = calculateDeputiesAligment(filteredDeputies);

        if (matrixDeputiesPerRollCall.length > 0 && matrixDeputiesPerRollCall[0].length > 0) {
            if (dimensionalReductionTechnique === "MDS")
                matrixDistanceDeputies = createMatrixDistanceDeputies(matrixDeputiesPerRollCall);

            function calcCallback(twoDimData) {
                state.setCurrentDeputies(createDeputyNodes(twoDimData.deputies, filteredDeputies, deputiesAligment));
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
            else if (dimensionalReductionTechnique === "W-NOMINATE") {
                var text = language === ENGLISH ? "Generating Political Spectra by W-NOMINATE" : "Gerando Espectro Político por W-NOMINATE";
                $('#loading #msg').text(text);
                setTimeout(function () {
                    calcWNominate(matrixDeputiesPerRollCall, calcCallback);
                }, 10);
            }
        }
        else {
            // Filter combination produced no roll calls / no deputies to reduce.
            // The loading overlay is otherwise only hidden inside calcCallback, so
            // hide it here and tell the user why the spectrum did not update.
            $('#loading').css('visibility', 'hidden');
            var emptyMsg = language === ENGLISH
                ? "No roll calls match the selected filters for this period. The spectrum was not updated."
                : "Nenhuma votação corresponde aos filtros selecionados neste período. O espectro não foi atualizado.";
            alert(emptyMsg);
        }
    });
}

/**
 * Recompute the deputies similarity graph for a panel under new subject/type
 * filters and hand the fresh graph to its chart. Party filtering is absent on
 * purpose: it needs no recompute and is applied by the chart itself, so it
 * survives this reload — as does the similarity slider's value.
 * @param {Array} filteredData - Date range [start, end]
 * @param {string} panelID - Panel ID
 * @param {Array} subjects - Selected subjects
 * @param {Array} types - Selected motion types
 */
function reloadSimilarityGraphData(filteredData, panelID, subjects, types) {
    $('#loading').css('visibility', 'visible');

    var tree = state.getTree();
    var chart = tree.getNode(panelID, tree.traverseBF).chart;

    updateDataforDateRange(filteredData, function () {
        applyRollCallFilters(subjects, types);

        var filteredDeputies = filterDeputies();
        var matrixDeputiesPerRollCall = createMatrixDeputiesPerRollCall(filteredDeputies);

        if (matrixDeputiesPerRollCall.length > 0 && matrixDeputiesPerRollCall[0].length > 0) {
            var text = language === ENGLISH ? "Generating Deputies Similarity Graph" : "Gerando Grafo de Similaridade";
            $('#loading #msg').text(text);

            // Yield once so the overlay paints before the O(n²) distance matrix.
            setTimeout(function () {
                var matrixDistanceDeputies = createMatrixDistanceDeputies(matrixDeputiesPerRollCall);
                var similarityGraph = createDeputySimilarityGraph(matrixDistanceDeputies, filteredDeputies);

                state.setCurrentDeputies(similarityGraph.nodes);
                state.setCurrentRollCalls(rollCallInTheDateRange);
                calcRollCallRate(state.getCurrentRollCalls(), state.getCurrentDeputies());

                state.addDeputyNode(panelID, state.getCurrentDeputies());
                state.addRollCallRate(panelID, state.getCurrentRollCalls());

                chart.reloadSimilarityGraph(similarityGraph);

                $('#loading').css('visibility', 'hidden');
            }, 10);
        }
        else {
            // Unlike reloadScatterPlotData, state is not cleared up front, so on
            // this path the panel keeps the graph it already had.
            $('#loading').css('visibility', 'hidden');
            var emptyMsg = language === ENGLISH
                ? "No roll calls match the selected filters for this period. The graph was not updated."
                : "Nenhuma votação corresponde aos filtros selecionados neste período. O grafo não foi atualizado.";
            alert(emptyMsg);
        }
    });
}

/**
 * Handle timeline context menu
 * @param {Object} invokedOn - Element that invoked the menu
 * @param {Object} selectedMenu - Selected menu item
 * @param {Array} filteredData - Filtered data
 */
/**
 * Handle the Map of Roll Calls grid context menu: spawn a derived subject view
 * over the map's currently filtered slice.
 * @param {Object} invokedOn - Element the menu was invoked on
 * @param {Object} selectedMenu - Selected menu item
 */
function handleContextMenuRollCallsHeatmap(invokedOn, selectedMenu) {
    var panelID = invokedOn.parents(".panel").attr('id');
    var tree = state.getTree();
    var node = tree.getNode(panelID, tree.traverseBF);
    if (!node || !node.chart || typeof node.chart.spawnSubjectView !== 'function') return;

    var kinds = {
        'heatmap-subjects-histogram': 'bar',
        'heatmap-subjects-proportion': 'bubble',
        'heatmap-subjects-trends': 'line'
    };
    var kind = kinds[selectedMenu.context.id];
    if (kind) node.chart.spawnSubjectView(kind);
}

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
    else if (selectedMenu.context.id === 'scatter-plot-w-nominate')
        setUpScatterPlotData(filteredData, "W-NOMINATE", SCATTER_PLOT);
    else if (selectedMenu.context.id === 'deputies-similarity-force')
        setUpScatterPlotData(filteredData, "MDS", DEPUTIES_SIMILARITY_FORCE);
    else if (selectedMenu.context.id === 'rollcalls-heatmap')
        setUpScatterPlotData(filteredData, "PCA", ROLLCALLS_HEATMAP);
    else if (selectedMenu.context.id === 'cohesion-comparison')
        setUpCohesionComparison(filteredData);
    else if (selectedMenu.context.id === 'cohesion-by-theme')
        setUpCohesionByTheme(filteredData);
}

/**
 * Set up Cohesion Comparison chart from timeline selection
 * @param {Array} filteredData - Date range [startDate, endDate]
 */
function setUpCohesionComparison(filteredData) {
    var dataRange = setNewDateRange(filteredData);
    var title, prettyTitle, panelClass;

    $('#loading').css('visibility', 'visible');

    updateDataforDateRange(filteredData, function () {
        // Use deputiesInTheDateRange (global populated by updateDataforDateRange)
        var deputies = [];
        for (var key in deputiesInTheDateRange) {
            if (deputiesInTheDateRange.hasOwnProperty(key)) {
                var dep = deputiesInTheDateRange[key];
                dep.deputyID = parseInt(key);
                deputies.push(dep);
            }
        }

        // Build roll calls array
        var rcs = rollCallInTheDateRange || [];
        rcs.forEach(function (e) {
            if (!e.rollCallName) {
                e.rollCallName = e.type + " " + e.number + " " + e.year;
            }
        });

        var titles = panelTitle('comparison', filteredData);
        title = titles.title;
        prettyTitle = titles.prettyTitle;
        panelClass = dataRange.found ? dataRange.type + '-' + dataRange.id : periodKey(filteredData);

        var data = {
            period: filteredData,
            rcs: rcs,
            deputies: deputies,
            series: []
        };

        var chartObj = {
            'chartID': COHESION_COMPARISON,
            'data': data,
            'title': title,
            'prettyTitle': prettyTitle,
            'panelClass': panelClass,
            'periodRange': filteredData
        };

        $('#loading').css('visibility', 'hidden');
        createNewChild('panel-1-1', chartObj);
    });
}

/**
 * Set up Agreement by Subject chart from timeline selection
 * @param {Array} filteredData - Date range [startDate, endDate]
 */
function setUpCohesionByTheme(filteredData) {
    var dataRange = setNewDateRange(filteredData);
    var title, prettyTitle, panelClass;

    $('#loading').css('visibility', 'visible');

    updateDataforDateRange(filteredData, function () {
        var deputies = [];
        for (var key in deputiesInTheDateRange) {
            if (deputiesInTheDateRange.hasOwnProperty(key)) {
                var dep = deputiesInTheDateRange[key];
                dep.deputyID = parseInt(key);
                deputies.push(dep);
            }
        }

        var rcs = rollCallInTheDateRange || [];
        rcs.forEach(function (e) {
            if (!e.rollCallName) {
                e.rollCallName = e.type + " " + e.number + " " + e.year;
            }
        });

        var titles = panelTitle('agreement', filteredData);
        title = titles.title;
        prettyTitle = titles.prettyTitle;
        panelClass = dataRange.found ? dataRange.type + '-' + dataRange.id : periodKey(filteredData);

        var data = {
            period: filteredData,
            rcs: rcs,
            deputies: deputies,
            referenceGroup: null,
            comparisonGroups: []
        };

        var chartObj = {
            'chartID': COHESION_BY_THEME,
            'data': data,
            'title': title,
            'prettyTitle': prettyTitle,
            'panelClass': panelClass,
            'periodRange': filteredData
        };

        $('#loading').css('visibility', 'hidden');
        createNewChild('panel-1-1', chartObj);
    });
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
        var range = panelRange(panelID);
        var titles = panelTitle('crop', range);
        title = titles.title;
        prettyTitle = titles.prettyTitle;
        var panelClass = period;
        data.period = cropPeriod(range, CONGRESS_DEFINE).period;

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
    else if (selectedMenu.context.id === 'static-rollcalls-heatmap') {
        var range = panelRange(panelID);
        var titles = panelTitle('map', range);
        title = titles.title;
        prettyTitle = titles.prettyTitle;
        var panelClass = period;

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
    else if (selectedMenu.context.id === 'cohesion-timeline-deputies-selection') {
        var range = panelRange(panelID);
        var titles = panelTitle('deputiesCohesion', range);
        title = titles.title;
        prettyTitle = titles.prettyTitle;
        var panelClass = period;

        var deputyNodes = state.getDeputyNodes();
        var rollCallsRates = state.getRollCallsRates();

        var selectedDeputies = deputyNodes[panelID].filter(function (deputy) {
            return deputy.selected;
        });

        var deputyIDs = selectedDeputies.map(function (d) { return d.deputyID; });

        var rcs = rollCallsRates[panelID];
        rcs.map(function (e) {
            e.rollCallName = e.type + " " + e.number + " " + e.year;
        });

        var data = {};
        data.rcs = rcs;
        data.deputies = selectedDeputies;
        data.deputyIDs = deputyIDs;
        data.isDeputyMode = true;

        chartObj = {
            'chartID': PARTY_RICE_TIMELINE,
            'data': data,
            'title': title,
            'prettyTitle': prettyTitle,
            'panelClass': panelClass
        };

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
    var range = panelRange(panelID);
    var titles = panelTitle('subjects', range);
    title = titles.title;
    prettyTitle = titles.prettyTitle;
    var panelClass = period;

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
    var contextMenuCohesionTimeline = $("#cohesion-timeline-deputies-selection");

    if (event.which === 3) {
        var period = $("#" + panelID).data().typePeriod;
        if (period !== undefined) {
            // The crop draws whole calendar years: it needs two of them inside
            // the panel's real range (legislatures and terms always qualify).
            var range = panelRange(panelID);
            if (range && canCrop(range, CONGRESS_DEFINE))
                contextMenuTimeLineCropSelection.removeClass("disabled");
            else
                contextMenuTimeLineCropSelection.addClass("disabled");

            // Cohesion timeline: enable only when >= 2 deputies are selected
            var selectedCount = $("#" + panelID + " .node.selected").length;
            if (selectedCount >= 2) {
                contextMenuCohesionTimeline.removeClass("disabled");
            } else {
                contextMenuCohesionTimeline.addClass("disabled");
            }
        }
        else {
            contextMenuTimeLineCropSelection.addClass("disabled");
            contextMenuCohesionTimeline.addClass("disabled");
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

/**
 * Handle context menu for party legend
 * @param {Object} invokedOn - Element that invoked the menu
 * @param {Object} selectedMenu - Selected menu item
 */
function handleContextMenuPartyLegend(invokedOn, selectedMenu) {
    var panelID = invokedOn.parents(".panel").attr('id');
    // Convert jQuery selection to D3 selection and get the bound datum (party name)
    var party = d3.select(invokedOn[0]).datum();
    var period = invokedOn.parents('.panel').data().typePeriod;

    var title, prettyTitle, data = {};
    var chartObj = {};

    if (selectedMenu.context.id === 'party-metrics') {
        var range = panelRange(panelID);
        var titles = panelTitle('partyMetrics', range, { group: party });
        title = titles.title;
        prettyTitle = titles.prettyTitle;
        var panelClass = period;

        var data = {};

        var deputyNodes = state.getDeputyNodes();
        var rollCallsRates = state.getRollCallsRates();

        var deputies = deputyNodes[panelID].filter(function (deputy) {
            return deputy.party === party;
        });

        var rcs = rollCallsRates[panelID];

        rcs.map(function (e) {
            e.rollCallName = e.type + " " + e.number + " " + e.year;
        });

        data.rcs = rcs;
        data.deputies = deputies;
        data.party = party;

        chartObj = {
            'chartID': PARTY_METRICS,
            'data': data,
            'title': title,
            'prettyTitle': prettyTitle,
            'panelClass': panelClass
        };

        createNewChild(panelID, chartObj);
    }
    else if (selectedMenu.context.id === 'party-rice-timeline') {
        // Retrieve multi-party selection from the parent chart
        var tree = state.getTree();
        var parentNode = tree.getNode(panelID, tree.traverseBF);
        var parentChart = (parentNode && parentNode.chart) ? parentNode.chart : null;
        var selectedParties = (parentChart && typeof parentChart.getSelectedPartiesForHulls === 'function')
            ? parentChart.getSelectedPartiesForHulls()
            : [];

        // If right-clicked party isn't in selection, or < 2 parties, fallback to single party
        if (selectedParties.length < 2 || selectedParties.indexOf(party) === -1) {
            selectedParties = [party];
        }

        var partiesLabel = selectedParties; // summarized by panelTitle when long

        var range = panelRange(panelID);
        var titles = panelTitle('cohesionTimeline', range, { group: partiesLabel });
        title = titles.title;
        prettyTitle = titles.prettyTitle;
        var panelClass = period;

        var data = {};

        var deputyNodes = state.getDeputyNodes();
        var rollCallsRates = state.getRollCallsRates();

        var deputies = deputyNodes[panelID].filter(function (deputy) {
            return selectedParties.indexOf(deputy.party) > -1;
        });

        var rcs = rollCallsRates[panelID];

        rcs.map(function (e) {
            e.rollCallName = e.type + " " + e.number + " " + e.year;
        });

        data.rcs = rcs;
        data.deputies = deputies;
        data.party = party;
        data.parties = selectedParties;

        chartObj = {
            'chartID': PARTY_RICE_TIMELINE,
            'data': data,
            'title': title,
            'prettyTitle': prettyTitle,
            'panelClass': panelClass
        };

        createNewChild(panelID, chartObj);
    }
}
