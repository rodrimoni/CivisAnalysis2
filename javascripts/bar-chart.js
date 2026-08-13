function barChart(typeChart) {
    var axisMargin = 20;
    var marginX = 150;
    var marginY = 20;
    var width = MAX_WIDTH;
    var height = MAX_HEIGHT;

    var div = d3.select(".toolTip");

    let panelID = "";

    // Approved / rejected poles. Same RdYlBu scale as the roll-calls heatmap
    // legend ("Yes (approved)" / "No (not approved)"), at steps that pass the
    // categorical palette checks (lightness band, chroma, CVD separation).
    var APPROVED_COLOR = '#4575b4';
    var REJECTED_COLOR = '#d73027';
    var DURATION = 450;
    var SEGMENT_GAP = 3;

    // Approval views apply only to the subjects histogram; the parties bar
    // chart reuses this factory with {category, frequency} only.
    var isThemes = (typeChart === THEMES_BAR_CHART);

    // Subject emphasis inside this chart, mirroring what we send to the map.
    // Factory scope (like panelID) so chart.clearSubjectHighlight can reach it.
    var hoveredCategory = null;
    var lockedCategory = null;
    var applyFocus = null;

    function focusedCategory() {
        return hoveredCategory !== null ? hoveredCategory : lockedCategory;
    }

    function barOpacity(d) {
        var focus = focusedCategory();
        return (focus === null || d.category === focus) ? 1 : 0.25;
    }

    const getCategoryColor = d => {
        if (typeChart === THEMES_BAR_CHART) {
            return CONGRESS_DEFINE.subjectsToColor[d];
        }
        return CONGRESS_DEFINE.getPartyColor(d);
    };

    const getCategoryLabel = d => {
        if (typeChart === THEMES_BAR_CHART) {
            return language === ENGLISH ? subjectsToEnglish[d] : d;
        }
        return d;
    };

    function chart(selection) {
        selection.each(function (data) {
            var container = this;
            panelID = ($(container).parents('.panel')).attr('id');

            // View state. `mode` is a view switch (what the bar means),
            // `sort` is an ordering, `minN` is a data filter — three distinct
            // kinds of control, so each gets its own affordance.
            var view = { mode: 'volume', sort: 'value', minN: isThemes ? 5 : 1 };

            data.forEach(function (d) {
                if (d.approved === undefined) d.approved = 0;
                if (d.rejected === undefined) d.rejected = 0;
                d.rate = d.frequency ? d.approved / d.frequency : 0;
            });

            // Overall approval rate for this slice — the reference baseline.
            var grandTotal = d3.sum(data, function (d) { return d.frequency; });
            var grandApproved = d3.sum(data, function (d) { return d.approved; });
            var globalRate = grandTotal ? grandApproved / grandTotal : 0;

            // ---------- header (controls + notice) ----------
            // One flow container so the notice follows the controls instead of
            // sitting at a fixed offset. render() measures its real height, so
            // the plot starts below it however many lines the controls wrap to.
            // Flex column: the header takes its natural height and the SVG below
            // flexes into whatever is left. CSS keeps them stacked at any panel
            // size, so the plot can neither overlap the controls nor overflow
            // the panel — no pixel arithmetic involved.
            d3.select(container)
                .style("display", "flex")
                .style("flex-direction", "column");

            var header = d3.select(container)
                .append("div")
                .attr("class", "bar-chart-header")
                .style("flex", "0 0 auto")
                .style("padding", "10px 20px 0 20px");

            var controls = header
                .append("div")
                .attr("class", "bar-chart-controls")
                .style("display", "flex").style("align-items", "center")
                .style("flex-wrap", "wrap").style("gap", "18px")
                .style("font-size", "13px").style("color", "#333");

            function addGroup(label) {
                var g = controls.append("div")
                    .style("display", "inline-flex").style("align-items", "center").style("gap", "7px");
                if (label) g.append("span").text(label).style("color", "#777");
                return g;
            }

            // Segmented control: mutually exclusive views.
            function segmented(group, options, current, onPick) {
                var wrap = group.append("div")
                    .style("display", "inline-flex")
                    .style("border", "1px solid #ccc").style("border-radius", "4px")
                    .style("overflow", "hidden");
                options.forEach(function (opt, i) {
                    var btn = wrap.append("button")
                        .attr("type", "button")
                        .attr("data-value", opt.value)
                        .text(opt.label)
                        .style("border", "none")
                        .style("border-left", i ? "1px solid #ccc" : "none")
                        .style("padding", "4px 11px")
                        .style("font-size", "13px")
                        .style("cursor", "pointer")
                        .style("background", opt.value === current ? "#4575b4" : "#fff")
                        .style("color", opt.value === current ? "#fff" : "#333")
                        .on("click", function () {
                            d3.event.stopPropagation();
                            wrap.selectAll("button")
                                .style("background", "#fff").style("color", "#333");
                            btn.style("background", "#4575b4").style("color", "#fff");
                            onPick(opt.value);
                        });
                });
            }

            if (isThemes) {
                segmented(addGroup(t("View:")), [
                    { value: 'volume', label: t("Volume") },
                    { value: 'rate', label: t("Approval rate") }
                ], view.mode, function (v) { view.mode = v; render(); });
            }

            segmented(addGroup(t("Sort:")), [
                { value: 'value', label: t("Value") },
                { value: 'alpha', label: 'A–Z' }
            ], view.sort, function (v) { view.sort = v; render(); });

            if (isThemes) {
                var minGroup = addGroup(t("Min. votes:"));
                var select = minGroup.append("select")
                    .style("font-size", "13px").style("padding", "3px 5px")
                    .style("border", "1px solid #ccc").style("border-radius", "4px")
                    .style("cursor", "pointer")
                    .on("click", function () { d3.event.stopPropagation(); })
                    .on("change", function () { view.minN = +this.value; render(); });
                [{ v: 1, label: t("all") }, { v: 3, label: 'n≥3' }, { v: 5, label: 'n≥5' }, { v: 10, label: 'n≥10' }]
                    .forEach(function (o) {
                        select.append("option").attr("value", o.v).text(o.label)
                            .property("selected", o.v === view.minN);
                    });
            }

            // Legend (right side of the controls row)
            var legend = null;
            if (isThemes) {
                legend = controls.append("div")
                    .style("margin-left", "auto")
                    .style("display", "inline-flex").style("align-items", "center").style("gap", "6px")
                    .style("font-size", "12px");
                function swatch(color) {
                    legend.append("span")
                        .style("display", "inline-block").style("width", "11px").style("height", "11px")
                        .style("background", color).style("border-radius", "2px");
                }
                swatch(APPROVED_COLOR);
                legend.append("span").text(t("approved")).style("margin-right", "8px");
                swatch(REJECTED_COLOR);
                legend.append("span").text(t("rejected"));
            }

            // Composed strings take parameters and a plural, so build them
            // explicitly rather than concatenating dictionary fragments.
            function hiddenNotice(count, minN) {
                if (typeof language !== 'undefined' && language === PORTUGUESE) {
                    return count + (count === 1 ? " tema oculto" : " temas ocultos") +
                        " (menos de " + minN + " votações)";
                }
                return count + (count === 1 ? " subject hidden" : " subjects hidden") +
                    " (fewer than " + minN + " votes)";
            }

            // Notice for data hidden by the min-n filter — never filter silently.
            // Flows below the controls inside the header.
            var notice = header.append("div")
                .attr("class", "bar-chart-notice")
                .style("margin-top", "5px")
                .style("font-size", "12px").style("color", "#888");

            // ---------- chart ----------
            var svg = d3.select(container)
                .append("svg")
                .attr("width", "100%")
                // Flexes into the space left by the header; min-height:0 lets it
                // shrink instead of forcing the container to grow.
                .style("flex", "1 1 auto").style("min-height", "0")
                .style("display", "block")
                .attr("preserveAspectRatio", "xMidYMin meet")
                .classed("bar-chart", true);

            var gridG = svg.append("g").attr("class", "axisHorizontal");
            var barsG = svg.append("g").attr("class", "bars");
            var refG = svg.append("g").attr("class", "reference").style("opacity", 0);
            refG.append("line")
                .attr("stroke", "#555").attr("stroke-width", 1.5).attr("stroke-dasharray", "5,4");
            refG.append("text")
                .attr("class", "reference-label")
                .attr("dy", "-8")
                // inline styles: the .bar-chart text CSS rule would otherwise
                // win over SVG presentation attributes and force 30px.
                .style("fill", "#555").style("font", "22px sans-serif");

            // Measure every label once so the plot geometry stays stable when
            // filtering or switching views (no axis jumping between renders).
            var labelWidth = 0;
            (function measureLabels() {
                var m = svg.append("g").style("visibility", "hidden");
                m.selectAll("text").data(data.map(function (d) { return d.category; }))
                    .enter().append("text").attr("class", "label")
                    .text(function (d) { return getCategoryLabel(d); })
                    .each(function () {
                        labelWidth = Math.ceil(Math.max(labelWidth, this.getBBox().width));
                    });
                m.remove();
            })();

            function visibleData() {
                var arr = data.filter(function (d) { return d.frequency >= view.minN; });
                if (view.sort === 'alpha') {
                    arr.sort(function (a, b) {
                        if (language === ENGLISH && isThemes) {
                            return d3.ascending(subjectsToEnglish[a.category], subjectsToEnglish[b.category]);
                        }
                        return d3.ascending(a.category, b.category);
                    });
                } else if (view.mode === 'rate') {
                    arr.sort(function (a, b) {
                        return d3.descending(a.rate, b.rate) || d3.descending(a.frequency, b.frequency);
                    });
                } else {
                    arr.sort(function (a, b) { return b.frequency - a.frequency; });
                }
                return arr;
            }

            function render(animate) {
                // Layout reflows (resize) must snap; only data/view changes animate.
                var dur = (animate === false) ? 0 : DURATION;

                // Match the viewBox aspect to the SVG's ACTUAL rendered box, so
                // the drawing fills it exactly — no letterbox band, no overflow.
                // Flex already decided that box; we only mirror it.
                var box = svg.node().getBoundingClientRect();
                var cw = Math.round(box.width) || MAX_WIDTH;
                var boxHeight = Math.round(box.height) || MAX_HEIGHT;
                height = Math.round(MAX_WIDTH * boxHeight / cw);

                svg.attr("viewBox", "0 0 " + width + " " + height);

                var rateMode = isThemes && view.mode === 'rate';
                var vis = visibleData();
                var hidden = data.length - vis.length;

                notice.text(hidden > 0 ? hiddenNotice(hidden, view.minN) : "");

                var topMargin = 30;                 // small breathing room only
                var bottomMargin = 70;
                var valueLabelSpace = 170;
                var axisY = height - bottomMargin;
                var bandHeight = axisY - marginY - topMargin;
                var count = vis.length || 1;

                var barHeight = bandHeight * 0.6 / count;
                var barPadding = bandHeight * 0.4 / count;
                var plotWidth = width - marginX * 2 - labelWidth - valueLabelSpace;

                var maxFreq = d3.max(vis, function (d) { return d.frequency; }) || 1;
                var scale = d3.scale.linear()
                    .domain(rateMode ? [0, 1] : [0, maxFreq])
                    .range([0, plotWidth]);

                var xAxis = d3.svg.axis()
                    .scale(scale)
                    .tickSize(-(axisY - topMargin))
                    .orient("bottom");
                if (rateMode) xAxis.tickFormat(d3.format(".0%"));

                gridG.attr("transform", "translate(" + (marginX + labelWidth) + "," + axisY + ")")
                    .transition().duration(dur)
                    .call(xAxis);

                function barY(d, i) { return topMargin + i * (barHeight + barPadding) + barPadding; }
                // In rate mode every bar spans the full width (normalized to
                // 100%), so the value labels line up in a single column.
                function barEnd(d) { return scale(rateMode ? 1 : d.frequency); }

                var bar = barsG.selectAll("g.bar").data(vis, function (d) { return d.category; });

                var entering = bar.enter().append("g")
                    .attr("class", "bar")
                    .attr("transform", function (d, i) { return "translate(" + marginX + "," + barY(d, i) + ")"; })
                    .style("opacity", 0);
                entering.append("text").attr("class", "label").style("pointer-events", "none");
                entering.append("rect").attr("class", "seg-approved");
                entering.append("rect").attr("class", "seg-rejected");
                entering.append("text").attr("class", "value").style("pointer-events", "none");

                bar.exit().transition().duration(dur).style("opacity", 0).remove();

                bar.transition().duration(dur)
                    .style("opacity", barOpacity)
                    .attr("transform", function (d, i) { return "translate(" + marginX + "," + barY(d, i) + ")"; });

                bar.select("text.label")
                    .attr("dy", ".35em")
                    .text(function (d) { return getCategoryLabel(d.category); })
                    .transition().duration(dur)
                    .attr("y", barHeight / 2);

                bar.select("rect.seg-approved")
                    .attr("fill", isThemes ? APPROVED_COLOR : function (d) { return getCategoryColor(d.category); })
                    .transition().duration(dur)
                    .attr("x", labelWidth)
                    .attr("height", barHeight)
                    .attr("width", function (d) {
                        if (!isThemes) return scale(d.frequency);
                        return scale(rateMode ? d.rate : d.approved);
                    });

                bar.select("rect.seg-rejected")
                    .attr("fill", REJECTED_COLOR)
                    .transition().duration(dur)
                    .attr("height", barHeight)
                    .attr("x", function (d) {
                        var start = scale(rateMode ? d.rate : d.approved);
                        return labelWidth + start + (start > 0 ? SEGMENT_GAP : 0);
                    })
                    .attr("width", function (d) {
                        if (!isThemes) return 0;
                        var start = scale(rateMode ? d.rate : d.approved);
                        var full = scale(rateMode ? 1 : d.frequency);
                        return Math.max(0, full - start - (start > 0 ? SEGMENT_GAP : 0));
                    });

                bar.select("text.value")
                    .attr("dy", ".35em")
                    .attr("text-anchor", "start")
                    .text(function (d) {
                        if (rateMode) return Math.round(d.rate * 100) + "%   n=" + d.frequency;
                        return d.frequency;
                    })
                    .transition().duration(dur)
                    .attr("y", barHeight / 2)
                    .attr("x", function (d) { return labelWidth + barEnd(d) + 10; });

                // Reference line: the slice's overall approval rate. Only
                // meaningful against a percentage axis.
                refG.transition().duration(dur).style("opacity", rateMode ? 1 : 0);
                if (rateMode) {
                    var refX = marginX + labelWidth + scale(globalRate);
                    refG.select("line")
                        .transition().duration(dur)
                        .attr("x1", refX).attr("x2", refX)
                        .attr("y1", topMargin).attr("y2", axisY);
                    refG.select("text")
                        .text(t("average") + " " + Math.round(globalRate * 100) + "%")
                        .transition().duration(dur)
                        .attr("x", refX + 6).attr("y", topMargin);
                }

                bar.on("mousemove", function (d) {
                    var pct = d.frequency ? Math.round(100 * d.approved / d.frequency) : 0;
                    div.style("left", d3.event.pageX + 10 + "px");
                    div.style("top", d3.event.pageY - 25 + "px");
                    div.style("display", "inline-block");
                    var subject = "<strong>" + getCategoryLabel(d.category) + "</strong>";
                    if (!isThemes) {
                        div.html(subject + "<br>" + d.frequency);
                    } else if (typeof language !== 'undefined' && language === PORTUGUESE) {
                        div.html(subject + "<br>" + pct + "% aprovadas · " +
                            d.approved + " de " + d.frequency + " votações");
                    } else {
                        div.html(subject + "<br>" + pct + "% approved · " +
                            d.approved + " of " + d.frequency + " votes");
                    }
                });

                bar.on("mouseout", function () { div.style("display", "none"); });

                // Re-emphasis inside this chart: the focused subject stays lit,
                // the rest recede — the same language the map speaks.
                applyFocus = function () {
                    barsG.selectAll("g.bar")
                        .transition().duration(160)
                        .style("opacity", barOpacity);
                };

                // Link to the parent Map of Roll Calls: hover previews the
                // subject's votes, click locks the focus. Namespaced so these
                // coexist with the tooltip handlers above.
                if (isThemes) {
                    bar.style("cursor", "pointer")
                        .on("mouseover.link", function (d) {
                            hoveredCategory = d.category;
                            applyFocus();
                            if (typeof subjectLinking !== 'undefined') {
                                subjectLinking.preview(panelID, d.category);
                            }
                        })
                        .on("mouseout.link", function () {
                            hoveredCategory = null;
                            applyFocus();
                            if (typeof subjectLinking !== 'undefined') {
                                subjectLinking.preview(panelID, null);
                            }
                        })
                        .on("click.link", function (d) {
                            d3.event.stopPropagation();
                            // Same toggle rule as the map, so the two stay in step.
                            lockedCategory = (lockedCategory === d.category) ? null : d.category;
                            applyFocus();
                            if (typeof subjectLinking !== 'undefined') {
                                subjectLinking.toggleLock(panelID, d.category);
                            }
                        });
                }
            }

            render();

            // The panel is resizable and can be maximized, but its resize
            // callback is generic — observe the container directly so the chart
            // re-fits itself on any size change. Guarded so a re-render (which
            // can change the header height) cannot loop.
            if (typeof ResizeObserver !== 'undefined') {
                var lastW = 0, lastH = 0;
                var observer = new ResizeObserver(function () {
                    var b = svg.node().getBoundingClientRect();
                    var w = Math.round(b.width), h = Math.round(b.height);
                    if (Math.abs(w - lastW) < 2 && Math.abs(h - lastH) < 2) return;
                    lastW = w; lastH = h;
                    render(false);   // reflow, not a data change: snap, don't animate
                });
                observer.observe(container);
            }
        });
    }

    /**
     * Drop any subject emphasis held by this chart. Called by the global
     * "Reset all selections" so the view does not stay dimmed on its own.
     */
    chart.clearSubjectHighlight = function () {
        hoveredCategory = null;
        lockedCategory = null;
        if (applyFocus) applyFocus();
    };

    return chart;
}
