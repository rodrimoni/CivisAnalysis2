/*
 * Panel Manager Module
 * Manages panel/window lifecycle: creation, removal, minimization, maximization
 */

/**
 * Remove selected panel and its children
 * @param {string} panelID - Panel ID
 * @param {boolean} deleteThis - Whether to delete this panel
 */
function removeWindow(panelID, deleteThis) {
    var tree = state.getTree();
    var node = tree.getNode(panelID, tree.traverseBF);
    var parent = node.parent.data;

    if (deleteThis) {
        if (node.children.length > 0) {
            if (confirm("Deleting this panel will delete all of his children. Are you sure you want to delete this panel?")) {
                removeChildren(node);
                tree.remove(panelID, parent, tree.traverseBF);
                $("#" + panelID).remove();
                $("#icon-" + panelID).remove();
                removeLines(panelID);
                removeDeputiesAndRollCalls(panelID);
            }
        }
        else {
            tree.remove(panelID, parent, tree.traverseBF);
            $("#" + panelID).remove();
            $("#icon-" + panelID).remove();
            removeLines(panelID);
            removeDeputiesAndRollCalls(panelID);
        }
    }
    else
        removeChildren(node);

    updateSideBar();
}

/**
 * Remove deputies and roll calls data for a panel
 * @param {string} panelID - Panel ID
 */
function removeDeputiesAndRollCalls(panelID) {
    var deputyNodes = state.getDeputyNodes();
    var rollCallsRates = state.getRollCallsRates();

    if (deputyNodes[panelID] !== undefined && rollCallsRates[panelID] !== undefined) {
        state.removeDeputyNode(panelID);
        state.removeRollCallRate(panelID);
    }
}

/**
 * Remove panel's children recursively
 * @param {Object} node - Tree node
 */
function removeChildren(node) {
    var tree = state.getTree();
    var children = node.children;
    var len = children.length;
    var i = 0;
    var idToRemove = "";

    if (len > 0) {
        for (i = 0; i < len; i++) {
            removeChildren(children[0]);
            idToRemove = children[0].data;
            tree.remove(idToRemove, node.data, tree.traverseBF);
            removeLines(idToRemove);
            removeDeputiesAndRollCalls(idToRemove);
            $("#" + idToRemove).remove();
            $("#icon-" + idToRemove).remove();
        }
    }
}

/**
 * Removes all lines connected to a panel
 * @param {string} id - Panel ID
 */
function removeLines(id) {
    var lines = d3.selectAll("line").filter(".class-" + id);
    var sizeLines = lines.size();
    if (sizeLines > 0) {
        for (var i = 0; i < sizeLines; i++) {
            var aLine = $("#" + lines[0][i].id);
            $(aLine).remove();
        }
    }
}

/**
 * Minimizes a panel to an icon
 */
function minimizeWindow() {
    var panelID = $(this).parents(".panel").attr("id");
    deselectNodeSideBarByPanel(panelID);
    createNewIcon(panelID);
    checkLimits(isSideBarActive());
    centerLine(panelID, true);
    $("#" + panelID).hide();
}

/**
 * Maximizes a minimized icon back to a panel
 * @param {string} panelID - Panel ID
 */
function maximizeWindow(panelID) {
    var icon = $("#icon-" + panelID);
    var iconOffset = icon.offset();
    var panel = $("#" + panelID);

    var left = iconOffset.left - panel.width() / 2;
    var top = iconOffset.top - panel.height() / 2;

    if (left <= 10)
        left = 10;

    if (top <= 10)
        top = 10;

    panel
        .show()
        .css({
            "left": left,
            "top": top
        });

    $("#" + panelID + " .btn-default.btn-minimize").css("background", "#fff");

    icon.remove();
    selectNodeSideBarByPanel(panelID);

    d3.selectAll("line").filter(".class-" + panelID).style("stroke-dasharray", "");

    var activeIcons = $(" .minimized-icons");
    for (var i = 0; i < activeIcons.size(); i++) {
        var iconID = activeIcons[i].id.replace("icon-", "");
        d3.selectAll("line").filter(".class-" + iconID).style("stroke-dasharray", ("3, 3"));
    }
}

/**
 * Creates an icon representing a minimized panel
 * @param {string} panelID - Panel ID
 */
function createNewIcon(panelID) {
    var panelCenter = getCenter(panelID);
    var tree = state.getTree()
    var node = tree.getNode(panelID, tree.traverseBF);
    var typeChart = node.typeChart;
    var iconHoverText = node.title;

    $(".container").append(
        '<a id= "icon-' + panelID + '" class="' + getChartIcon(typeChart) + ' minimized-icon"></a>'
    );

    $("#icon-" + panelID).attr(popoverAttrFocus(function () {
        return iconHoverText;
    }, 'top'));

    $("#icon-" + panelID).popover({ trigger: "focus" });

    $("#icon-" + panelID)
        .draggable({
            stack: ".panel, .custom-icon",
            containment: getContainmentArray(ICON_WIDTH, ICON_HEIGHT, isSideBarActive()),
            start: function () {
                $(this).blur();
            },
            drag: function () {
                centerLine(panelID, true);
            },
            stop: function () {
                centerLine(panelID, true);
                $(this).blur();
            }
        })
        .css({
            "left": panelCenter["x"],
            "top": panelCenter["y"]
        });

    d3.selectAll("line").filter(".class-" + panelID).style("stroke-dasharray", ("3, 3"));
}

/**
 * Creates a new child panel
 * @param {string|number} currentId - Current panel ID or chart type constant
 * @param {Object} chartObj - Chart configuration object
 */
function createNewChild(currentId, chartObj) {
    var newElem = "";
    var newID = "";
    var chart;
    var tree = state.getTree();

    /* Creating the root timeline */
    if (currentId === TIME_LINE) {
        newID = "panel-1-1";
        newElem = $('<div ' + 'id="' + newID + '" class="panel panel-selected panel-default"> <div class="panel-heading clearfix"> <h6 class="panel-title pull-left" style="padding-top: 7.5px;"></h6> <div class="btn-group"> <button disabled class="btn btn-default btn-remove"><i class="glyphicon glyphicon-remove"></i></button> <button class="btn btn-default btn-minimize"><i class="glyphicon glyphicon-minus"></i></button></div></div><div class="panel-body center-panel"></div></div>').css({ "position": "absolute" });

        $(".container").append(newElem);

        var timelineWidth = $(window).width() - 40;
        var timelineHeight = $(window).height() * 0.5;

        setUpPanel(newID);

        var timeline = d3.chart.timeline();

        timeline(d3.select("#" + newID + " .panel-body"),
            timelineWidth,
            timelineHeight
        );

        const arrayRollCalls = state.getArrayRollCalls();

        timeline
            .data(arrayRollCalls)
            .update();

        var filteredData;

        timeline
            .on("timelineFilter", function (filtered) {
                filteredData = filtered;
            });

        var currentMouseX;
        var invertX;

        d3.selectAll('.period').on('mousedown', function () {
            currentMouseX = d3.mouse(this)[0];
            invertX = timeline.invertByX(currentMouseX);
        });

        $(".timeline .period")
            .contextMenu({
                menuSelector: "#contextMenuTimeline",
                menuSelected: function (invokedOn, selectedMenu) {
                    handleContextMenuTimeline(invokedOn, selectedMenu, filteredData);
                },
                menuFilter: function () {
                    if (filteredData === undefined)
                        return true;
                    else {
                        if (invertX >= filteredData[0] && invertX <= filteredData[1])
                            return false;
                        else
                            return true;
                    }
                }
            });

        tree._root.chart = timeline;
        tree._root.typeChart = TIME_LINE;
        tree._root.title = "Timeline";

        $('#' + newID + ' .panel-title').append(getChartIconTitle(TIME_LINE));
        $('#' + newID + ' .panel-title').append("<span>Timeline</span");

        addConfigMenu(newID, 'time-line', true);
        addDatePickerTimeline();
        addEditTitleInput(newID);

        updateSideBar();

        if (language === PORTUGUESE) {
            translator.lang("br");
            $("#maxRollCallsWeek").text(translator.get("max RollCalls/week"));
        }
    }
    else {
        var parentID = $("#" + currentId);
        var offset = 40;
        var parentPosition = parentID.position();

        var newLocation = [];
        newLocation["top"] = parentPosition.top + offset;
        newLocation["left"] = parentPosition.left + offset;

        var node = tree.add('panel-', currentId, tree.traverseBF);
        newID = node.data;

        newElem = $('<div ' + 'id="' + newID + '" class="panel panel-default"> <div class="panel-heading clearfix"> <h6 class="panel-title pull-left" style="padding-top: 7.5px;"></h6> <div class="btn-group"> <button class="btn btn-default btn-remove"><i class="glyphicon glyphicon-remove"></i></button> <button class="btn btn-default btn-minimize"><i class="glyphicon glyphicon-minus"></i></button></div></div><div class="panel-body center-panel"><div class = "modal"></div></div></div>').css({ "position": "absolute", "top": newLocation["top"], "left": newLocation["left"], "z-index": "90" });

        $('.panel').last().after(newElem);

        node.typeChart = chartObj.chartID;
        node.title = chartObj.prettyTitle;
        node.args = chartObj.args;

        if (chartObj !== null)
            chart = initializeChart(newID, chartObj);

        node.chart = chart;

        updateSideBar();
        selectNodeSideBarByPanel(newID);

        setUpPanel(newID);

        if (chart !== null) {
            d3v4.select("#" + newID + " .panel-body")
                .datum(chartObj.data)
                .call(chart);
        }

        // Tutorial triggers
        if (node.typeChart === SCATTER_PLOT && state.isFirstScatterPlot()) {
            state.setFirstScatterPlot(false);
        } else if (node.typeChart === CHAMBER_INFOGRAPHIC && state.isFirstChamberInfographic()) {
            state.setFirstChamberInfographic(false);
        } else if (node.typeChart === DEPUTIES_SIMILARITY_FORCE && state.isFirstDeputiesSimilarity()) {
            state.setFirstDeputiesSimilarity(false);
        } else if (node.typeChart === ROLLCALLS_HEATMAP && state.isFirstRollCallHeatMap()) {
            state.setFirstRollCallHeatMap(false);
        } else if (node.typeChart === TIME_LINE_CROP && state.isFirstTimelineCrop()) {
            state.setFirstTimelineCrop(false);
        }
        else if (node.typeChart === THEMES_BUBBLE_CHART && state.isFirstThemesBubbleChart()) {
            state.setFirstThemesBubbleChart(false);
        }

        drawLine(currentId, newID);

        if (state.getLanguage() === PORTUGUESE) {
            translator.lang("br");
        }
    }
}

/**
 * Sets up panel drag, resize, and other behaviors
 * @param {string} newID - Panel ID
 */
function setUpPanel(newID) {
    $("#" + newID + " .btn-default.btn-minimize")
        .mouseenter(function () {
            $(this).css("background", "#e6e6e6");
        })
        .mouseleave(function () {
            $(this).css("background", "#fff");
        });

    var isTimeline = newID === "panel-1-1";

    var initialWidth, initialHeight, minWidth, minHeight, maxWidth, maxHeight;

    if (isTimeline) {
        initialWidth = $(window).width() - 40;
        initialHeight = $(window).height() * 0.5;

        minWidth = initialWidth / 2;
        minHeight = initialHeight / 2;

        maxWidth = initialWidth;
        maxHeight = initialHeight;
    }
    else {
        initialWidth = INITIAL_WIDTH;
        initialHeight = INITIAL_HEIGHT;

        minWidth = INITIAL_WIDTH - 30;
        minHeight = INITIAL_HEIGHT - 30;

        maxWidth = MAX_WIDTH;
        maxHeight = MAX_HEIGHT;
    }

    $("#" + newID)
        .draggable({
            handle: ".panel-heading",
            stack: ".panel, .custom-icon",
            containment: getContainmentArray(initialWidth, initialHeight, isSideBarActive()),
            start: function () {
                selectNodeSideBarByPanel(newID);
            },
            drag: function () {
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
            resize: function () {
                var aPanel = $(this).parents(".panel")[0];
                centerLine(aPanel.id);
            },
            aspectRatio: true,
            maxHeight: maxHeight,
            maxWidth: maxWidth,
            minHeight: minHeight,
            minWidth: minWidth
        });
}

/**
 * Checks window limits when resizing
 * @param {boolean} isSideBarActive - Whether sidebar is active
 */
function checkLimits(isSideBarActive) {
    var panels = $(".panel");
    panels.each(function (index) {
        var getElem = $("#" + panels[index].id);
        $(getElem).draggable("option", "containment", getContainmentArray(getElem.width(),
            getElem.height(),
            isSideBarActive));
    })

    var minimizedIcons = $(".minimized-icon");
    minimizedIcons.each(function (index) {
        var getElem = $("#" + minimizedIcons[index].id);
        $(getElem).draggable("option", "containment", getContainmentArray(getElem.width(),
            getElem.height(),
            isSideBarActive));
    })
}

/**
 * Check if sidebar is active
 * @returns {boolean} True if sidebar is active
 */
function isSideBarActive() {
    return $("#mySidebar").width() >= SIDEBAR_OFFSET
}

/**
 * Select node in sidebar by panel ID
 * @param {string} panelID - Panel ID
 */
function selectNodeSideBarByPanel(panelID) {
    var nodes = $('#tree').treeview('getEnabled');
    nodes.forEach(function (node) {
        if (node.panel === panelID) {
            if (node.state !== 'selected') {
                $('#tree').treeview('selectNode', node);
            }
        }
    })
}

/**
 * Deselect node in sidebar by panel ID
 * @param {string} panelID - Panel ID
 */
function deselectNodeSideBarByPanel(panelID) {
    var nodes = $('#tree').treeview('getEnabled');
    nodes.forEach(function (node) {
        if (node.panel === panelID) {
            $('#tree').treeview('unselectNode', node);
        }
    })
    $("#" + panelID).removeClass('panel-selected')
}

/**
 * Update sidebar tree view
 */
function updateSideBar() {
    $('#tree').treeview({ data: getTree() });
    $('#tree').treeview('expandAll', { levels: 2, silent: true });

    $('#tree').on('nodeSelected', function (event, data) {
        $("#" + data.panel).addClass("panel-selected");
        if ($(".ui-draggable-dragging").length < 1)
            $(window).scrollTo($("#" + data.panel).position(), 800);
        if ($("#icon-" + data.panel).length >= 1) {
            maximizeWindow(data.panel);
            centerLine(data.panel);
            $(window).scrollTo($("#" + data.panel).position(), 800);
        }
        $(".panel").css("z-index", "1");
        $("#" + data.panel).css("z-index", "100");
    });

    $('#tree').on('nodeUnselected', function (event, data) {
        $('#' + data.panel).removeClass('panel-selected');
    });
}

/**
 * Get tree structure for sidebar
 * @returns {Array} Tree data
 */
function getTree() {
    var tree = state.getTree();
    tree.createJsonTree();
    return tree.getJsonTree();
}

/**
 * Resize timeline on window resize
 */
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

