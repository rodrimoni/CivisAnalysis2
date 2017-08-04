/*
 * Created by Rodrigo on 25/05/2017.
 */

/* Initial values of panel Height and Width */
var INITIAL_HEIGHT = 300;
var INITIAL_WIDTH = 400;

/* Max values of panel Height and Width */
var MAX_HEIGHT = 620;
var MAX_WIDTH = 1000;

/* Constant values of icon Height and Width */
var HEIGHT_ICON = 28;
var WIDTH_ICON = 28;

/* Constant values of Legislatures and Years */
var FIRST_YEAR = 1991;
var LAST_YEAR = 2016;
var FIRST_LEGISLATURE = 0;
var LAST_LEGISLATURE = 6;

/* Constant to define the charts */
var SCATTER_PLOT = 1;
var BAR_CHART = 2;
var FORCE_LAYOUT = 3;

/* Global variable to store all deputies with an ID */
var deputiesArray = [];

/* Global variable to store the scatter plot nodes */
var deputiesNodes = [];

var globalCount = 0;

/* Creating the tree with the first node */
var tree = new Tree('panel-1-1', null);

function initSystem() {
    loadDeputies(deputiesArray);
}

function handleDropDown(value) {
    var type = "";

    if (value >= FIRST_YEAR && value <= LAST_YEAR )
        type = "year";
    else
        if (value >= FIRST_LEGISLATURE && value <= LAST_LEGISLATURE)
            type = "legislature";

    deputiesNodes= [];
    loadNodes(type, value);
}

function initializeChart(newID, chartObj) {
    var chart;

    switch (chartObj.chartID)
    {
        case SCATTER_PLOT:
            chart = scatterPlotChart();
            $('#' +newID + ' .panel-heading .btn-group').append('<button class="btn btn-default btn-settings-scatterplot toggle-dropdown" data-toggle="dropdown"><i class="glyphicon glyphicon-cog"></i></button> </button> <ul class="dropdown-menu panel-settings"><li role="presentation" class="dropdown-header">Clusterization with K-Means</li><li> Select the value of K: <br> <input id= "slider-'+ newID + '" type="text" data-slider-min="0" data-slider-max="20" data-slider-step="1" data-slider-value="10"/></li></ul>')
            initializeSlider(newID, chart);
            break;

        case BAR_CHART:
            chart =  barChart();
            break;

        case FORCE_LAYOUT:
            chart =  forceLayout();
            break;

        default:
            break;

    }

    /* Set the new tittle */
    $('#' +newID + ' .panel-title').append(chartObj.title);

    return chart;
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
                removeLines(panelID);
            }
        }
        else
        {
            tree.remove(panelID, parent, tree.traverseBF);
            $("#" + panelID).remove();
            removeLines(panelID);
        }
    }
    else
        removeChildren(node);
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

    panel
        .show()
        .css({
            "left" : iconOffset.left - panel.width()/2,
            "top"  : iconOffset.top - panel.height()/2
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
    if (currentId === null)
    {
        newID = "panel-1-1";
        newElem = $('<div '+ 'id="' + newID + '" class="panel panel-default"> <div class="panel-heading clearfix"> <h4 class="panel-title pull-left" style="padding-top: 7.5px;">' + newID + '</h4> <button disabled class="btn btn-default btn-remove"><i class="glyphicon glyphicon-remove"></i></button> <button class="btn btn-default btn-minimize"><i class="glyphicon glyphicon-minus"></i></button> </div><div class="panel-body center-panel"></div></div>').css({"position": "absolute"});

        $(".container").append(newElem);

        /* Sets up the panel settings as drag, resize, etc */
        setUpPanel(newID, null);

        $("#btn-init").appendTo("#panel-1-1 .panel-body");
        $("#btn-init").show();
    }
    else
    {
        var hashID = $("#" + currentId);
        var offset = 40;
        var parentPosition = hashID.position();

        var newLocation = [];

        /* Positions the new panel close to the parent panel */
        newLocation["top"]	= parentPosition.top + offset;
        newLocation["left"]  = parentPosition.left + offset;

        /* Adds the node to the tree structure */
        var node = tree.add('panel-', currentId, tree.traverseBF);
        newID = node.data;

        newElem = $('<div '+ 'id="' + newID + '" class="panel panel-default"> <div class="panel-heading clearfix"> <h4 class="panel-title pull-left" style="padding-top: 7.5px;"></h4> <div class="btn-group"> <button class="btn btn-default btn-remove"><i class="glyphicon glyphicon-remove"></i></button> <button class="btn btn-default btn-minimize"><i class="glyphicon glyphicon-minus"></i></button></div></div><div class="panel-body center-panel"><div class = "modal"></div></div></div>').css({"position": "absolute", "top": newLocation["top"], "left": newLocation["left"], "z-index":"90"});


        /* Inserts the panel after the last one in DOM */
        $('.panel').last().after(newElem);

        /* Initialize charts */
        if (chartObj !== null)
            chart = initializeChart(newID, chartObj);

        /* Bind data chart to node in tree */
        node.chart = chart;

        /* Sets up the panel settings as drag, resize, etc */
        setUpPanel(newID);

        if (chart !== null) {
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

    /* Setting up the panel */
    $( "#" + newID)
        .draggable({
            handle: ".panel-heading",
            stack: ".panel, .fa-window-maximize",
            containment: [10,10, workspace.width() - INITIAL_WIDTH - 10 , workspace.height() - INITIAL_HEIGHT - 70],
            drag: function(){
                centerLine(this.id);
            },
            cancel: '.dropdown-menu'
        })
        .find(".panel-body")
        .css({
            height: INITIAL_HEIGHT,
            width: INITIAL_WIDTH
        })
        .resizable({
            resize: function(){
                var aPanel = $(this).parents(".panel")[0];
                centerLine(aPanel.id);
            },
            aspectRatio: true,
            maxHeight: MAX_HEIGHT,
            maxWidth: MAX_WIDTH,
            minHeight: INITIAL_HEIGHT,
            minWidth: INITIAL_WIDTH
        });
        //.append(function(){
        //    createShape($(this), shape);
        //});
}

function getPartyCount(cluster) {

    var currentPartyCount = [];

    cluster.points.forEach(function(deputy){
        var result = $.grep(currentPartyCount, function(e){ return e.party === deputy.party; });
        if (result.length === 0) {
            currentPartyCount.push({"party" : deputy.party, "number": 1});
        }
        else
            if (result.length === 1) {
                result[0].number += 1;
            }
    });

    /* Sort and count the number of deputies per party*/
    currentPartyCount.sort(function(x,y){
            return d3.descending(x.number, y.number);
        });

    return currentPartyCount;
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
 * Create a new shape for a panel body
 * @param currentBody Body of panel that will receive the new SVG with the new shape
 * @param shape "Circle" or "Rect"
 * @returns {*} The new SVG with the shape drawn
 */
function createShape(currentBody, shape)
{

    var newSvg = d3.select(currentBody[0])
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", "0 0 600 400");

    if (shape === "circle")
    {
        newSvg.append("g")
            .append("circle")
            .attr("r", 200)
            .attr("cx", 300)
            .attr("cy", 200)
            .style("fill", "#F00")
    }
    else
    if (shape === "rect")
    {
        newSvg.append("g")
            .append("rect")
            .attr("x", 125)
            .attr("y", 25)
            .attr("width", 350)
            .attr("height", 350)
            .style("fill", "#3D37FF");
    }

    return newSvg;
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
    var panels = $(".panel");
    panels.each(function(index){
        var getElem = $( "#"+panels[index].id);
        var offsetWidth = workspace.width() - getElem.width() - 10;
        var offsetHeight= workspace.height() - getElem.height() - 10;
        $(getElem).draggable( "option", "containment", [10,10,offsetWidth,offsetHeight]);
    })
}

function  initializeSlider(id, chart) {
    var data = [];
    var k = 0;

    /* Formatting the slider */
    $('#slider-' + id).bootstrapSlider({
        formatter: function(value) {
            return 'Value of K: ' + value;
        }
    });

    /* Setting initial margin */
    $("#" + id + " .tooltip-main").css({'margin-left': '-45px'});

    /* Binding the call of K-Means in slide event */
    $('#slider-' + id).on("slideStop", function(slideEvt) {
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
            chart.getClusters(k, data, id);
            panel.removeClass("loading");
        }, 0);
    });
}

function checkChildren() {
    var panelID = $(this).parents(".panel").attr("id");
    var node = tree.getNode(panelID, tree.traverseBF);

    if (node.children.length > 0)
        alert("Caution! If you change the value of K the panel's children will be deleted.");
}