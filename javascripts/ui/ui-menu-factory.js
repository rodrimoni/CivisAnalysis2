/*
 * UI Menu Factory
 * Factory pattern for creating various UI menus and controls
 */

/**
 * Add configuration menu to panel
 * @param {string} newID - Panel ID
 * @param {string} panelClass - Panel class name
 * @param {boolean} isRightMenu - Whether menu is right-aligned
 */
function addConfigMenu(newID, panelClass, isRightMenu) {
    var rightMenu = isRightMenu ? "dropdown-menu-right " : "";
    $('#' + newID + ' .panel-heading .btn-group')
        .append('<button class="btn btn-default btn-settings-' + panelClass + ' toggle-dropdown" data-toggle="dropdown"><i class="glyphicon glyphicon-menu-hamburger"></i></button> ')
        .append('<ul class="dropdown-menu ' + rightMenu + 'panel-settings"></ul>');
}

/**
 * Add tutorial button to panel
 * @param {string} newID - Panel ID
 * @param {string} panelClass - Panel class
 * @param {number} typeChart - Chart type
 */
function addTutorialButton(newID, panelClass, typeChart) {
    $('#' + newID + ' .panel-heading .btn-group')
        .append('<button class="btn btn-primary btn-tutorial"><i class="glyphicon glyphicon-info-sign"></i></button> ')
        .on('click', function () {
            console.log(panelClass);
        });
}

/**
 * Add clustering menu with slider
 * @param {string} newID - Panel ID
 */
function addClusteringMenu(newID) {
    $("#" + newID + " .panel-settings")
        .append('<li role="presentation" class="dropdown-header"><span class="trn">Grouping deputies</span></li>')
        .append('<li> <span class = "trn">Number of groups</span>:<br><input id= "slider-' + newID + '" type="text" data-slider-min="0" data-slider-max="20" data-slider-step="1" data-slider-value="10"/></li>')
}

/**
 * Add search roll call menu
 * @param {string} newID - Panel ID
 * @param {Array} rollCalls - Roll calls data
 * @returns {Object} Bloodhound search instance
 */
function addSearchRollCallMenu(newID, rollCalls) {
    var placeholder = language === ENGLISH ? "Type a Roll Call Identifier" : "Digite o identificador de uma votação"
    $("#" + newID + " .panel-settings")
        .append('<li role="presentation" class="dropdown-header"><span class="trn">Select one Roll Call</span></li>')
        .append('<li><input type="text" ' +
            'class="form-control typeahead searchRollCall" ' +
            'placeholder="' + placeholder + ' (e.g. PL 1234/2001)"/> </li>');

    rollCalls = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('rollCallName'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: rollCalls
    });

    var elt = $('#' + newID + ' .searchRollCall');

    elt.typeahead({
        hint: false,
        highlight: true,
        minLength: 1
    },
        {
            name: 'rollCalls',
            source: rollCalls.ttAdapter(),
            displayKey: 'rollCallName',
            templates: {
                suggestion: function (data) {
                    return '<div><strong>' + data.rollCallName + '</strong> – Voted in: ' + data.datetime.toLocaleString() + '</div>';
                }
            }
        });

    var chart;
    elt.bind('typeahead:select', function (ev, suggestion) {
        console.log('Selection: ' + suggestion.rollCallID);
        var tree = state.getTree();
        chart = tree.getNode(newID, tree.traverseBF).chart;
        chart.selectRollCallBySearch(suggestion.rollCallID);
    });

    var eltInput = $('#' + newID + ' .searchRollCall.tt-input');
    eltInput.on('keyup', function () {
        if ($(this).val() === "") {
            var tree = state.getTree();
            chart = tree.getNode(newID, tree.traverseBF).chart;
            chart.selectAllRollCalls();
        }
    });

    return rollCalls;
}

/**
 * Standard "filter" tagsinput: the full option list is shown on focus
 * (minLength 0, no practical cap) and selections become multi-select tags.
 * The caller owns the DOM <input> and the apply wiring (itemAdded/itemRemoved
 * handlers or a reload button); this only sets up the shared typeahead engine.
 * @param {Object} elt - jQuery <input> element to turn into a tagsinput
 * @param {Array<string>} optionValues - option labels (already localized)
 * @param {string} datasetName - typeahead dataset name
 * @returns {Object} the same jQuery element, for chaining
 */
function setupFilterTagsinput(elt, optionValues, datasetName) {
    var options = optionValues.slice().sort();
    var engine = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: d3.entries(options),
        identify: function (obj) { return obj.value; }
    });
    engine.initialize();
    elt.tagsinput({
        itemValue: 'key',
        itemText: 'value',
        typeaheadjs: [{
            hint: false,
            highlight: true,
            minLength: 0
        },
        {
            name: datasetName,
            displayKey: 'value',
            limit: 100,
            source: function (q, sync) {
                if (q === '') sync(engine.get(options));
                else engine.search(q, sync);
            }
        }]
    });
    return elt;
}

/**
 * Add filter motion type menu
 * @param {string} newID - Panel ID
 * @param {Array} rollCalls - Roll calls data
 */
function addFilterMotionTypeMenu(newID, rollCalls) {
    var placeholder = language === ENGLISH ? "Type motion type to filter" : "Digite tipos de votações para filtrar"
    $("#" + newID + " .panel-settings")
        .append('<li role="presentation" class="dropdown-header"><span class="trn">Select motion types</span></li>')
        .append('<li><input type="text" ' +
            'class="form-control typeahead filterMotions" ' +
            'placeholder="' + placeholder + ' (e.g. PL, PEC, etc.)"/> </li>');

    var rollCallsTypes = d3.map(rollCalls, function (d) { return d.type; }).keys();
    var elt = $('#' + newID + ' .filterMotions');
    setupFilterTagsinput(elt, rollCallsTypes, 'rollCallsTypes');

    var chart;
    elt.on('itemAdded', function (event) {
        var tree = state.getTree();
        chart = tree.getNode(newID, tree.traverseBF).chart;
        chart.selectRollCallsByFilter(newID);
    });

    elt.on('itemRemoved', function (event) {
        var tree = state.getTree();
        chart = tree.getNode(newID, tree.traverseBF).chart;
        chart.selectRollCallsByFilter(newID);
    });

    $("#" + newID + " .bootstrap-tagsinput").click(function (e) {
        e.stopPropagation();
    });
}

/**
 * Add a motion-type filter to a panel whose chart exposes setMotionTypeFilter.
 * Tagsinput + typeahead pattern that routes the selection to
 * chart.setMotionTypeFilter so the whole panel recalculates. Empty selection =
 * all types. Options are derived from the period's roll calls. Shared by the
 * Party Metrics and Cohesion Comparison panels (distinguished by datasetName).
 * @param {string} newID - Panel ID
 * @param {Array} rollCalls - Roll calls data for the period
 * @param {string} datasetName - Unique typeahead dataset name for this panel
 */
function addFilterMotionTypeChart(newID, rollCalls, datasetName) {
    var placeholder = language === ENGLISH ? "Type motion type to filter" : "Digite tipos de votações para filtrar";
    $("#" + newID + " .panel-settings")
        .append('<li role="presentation" class="dropdown-header"><span class="trn">Select motion types</span></li>')
        .append('<li><input type="text" ' +
            'class="form-control typeahead filterMotions" ' +
            'placeholder="' + placeholder + ' (e.g. PL, PEC, etc.)"/> </li>');

    var rollCallsTypes = d3.map(rollCalls, function (d) { return d.type; }).keys();
    var elt = $('#' + newID + ' .filterMotions');
    setupFilterTagsinput(elt, rollCallsTypes, datasetName);

    function applyTypeFilter() {
        var tree = state.getTree();
        var chart = tree.getNode(newID, tree.traverseBF).chart;
        var types = elt.tagsinput('items').map(function (item) { return item.value; });
        chart.setMotionTypeFilter(types);
    }

    elt.on('itemAdded', applyTypeFilter);
    elt.on('itemRemoved', applyTypeFilter);

    $("#" + newID + " .bootstrap-tagsinput").click(function (e) {
        e.stopPropagation();
    });
}

/**
 * Add date picker for timeline
 */
function addDatePickerTimeline() {
    $("#panel-1-1 .panel-settings")
        .append('<li role="presentation" class="dropdown-header"><span class="trn">Select the initial and final date</span></li>')
        .append('<li> <div class="input-daterange input-group" id="timeline-datepicker">' +
            '<input type="text" class="input-sm form-control" placeholder="mm/dd/yyyy" name="start" />' +
            '<span class="input-group-addon">to</span>' +
            '<input type="text" class="input-sm form-control" placeholder="mm/dd/yyyy" name="end" />' +
            '</div> </li>');

    var startDate = new Date(1991, 0, 1);
    var endDate = new Date();
    var elt = '#panel-1-1 .input-daterange';
    var chart;

    $(elt + ' input').keydown(function (event) {
        return false;
    });

    var datetimeLocal = language === ENGLISH ? 'en' : 'pt-BR'

    $(elt).datepicker({
        autoclose: true,
        keyboardNavigation: false,
        keepEmptyValues: true,
        orientation: "bottom",
        startDate: startDate,
        endDate: endDate,
        language: datetimeLocal
    });

    endDate.setHours(0, 0, 0, 0);
    const currentBeginningOfYear = new Date(endDate.getFullYear(), 0, 1);

    $(elt + ' input[name="start"]').datepicker('setDate', currentBeginningOfYear);
    $(elt + ' input[name="end"]').datepicker('setDate', endDate);

    $(elt).on('changeDate', function (e) {
        var initialDate = $(elt + ' input[name="start"]').datepicker('getDate');
        var endDate = $(elt + ' input[name="end"]').datepicker('getDate');
        const period = [initialDate, endDate];

        var tree = state.getTree();
        chart = tree.getNode("panel-1-1", tree.traverseBF).chart;
        chart.selectPeriodByDatePicker(period)
    });
}

/**
 * Add filter date for roll call menu
 * @param {string} newID - Panel ID
 * @param {Array} rollCalls - Roll calls data
 */
function addFilterDateRollCallMenu(newID, rollCalls) {
    $("#" + newID + " .panel-settings")
        .append('<li role="presentation" class="dropdown-header"><span class="trn">Select the initial and final date</span></li>')
        .append('<li> <div class="input-daterange input-group" id="datepicker">' +
            '<input type="text" class="input-sm form-control" placeholder="mm/dd/yyyy" name="start" />' +
            '<span class="input-group-addon">to</span>' +
            '<input type="text" class="input-sm form-control" placeholder="mm/dd/yyyy" name="end" />' +
            '</div> </li>');

    var dateExtents = d3.extent(rollCalls, function (d) { return d.datetime });
    var startDate = dateExtents[0];
    var endDate = dateExtents[1];
    var elt = '#' + newID + ' .input-daterange';
    var chart;

    $(elt + ' input').keydown(function (event) {
        return false;
    });

    var datetimeLocal = language === ENGLISH ? 'en' : 'pt-BR'

    $(elt).datepicker({
        autoclose: true,
        keyboardNavigation: false,
        keepEmptyValues: true,
        orientation: "bottom",
        startDate: startDate,
        endDate: endDate,
        language: datetimeLocal
    });

    endDate.setHours(0, 0, 0, 0);
    $(elt + ' input[name="start"]').datepicker('setDate', startDate);
    $(elt + ' input[name="end"]').datepicker('setDate', endDate);

    $(elt).on('changeDate', function (e) {
        var tree = state.getTree();
        chart = tree.getNode(newID, tree.traverseBF).chart;
        chart.selectRollCallsByFilter(newID);
    });
}

/**
 * Get active filters from panel
 * @param {string} panelID - Panel ID
 * @returns {Object} Filter object
 */
function getFilters(panelID) {
    var filter = {};
    var dateElt = '#' + panelID + ' .input-daterange';
    var motionTypeElt = $('#' + panelID + ' .filterMotions');
    var motionThemeElt = $('#' + panelID + ' .filterSubjectMotions');

    var dateFilter = [];
    var initialDate = $(dateElt + ' input[name="start"]').datepicker('getDate');
    var endDate = $(dateElt + ' input[name="end"]').datepicker('getDate');

    dateFilter.push(initialDate);
    dateFilter.push(endDate);

    var motionTypeFilter = motionTypeElt.tagsinput('items');
    motionTypeFilter = motionTypeFilter.map(function (e) {
        return e.value;
    });

    var motionThemeFilter = motionThemeElt.tagsinput('items');
    motionThemeFilter = motionThemeFilter.map(function (e) {
        return e.value;
    });

    filter.dateFilter = dateFilter;
    filter.motionTypeFilter = motionTypeFilter;
    filter.motionThemeFilter = motionThemeFilter;

    return filter;
}

/**
 * Add party size filter
 * @param {string} newID - Panel ID
 * @param {Object} chart - Chart instance
 */
function addPartySizeFilter(newID, chart) {
    var placeholder = language === ENGLISH ? "Type a threshold..." : "Digite um limite..."
    $("#" + newID + " .panel-settings")
        .append('<li role="presentation" class="dropdown-header"><span class="trn">Threshold</span></li>')
        .append('<li><input type="text" class="form-control filterParties" placeholder="' + placeholder + '"/> </li>');

    $("#" + newID + " .filterParties").on('keypress', function (e) {
        if (e.which == 13) {
            if (!$(this).val())
                chart.setHasTreshold(false);
            else {
                chart.setHasTreshold(true);
                chart.setThreshold($(this).val());
            }
            updateVisualizations();
        }
    });
}

/**
 * Add edit title input
 * @param {string} newID - Panel ID
 */
function addEditTitleInput(newID) {
    var tree = state.getTree();
    var node = tree.getNode(newID, tree.traverseBF);
    var originalTitle = node.title;
    var newTitle = "";

    $("#" + newID + " .panel-settings")
        .append('<li role="presentation" class="dropdown-header"><span class="trn">Edit Panel Title</span></li>')
        .append('<li><label class="radio-inline"><input id = "radio-' + newID + '-default" type="radio" name="' + newID + '-titleType" value = "default" checked>Default</label> <label class="radio-inline"><input id = "radio-' + newID + '-custom" type="radio" name="' + newID + '-titleType" value = "custom">Custom</label></li>')
        .append('<li><input type="text" class="form-control newTitle" value ="' + originalTitle + '" disabled></li>');

    $('#' + newID + ' input[type=radio][name=' + newID + '-titleType]').change(function () {
        if (this.value == 'default') {
            if ($("#" + newID + " .custom-title").length >= 1) {
                $("#" + newID + " .panel-title span").eq(2).removeClass('panel-subtitle');
                $("#" + newID + " .custom-title").remove();

                if ($("#" + newID + " .panel-subtitle").length >= 1)
                    $("#" + newID + " .panel-title span.title-icon").css("top", "15px");
                else
                    $("#" + newID + " .panel-title span.title-icon").css("top", "5px");
            }

            $("#" + newID + " .panel-settings .newTitle").prop('disabled', true);
            $("#" + newID + " .newTitle").val(originalTitle);
            node.title = originalTitle;
            updateSideBar();
        }
        else if (this.value == 'custom') {
            $("#" + newID + " .panel-settings .newTitle").prop('disabled', false);
        }
    });

    $("#" + newID + " .newTitle").on('keypress', function (e) {
        if (e.which == 13) {
            if ($(this).val()) {
                newTitle = $(this).val();
                insertCustomTitle(newID, newTitle);
                node.title = newTitle;
            }
            updateSideBar();
        }
    });
}

/**
 * Insert custom title into panel
 * @param {string} newID - Panel ID
 * @param {string} newTitle - New title text
 */
function insertCustomTitle(newID, newTitle) {
    if ($("#" + newID + " .custom-title").length >= 1)
        $("#" + newID + " .custom-title").remove();

    $("<span class='custom-title'>" + newTitle + "<br></span>").insertAfter("#" + newID + " .panel-title span.icon");
    $("#" + newID + " .panel-title span").eq(2).addClass('panel-subtitle');

    if ($("#" + newID + " .panel-subtitle").length >= 2)
        $("#" + newID + " .panel-title span.title-icon").css("top", "25px");
    else
        $("#" + newID + " .panel-title span.title-icon").css("top", "15px");
}

/**
 * Add search deputy menu
 * @param {string} newID - Panel ID
 * @param {Array} deputies - Deputies data
 */
function addSearchDeputyMenu(newID, deputies) {
    var placeholder = language === ENGLISH ? "Type a deputy name..." : "Digite o nome de um deputado..."
    $("#" + newID + " .panel-settings")
        .append('<li role="presentation" class="dropdown-header"><span class="trn">Select Deputies</span></li>')
        .append('<li><input type="text" class="form-control typeahead searchDeputies" placeholder="' + placeholder + '"/> </li>');

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
        tagClass: function (item) {
            return 'label label-info label-' + item.party;
        },
        typeaheadjs: [
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
                    suggestion: function (data) {
                        return '<p>' + data.name + ' (' + data.party + '-' + data.district + ')</p>';
                    }
                }
            }
        ]
    });

    var chart;
    elt.on('itemAdded', function (event) {
        var party = event.item.party;
        $(".tag.label.label-info.label-" + party).css({ "background-color": CONGRESS_DEFINE.getPartyColor(party) });

        var deputies = $(this).tagsinput('items');
        var tree = state.getTree();
        chart = tree.getNode(newID, tree.traverseBF).chart;
        chart.selectDeputiesBySearch(deputies);
    });

    elt.on('itemRemoved', function (event) {
        var deputies = $(this).tagsinput('items');

        if (!Array.isArray(deputies) || !deputies.length)
            resetSelection();
        else {
            var tree = state.getTree();
            chart = tree.getNode(newID, tree.traverseBF).chart;
            chart.selectDeputiesBySearch(deputies);
        }
    });

    $("#" + newID + " .bootstrap-tagsinput").click(function (e) {
        e.stopPropagation();
    });
}

/**
 * Add theme filter menu
 * @param {string} newID - Panel ID
 * @param {Array} rollCalls - Roll calls data
 */
function addThemeFilter(newID, rollCalls) {
    var placeholder = language === ENGLISH
        ? "Type motion subject to filter (e.g. Health, Education, Economy, etc)"
        : "Digite temas de votações para filtrar (e.g. Saúde, Educação, Economia, etc)"

    $("#" + newID + " .panel-settings")
        .append('<li role="presentation" class="dropdown-header"><span class="trn">Select Subjects</span></li>')
        .append('<li><input type="text" ' +
            'class="form-control typeahead filterSubjectMotions" ' +
            'placeholder="' + placeholder + '"/> </li>');

    var rollCallsThemes = d3.map(rollCalls, function (d) {
        return language === ENGLISH ? subjectsToEnglish[d.theme] : d.theme
    }).keys();
    var elt = $('#' + newID + ' .filterSubjectMotions');
    setupFilterTagsinput(elt, rollCallsThemes, 'rollCallsThemes');

    var chart;
    elt.on('itemAdded', function (event) {
        var tree = state.getTree();
        chart = tree.getNode(newID, tree.traverseBF).chart;
        chart.selectRollCallsByFilter(newID);
    });

    elt.on('itemRemoved', function (event) {
        var tree = state.getTree();
        chart = tree.getNode(newID, tree.traverseBF).chart;
        chart.selectRollCallsByFilter(newID);
    });

    $("#" + newID + " .bootstrap-tagsinput").click(function (e) {
        e.stopPropagation();
    });
}

/**
 * Add subject + motion-type filters for the scatter plot.
 * Both reuse the standard tagsinput + typeahead pattern and feed the shared
 * Reload button, applied as an intersection (subject AND type). Empty = no
 * filter. Options are derived from the period's roll calls; the full list is
 * shown on focus (minLength 0, no result cap).
 * @param {string} newID - Panel ID
 * @param {Array} rollCalls - Roll calls data for the period
 */
function addScatterPlotFilters(newID, rollCalls) {
    var subjectPlaceholder = language === ENGLISH
        ? "Type subject to select (e.g. Health, Education, etc)"
        : "Digite temas de votações para filtrar (e.g. Saúde, Educação, Economia, etc)";
    var typePlaceholder = language === ENGLISH
        ? "Type motion type to filter"
        : "Digite tipos de votações para filtrar";

    const popoverContent = 'Reload scatterplot with subjects and types';

    $("#" + newID + " .panel-settings")
        .append('<li role="presentation" class="dropdown-header"><span class="trn">Select Subjects</span></li>')
        .append('<li><input type="text" class="form-control typeahead filterSubjectMotions" placeholder="' + subjectPlaceholder + '"/></li>')
        .append('<li role="presentation" class="dropdown-header"><span class="trn">Select motion types</span></li>')
        .append('<li><div class="row" style="width: 100%; margin: 0;">' +
            '<div class="col-xs-11" style="padding-left: 0;"><input type="text" class="form-control typeahead filterMotions" placeholder="' + typePlaceholder + ' (e.g. PL, PEC, etc.)"/></div>' +
            '<div class="col-xs-1" style="padding-left: 0;">' +
            '<button class="btn btn-primary reloadScatter" style="padding:12px; display: flex; align-items: center; justify-content: center;" ' +
            'data-container="body" data-content="' + popoverContent + '" data-html="true" rel="popover" ' +
            'data-placement="top" data-trigger="hover" data-viewport="body">' +
            '<i class="fa fa-rotate-right"></i></button></div>' +
            '</div></li>');

    $('#' + newID + ' .reloadScatter').popover();

    // --- Subjects typeahead (full option list shown on focus) ---
    var rollCallsThemes = d3.map(rollCalls, function (d) {
        return language === ENGLISH ? subjectsToEnglish[d.theme] : d.theme;
    }).keys();
    var themeElt = $('#' + newID + ' .filterSubjectMotions');
    setupFilterTagsinput(themeElt, rollCallsThemes, 'rollCallsThemes');

    // --- Motion types typeahead (full option list shown on focus) ---
    var rollCallsTypes = d3.map(rollCalls, function (d) { return d.type; }).keys();
    var typeElt = $('#' + newID + ' .filterMotions');
    setupFilterTagsinput(typeElt, rollCallsTypes, 'rollCallsTypes');

    $("#" + newID + " .bootstrap-tagsinput").click(function (e) {
        e.stopPropagation();
    });

    $('#' + newID + ' .reloadScatter').click(function () {
        var tree = state.getTree();
        const { filteredData, dimensionalReductionTechnique } = tree.getNode(newID, tree.traverseBF).args;
        const subjects = themeElt.tagsinput('items').map(item => item.value);
        const types = typeElt.tagsinput('items').map(item => item.value);
        reloadScatterPlotData(filteredData, dimensionalReductionTechnique, newID, subjects, types);
    });
}

/**
 * Initialize slider for K-means clustering
 * @param {string} id - Panel ID
 * @param {Object} chart - Chart instance
 */
function initializeSlider(id, chart) {
    var data = [];
    var k = 0;
    var slider = '#slider-' + id;

    $(slider).bootstrapSlider();
    $("#" + id + " .tooltip-main").css({ 'margin-left': '-45px' });
    $("#" + id + " .slider").addClass('slider-k-means');

    $(slider).on("slideStop", function (slideEvt) {
        var panel = $(this).parents(".panel");
        var panelID = panel.attr("id");
        var tree = state.getTree();
        var node = tree.getNode(panelID, tree.traverseBF);

        if (node.children.length > 0)
            removeWindow(panelID, false);

        k = slideEvt.value;
        data = d3.select('#' + id + ' .deputiesNodesDots')
            .selectAll("circle")
            .data();

        console.log(data);

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