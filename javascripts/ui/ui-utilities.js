/*
 * UI Utilities Module
 * Helper functions for UI operations and drawing
 */

/**
 * Draw a line between two panels
 * @param {string} panelX - First panel ID
 * @param {string} panelY - Second panel ID
 */
function drawLine(panelX, panelY) {
    var svg = d3.select("#workspace");

    var centerX = getCenter(panelX);
    var centerY = getCenter(panelY);

    var line = svg.append("line")
        .style("stroke", "black")
        .attr("id", panelX + "_" + panelY)
        .attr("class", "class-" + panelX + " class-" + panelY)
        .attr("x1", centerX["x"])
        .attr("y1", centerX["y"])
        .attr("x2", centerY["x"])
        .attr("y2", centerY["y"]);
}

/**
 * Get the center point of a panel
 * @param {string} obj - Panel ID
 * @returns {Object} Center coordinates {x, y}
 */
function getCenter(obj) {
    var $this = $("#" + obj);
    var offset = $this.offset();
    var width = $this.width()
    var height = $this.height();
    var getSvg = $('#workspace');
    var centerX = offset.left + width / 2 - getSvg.offset().left + 15;
    var centerY = offset.top + height / 2 - getSvg.offset().top + 15;
    var arr = [];
    arr["x"] = centerX;
    arr["y"] = centerY;
    return arr;
}

/**
 * Center lines connected to a panel when it moves
 * @param {string} panelID - Panel ID
 * @param {boolean} icon - Whether dealing with an icon (default: false)
 */
function centerLine(panelID, icon) {
    if (typeof icon === 'undefined') { icon = false; }
    var lines = d3.selectAll("line").filter(".class-" + panelID);
    var sizeLines = lines.size();

    for (var i = 0; i < sizeLines; i++) {
        var aLine = $("#" + lines[0][i].id);
        var lineID = lines[0][i].id.split("_");
        if (lineID[0] === panelID) {
            if (!icon) {
                aLine.attr("x1", getCenter(lineID[0])["x"]);
                aLine.attr("y1", getCenter(lineID[0])["y"]);
            }
            else {
                aLine.attr("x1", parseInt(getCenter("icon-" + lineID[0])["x"]));
                aLine.attr("y1", parseInt(getCenter("icon-" + lineID[0])["y"]));
            }
        }
        else {
            if (!icon) {
                aLine.attr("x2", getCenter(lineID[1])["x"]);
                aLine.attr("y2", getCenter(lineID[1])["y"]);
            }
            else {
                aLine.attr("x2", parseInt(getCenter("icon-" + lineID[1])["x"]));
                aLine.attr("y2", parseInt(getCenter("icon-" + lineID[1])["y"]));
            }
        }
    }
}

/**
 * Get containment array for draggable elements
 * @param {number} elementWidth - Width of element
 * @param {number} elementHeight - Height of element
 * @param {boolean} isSideBarActive - Whether sidebar is active
 * @returns {Array} Containment array [x1, y1, x2, y2]
 */
function getContainmentArray(elementWidth, elementHeight, isSideBarActive) {
    var sideBarOffSet = isSideBarActive ? SIDEBAR_OFFSET : 0;
    var containmentArr = [];
    var workspace = $("#workspace");
    var containerOffset = $('.container').offset();
    var offsetWidth = workspace.width() - elementWidth - 10;
    var offsetHeight = workspace.height() - elementHeight - 10;
    containmentArr = [
        10 + sideBarOffSet,
        containerOffset.top,
        offsetWidth + sideBarOffSet,
        offsetHeight + containerOffset.top
    ];
    return containmentArr;
}

/**
 * Get chart icon class based on chart type
 * @param {number} typeChart - Chart type constant
 * @returns {string} Icon class name
 */
function getChartIcon(typeChart) {
    var icon = "custom-icon ";
    if (typeChart === TIME_LINE)
        icon += "icon-time-line";
    else if (typeChart === SCATTER_PLOT)
        icon += "icon-scatter-plot";
    else if (typeChart === CHAMBER_INFOGRAPHIC)
        icon += "icon-chamber-infographic";
    else if (typeChart === DEPUTIES_SIMILARITY_FORCE)
        icon += "icon-network-graph";
    else if (typeChart === ROLLCALLS_HEATMAP)
        icon += "icon-map-roll-calls";
    else if (typeChart === STATIC_ROLLCALLS_HEATMAP)
        icon += "icon-map-roll-calls";
    else if (typeChart === TIME_LINE_CROP)
        icon += "icon-cropped-time-line";
    else if (typeChart === BAR_CHART)
        icon += "icon-bar-chart";
    else if (typeChart === FORCE_LAYOUT)
        icon += "icon-force-layout";
    else if (typeChart === THEMES_BUBBLE_CHART)
        icon += "icon-bubble-chart";
    else if (typeChart === SMALL_MULTIPLES_CHART)
        icon += "icon-line-chart";

    return icon;
}

/**
 * Get chart icon title HTML
 * @param {number} typeChart - Chart type constant
 * @returns {string} HTML for icon title
 */
function getChartIconTitle(typeChart) {
    return '<span class="icon node-icon ' + getChartIcon(typeChart) + ' title-icon"></span>';
}

/**
 * Hide tooltip for cluster
 */
function hideToolTipCluster() {
    d3.select('.toolTipCluster').style("display", "none");
}

