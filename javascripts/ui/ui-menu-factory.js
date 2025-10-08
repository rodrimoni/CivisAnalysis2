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
    var defaultOptions = rollCallsTypes.sort();
    rollCallsTypes = d3.entries(rollCallsTypes);

    var rollCallsTypes = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: rollCallsTypes,
        identify: function (obj) { return obj.value; }
    });

    rollCallsTypes.initialize();

    function values(q, sync) {
        if (q === '') {
            sync(rollCallsTypes.get(defaultOptions));
        }
        else {
            rollCallsTypes.search(q, sync);
        }
    }

    var elt = $('#' + newID + ' .filterMotions');
    elt.tagsinput({
        itemValue: 'key',
        itemText: 'value',
        typeaheadjs: [{
            hint: false,
            highlight: true,
            minLength: 0
        },
        {
            name: 'rollCallsTypes',
            displayKey: 'value',
            limit: 10,
            source: values
        }]
    });

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
    var defaultOptions = rollCallsThemes.sort();
    rollCallsThemes = d3.entries(rollCallsThemes);

    var rollCallsThemes = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: rollCallsThemes,
        identify: function (obj) { return obj.value; }
    });

    rollCallsThemes.initialize();

    function values(q, sync) {
        if (q === '') {
            sync(rollCallsThemes.get(defaultOptions));
        }
        else {
            rollCallsThemes.search(q, sync);
        }
    }

    var elt = $('#' + newID + ' .filterSubjectMotions');
    elt.tagsinput({
        itemValue: 'key',
        itemText: 'value',
        typeaheadjs: [{
            hint: false,
            highlight: true,
        },
        {
            name: 'rollCallsThemes',
            displayKey: 'value',
            limit: 10,
            source: values
        }]
    });

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
 * Add theme search for scatter plot
 * @param {string} newID - Panel ID
 * @param {Array} rollCalls - Roll calls data
 */
function addThemeSearchScatterPlot(newID, rollCalls) {
    var placeholder = language === ENGLISH
        ? "Type subject to select (e.g. Health, Education, etc)"
        : "Digite temas de votações para filtrar (e.g. Saúde, Educação, Economia, etc)"

    const popoverContent = 'Reload scatterplot with subjects';

    $("#" + newID + " .panel-settings")
        .append('<li role="presentation" class="dropdown-header"><span class="trn">Select Subjects</span></li>')
        .append('<li><div class="row" style="width: 100%;">' +
            '<div class="col-xs-11"><input type="text" class="form-control typeahead filterSubjectMotions" placeholder="' + placeholder + '"/></div>' +
            '<div class="col-xs-1" style="padding-left: 0;">' +
            '<button class="btn btn-primary reloadScatter" style="padding:12px; display: flex; align-items: center; justify-content: center;" ' +
            'data-container="body" data-content="' + popoverContent + '" data-html="true" rel="popover" ' +
            'data-placement="top" data-trigger="hover" data-viewport="body">' +
            '<i class="fa fa-rotate-right"></i></button></div>' +
            '</div></li>');

    $('#' + newID + ' .reloadScatter').popover();

    var rollCallsThemes = d3.map(rollCalls, function (d) {
        return language === ENGLISH ? subjectsToEnglish[d.theme] : d.theme
    }).keys();
    var defaultOptions = rollCallsThemes.sort();
    rollCallsThemes = d3.entries(rollCallsThemes);

    var rollCallsThemes = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: rollCallsThemes,
        identify: function (obj) { return obj.value; }
    });

    rollCallsThemes.initialize();

    function values(q, sync) {
        if (q === '') {
            sync(rollCallsThemes.get(defaultOptions));
        }
        else {
            rollCallsThemes.search(q, sync);
        }
    }

    var elt = $('#' + newID + ' .filterSubjectMotions');
    elt.tagsinput({
        itemValue: 'key',
        itemText: 'value',
        typeaheadjs: [{
            hint: false,
            highlight: true,
        },
        {
            name: 'rollCallsThemes',
            displayKey: 'value',
            limit: 10,
            source: values
        }]
    });

    $("#" + newID + " .bootstrap-tagsinput").click(function (e) {
        e.stopPropagation();
    });

    $('#' + newID + ' .reloadScatter').click(function () {
        var tree = state.getTree();
        const { filteredData, dimensionalReductionTechnique } = tree.getNode(newID, tree.traverseBF).args;
        const subjects = elt.tagsinput('items').map(item => item.value);
        reloadScatterPlotData(filteredData, dimensionalReductionTechnique, newID, subjects);
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

/**
 * Add party convex hull selection menu
 * @param {string} newID - Panel ID
 * @param {Array} parties - Parties data
 */
function addPartyConvexHullSelection(newID, parties) {
    var placeholder = language === ENGLISH
        ? "Type party names to show (e.g. PT, PSDB, MDB, etc)"
        : "Digite nomes de partidos para exibir (e.g. PT, PSDB, MDB, etc)"

    $("#" + newID + " .panel-settings")
        .append('<li role="presentation" class="dropdown-header"><span class="trn">Select Parties to show its "territories"</span></li>')
        .append('<li><input type="text" ' +
            'class="form-control typeahead filterPartyConvexHull" ' +
            'placeholder="' + placeholder + '"/> </li>');

    var partyList = d3.map(parties, function (d) {
        return d;
    }).keys();
    var defaultOptions = partyList.sort();
    partyList = d3.entries(partyList);

    var partyList = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: partyList,
        identify: function (obj) { return obj.value; }
    });

    partyList.initialize();

    function values(q, sync) {
        if (q === '') {
            sync(partyList.get(defaultOptions));
        }
        else {
            partyList.search(q, sync);
        }
    }

    var elt = $('#' + newID + ' .filterPartyConvexHull');
    elt.tagsinput({
        itemValue: 'key',
        itemText: 'value',
        tagClass: function (item) {
            return 'label label-info label-' + item.value;
        },
        typeaheadjs: [{
            hint: false,
            highlight: true,
        },
        {
            name: 'partyList',
            displayKey: 'value',
            limit: 10,
            source: values
        }]
    });

    var chart;
    elt.on('itemAdded', function (event) {
        var party = event.item.value;

        $(".tag.label.label-info.label-" + party).css({ "background-color": CONGRESS_DEFINE.getPartyColor(party) });

        const partiesTags = $(this).tagsinput('items');
        const selectedParties = partiesTags.map(item => item.value);

        var tree = state.getTree();
        chart = tree.getNode(newID, tree.traverseBF).chart;
        chart.showConvexHullOfParties(selectedParties);

    });

    elt.on('itemRemoved', function (event) {
        const partiesTags = $(this).tagsinput('items');
        const selectedParties = partiesTags.map(item => item.value);

        var tree = state.getTree();
        chart = tree.getNode(newID, tree.traverseBF).chart;

        if (!Array.isArray(selectedParties) || !selectedParties.length) {
            chart.hideConvexHulls();
        }
        else {
            chart.showConvexHullOfParties(selectedParties);
        }
    });

    $("#" + newID + " .bootstrap-tagsinput").click(function (e) {
        e.stopPropagation();
    });
}