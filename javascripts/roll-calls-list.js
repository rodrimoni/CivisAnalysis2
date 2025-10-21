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
        var sortOrder = 'desc'; // desc => most cohesive first; asc => least cohesive first

        // Filter by theme if selected
        var filteredData = allData;
        if (selectedTheme && allData) {
            filteredData = allData.filter(function (d) {
                return d.theme === selectedTheme;
            });
        }

        var data = filteredData ? filteredData.slice() : [];
        if (!data.length) return;

        var group = svgSelection.append("g").attr("transform", "translate(" + x0 + "," + y0 + ")");

        var baseColor = CONGRESS_DEFINE.getPartyColor(party);
        var isEnglish = (typeof language !== 'undefined' && language === ENGLISH);

        // Title text element (will be updated on toggle)
        var titleEl = group.append("text")
            .attr("x", 0)
            .attr("y", -8)
            .attr("text-anchor", "start")
            .attr("font-size", "15px")
            .attr("font-weight", "bold")
            .attr("fill", "#444");

        function setTitle() {
            var baseTitle;
            if (selectedTheme) {
                var themeName = localizedTheme(selectedTheme);
                baseTitle = isEnglish
                    ? ((sortOrder === 'asc') ? ("Least Cohesive: " + themeName) : ("Most Cohesive: " + themeName))
                    : ((sortOrder === 'asc') ? ("Menor Coesão: " + themeName) : ("Maior Coesão: " + themeName));
            } else {
                baseTitle = isEnglish
                    ? ((sortOrder === 'asc') ? "Least Cohesive Roll Calls" : "Most Cohesive Roll Calls")
                    : ((sortOrder === 'asc') ? "Menor Coesão – Todos" : "Maior Coesão – Todos");
            }
            titleEl.text(baseTitle);
        }

        // Sort toggle pill near the title (right-aligned)
        var toggleW = 90;
        var toggleH = 22;
        var knobW = Math.floor(toggleW / 2);
        var toggleX = Math.max(0, w - toggleW);
        var toggleY = -toggleH - 2;
        var sortAscLabel = isEnglish ? 'Asc' : 'Asc';
        var sortDescLabel = isEnglish ? 'Desc' : 'Desc';

        var toggleGroup = group.append('g')
            .attr('class', 'rc-sort-toggle')
            .attr('transform', 'translate(' + toggleX + ',' + toggleY + ')')
            .style('cursor', 'pointer');

        toggleGroup.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', toggleW)
            .attr('height', toggleH)
            .attr('rx', toggleH / 2)
            .attr('ry', toggleH / 2)
            .style('fill', '#f2f2f7')
            .style('stroke', '#d1d1d6')
            .style('stroke-width', 1);

        var knob = toggleGroup.append('rect')
            .attr('class', 'knob')
            .attr('x', sortOrder === 'desc' ? 0 : knobW)
            .attr('y', 0)
            .attr('width', knobW)
            .attr('height', toggleH)
            .attr('rx', toggleH / 2)
            .attr('ry', toggleH / 2)
            .style('fill', '#ffffff')
            .style('stroke', '#c7c7cc')
            .style('stroke-width', 1);

        toggleGroup.append('text')
            .attr('class', 'desc-label')
            .attr('x', knobW / 2)
            .attr('y', Math.floor(toggleH / 2))
            .attr('dy', '.35em')
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .text(sortDescLabel)
            .style('fill', sortOrder === 'desc' ? '#000' : '#6c6c70')
            .style('pointer-events', 'none');

        toggleGroup.append('text')
            .attr('class', 'asc-label')
            .attr('x', knobW + knobW / 2)
            .attr('y', Math.floor(toggleH / 2))
            .attr('dy', '.35em')
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .text(sortAscLabel)
            .style('fill', sortOrder === 'asc' ? '#000' : '#6c6c70')
            .style('pointer-events', 'none');

        function sortData() {
            data.sort(function (a, b) {
                if (a.rice === b.rice) {
                    var nameA = (a.label || '').toString();
                    var nameB = (b.label || '').toString();
                    var cmp = nameA.localeCompare(nameB);
                    return (sortOrder === 'asc') ? cmp : -cmp;
                }
                // asc => least cohesive first (lower rice first)
                return (sortOrder === 'asc') ? (a.rice - b.rice) : (b.rice - a.rice);
            });
        }

        function renderContent() {
            group.selectAll('.rc-content').remove();
            sortData();

            var content = group.append('foreignObject')
                .attr('class', 'rc-content')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', w)
                .attr('height', h);

            var scrollDiv = content.append('xhtml:div')
                .style('width', w + 'px')
                .style('height', h + 'px')
                .style('overflow-y', 'auto')
                .style('-webkit-overflow-scrolling', 'touch');

            var topPad = 5;
            var rowGap = 6;
            var n = data.length;
            var visibleCount = Math.min(10, n);
            var available = h - topPad - (visibleCount > 0 ? (rowGap * (visibleCount - 1)) : 0);
            var rowH = Math.min(32, Math.max(22, Math.floor(available / Math.max(1, visibleCount))));

            var innerSvgHeight = topPad + (n * (rowH + rowGap)) - (n > 0 ? rowGap : 0);
            var innerSvg = scrollDiv.append('svg')
                .attr('xmlns', 'http://www.w3.org/2000/svg')
                .attr('width', w)
                .attr('height', innerSvgHeight);

            var rowsGroup = innerSvg.append('g').attr('transform', 'translate(0,0)');

            // Right-side badge width
            var badgeW = 60;
            var paddingX = 10;

            var rows = rowsGroup.selectAll('g.rc-row')
                .data(data)
                .enter()
                .append('g')
                .attr('class', 'rc-row')
                .attr('transform', function (d, i) {
                    var y = topPad + i * (rowH + rowGap);
                    return 'translate(0,' + y + ')';
                })
                .style('cursor', 'pointer');

            rows.append('rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('rx', Math.min(10, Math.floor(rowH / 3)))
                .attr('ry', Math.min(10, Math.floor(rowH / 3)))
                .attr('width', w)
                .attr('height', rowH)
                .style('fill', '#ffffff')
                .style('stroke', 'rgba(0,0,0,0.08)')
                .style('stroke-width', 1);

            var indexPillW = 22;
            rows.append('rect')
                .attr('x', paddingX)
                .attr('y', Math.floor((rowH - 18) / 2))
                .attr('rx', 9)
                .attr('ry', 9)
                .attr('width', indexPillW)
                .attr('height', 18)
                .style('fill', baseColor)
                .style('fill-opacity', 0.15)
                .style('stroke', baseColor)
                .style('stroke-opacity', 0.4)
                .style('stroke-width', 1);

            rows.append('text')
                .attr('x', paddingX + Math.floor(indexPillW / 2))
                .attr('y', Math.floor(rowH / 2))
                .attr('dy', '.35em')
                .attr('text-anchor', 'middle')
                .style('font-size', '11px')
                .style('font-weight', 'bold')
                .style('fill', baseColor)
                .text(function (d, i) { return (i + 1); });

            var labelStartX = paddingX + indexPillW + 10;
            var labelMaxW = Math.max(60, w - labelStartX - (badgeW + paddingX));
            rows.append('text')
                .attr('x', labelStartX)
                .attr('y', Math.floor(rowH / 2))
                .attr('dy', '.35em')
                .attr('text-anchor', 'start')
                .style('fill', '#333')
                .style('font-size', '11px')
                .text(function (d) { return truncateLabel(d.label, labelMaxW); });

            rows.append('rect')
                .attr('x', w - badgeW - paddingX)
                .attr('y', Math.floor((rowH - 20) / 2))
                .attr('rx', 10)
                .attr('ry', 10)
                .attr('width', badgeW)
                .attr('height', 20)
                .style('fill', baseColor)
                .style('fill-opacity', 0.12)
                .style('stroke', baseColor)
                .style('stroke-opacity', 0.35)
                .style('stroke-width', 1);

            rows.append('text')
                .attr('x', w - Math.floor(badgeW / 2) - paddingX)
                .attr('y', Math.floor(rowH / 2))
                .attr('dy', '.35em')
                .attr('text-anchor', 'middle')
                .style('font-size', '11px')
                .style('font-weight', 'bold')
                .style('fill', baseColor)
                .text(function (d) { return (d.rice * 100).toFixed(1) + '%'; });

            var div = d3.select('.toolTip');
            rows.on('mousemove', function (d) {
                var isEnglishLocal = (typeof language !== 'undefined' && language === ENGLISH);
                var yesLabel = isEnglishLocal ? 'Yes' : 'Sim';
                var noLabel = isEnglishLocal ? 'No' : 'Não';
                var votersLabel = isEnglishLocal ? 'Voters' : 'Votantes';
                var riceLabel = isEnglishLocal ? 'Rice Index' : 'Índice Rice';
                var amendmentLabel = isEnglishLocal ? 'Amendment' : 'Ementa';

                var html = '<strong>' + d.label + '</strong><br><br>';
                if (d.rc && d.rc.type && d.rc.number && d.rc.year) {
                    var motionKey = d.rc.type + d.rc.number + d.rc.year;
                    if (typeof motions !== 'undefined' && motions[motionKey] && motions[motionKey].amendment) {
                        html += '<strong>' + amendmentLabel + ':</strong> ' + motions[motionKey].amendment.trim() + '<br><br>';
                    }
                }
                html += votersLabel + ': ' + d.total + '<br>' +
                    yesLabel + ': ' + d.yesCount + ' | ' + noLabel + ': ' + d.noCount + '<br>' +
                    riceLabel + ': ' + d.rice.toFixed(3);

                div.style('left', d3.event.pageX + 10 + 'px');
                div.style('top', d3.event.pageY - 25 + 'px');
                div.style('display', 'inline-block');
                div.style('max-width', '400px');
                div.style('white-space', 'normal');
                div.style('word-wrap', 'break-word');
                div.html(html);
            }).on('mouseout', function () { div.style('display', 'none'); });
        }

        setTitle();
        renderContent();

        toggleGroup.on('click', function () {
            sortOrder = (sortOrder === 'asc') ? 'desc' : 'asc';
            knob.transition().duration(160).attr('x', sortOrder === 'desc' ? 0 : knobW);
            toggleGroup.select('.asc-label').style('fill', sortOrder === 'asc' ? '#000' : '#6c6c70');
            toggleGroup.select('.desc-label').style('fill', sortOrder === 'desc' ? '#000' : '#6c6c70');
            setTitle();
            renderContent();
        });
    }

    // Export to global scope
    global.RollCallsList = {
        render: renderRollCallsList
    };

})(window);

