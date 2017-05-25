/**
 * Created by Rodrigo on 25/05/2017.
 */

/** Initial values of panel Height and Width */
var INITIAL_HEIGHT = 150;
var INITIAL_WIDTH = 200;

/** Constant values of icon Height and Width */
var HEIGHT_ICON = 28;
var WIDTH_ICON = 28;

/** Creating the tree with the first node */
var tree = new Tree('painel-1-1');

/**
 * Remove selected panel and his children
 * @example
 * $('selector').on("event", "element", removeWindow);
 * @returns {boolean} //Confirm event triggered, if false do nothing else remove panels
 */
function removeWindow() {
    if (confirm("Deleting this panel will delete all of his children. Are you sure you want to delete this panel?"))
    {
        var panelID = $(this).parents(".panel").attr("id");
        var parent = tree.getParent(panelID, tree.traverseBF).data;
        var removedNode = tree.remove(panelID, parent, tree.traverseBF);

        $("#" + panelID).remove();
        removeLines(panelID);
        removeChildren(removedNode[0].children);
    }

    return false;
}

/**
 * Remove all panel's children
 * @param {string[]} arr The array of children
 */
function removeChildren(arr) {
    var len = arr.length;
    var i = 0;
    var idToRemove = "";

    if (len > 0)
    {
        for (i = 0; i < len; i ++)
        {
            //recursive call to all children
            removeChildren(arr[i].children);
            idToRemove = arr[i].data;
            removeLines(idToRemove);
            $("#"+ idToRemove).remove();
        }
    }
}

/**
 * Remove all lines that connect to selected id
 * @param {string} id ID of line to remove
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
 * Replace a bootsrap panel for a small icon that represents the panel minimized
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
 * Replace a small icon for a bootsrap panel that represents the icon maximized
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

    /** Guarantee that hover effect triggered before, when btn-minimize is clicked, is removed */
    $("#"+ panelID + " .btn-default.btn-minimize").css("background", "#fff");

    icon.remove();

    /** Remove the dotted style of lines */
    d3.selectAll("line").filter(".class-" + panelID).style("stroke-dasharray", "");

    /** Keep the icons with dotted line */
    var activeIcons = $(" .fa-window-maximize");
    for (var i = 0; i < activeIcons.size(); i++)
    {
        var iconID = activeIcons[i].id.replace("icon-", "");
        d3.selectAll("line").filter(".class-" + iconID).style("stroke-dasharray", ("3, 3"));
    }

}

/**
 * Create a new Panel with a new ID and a selected shape
 * @param {string} currentId The panelID that is originating the new panel
 * @param {string} shape The shape only assume two values: "circle" or "rect"
 * @example
 * createNewChild("painel-1-1", "rect") // From "painel-1-1" create a panel child with rect shape
 */
function createNewChild(currentId, shape) {
    var newElem = "";
    var newID = "";

    /** Creating the root */
    if (currentId === null)
    {
        newID = "painel-1-1";
        newElem = $('<div '+ 'id="' + newID + '" class="panel panel-default"> <div class="panel-heading clearfix"> <h4 class="panel-title pull-left" style="padding-top: 7.5px;">' + newID + '</h4> <button disabled class="btn btn-default btn-remove"><i class="glyphicon glyphicon-remove"></i></button> <button class="btn btn-default btn-minimize"><i class="glyphicon glyphicon-minus"></i></button> </div><div class="panel-body center-panel"></div></div>').css({"position": "absolute", "z-index":"90"});

        $(".container").append(newElem);

        /** Configure the panel settings as drag, resize, etc */
        setUpPanel(newID, shape);
    }
    else
    {
        var hashID = $("#" + currentId);

        var top  =  hashID[0].style["top"];
        var left =  hashID[0].style["left"];
        var offset = 40;
        var parentPosition = hashID.position();

        var newLocation = [];

        /** Positions the new panel close to the parent panel */
        newLocation["top"]	= parentPosition.top + offset;
        newLocation["left"]  = parentPosition.left + offset;

        /** Add the node to the tree structure */
        var node = tree.add('painel-', currentId, tree.traverseBF);
        newID = node.data;

        newElem = $('<div '+ 'id="' + newID + '" class="panel panel-default"> <div class="panel-heading clearfix"> <h4 class="panel-title pull-left" style="padding-top: 7.5px;">' + newID + '</h4> <button class="btn btn-default btn-remove"><i class="glyphicon glyphicon-remove"></i></button> <button class="btn btn-default btn-minimize"><i class="glyphicon glyphicon-minus"></i></button> </div><div class="panel-body center-panel"></div></div>').css({"position": "absolute", "top": newLocation["top"], "left": newLocation["left"], "z-index":"90"});

        /** Inserts the panel after the last panel in DOM */
        $('.panel').last().after(newElem);

        /** Configure the panel settings as drag, resize, etc */
        setUpPanel(newID, shape);

        /** Draw the lines between the two panels */
        drawLine(currentId, newID);
    }
}

/**
 * Set up the settings of each panel
 * @param {string} newID The id of the new panel
 * @param {string} shape The shape of the new panel
 */
function setUpPanel(newID, shape) {
    /** Guarantee the right colors of minimize buttons */
    $("#"+ newID + " .btn-default.btn-minimize")
        .mouseenter(function() {
            $(this).css("background", "#e6e6e6");
        })
        .mouseleave(function() {
            $(this).css("background", "#fff");
        });

    /** Getting the workspace SVG */
    var workspace = $("#workspace");

    //noinspection JSUnusedGlobalSymbols
    /** Setting up the panel */
    $( "#" + newID)
        .draggable({
            stack: ".container div",
            handle: ".panel-heading",
            containment: [10,10, workspace.width() - INITIAL_WIDTH - 10 , workspace.height() - INITIAL_HEIGHT - 70],
            drag: function(){
                centerLine(this.id);
            }
        })
        .find(".panel-body")
        .css({
            height: INITIAL_HEIGHT,
            width: INITIAL_WIDTH
        })
        .contextMenu({
            menuSelector: "#contextMenu",
            menuSelected: function (invokedOn, selectedMenu) {
                handleContextMenu(invokedOn, selectedMenu);
            }
        })
        .resizable({
            resize: function(){
                var aPanel = $(this).parents(".panel")[0];
                centerLine(aPanel.id);
            },
            maxHeight: 900,
            maxWidth: 900,
            minHeight: INITIAL_HEIGHT,
            minWidth: INITIAL_WIDTH
        })
        .append(function(){
            createShape($(this), shape);
        });
}

/**
 * The handle of context menu of each panel
 * @param invokedOn The place where right mouse button is clicked
 * @param selectedMenu The option selected in custom context menu
 */
function handleContextMenu(invokedOn, selectedMenu)
{
    /** Get ID of the panel that was click */
    var panelID = invokedOn.parents(".panel")[0].id;

    if(selectedMenu.context.id === "circle-child")
    {
        createNewChild(panelID, "circle");
    }
    else
    if(selectedMenu.context.id === "square-child")
        createNewChild(panelID, "rect");
    else
    if(selectedMenu.context.id === "get-parent")
    {
        var parent = tree.getParent(panelID, tree.traverseBF);
        var msg = parent !== null ? parent.data : "Root doesn't have parent";
        alert(msg);
    }
}

/**
 * Create a icon that simulate a panel minimized
 * @param {string} panelID ID of the panel minimized
 */
function createNewIcon(panelID)
{
    var panelCenter = getCenter(panelID);

    /** Getting the workspace SVG */
    var workspace = $("#workspace");

    $(".container").append(
        '<i id= "icon-' + panelID + '" class="fa fa-window-maximize fa-2x"></i>'
    );

    //noinspection JSUnusedGlobalSymbols
    $("#icon-"+panelID)
        .draggable({
            stack: ".container div",
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

    /** Make all the lines that are connected to a icon dotted */
    d3.selectAll("line").filter(".class-" + panelID).style("stroke-dasharray", ("3, 3"));
}

/**
 * Create a new shape for a panel body
 * @param currentBody Body of panel that will receive the new svg with the new shape
 * @param shape "Circle" or "Rect"
 * @returns {*} The new svg with the shape drawn
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
 * Draw a line between two selected panels
 * @param {string} panelX ID of first panel
 * @param {string} panelY ID of second panel
 * @example
 * drawLine("painel-1-1", "painel-2-1"); // A line will be draw connecting the two centers of panels
 */
function drawLine(panelX, panelY)
{
    var svg = d3.select("#workspace");

    var centerX = getCenter(panelX);
    var centerY = getCenter(panelY);

    var line = svg.append("line")
        .style("stroke", "black")
        .attr("id", panelX + "_"+ panelY) //ex: id = "painel-1-1_painel-2-1"
        .attr("class", "class-" + panelX + " class-" + panelY) //ex: class="painel-1-1 painel-2-1"
        .attr("x1",centerX["x"])
        .attr("y1", centerX["y"])
        .attr("x2", centerY["x"])
        .attr("y2", centerY["y"]);
}

/**
 * Get the center of a panel
 * @param {string} obj The ID of panel
 * @returns {Array} The coordinates of the center point
 * @example
 * var center = getCenter("painel-1-1")
 * console.log(center["x"]); //10
 * console.log(center["y]); // 20
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
 * @param {string} panelID The id of the panel
 * @param {boolean} [icon= false] icon If is "true" means that we are dealing with icon, if is undefined it is a panel
 * @example
 * centerLine("painel-1-1", true) // Icon with panelID = "painel-1-1"
 * centerLine("painel-1-1") // Panel with panelID = "painel-1-1"
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