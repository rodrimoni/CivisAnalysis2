/**
 * Roll Calls List Module
 * Renders a compact list of roll calls with the lowest Rice Index (least cohesive)
 */

(function (global) {
    'use strict';

    /**
     * Truncate label text by approximate character width
     * @param {string} text - Text to truncate
     * @param {number} maxPx - Maximum width in pixels
     * @param {number} approxCharW - Approximate character width
     * @returns {string} Truncated text
     */
    function truncateLabel(text, maxPx, approxCharW = 7) {
        var maxChars = Math.max(4, Math.floor(maxPx / approxCharW));
        if (text.length <= maxChars) return text;
        return text.substr(0, maxChars - 1) + '…';
    }

    /**
     * Render a clean, compact list of the 10 roll calls with the lowest Rice Index
     * @param {Object} svgSelection - D3 selection where to append the list
     * @param {Object} options - Configuration options
     * @param {string} options.party - Party name
     * @param {Array} options.data - Pre-calculated roll call data
     * @param {number} options.x - X position
     * @param {number} options.y - Y position
     * @param {number} options.w - Width
     * @param {number} options.h - Height
     * @param {string} options.selectedTheme - Optional theme to filter by
     */
    function renderRollCallsList(svgSelection, options) {
        var party = options.party;
        var allData = options.data;
        var x0 = options.x;
        var y0 = options.y;
        var w = Math.max(180, options.w);
        var h = Math.max(140, options.h);
        var selectedTheme = options.selectedTheme;

        // Filter by theme if selected
        var filteredData = allData;
        if (selectedTheme && allData) {
            filteredData = allData.filter(function (d) {
                return d.theme === selectedTheme;
            });
        }

        var data = filteredData ? filteredData.slice(0, 10) : [];
        if (!data.length) return;

        var group = svgSelection.append("g").attr("transform", "translate(" + x0 + "," + y0 + ")");

        // Section title - update based on filter
        var titleText;
        var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);

        if (selectedTheme) {
            var themeName = localizedTheme(selectedTheme);
            titleText = isEnglish
                ? "Least Cohesive: " + themeName
                : "Menor Coesão: " + themeName;
        } else {
            titleText = isEnglish
                ? "Least Cohesive Roll Calls"
                : "Menor Coesão – 10 Itens";
        }

        group.append("text")
            .attr("x", 0)
            .attr("y", -8)
            .attr("text-anchor", "start")
            .attr("font-size", "15px")
            .attr("font-weight", "bold")
            .attr("fill", "#444")
            .text(titleText);

        var baseColor = CONGRESS_DEFINE.getPartyColor(party);

        var topPad = 5;
        var rowGap = 6;
        var n = data.length;
        var available = h - topPad - (n > 0 ? (rowGap * (n - 1)) : 0);
        var rowH = Math.min(32, Math.max(22, Math.floor(available / n)));

        // Right-side badge width
        var badgeW = 60;
        var paddingX = 10;

        var rows = group.selectAll("g.rc-row")
            .data(data)
            .enter()
            .append("g")
            .attr("class", "rc-row")
            .attr("transform", function (d, i) {
                var y = topPad + i * (rowH + rowGap);
                return "translate(0," + y + ")";
            })
            .style("cursor", "pointer");

        // Row background (subtle rounded capsule)
        rows.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("rx", Math.min(10, Math.floor(rowH / 3)))
            .attr("ry", Math.min(10, Math.floor(rowH / 3)))
            .attr("width", w)
            .attr("height", rowH)
            .style("fill", "#ffffff")
            .style("stroke", "rgba(0,0,0,0.08)")
            .style("stroke-width", 1);

        // Index pill
        var indexPillW = 22;
        rows.append("rect")
            .attr("x", paddingX)
            .attr("y", Math.floor((rowH - 18) / 2))
            .attr("rx", 9)
            .attr("ry", 9)
            .attr("width", indexPillW)
            .attr("height", 18)
            .style("fill", baseColor)
            .style("fill-opacity", 0.15)
            .style("stroke", baseColor)
            .style("stroke-opacity", 0.4)
            .style("stroke-width", 1);

        rows.append("text")
            .attr("x", paddingX + Math.floor(indexPillW / 2))
            .attr("y", Math.floor(rowH / 2))
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .style("fill", baseColor)
            .text(function (d, i) { return (i + 1); });

        // Roll call label (truncated)
        var labelStartX = paddingX + indexPillW + 10;
        var labelMaxW = Math.max(60, w - labelStartX - (badgeW + paddingX));
        rows.append("text")
            .attr("x", labelStartX)
            .attr("y", Math.floor(rowH / 2))
            .attr("dy", ".35em")
            .attr("text-anchor", "start")
            .style("fill", "#333")
            .style("font-size", "11px")
            .text(function (d) { return truncateLabel(d.label, labelMaxW); });

        // Rice badge at right
        rows.append("rect")
            .attr("x", w - badgeW - paddingX)
            .attr("y", Math.floor((rowH - 20) / 2))
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("width", badgeW)
            .attr("height", 20)
            .style("fill", baseColor)
            .style("fill-opacity", 0.12)
            .style("stroke", baseColor)
            .style("stroke-opacity", 0.35)
            .style("stroke-width", 1);

        rows.append("text")
            .attr("x", w - Math.floor(badgeW / 2) - paddingX)
            .attr("y", Math.floor(rowH / 2))
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .style("fill", baseColor)
            .text(function (d) { return (d.rice * 100).toFixed(1) + "%"; });

        // Hover tooltip with details
        var div = d3.select(".toolTip");
        rows.on("mousemove", function (d) {
            var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);
            var yesLabel = isEnglish ? "Yes" : "Sim";
            var noLabel = isEnglish ? "No" : "Não";
            var votersLabel = isEnglish ? "Voters" : "Votantes";
            var riceLabel = isEnglish ? "Rice Index" : "Índice Rice";
            var amendmentLabel = isEnglish ? "Amendment" : "Ementa";

            var html = "<strong>" + d.label + "</strong><br><br>";

            // Add amendment if available (full text with wrapping)
            if (d.rc && d.rc.type && d.rc.number && d.rc.year) {
                var motionKey = d.rc.type + d.rc.number + d.rc.year;
                if (typeof motions !== 'undefined' && motions[motionKey] && motions[motionKey].amendment) {
                    html += "<strong>" + amendmentLabel + ":</strong> " + motions[motionKey].amendment.trim() + "<br><br>";
                }
            }

            html += votersLabel + ": " + d.total + "<br>" +
                yesLabel + ": " + d.yesCount + " | " + noLabel + ": " + d.noCount + "<br>" +
                riceLabel + ": " + d.rice.toFixed(3);

            div.style("left", d3.event.pageX + 10 + "px");
            div.style("top", d3.event.pageY - 25 + "px");
            div.style("display", "inline-block");
            div.style("max-width", "400px");
            div.style("white-space", "normal");
            div.style("word-wrap", "break-word");
            div.html(html);
        }).on("mouseout", function () { div.style("display", "none"); });
    }

    // Export to global scope
    global.RollCallsList = {
        render: renderRollCallsList
    };

})(window);

