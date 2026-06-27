/**
 * Shared Group Editor overlay.
 * A parties/deputies tab picker rendered as an SVG foreignObject overlay inside a
 * chart's main <g>. Builds a group of parties and/or individual deputies and
 * hands the editor state to opts.onSave. Used by Cohesion Comparison and
 * Cohesion by Theme.
 *
 * Dependencies: D3 v3, congress-definitions.js (party colors)
 *
 * @param {Object} opts
 * @param {Object}   opts.svg          - d3 selection of the chart's main <g>
 * @param {Object}   opts.layout       - { width, margin:{top,left}, outerWidth, outerHeight }
 * @param {Array}    opts.deputies     - [{ party, deputyID, name }]
 * @param {string}   opts.title        - editor heading text
 * @param {string}   opts.confirmLabel - confirm button text
 * @param {string}   opts.initialColor - initial group color (hex)
 * @param {Function} opts.onSave       - (editorState) => void
 * @param {Function} [opts.nextColor]  - () => hex; color used when the selection is not a single party
 */
function openGroupEditor(opts) {
    var svg = opts.svg;
    var width = opts.layout.width;
    var margin = opts.layout.margin;
    var outerWidth = opts.layout.outerWidth;
    var outerHeight = opts.layout.outerHeight;
    var deputies = opts.deputies || [];

    function enableInputEvents(inputSelection) {
        inputSelection
            .on("keydown", function () { d3.event.stopPropagation(); })
            .on("keyup", function () { d3.event.stopPropagation(); })
            .on("keypress", function () { d3.event.stopPropagation(); })
            .on("focus", function () { d3.event.stopPropagation(); })
            .on("mousedown", function () { d3.event.stopPropagation(); });
    }

    function autoColor(editorState) {
        if (editorState.selectedParties.length === 1 && editorState.selectedDeputies.length === 0) {
            var c = CONGRESS_DEFINE.getPartyColor(editorState.selectedParties[0]);
            if (c) return c;
        }
        return opts.nextColor ? opts.nextColor() : editorState.color;
    }

    function closeGroupEditor() {
        svg.selectAll(".group-editor-overlay").remove();
        svg.selectAll(".group-editor-backdrop").remove();
    }

    function buildEditorContent(container, editorState) {
        container.html('');
        editorState.mainContainer = container;
        var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);

        // Title
        container.append("xhtml:div")
            .style("font-size", "16px")
            .style("font-weight", "700")
            .style("color", "#1e293b")
            .style("margin-bottom", "12px")
            .text(opts.title);

        // Name input
        var nameRow = container.append("xhtml:div").style("margin-bottom", "12px");

        nameRow.append("xhtml:label")
            .style("display", "block").style("font-size", "11px").style("font-weight", "600")
            .style("color", "#64748b").style("margin-bottom", "4px")
            .text(isEnglish ? "Group Name:" : "Nome do Grupo:");

        var nameInputRow = nameRow.append("xhtml:div")
            .style("display", "flex").style("gap", "8px").style("align-items", "center");

        var nameInput = nameInputRow.append("xhtml:input")
            .attr("type", "text")
            .attr("placeholder", isEnglish ? "e.g. Government Base" : "ex. Base do Governo")
            .attr("value", editorState.name)
            .style("flex", "1").style("padding", "6px 10px")
            .style("border", "1px solid #d1d5db").style("border-radius", "6px")
            .style("font-size", "13px").style("outline", "none").style("box-sizing", "border-box");

        enableInputEvents(nameInput);
        nameInput.on("input", function () { editorState.name = this.value; });

        var colorInput = nameInputRow.append("xhtml:input")
            .attr("type", "color").attr("value", editorState.color)
            .attr("title", isEnglish ? "Group color" : "Cor do grupo")
            .style("width", "32px").style("height", "32px").style("padding", "0")
            .style("border", "1px solid #d1d5db").style("border-radius", "6px")
            .style("cursor", "pointer").style("flex-shrink", "0");

        enableInputEvents(colorInput);
        colorInput.on("input", function () { editorState.color = this.value; });

        // Tabs
        var tabRow = container.append("xhtml:div")
            .style("display", "flex").style("gap", "0").style("margin-bottom", "12px")
            .style("border-bottom", "2px solid #e2e8f0");

        ['parties', 'deputies'].forEach(function (tab) {
            var label = tab === 'parties'
                ? (isEnglish ? "Parties" : "Partidos")
                : (isEnglish ? "Deputies" : "Deputados");

            tabRow.append("xhtml:button")
                .style("flex", "1").style("padding", "6px 0").style("font-size", "12px")
                .style("font-weight", editorState.activeTab === tab ? "700" : "400")
                .style("color", editorState.activeTab === tab ? "#2563eb" : "#64748b")
                .style("background", "none").style("border", "none")
                .style("border-bottom", editorState.activeTab === tab ? "2px solid #2563eb" : "2px solid transparent")
                .style("margin-bottom", "-2px").style("cursor", "pointer")
                .text(label)
                .on("click", function () {
                    editorState.activeTab = tab;
                    editorState.searchText = '';
                    buildEditorContent(container, editorState);
                });
        });

        var tabContentWrapper = container.append("xhtml:div").attr("class", "tab-content-wrapper");
        if (editorState.activeTab === 'parties') buildPartiesTab(tabContentWrapper, editorState);
        else buildDeputiesTab(tabContentWrapper, editorState);

        var bottomWrapper = container.append("xhtml:div").attr("class", "editor-bottom-wrapper");
        buildMembersSection(bottomWrapper, editorState);

        var actionsRow = bottomWrapper.append("xhtml:div")
            .attr("class", "editor-actions-row")
            .style("display", "flex").style("gap", "8px").style("justify-content", "flex-end")
            .style("margin-top", "12px").style("padding-top", "12px").style("border-top", "1px solid #e2e8f0");

        actionsRow.append("xhtml:button")
            .style("padding", "6px 16px").style("font-size", "12px")
            .style("background", "#f1f5f9").style("color", "#64748b")
            .style("border", "1px solid #cbd5e1").style("border-radius", "6px").style("cursor", "pointer")
            .text(isEnglish ? "Cancel" : "Cancelar")
            .on("click", function () { closeGroupEditor(); });

        var hasMembers = editorState.selectedParties.length > 0 || editorState.selectedDeputies.length > 0;

        actionsRow.append("xhtml:button")
            .style("padding", "6px 16px").style("font-size", "12px").style("font-weight", "600")
            .style("background", hasMembers ? "#2563eb" : "#94a3b8").style("color", "#ffffff")
            .style("border", "none").style("border-radius", "6px")
            .style("cursor", hasMembers ? "pointer" : "default").style("opacity", hasMembers ? "1" : "0.6")
            .text(opts.confirmLabel)
            .on("click", function () {
                if (!hasMembers) return;
                opts.onSave(editorState);
                closeGroupEditor();
            });
    }

    function buildPartiesTab(container, editorState) {
        var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);

        var searchRow = container.append("xhtml:div").style("margin-bottom", "8px");
        var searchInput = searchRow.append("xhtml:input")
            .attr("type", "text")
            .attr("placeholder", isEnglish ? "Search party..." : "Buscar partido...")
            .property("value", editorState.searchText || '')
            .style("width", "100%").style("padding", "5px 10px")
            .style("border", "1px solid #e2e8f0").style("border-radius", "6px")
            .style("font-size", "12px").style("outline", "none").style("box-sizing", "border-box");

        enableInputEvents(searchInput);

        searchInput.on("input", function () {
            editorState.searchText = this.value.toLowerCase();
            container.selectAll(".party-chips-container").remove();
            buildPartyChips(container, editorState);
        });

        if (editorState.searchText) {
            setTimeout(function () {
                var node = searchInput.node();
                if (node) { node.focus(); var len = node.value.length; node.setSelectionRange(len, len); }
            }, 0);
        }

        buildPartyChips(container, editorState);
    }

    function buildPartyChips(container, editorState) {
        var partiesSet = {};
        deputies.forEach(function (d) {
            if (d.party) { if (!partiesSet[d.party]) partiesSet[d.party] = 0; partiesSet[d.party]++; }
        });

        var partiesList = Object.keys(partiesSet).sort();
        if (editorState.searchText) {
            partiesList = partiesList.filter(function (p) {
                return p.toLowerCase().indexOf(editorState.searchText) > -1;
            });
        }

        var chipsContainer = container.append("xhtml:div")
            .attr("class", "party-chips-container")
            .style("display", "flex").style("flex-wrap", "wrap").style("gap", "6px")
            .style("max-height", "100px").style("overflow-y", "auto").style("margin-bottom", "8px");

        partiesList.forEach(function (party) {
            var isSelected = editorState.selectedParties.indexOf(party) > -1;
            var partyColor = CONGRESS_DEFINE.getPartyColor(party) || '#6b7280';
            var count = partiesSet[party];

            chipsContainer.append("xhtml:span")
                .style("display", "inline-flex").style("align-items", "center")
                .style("padding", "4px 10px").style("border-radius", "9px")
                .style("font-size", "11px").style("cursor", "pointer").style("background", "#f8fafc")
                .style("border", isSelected ? "2px solid " + partyColor : "1px solid #e2e8f0")
                .style("color", isSelected ? partyColor : "#374151")
                .style("font-weight", isSelected ? "bold" : "500")
                .text(party + " (" + count + ")")
                .on("click", function () {
                    var idx = editorState.selectedParties.indexOf(party);
                    if (idx > -1) editorState.selectedParties.splice(idx, 1);
                    else editorState.selectedParties.push(party);
                    editorState.color = autoColor(editorState);
                    buildEditorContent(editorState.mainContainer, editorState);
                });
        });
    }

    function buildDeputiesTab(container, editorState) {
        var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);

        var filterRow = container.append("xhtml:div")
            .style("display", "flex").style("gap", "6px").style("margin-bottom", "8px");

        var searchInput = filterRow.append("xhtml:input")
            .attr("type", "text")
            .attr("placeholder", isEnglish ? "Search deputy..." : "Buscar deputado...")
            .property("value", editorState.searchText || '')
            .style("flex", "1").style("padding", "5px 10px")
            .style("border", "1px solid #e2e8f0").style("border-radius", "6px")
            .style("font-size", "12px").style("outline", "none");

        enableInputEvents(searchInput);

        searchInput.on("input", function () {
            editorState.searchText = this.value.toLowerCase();
            container.selectAll(".deputy-results-container").remove();
            buildDeputyResults(container, editorState);
        });

        if (editorState.searchText) {
            setTimeout(function () {
                var node = searchInput.node();
                if (node) { node.focus(); var len = node.value.length; node.setSelectionRange(len, len); }
            }, 0);
        }

        var partiesSet = {};
        deputies.forEach(function (d) { if (d.party) partiesSet[d.party] = true; });
        var partiesList = ['All'].concat(Object.keys(partiesSet).sort());

        var select = filterRow.append("xhtml:select")
            .style("padding", "5px 8px").style("border", "1px solid #e2e8f0").style("border-radius", "6px")
            .style("font-size", "11px").style("background", "#ffffff").style("cursor", "pointer");

        enableInputEvents(select);

        partiesList.forEach(function (p) {
            select.append("xhtml:option")
                .attr("value", p).property("selected", editorState.partyFilter === p).text(p);
        });

        select.on("change", function () {
            editorState.partyFilter = this.value;
            container.selectAll(".deputy-results-container").remove();
            buildDeputyResults(container, editorState);
        });

        buildDeputyResults(container, editorState);
    }

    function buildDeputyResults(container, editorState) {
        var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);

        var filtered = deputies.slice();
        if (editorState.partyFilter && editorState.partyFilter !== 'All') {
            filtered = filtered.filter(function (d) { return d.party === editorState.partyFilter; });
        }
        if (editorState.searchText) {
            filtered = filtered.filter(function (d) {
                return d.name && d.name.toLowerCase().indexOf(editorState.searchText) > -1;
            });
        }

        var selectedIDs = editorState.selectedDeputies.map(function (d) { return d.deputyID; });
        filtered = filtered.filter(function (d) { return selectedIDs.indexOf(d.deputyID) === -1; });
        filtered = filtered.slice(0, 30);

        var listContainer = container.append("xhtml:div")
            .attr("class", "deputy-results-container")
            .style("max-height", "90px").style("overflow-y", "auto")
            .style("border", "1px solid #e2e8f0").style("border-radius", "6px").style("margin-bottom", "8px");

        if (filtered.length === 0) {
            listContainer.append("xhtml:div")
                .style("padding", "8px").style("color", "#94a3b8").style("font-size", "11px").style("text-align", "center")
                .text(isEnglish ? "No deputies found" : "Nenhum deputado encontrado");
        }

        filtered.forEach(function (dep) {
            var partyColor = CONGRESS_DEFINE.getPartyColor(dep.party) || '#6b7280';

            listContainer.append("xhtml:div")
                .style("padding", "4px 10px").style("font-size", "11px").style("cursor", "pointer")
                .style("border-bottom", "1px solid #f1f5f9").style("display", "flex")
                .style("justify-content", "space-between").style("align-items", "center")
                .html('<span>' + dep.name + '</span>' +
                    '<span style="color:' + partyColor + ';font-weight:500;font-size:10px;">' + dep.party + '</span>')
                .on("click", function () {
                    editorState.selectedDeputies.push(dep);
                    editorState.searchText = '';
                    buildEditorContent(editorState.mainContainer, editorState);
                });
        });
    }

    function buildMembersSection(container, editorState) {
        var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);
        var hasMembers = editorState.selectedParties.length > 0 || editorState.selectedDeputies.length > 0;
        if (!hasMembers) return;

        var membersDiv = container.append("xhtml:div").attr("class", "members-section").style("margin-top", "8px");

        membersDiv.append("xhtml:div")
            .style("font-size", "11px").style("font-weight", "600").style("color", "#64748b").style("margin-bottom", "6px")
            .text(isEnglish ? "Members:" : "Membros:");

        var chipsDiv = membersDiv.append("xhtml:div")
            .style("display", "flex").style("flex-wrap", "wrap").style("gap", "4px");

        editorState.selectedParties.forEach(function (party) {
            var partyColor = CONGRESS_DEFINE.getPartyColor(party) || '#6b7280';
            var count = deputies.filter(function (d) { return d.party === party; }).length;

            chipsDiv.append("xhtml:span")
                .style("display", "inline-flex").style("align-items", "center").style("gap", "4px")
                .style("padding", "4px 10px").style("border-radius", "9px").style("font-size", "11px").style("font-weight", "bold")
                .style("background", "#f8fafc").style("border", "1px solid " + partyColor).style("color", partyColor)
                .html(party + ' (' + count + ' deps) <span style="cursor:pointer;color:#ef4444;font-weight:bold;margin-left:2px;" class="remove-party">&times;</span>')
                .on("click", function () {
                    if (d3.event.target.classList.contains('remove-party')) {
                        var idx = editorState.selectedParties.indexOf(party);
                        if (idx > -1) editorState.selectedParties.splice(idx, 1);
                        buildEditorContent(editorState.mainContainer, editorState);
                    }
                });
        });

        editorState.selectedDeputies.forEach(function (dep, i) {
            var partyColor = CONGRESS_DEFINE.getPartyColor(dep.party) || '#6b7280';

            chipsDiv.append("xhtml:span")
                .style("display", "inline-flex").style("align-items", "center").style("gap", "4px")
                .style("padding", "4px 10px").style("border-radius", "9px").style("font-size", "11px").style("font-weight", "bold")
                .style("background", "#f8fafc").style("border", "1px solid " + partyColor).style("color", partyColor)
                .html(dep.name + ' - ' + dep.party + ' <span style="cursor:pointer;color:#ef4444;font-weight:bold;margin-left:2px;" class="remove-deputy">&times;</span>')
                .on("click", function () {
                    if (d3.event.target.classList.contains('remove-deputy')) {
                        editorState.selectedDeputies.splice(i, 1);
                        buildEditorContent(editorState.mainContainer, editorState);
                    }
                });
        });
    }

    // ── Open the overlay ──
    svg.selectAll(".group-editor-overlay").remove();

    var editorW = 420;
    var editorH = 400;
    var editorX = (width - editorW) / 2;
    var editorY = -20;

    var overlay = svg.append("g")
        .attr("class", "group-editor-overlay")
        .attr("transform", "translate(" + editorX + "," + editorY + ")");

    svg.insert("rect", ".group-editor-overlay")
        .attr("class", "group-editor-backdrop")
        .attr("x", -margin.left).attr("y", -margin.top)
        .attr("width", outerWidth).attr("height", outerHeight)
        .style("fill", "rgba(0,0,0,0.3)").style("cursor", "pointer")
        .on("click", function () { closeGroupEditor(); });

    var fo = overlay.append("foreignObject")
        .attr("x", 0).attr("y", 0).attr("width", editorW).attr("height", editorH);

    var container = fo.append("xhtml:div")
        .style("width", editorW + "px").style("height", editorH + "px")
        .style("background", "#ffffff").style("border-radius", "12px")
        .style("box-shadow", "0 8px 32px rgba(0,0,0,0.15)").style("padding", "20px")
        .style("font-family", "system-ui, -apple-system, sans-serif")
        .style("overflow-y", "auto").style("box-sizing", "border-box");

    var editorState = {
        name: '',
        color: opts.initialColor,
        activeTab: 'parties',
        selectedParties: [],
        selectedDeputies: [],
        searchText: '',
        partyFilter: 'All'
    };

    buildEditorContent(container, editorState);
}
