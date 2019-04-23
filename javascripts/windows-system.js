/*
 * Created by Rodrigo on 25/05/2017.
 */

/* Initial values of panel Height and Width */
var INITIAL_HEIGHT = 450;
var INITIAL_WIDTH = 550;

/* Max values of panel Height and Width */
var MAX_HEIGHT  = 1080;
var MAX_WIDTH   = 1920;

/* Constant values of icon Height and Width */
var HEIGHT_ICON = 28;
var WIDTH_ICON  = 28;

/* Constant to define the charts */
var TIME_LINE           = 0;
var SCATTER_PLOT        = 1;
var BAR_CHART           = 2;
var FORCE_LAYOUT        = 3;
var TIME_LINE_CROP      = 4;
var CHAMBER_INFOGRAPHIC = 5;
var ROLLCALLS_HEATMAP   = 6;

/* Constant to keep the value of ShiftKey */
var SHIFTKEY = false;

/* Constant to define Dimensional Reduction Techniques */
var PCA = 1;
var MDS = 2;
var TSNE = 3;

/* Global variable to handle deputies selections */
var selectionOn = false;

/* Global variable to store all deputies with an ID */
var deputiesArray = [];

/* Global variable to store all deputies with Scatter Plot Values by Year */
var deputiesNodesByYear = [];

/* Global variable to store all rollcalls */
var arrayRollCalls = [];

/* Global variable to store the scatter plot nodes */
var deputyNodes = [];

/* Global variable to store roll calls cards */
var rollCallsRates = [];

/* Global variable to handle with loaded Deputies */
var currentDeputies = [];

/* Global variable to handle with loaded rollCalls */
var currentRollCalls = [];

/* Creating the tree with the first node */
var tree = new Tree('panel-1-1');

function initSystem() {
    loadDeputies(deputiesArray);
    loadDeputiesNodesByYear(deputiesNodesByYear);
    loadRollCalls(arrayRollCalls, function () {
        createNewChild(TIME_LINE, {});
        //createTraces1by1();
    });
}


function initializeChart(newID, chartObj) {
    var chart;

    switch (chartObj.chartID)
    {
        case SCATTER_PLOT:
            chart = scatterPlotChart();

            deputyNodes[newID] = currentDeputies;
            rollCallsRates[newID] = currentRollCalls;

            console.log(rollCallsRates);

            addConfigMenu(newID);
            addClusteringMenu(newID);

            var deputies = [];
            for (var key in chartObj.data) {
                deputies.push(chartObj.data[key])
            }
            addSearchDeputyMenu(newID, deputies);

            initializeSlider(newID, chart);
            $('#' +newID).attr('data-type-period', chartObj.panelClass);

            chart.on('update', function () {
                updateDeputies(newID)
            });
            break;

        case BAR_CHART:
            chart =  barChart();
            break;

        case FORCE_LAYOUT:
            chart =  forceLayout();
            break;

        case TIME_LINE_CROP:
            chart = timeLineCrop();
            $('#' +newID).attr('data-type-period', chartObj.panelClass);
            break;

        case CHAMBER_INFOGRAPHIC:
            chart = chamberInfographic();

            deputyNodes[newID] = currentDeputies;
            rollCallsRates[newID] = currentRollCalls;

            addConfigMenu(newID);
            addSearchDeputyMenu(newID, chartObj.data.deputies);

            $('#' +newID).attr('data-type-period', chartObj.panelClass);

            chart.on('update', function () {
                updateDeputies(newID)
            });
            break;
        case ROLLCALLS_HEATMAP:
            chart = rollCallsHeatmap();
            addConfigMenu(newID);
            addFilterRollCallsMenu(newID, chartObj.data);
            chart.on('update', function () {
                var node = tree.getNode(newID, tree.traverseBF);
                var parentID = node.parent.data;
                updateRollCalls(parentID);
            });

            break;
        default:
            break;

    }

    /* Set the new tittle */
    $('#' +newID + ' .panel-title').append(chartObj.title);

    return chart;
}

function addConfigMenu(newID) {
    $('#' +newID + ' .panel-heading .btn-group')
        .append('<button class="btn btn-default btn-settings-scatterplot toggle-dropdown" data-toggle="dropdown"><i class="glyphicon glyphicon-cog"></i></button> ')
        .append('<ul class="dropdown-menu panel-settings"></ul>');
}

function addClusteringMenu(newID) {
    $("#" + newID + " .panel-settings")
        .append('<li role="presentation" class="dropdown-header">Clustering with K-Means</li>')
        .append('<li> Select the value of K: <br> <input id= "slider-'+ newID +'" type="text" data-slider-min="0" data-slider-max="20" data-slider-step="1" data-slider-value="10"/></li>')

}

function addFilterRollCallsMenu(newID, rollCalls) {
    $("#" + newID + " .panel-settings")
        .append('<li role="presentation" class="dropdown-header">Select motion types </li>')
        .append('<li><input type="text" ' +
            'class="form-control typeahead filterMotions" ' +
            'placeholder="Type motion type to filter..."/> </li>');

    // Get motions unique type array
    var rollCallsTypes = d3.map(rollCalls, function(d){return d.type;}).keys();
    rollCallsTypes.sort();

    // Convert to {key : index, value: typeMotion}
    rollCallsTypes = d3.entries(rollCallsTypes);

    var rollCallsTypes = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: rollCallsTypes
    });

    rollCallsTypes.initialize();

    var elt = $('#' + newID + ' .filterMotions');
    elt.tagsinput({
        itemValue: 'key',
        itemText: 'value',
        typeaheadjs: [{
                hint: true,
                highlight: true,
                minLength: 1
            },
            {
                name: 'rollCallsTypes',
                displayKey: 'value',
                source: rollCallsTypes.ttAdapter()
            }]
    });

    /* Prevents click to close the settings menu */
    $("#" + newID + " .bootstrap-tagsinput").click( function(e){
        e.stopPropagation();
    });

}

function addSearchDeputyMenu(newID, deputies) {
    $("#" + newID + " .panel-settings")
        .append('<li role="presentation" class="dropdown-header">Select Deputies </li>')
        .append('<li><input type="text" class="form-control typeahead searchDeputies" placeholder="Type a deputy name..."/> </li>');

    deputies = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: deputies
    });

    deputies.initialize();

    var elt = $('#' + newID + ' .searchDeputies');

    var printDeputy = function (data) {
        return data.name + ' (' + data.party + '-' + data.district + ')';
    };

    elt.tagsinput({
        itemValue: 'deputyID',
        itemText: printDeputy,
        tagClass: function(item) {
            return 'label label-info label-' + item.party;
        },
        typeaheadjs:[
            {
                hint: false,
                highlight: false
            },
            {
                name: 'deputies',
                displayKey: printDeputy,
                limit: 10,
                source: deputies.ttAdapter(),
                templates: {
                    suggestion:
                        function (data) {
                            return '<p>' + data.name + ' (' + data.party + '-' + data.district + ')</p>';
                        }
                }
            }
        ]
    });

    var chart;
    elt.on('itemAdded', function(event) {
        /* Set the correspondent party color */
        var party = event.item.party;
        $(".tag.label.label-info.label-"+ party).css({"background-color": selColor(party)});

        /* Select the deputies in input */
        var deputies = $(this).tagsinput('items');
        chart = tree.getNode(newID, tree.traverseBF).chart;
        chart.selectDeputiesBySearch(deputies);
    });

    elt.on('itemRemoved', function(event) {
        /* Select the deputies in input */
        var deputies = $(this).tagsinput('items');

        if (!Array.isArray(deputies) || !deputies.length)
            resetSelection();
        else {
            chart = tree.getNode(newID, tree.traverseBF).chart;
            chart.selectDeputiesBySearch(deputies);
        }

    });


    /* Prevents click to close the settings menu */
    $("#" + newID + " .bootstrap-tagsinput").click( function(e){
        e.stopPropagation();
    });

}


/**
 * Remove selected panel and his children
 * @example
 * $('selector').on("event", "element", removeWindow);
 */
function removeWindow(panelID, deleteThis) {
    //var panelID = $(this).parents(".panel").attr("id");
    var node = tree.getNode(panelID, tree.traverseBF);
    var parent = node.parent.data;

    if (deleteThis){
        if (node.children.length > 0)
        {
            /* Needs confirmation from user if panel has children */
            if (confirm("Deleting this panel will delete all of his children. Are you sure you want to delete this panel?"))
            {
                removeChildren(node);
                tree.remove(panelID, parent, tree.traverseBF);
                $("#" + panelID).remove();
                $("#icon-"+ panelID).remove();
                removeLines(panelID);
                removeDeputiesAndRollCalls(panelID);
            }
        }
        else
        {
            tree.remove(panelID, parent, tree.traverseBF);
            $("#" + panelID).remove();
            $("#icon-"+ panelID).remove();
            removeLines(panelID);
            removeDeputiesAndRollCalls(panelID);
        }
    }
    else
        removeChildren(node);

}

function removeDeputiesAndRollCalls(panelID) {
    if (deputyNodes[panelID] !== undefined && rollCallsRates[panelID] !==undefined)
    {
        delete deputyNodes[panelID];
        delete rollCallsRates[panelID];
    }
    console.log(deputyNodes);
    console.log(rollCallsRates);
}

/**
 * Remove panel's children
 * @param {string[]} arr The array of children
 */
function removeChildren(node) {
    var children = node.children;
    var len = children.length;
    var i = 0;
    var idToRemove = "";

    if (len > 0)
    {
        for (i = 0; i < len; i ++)
        {
            //recursive call to all children
            removeChildren(children[0]);
            idToRemove = children[0].data;
            tree.remove(idToRemove, node.data, tree.traverseBF);
            removeLines(idToRemove);
            $("#"+ idToRemove).remove();
            $("#icon-"+ idToRemove).remove();
        }
    }
}

/**
 * Removes all the lines that connects to a selected ID
 * @param {string} id Identification of the line to be removed
 *
 */
function removeLines(id)
{
    var lines =  d3.selectAll("line").filter(".class-" + id);
    var sizeLines = lines.size();
    if (sizeLines > 0)
    {
        for (var i = 0; i < sizeLines; i++)
        {
            var aLine = $("#" + lines[0][i].id);
            $(aLine).remove();
        }
    }
}

/**
 * Replaces a Bootstrap Panel with a small icon representing it minimized
 * @example
 * $('selector').on("event", "element", minimizeWindow);
 */
function minimizeWindow()
{
    var panelID = $(this).parents(".panel").attr("id");
    createNewIcon(panelID);
    centerLine(panelID, true);
    $("#"+ panelID).hide();
}

/**
 * Replaces a small icon with a Bootstrap Panel representing it maximized
 * @example
 * $('selector').on("event", "element", maximizeWindow);
 */
function maximizeWindow()
{
    var icon = $(this);
    var iconOffset = icon.offset();
    var panelID = icon.attr("id").replace("icon-", "");
    var panel = $("#"+panelID);

    var left = iconOffset.left - panel.width()/2;
    var top = iconOffset.top - panel.height()/2;

    if (left <= 10)
        left = 10;

    if (top <= 10)
        top = 10;

    panel
        .show()
        .css({
            "left" : left,
            "top"  : top
        });

    /* Guarantees that hover effect that was triggered, when btn-minimize is clicked, is removed */
    $("#"+ panelID + " .btn-default.btn-minimize").css("background", "#fff");

    icon.remove();

    /* Removes the dotted stylesheets of lines */
    d3.selectAll("line").filter(".class-" + panelID).style("stroke-dasharray", "");

    /* Keeps the icons with dotted line stylesheets */
    var activeIcons = $(" .fa-window-maximize");
    for (var i = 0; i < activeIcons.size(); i++)
    {
        var iconID = activeIcons[i].id.replace("icon-", "");
        d3.selectAll("line").filter(".class-" + iconID).style("stroke-dasharray", ("3, 3"));
    }
}

/**
 * Creates a new Panel with a selected shape
 * @param {string} currentId Identification of the panel that is originating the new one
 * @param {object} chartObj The selected chart (e.g Scatter Plot, Pie Chart, etc)
 * @example
 * createNewChild("panel-1-1", "rect") // From the "panel-1-1" is created a new panel with a shape of rect inside
 * createNewChild("panel-2-1", "circle") // From the "panel-2-1" is created a new panel with a shape of circle inside
 */
function createNewChild(currentId, chartObj) {
    var newElem = "";
    var newID = "";
    var chart;

    /* Creating the root */
    if (currentId === TIME_LINE)
    {
        newID = "panel-1-1";
        newElem = $('<div '+ 'id="' + newID + '" class="panel panel-default"> <div class="panel-heading clearfix"> <h4 class="panel-title pull-left" style="padding-top: 7.5px;"> Timeline </h4> <button disabled class="btn btn-default btn-remove"><i class="glyphicon glyphicon-remove"></i></button> <button class="btn btn-default btn-minimize"><i class="glyphicon glyphicon-minus"></i></button> </div><div class="panel-body center-panel"></div></div>').css({"position": "absolute"});

        $(".container").append(newElem);

        var timelineWidth = $(window).width() - 40;
        var timelineHeight = $(window).height()*0.6;

        /* Sets up the panel settings as drag, resize, etc */
        setUpPanel(newID);

        var timeline = d3.chart.timeline();

        timeline(d3.select("#" + newID + " .panel-body"),
            timelineWidth,
            timelineHeight
        );

        timeline
            .data(arrayRollCalls)
            .update();

        var filteredData;

        timeline
            .on("timelineFilter", function(filtered) {
                filteredData = filtered;
            });

        var currentMouseX;
        var invertX;

        d3.selectAll('.period').on('mousedown', function () {
            currentMouseX = d3.mouse(this)[0];
            invertX = timeline.invertByX(currentMouseX);
        });


        /* Context menu for Timeline Chart */
        $(".timeline .period")
            .contextMenu({
                menuSelector:"#contextMenuTimeline",
                menuSelected: function (invokedOn, selectedMenu) {
                    handleContextMenuTimeline(invokedOn, selectedMenu, filteredData);
                },
                menuFilter: function(){
                    if (filteredData === undefined)
                        return true;
                    else
                    {
                        if (invertX >= filteredData[0] && invertX <= filteredData[1])
                            return false;
                        else
                            return true;
                    }

                }
            });

        tree._root.chart = timeline;
        tree._root.typeChart = TIME_LINE;
    }
    else
    {
        var parentID = $("#" + currentId);
        var offset = 40;
        var parentPosition = parentID.position();

        var newLocation = [];

        /* Positions the new panel close to the parent panel */
        newLocation["top"]	= parentPosition.top + offset;
        newLocation["left"]  = parentPosition.left + offset;

        /* Adds the node to the tree structure */
        var node = tree.add('panel-', currentId, tree.traverseBF);
        newID = node.data;

        newElem = $('<div '+ 'id="' + newID + '" class="panel panel-default"> <div class="panel-heading clearfix"> <h6 class="panel-title pull-left" style="padding-top: 7.5px;"></h6> <div class="btn-group"> <button class="btn btn-default btn-remove"><i class="glyphicon glyphicon-remove"></i></button> <button class="btn btn-default btn-minimize"><i class="glyphicon glyphicon-minus"></i></button></div></div><div class="panel-body center-panel"><div class = "modal"></div></div></div>').css({"position": "absolute", "top": newLocation["top"], "left": newLocation["left"], "z-index":"90"});


        /* Inserts the panel after the last one in DOM */
        $('.panel').last().after(newElem);

        /* Initialize charts */
        if (chartObj !== null)
            chart = initializeChart(newID, chartObj);

        /* Bind data chart to node in tree */
        node.chart      = chart;
        node.typeChart  = chartObj.chartID;

        /* Sets up the panel settings as drag, resize, etc */
        setUpPanel(newID);

        if (chart !== null) {
            if (chartObj.chartID === ROLLCALLS_HEATMAP)
            {
                //FIXME: gambiarra feita para gerar um novo heatmap fora da classe
                var teste = d3.select('#' +newID + " .panel-body");
                console.log(teste[0]);
                chart.drawRollCallsHeatMap(chartObj.data, teste[0][0]);
            }
            d3.select("#" + newID + " .panel-body")
                .datum(chartObj.data)
                .call(chart);
        }

        /* Draws the lines between the two panels */
        drawLine(currentId, newID);
    }
}

/**
 * Sets up the panel settings
 * @param {string} newID The identification of the new panel
 */
function setUpPanel(newID) {
    /* Guarantees the right colors of btn-minimize */
    $("#"+ newID + " .btn-default.btn-minimize")
        .mouseenter(function() {
            $(this).css("background", "#e6e6e6");
        })
        .mouseleave(function() {
            $(this).css("background", "#fff");
        });

    /* Getting the workspace SVG */
    var workspace = $("#workspace");

    var isTimeline = newID === "panel-1-1";

    var initialWidth, initialHeight, minWidth, minHeight, maxWidth, maxHeight;

    if (isTimeline) {
        initialWidth = $(window).width() - 40;
        initialHeight = $(window).height()*0.6;

        minWidth = initialWidth/2;
        minHeight = initialHeight/2;

        maxWidth  = initialWidth;
        maxHeight = initialHeight;
    }
    else {
        initialWidth = INITIAL_WIDTH;
        initialHeight = INITIAL_HEIGHT;

        minWidth = INITIAL_WIDTH - 100;
        minHeight = INITIAL_HEIGHT - 100;

        maxWidth  = MAX_WIDTH;
        maxHeight = MAX_HEIGHT;
    }

    var containerOffset = $('.container').offset();

    /* Setting up the panel */
    $( "#" + newID)
        .draggable({
            handle: ".panel-heading",
            stack: ".panel, .fa-window-maximize",
            containment: [10,containerOffset.top, workspace.width() - initialWidth  - 10 , workspace.height() - initialHeight],
            drag: function(){
                centerLine(this.id);
            },
            cancel: '.dropdown-menu'
        })
        .find(".panel-body")
        .css({
            height: initialHeight,
            width: initialWidth
        })
        .resizable({
            resize: function(){
                var aPanel = $(this).parents(".panel")[0];
                centerLine(aPanel.id);
            },
            aspectRatio: true,
            maxHeight: maxHeight,
            maxWidth: maxWidth,
            minHeight: minHeight,
            minWidth: minWidth
        });

    /* Scrollable svg
    $("#" + newID)
        .find(".panel-body")
        .wrap('<div/>')
        .css({'overflow':'scroll'})
        .parent()
        .css({'display':'inline-block',
            'overflow':'hidden',
            'height':function(){return $('.panel-body',this).height();},
            'width':  function(){return $('.panel-body',this).width();},
            'paddingBottom':'12px',
            'paddingRight':'12px'

        }).resizable({
        resize: function(){
            var aPanel = $(this).parents(".panel")[0];
            centerLine(aPanel.id);
        },
        aspectRatio: true,
        maxHeight: maxHeight,
        maxWidth: maxWidth,
        minHeight: minHeight,
        minWidth: minWidth
    })
        .find('.panel-body')
        .css({overflow:'auto',
            width:'100%',
            height:'100%'});*/
}

/**
 * The handler of context menu of panels
 * @param invokedOn The place where cursor are when the right mouse button is clicked
 * @param selectedMenu The selected option in custom context menu
 */
function handleContextMenuScatterPlot(invokedOn, selectedMenu)
{
    /* Gets ID of the panel that was click */
    var panelID = invokedOn.parents(".panel").attr('id');

    /* Gets ID of the panel that was click */
    var clusterID = invokedOn.attr('id').replace('cluster_id_', '');

    var clusterData = tree.getNode(panelID, tree.traverseBF);
    var chartData;

    if (clusterData !== null)
        chartData = clusterData.chart;

    var title = "";
    var chartObj = {};

    if(selectedMenu.context.id === "bar-chart") {
        title = 'Bar Chart: Cluster ' + clusterID;
        var partyCountData = getPartyCount(chartData.clusters[clusterID]);
        chartObj = {'chartID' : BAR_CHART, 'data': partyCountData, 'title': title };
        createNewChild(panelID, chartObj );
    }
    else
        if(selectedMenu.context.id === "force-layout") {
            title = 'Force Layout: Cluster ' + clusterID;
            chartObj = {'chartID' : FORCE_LAYOUT, 'data': chartData.clusters[clusterID], 'title': title};
            createNewChild(panelID, chartObj);
        }
        else
            if(selectedMenu.context.id === "get-parent") {
                var parent = tree.getParent(panelID, tree.traverseBF);
                var msg = parent !== null ? parent.data : "Root doesn't have parent";
                alert(msg);
            }
}

function setUpScatterPlotData(filteredData, panelID, dimensionalReductionTechnique, isInfographic)
{
    var panelClass, title;

    currentDeputies = [];
    currentRollCalls = [];

    var dataRange = setNewDateRange(filteredData);

    if (isInfographic) {
        var createChamberInfographic = function(){

            currentRollCalls = rollCallInTheDateRange;
            calcRollCallRate(currentRollCalls, currentDeputies);

            var nodesValues = d3.values(currentDeputies);
            var parties = calcPartiesSizeAndCenter(nodesValues);
            var data = {'deputies': nodesValues, 'partiesMap' : parties };
            var chartObj = {'chartID': CHAMBER_INFOGRAPHIC, 'data': data, 'title': title, 'panelClass' : panelClass};
            createNewChild('panel-1-1', chartObj);
        };
    }
    else {
        var createScatterPlot = function(){
            currentRollCalls = rollCallInTheDateRange;
            calcRollCallRate(currentRollCalls, currentDeputies);

            var chartObj = {'chartID': SCATTER_PLOT, 'data': currentDeputies, 'title': title, 'panelClass' : panelClass};
            createNewChild('panel-1-1', chartObj);
        };
    }

    $('#loading').css('visibility','visible');

    // update the data for the selected period
    updateDataforDateRange(filteredData, function () {
        // if the precal was found we dont need to calc the SVD
        if((!dataRange.found && dimensionalReductionTechnique === "PCA") || dimensionalReductionTechnique !== "PCA") {
            var filteredDeputies = filterDeputies();
            var matrixDeputiesPerRollCall = createMatrixDeputiesPerRollCall(filteredDeputies);
            if (dimensionalReductionTechnique === "MDS")
                var matrixDistanceDeputies = createMatrixDistanceDeputies(matrixDeputiesPerRollCall);

            function calcCallback(twoDimData) {
                // Deputies array
                title = filteredData[0].getFullYear() + " to " + filteredData[1].getFullYear();

                if (isInfographic)
                    createChart = createChamberInfographic;
                else {
                    title += " (" + dimensionalReductionTechnique + ")";
                    createChart = createScatterPlot;
                }

                panelClass = "period-" + filteredData[0].getFullYear() + "-" + filteredData[1].getFullYear();


                currentDeputies = createDeputyNodes(twoDimData.deputies, filteredDeputies);
                scaleAdjustment().setGovernmentTo3rdQuadrant(d3.values(currentDeputies), filteredData[1]);

                currentRollCalls = rollCallInTheDateRange;
                calcRollCallRate(currentRollCalls, currentDeputies);

                $('#loading').css('visibility', 'hidden');
                createChart();
            }

            if (dimensionalReductionTechnique === "PCA") {
                $('#loading #msg').text('Generating Political Spectra by PCA');
                setTimeout(function () {
                    calcSVD(matrixDeputiesPerRollCall, calcCallback)
                }, 10);
            }
            else if (dimensionalReductionTechnique === "MDS") {
                $('#loading #msg').text('Generating Political Spectra by MDS');
                setTimeout(function () {
                    calcMDS(matrixDistanceDeputies, calcCallback)
                }, 10);
            }
            else if (dimensionalReductionTechnique === "TSNE") {
                $('#loading #msg').text('Generating Political Spectra by T-SNE');
                calcTSNE(matrixDeputiesPerRollCall, calcCallback);
            }
        }
        else {
            $('#loading #msg').text('Loading Data');
            if (dataRange.type !== "year")
                title = CONGRESS_DEFINE[dataRange.type + "s"][dataRange.id].name;
            else
                title = "Year: " + dataRange.id;
            panelClass = dataRange.type + '-' + dataRange.id;

            var createChart;

            if (isInfographic)
                createChart = createChamberInfographic;
            else {
                title += " ("+ dimensionalReductionTechnique + ")";
                createChart = createScatterPlot;
            }

            var subtitle = "<br><span class='panel-subtitle'>" + filteredData[0].toLocaleDateString() + " to " + filteredData[1].toLocaleDateString() + "</span>";
            title += subtitle;

            if (dimensionalReductionTechnique === "PCA") {
                //setTimeout(function () {
                    loadNodes(dataRange.type, dataRange.id, createChart);
                    $('#loading').css('visibility','hidden');
                //}, 10);
            }
        }
    });
}

function handleContextMenuTimeline(invokedOn, selectedMenu, filteredData)
{
    /* Gets ID of the panel that was click */
    var panelID = invokedOn.parents(".panel").attr('id');

    if (selectedMenu.context.id === "scatter-plot-pca") {
        setUpScatterPlotData(filteredData, panelID, "PCA", false);
    }
    else
        if (selectedMenu.context.id === "chamber-infographic")
            setUpScatterPlotData(filteredData, panelID, "PCA", true);
        else
            if (selectedMenu.context.id === "scatter-plot-mds")
                setUpScatterPlotData(filteredData, panelID, "MDS", false);
            else
                if (selectedMenu.context.id ==='scatter-plot-tsne')
                    setUpScatterPlotData(filteredData, panelID, "TSNE", false);
}

function handleContextMenuDeputy(invokedOn, selectedMenu)
{
    var title, data;
    var chartObj = {};

    var panelID = invokedOn.parents('.panel').attr("id");

    /* Get period of the Scatter Plot Chart */
    var period = invokedOn.parents('.panel').data().typePeriod;

    if (selectedMenu.context.id ==='time-line-crop-behavior-selection') {
        /* Get the Time Line Crop Chart with the same period of Scatter Plot Chart */
        var query = "[data-type-period='" + period + "'] .timeline-crop";
        var timelineCropPanel = $(query).parents('.panel');
        var timelineCropPanelID = timelineCropPanel.attr("id");

        if (timelineCropPanel.length === 0) {
            var periodID = period.split("-");
            var type, id, periodData, subtitle, panelClass, firstYear, lastYear;
            if (periodID.length <= 2) {
                type = periodID[0];
                id = periodID[1];
                periodData = CONGRESS_DEFINE[type + "s"][id];
                title = periodData.name;
                subtitle = "<br><span class='panel-subtitle'>" + periodData.period[0].toLocaleDateString() + " to " + periodData.period[1].toLocaleDateString() + "</span>";
                title += subtitle;
                panelClass = type + '-' + id;
                data = [periodData.period[0], periodData.period[1]];
            }
            else {
                type = periodID[0];
                firstYear = periodID[1];
                lastYear = periodID[2];
                title = firstYear + " to " + lastYear;
                panelClass = type + "-" + firstYear + "-" + lastYear;
                data = [new Date(firstYear,0,1),new Date(lastYear,0,1)];
            }

            chartObj = {'chartID': TIME_LINE_CROP, 'data': data, 'title': title, 'panelClass': panelClass};

            createNewChild(panelID, chartObj);

            /* Update after inserted new Chart */
            timelineCropPanel = $(query).parents('.panel');
            timelineCropPanelID = timelineCropPanel.attr("id");
        }

        var timeLineCropChart = tree.getNode(timelineCropPanelID, tree.traverseBF).chart;
        var deputies = [];

        d3.selectAll("#" + panelID + " .node.selected")
            .data()
            .forEach(function(d) {
                deputies.push(deputiesNodesByYear[d.deputyID]);
            });

        timeLineCropChart.drawDeputy(deputies);
    }
    else
        if (selectedMenu.context.id ==='rollcalls-heatmap'){

            var periodID = period.split("-");
            var id, periodData, subtitle, panelClass, firstYear, lastYear;
            if (periodID.length <= 2) {
                type = periodID[0];
                id = periodID[1];
                if (type !== 'year'){
                    periodData = CONGRESS_DEFINE[type + "s"][id];
                    title = "Roll Calls Heatmap of "+ periodData.name;
                    subtitle = "<br><span class='panel-subtitle'>" + periodData.period[0].toLocaleDateString() + " to " + periodData.period[1].toLocaleDateString() + "</span>";
                    title += subtitle;
                }
                else {
                    title = "Roll Calls Heatmap of year "+ id;
                }
            }
            else {
                firstYear = periodID[1];
                lastYear = periodID[2];
                title = "Roll Calls Heatmap of " + firstYear + " to " + lastYear;
            }

            // Get the corresponding rollcalls to this deputyNodes set
            var rcs =  groupRollCallsByMonth(rollCallsRates[panelID]);
            console.log(rcs);
            chartObj = {'chartID' : ROLLCALLS_HEATMAP, 'data': rcs, 'title':title};
            createNewChild(panelID, chartObj);
        }
}

function groupRollCallsByMonth(rcs) {
    var data = [];
    var lastMonth;
    var countRollCalls = 0;

    rcs.forEach(function (rc) {
        var currentMonth = rc.datetime.getMonth();
        if (lastMonth === undefined)
            lastMonth = currentMonth;
        else
            if (lastMonth !== currentMonth){
                countRollCalls = 0;
                lastMonth = currentMonth;
            }

        var currentYear = rc.datetime.getFullYear();
        var period = currentMonth + "/" + currentYear;
        var obj;
        obj = rc;
        obj.period = period;
        obj.index = countRollCalls;
        obj.selected = true;
        obj.hovered = false;
        if (obj.rate !== 'noVotes') {
            data.push(obj);
            countRollCalls++;
        }
    });
    return data;
}

/**
 * Creates a icon that represents a panel minimized
 * @param {string} panelID Identification of the minimized panel
 */
function createNewIcon(panelID)
{
    var panelCenter = getCenter(panelID);

    /* Getting the workspace SVG */
    var workspace = $("#workspace");

    $(".container").append(
        '<i id= "icon-' + panelID + '" class="fa fa-window-maximize fa-2x"></i>'
    );

    $("#icon-"+panelID)
        .draggable({
            stack: ".panel, .fa-window-maximize",
            containment: [10,10, workspace.width() - WIDTH_ICON - 10 , workspace.height() - HEIGHT_ICON - 10],
            drag: function(){
                centerLine(panelID, true);
            },
            stop:function(){
                centerLine(panelID, true);
            }
        })
        .css({
            "left" :  panelCenter["x"],
            "top"  :  panelCenter["y"]
        });

    /* Makes all the lines that are connected to a icon to become dotted */
    d3.selectAll("line").filter(".class-" + panelID).style("stroke-dasharray", ("3, 3"));
}


/**
 * Draws a line between two selected panels
 * @param {string} panelX Identification of the first panel
 * @param {string} panelY Identification of the second panel
 * @example
 * drawLine("panel-1-1", "panel-2-1"); // A line will be draw connecting the two centers of panels
 */
function drawLine(panelX, panelY)
{
    var svg = d3.select("#workspace");

    var centerX = getCenter(panelX);
    var centerY = getCenter(panelY);

    var line = svg.append("line")
        .style("stroke", "black")
        .attr("id", panelX + "_"+ panelY) //ex: id = "panel-1-1_panel-2-1"
        .attr("class", "class-" + panelX + " class-" + panelY) //ex: class="panel-1-1 panel-2-1"
        .attr("x1",centerX["x"])
        .attr("y1", centerX["y"])
        .attr("x2", centerY["x"])
        .attr("y2", centerY["y"]);
}

/**
 * Get the center of a panel
 * @param {string} obj The identification of panel
 * @returns {Array} The coordinates of the center point
 * @example
 * var center = getCenter("panel-1-1")
 * console.log(center["x"]); //10
 * console.log(center["y"]); // 20
 */
function getCenter(obj)
{
    var $this = $("#" + obj);
    var offset = $this.offset();
    var width = $this.width();
    var height = $this.height();
    var getSvg = $('#workspace');
    var centerX = offset.left + width / 2 -  getSvg.offset().left;
    var centerY = offset.top + height / 2 - getSvg.offset().top;
    var arr = [];
    arr["x"] = centerX;
    arr["y"] = centerY;
    return arr;
}

/**
 * Whenever a panel is moved the lines must follow it
 * @param {string} panelID The identification of the panel
 * @param {boolean} [icon= false] icon If is "true" means that we are dealing with icon, if is undefined it is a panel
 * @example
 * centerLine("panel-1-1", true) // Icon with panelID = "panel-1-1"
 * centerLine("panel-1-1") // Panel with panelID = "panel-1-1"
 */
function centerLine(panelID, icon) {
    if (typeof icon === 'undefined') { icon = false; }
    var lines =  d3.selectAll("line").filter(".class-" + panelID);
    var sizeLines = lines.size();

    for (var i = 0; i < sizeLines; i++)
    {
        var aLine = $("#" + lines[0][i].id);
        var lineID = lines[0][i].id.split("_");
        if (lineID[0] === panelID)
        {
            if (!icon)
            {
                aLine.attr("x1", getCenter(lineID[0])["x"]);
                aLine.attr("y1", getCenter(lineID[0])["y"]);
            }
            else
            {
                aLine.attr("x1", parseInt(getCenter("icon-" + lineID[0])["x"]));
                aLine.attr("y1", parseInt(getCenter("icon-" + lineID[0])["y"]));
            }
        }
        else
        {
            if (!icon)
            {
                aLine.attr("x2", getCenter(lineID[1])["x"]);
                aLine.attr("y2", getCenter(lineID[1])["y"]);
            }
            else
            {
                aLine.attr("x2", parseInt(getCenter("icon-" + lineID[1])["x"]));
                aLine.attr("y2", parseInt(getCenter("icon-" + lineID[1])["y"]));
            }
        }
    }
}

function hideToolTipCluster(){
    d3.select('.toolTipCluster').style("display", "none");
}

/**
 * Checks limits of window, guaranteeing that the panels and icons don't overflow
 * @example
 * $(window).on('resize', function(){
            checkLimits();
        });
 */
function checkLimits()
{
    var workspace =  $("#workspace");
    var containerOffset = $('.container').offset();
    var panels = $(".panel");
    panels.each(function(index){
        var getElem = $( "#"+panels[index].id);
        var offsetWidth = workspace.width() - getElem.width() - 10;
        var offsetHeight= workspace.height() - getElem.height() - 10;
        $(getElem).draggable( "option", "containment", [10,containerOffset.top,offsetWidth,offsetHeight + containerOffset.top]);
    })
}

function  initializeSlider(id, chart) {
    var data = [];
    var k = 0;

    var slider = '#slider-' + id;

    /* Formatting the slider */
    $(slider).bootstrapSlider({
        formatter: function(value) {
            return 'Value of K: ' + value;
        }
    });

    /* Setting initial margin */
    $("#" + id + " .tooltip-main").css({'margin-left': '-45px'});

    /* Binding the call of K-Means in slide event */
    $(slider).on("slideStop", function(slideEvt) {
        var panel = $(this).parents(".panel");
        var panelID = panel.attr("id");
        var node = tree.getNode(panelID, tree.traverseBF);

        if (node.children.length > 0)
            removeWindow(panelID, false);

        k = slideEvt.value;
        data = d3.select('#' + id + ' .panel-body').data()[0];

        var spinner = new Spinner().spin();

        $("#" + panelID + " .modal").append(spinner.el);

        panel.addClass("loading");
        setTimeout(function () {
            chart.getClusters(k, d3.values(data), id);
            panel.removeClass("loading");
            spinner.stop();
        }, 0);
    });
}

function checkChildrenScatterPlot() {
    var panelID = $(this).parents(".panel").attr("id");
    var node = tree.getNode(panelID, tree.traverseBF);

    if (node.children.length > 0)
        alert("Caution! If you change the value of K the panel's children will be deleted.");
}

function resizeTimeline() {

    var querySelector = "#panel-1-1 .panel-body";

    d3.select(window)
        .on('resize', function () {
            var maxWidth = $(window).width() - 40;
            var maxHeight = $(window).height() * 0.6;
            $(querySelector).resizable("option", "maxWidth", maxWidth);
            $(querySelector).resizable("option", "maxHeight", maxHeight);
        });
}

function checkPeriodTimeLineCrop(event, deputy) {
    var panelID = deputy.id.split("_")[0];
    var contextMenuTimeLineCropSelection = $("#time-line-crop-behavior-selection");

    if (event.which === 3)
    {
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

function updateRollCalls(parentID) {
    var selectedRollCalls = [];
    var hoveredRollCalls = [];
    var node = tree.getNode(parentID, tree.traverseBF);

    rollCallsRates[parentID].forEach(function (rollCall) {
        if(rollCall.selected) selectedRollCalls.push(rollCall);
        if(rollCall.hovered) hoveredRollCalls.push(rollCall);
    });

    if( (selectedRollCalls.length === rollCallsRates[parentID].length) && (hoveredRollCalls.length === 0) ){
        // reset deputies
        deputyNodes[parentID].forEach(function (deputy) { deputy.rate = null; deputy.vote = null; });

        if (node.typeChart === CHAMBER_INFOGRAPHIC)        {
            node.chart.resetParties();
        }
    }

    else {
        // ONLY ONE ROLL CALL SELECTED || HOVER
        if ((hoveredRollCalls.length === 1) || (selectedRollCalls.length === 1)) {

            deputyNodes[parentID].forEach(function (deputy) {
                deputy.vote = 'null';
            });

            var rollCall = (hoveredRollCalls.length === 1) ? hoveredRollCalls[0] : selectedRollCalls[0];
            // set the deputy votes
            rollCall.votes.forEach(function (deputyVote) {
                // TODO: Check this code. Is it necessary this test?
                if (deputyNodes[parentID][deputyVote.deputyID] !== undefined)
                    deputyNodes[parentID][deputyVote.deputyID].vote = deputyVote.vote;
            });

            if (node.typeChart === CHAMBER_INFOGRAPHIC)
            {
                node.chart.updateParties(rollCall);
            }
        }
    }

    updateVisualizations();
}

function updateDeputies(panelID) {
    var node = tree.getNode(panelID, tree.traverseBF);

    node.children.forEach(function (value) {
        if (value.typeChart === ROLLCALLS_HEATMAP) {

            var selectedDeputies    = [];
            var hoveredDeputies     = [];

            deputyNodes[panelID].forEach(function (deputy) {
                if(deputy.selected) selectedDeputies.push(deputy);
                if(deputy.hovered) hoveredDeputies.push(deputy);
            });

            // Update Roll Calls Votes accordingly deputies individual votes
            rollCallsRates[panelID].forEach(function (rollCall) {
                rollCall.vote = null;
                rollCall.rate = null;
            });

            // show the votes of one deputy
            if( (hoveredDeputies.length === 1) || (selectedDeputies.length===1) ){
                // get the deputy id
                var deputy = (hoveredDeputies.length === 1)? hoveredDeputies[0] : selectedDeputies[0];
                // set the deputy vote for each rollCall
                rollCallsRates[panelID].forEach( function(rollCall){
                    rollCall.vote = 'null';
                    rollCall.votes.forEach( function(vote){
                        if(vote.deputyID === deputy.deputyID){
                            rollCall.vote = vote.vote;
                        }
                    })
                });
            } else {
                calcRollCallRate(rollCallsRates[panelID],selectedDeputies);
            }
        }
    });

    updateVisualizations();
}

function updateVisualizations() {
    tree.traverseBF(function (n) {
        if (n.typeChart === SCATTER_PLOT || n.typeChart === CHAMBER_INFOGRAPHIC || n.typeChart === ROLLCALLS_HEATMAP)
            n.chart.update();
    })
}

function enableBrushForAllScatterPlots(){
    if (d3.event.shiftKey){
        SHIFTKEY = true;
        tree.traverseBF(function (n) {
            if (n.typeChart === SCATTER_PLOT)
                n.chart.enableBrush();
        })
    }
}

function disableBrushForAllScatterPlots(){
    if (!d3.event.shiftKey){
        SHIFTKEY = false;
        tree.traverseBF(function (n) {
            if (n.typeChart === SCATTER_PLOT)
                n.chart.disableBrush();
        })
    }
}

/*function getUniqueValues(arr, attr){
    return [...new Set(arr.map(item => item[attr]))];
}*/

function array_flip( trans )
{
    var key, tmp_ar = {};

    for ( key in trans )
    {
        if ( trans.hasOwnProperty( key ) )
        {
            tmp_ar[trans[key]] = key;
        }
    }

    return tmp_ar;
}