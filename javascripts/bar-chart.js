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
    var lockedCategories = [];              // empty means "no focus" = show all
    var applyFocus = null;

    /**
     * Categories in focus: the locked set UNION whatever is hovered. Hovering
     * must never drop a pinned subject — it adds a transient layer on top and
     * previews what a cmd/ctrl-click would add. Empty means "show everything".
     */
    function focusedCategories() {
        if (hoveredCategory === null) return lockedCategories;
        if (lockedCategories.indexOf(hoveredCategory) > -1) return lockedCategories;
        return lockedCategories.concat([hoveredCategory]);
    }

    // Opacity says "in focus"; the outline says "pinned". Two states, two
    // channels — otherwise hovered and selected are indistinguishable.
    function barOpacity(d) {
        var focus = focusedCategories();
        if (!focus.length) return 1;
        return focus.indexOf(d.category) > -1 ? 1 : 0.25;
    }

    function barStroke(d) {
        return lockedCategories.indexOf(d.category) > -1 ? '#333' : 'none';
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
                if (d.govDecided === undefined) d.govDecided = 0;
                if (d.govPrevailed === undefined) d.govPrevailed = 0;
                d.rate = d.frequency ? d.approved / d.frequency : 0;
                // Its own denominator: only the roll calls where the government
                // declared a direction. Dividing by `frequency` would read every
                // roll call it stayed out of as a government defeat.
                d.govRate = d.govDecided ? d.govPrevailed / d.govDecided : 0;
            });

            // Baselines for the reference line, one per mode — each against its
            // own denominator, for the same reason.
            var grandTotal = d3.sum(data, function (d) { return d.frequency; });
            var grandApproved = d3.sum(data, function (d) { return d.approved; });
            var grandGovDecided = d3.sum(data, function (d) { return d.govDecided; });
            var grandGovPrevailed = d3.sum(data, function (d) { return d.govPrevailed; });
            var globalRate = grandTotal ? grandApproved / grandTotal : 0;
            var globalGovRate = grandGovDecided ? grandGovPrevailed / grandGovDecided : 0;

            // The Chamber only began publishing leader orientations consistently
            // around 1999, so an earlier slice has nothing to measure here.
            var hasGovData = grandGovDecided > 0;

            // The three modes measure different things over different
            // denominators. Every read goes through these, so the two rates
            // cannot end up sharing a denominator by accident.
            function isRateMode() { return isThemes && (view.mode === 'rate' || view.mode === 'gov'); }
            function denominator(d) { return view.mode === 'gov' ? d.govDecided : d.frequency; }
            function numerator(d) { return view.mode === 'gov' ? d.govPrevailed : d.approved; }
            function shareOf(d) { return view.mode === 'gov' ? d.govRate : d.rate; }
            function baseline() { return view.mode === 'gov' ? globalGovRate : globalRate; }

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

            // Segmented control: mutually exclusive views. An option the current
            // slice has no data for is greyed and explains itself on hover,
            // rather than disappearing — otherwise the view looks like it does
            // not exist instead of not applying here.
            function segmented(group, options, current, onPick) {
                var wrap = group.append("div")
                    .style("display", "inline-flex")
                    .style("border", "1px solid #ccc").style("border-radius", "4px")
                    .style("overflow", "hidden");

                var buttons = options.map(function (opt, i) {
                    return wrap.append("button")
                        .attr("type", "button")
                        .attr("data-value", opt.value)
                        .attr("title", opt.title || null)
                        .text(opt.label)
                        .property("disabled", !!opt.disabled)
                        .style("border", "none")
                        .style("border-left", i ? "1px solid #ccc" : "none")
                        .style("padding", "4px 11px")
                        .style("font-size", "13px")
                        .style("cursor", opt.disabled ? "not-allowed" : "pointer")
                        .on("click", function () {
                            d3.event.stopPropagation();
                            if (opt.disabled) return;
                            paint(opt.value);
                            onPick(opt.value);
                        });
                });

                // Repaint from the options every time, so a disabled button
                // keeps its greyed look instead of being reset to the idle style.
                function paint(active) {
                    buttons.forEach(function (btn, i) {
                        var opt = options[i];
                        var on = opt.value === active;
                        btn.style("background", on ? "#4575b4" : "#fff")
                            .style("color", opt.disabled ? "#bbb" : (on ? "#fff" : "#333"));
                    });
                }
                paint(current);
            }

            if (isThemes) {
                segmented(addGroup(t("View:")), [
                    { value: 'volume', label: t("Volume") },
                    { value: 'rate', label: t("Approval rate") },
                    {
                        value: 'gov',
                        label: t("Government success"),
                        disabled: !hasGovData,
                        title: hasGovData
                            ? t("Share of roll calls that ended the way the government asked")
                            : t("No party-leader orientations published in this period")
                    }
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

            // What each view means and how its number is reached. Written per
            // mode rather than as one "about this chart", so it always describes
            // what is actually on screen — the three views count different
            // things over different denominators, and the differences are
            // exactly what a reader would otherwise get wrong.
            var infoOpen = false, info = null, infoBtn = null;
            if (isThemes) {
                infoBtn = addGroup(null).append("button")
                    .attr("type", "button")
                    .attr("aria-expanded", "false")
                    .attr("title", t("About this view"))
                    .text("i")
                    .style("width", "20px").style("height", "20px")
                    .style("border", "1px solid #ccc").style("border-radius", "50%")
                    .style("background", "#fff").style("color", "#555")
                    .style("font-size", "12px").style("font-style", "italic")
                    .style("font-family", "Georgia, serif")
                    .style("line-height", "1").style("padding", "0")
                    .style("cursor", "pointer")
                    .on("click", function () {
                        d3.event.stopPropagation();
                        infoOpen = !infoOpen;
                        // The panel lives in the header, which the SVG flexes
                        // against — re-render so the plot reclaims the space.
                        // Snap rather than animate: this is a reflow, not data.
                        render(false);
                    });

                info = header.append("div")
                    .attr("class", "bar-chart-info")
                    .style("display", "none")
                    .style("margin-top", "8px")
                    .style("padding", "9px 12px")
                    .style("background", "#f6f7f9")
                    .style("border", "1px solid #e2e6eb")
                    .style("border-radius", "4px")
                    .style("font-size", "12px").style("line-height", "1.5")
                    .style("color", "#444");
            }

            function infoLines(mode) {
                var pt = (typeof language !== 'undefined' && language === PORTUGUESE);
                if (mode === 'gov') {
                    return pt ? [
                        ["O que mostra", "Em que fração das votações do tema o plenário entregou o resultado que o líder do governo pediu."],
                        ["Denominador", "Só as votações em que o governo declarou Sim ou Não — 69% do total. \"Liberado\" é o governo não tomar partido, e fica de fora."],
                        ["Atenção", "Inclui votações procedimentais, que são a maioria. Mede controle de pauta, não aprovação de lei."],
                        ["Cobertura", "A Câmara só publica orientação de bancada com regularidade a partir de 1999."]
                    ] : [
                        ["What it shows", "The share of the theme's roll calls where the floor delivered what the government's leader asked for."],
                        ["Denominator", "Only roll calls where the government declared Sim or Não — 69% of the total. \"Liberado\" means it took no side, and is excluded."],
                        ["Caveat", "Procedural roll calls are included, and they are the majority. This measures agenda control, not law-making."],
                        ["Coverage", "The Chamber only publishes leader orientations consistently from 1999 on."]
                    ];
                }
                if (mode === 'rate') {
                    return pt ? [
                        ["O que mostra", "Em que fração das votações do tema a matéria avançou."],
                        ["Como decide", "Vale o veredito do texto (\"aprovada\"/\"rejeitada\"), que já embute as regras de quórum — PEC exige 3/5, PLP maioria absoluta. Sem veredito no texto, vale a maioria simples dos votos."],
                        ["Atenção", "Cerca de 4 em cada 5 votações são procedimentais. Derrubar um requerimento não é derrubar a matéria."]
                    ] : [
                        ["What it shows", "The share of the theme's roll calls where the matter advanced."],
                        ["How it's decided", "The recorded verdict wins (\"aprovada\"/\"rejeitada\"), since it already reflects quorum rules — 3/5 for a PEC, absolute majority for a PLP. With no verdict in the text, a simple majority of the votes decides."],
                        ["Caveat", "Roughly 4 in 5 roll calls are procedural. Defeating a motion is not the same as defeating the matter."]
                    ];
                }
                return pt ? [
                    ["O que mostra", "Quantas votações cada tema teve no recorte atual."],
                    ["Como conta", "Toda votação nominal do tema: mérito, requerimento e destaque."]
                ] : [
                    ["What it shows", "How many roll calls each theme had in the current slice."],
                    ["How it counts", "Every recorded roll call on the theme: merits, motions and separate votes."]
                ];
            }

            function renderInfo(mode) {
                if (!info) return;   // parties chart: no views to explain

                info.style("display", infoOpen ? "block" : "none");
                infoBtn.attr("aria-expanded", infoOpen ? "true" : "false")
                    .style("background", infoOpen ? "#4575b4" : "#fff")
                    .style("color", infoOpen ? "#fff" : "#555");
                if (!infoOpen) return;

                var rows = info.selectAll("div.info-row").data(infoLines(mode));
                rows.enter().append("div").attr("class", "info-row").style("margin-bottom", "3px");
                rows.exit().remove();
                rows.html(function (d) {
                    return "<strong>" + d[0] + ":</strong> " + d[1];
                });
            }

            // Legend (right side of the controls row).
            //
            // The two hues keep one meaning across modes — the outcome the
            // current mode measures either happened or it did not — so the
            // labels are what change, not the encoding. Only one mode is on
            // screen at a time, and the legend always names the mode's terms.
            var legend = null, legendPositive = null, legendNegative = null;
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
                legendPositive = legend.append("span").style("margin-right", "8px");
                swatch(REJECTED_COLOR);
                legendNegative = legend.append("span");
            }

            // Composed strings take parameters and a plural, so build them
            // explicitly rather than concatenating dictionary fragments.
            function hiddenNotice(count, minN, mode) {
                var pt = (typeof language !== 'undefined' && language === PORTUGUESE);
                var subjects = pt
                    ? count + (count === 1 ? " tema oculto" : " temas ocultos")
                    : count + (count === 1 ? " subject hidden" : " subjects hidden");

                // In government mode the threshold counts a narrower set — only
                // the roll calls the government took a side on — so saying just
                // "votes" would point at the wrong number.
                if (mode === 'gov') {
                    return subjects + (pt
                        ? " (menos de " + minN + (minN === 1 ? " votação" : " votações") +
                          " com posição declarada do governo)"
                        : " (fewer than " + minN + " roll calls with a declared government position)");
                }
                return subjects + (pt
                    ? " (menos de " + minN + " votações)"
                    : " (fewer than " + minN + " votes)");
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
                // Threshold applies to the mode's own denominator. In government
                // mode this also drops themes with no declared position at all,
                // which would otherwise plot as a flat 0% and read as a total
                // government defeat instead of an absence of data.
                var arr = data.filter(function (d) { return denominator(d) >= view.minN; });
                if (view.sort === 'alpha') {
                    arr.sort(function (a, b) {
                        if (language === ENGLISH && isThemes) {
                            return d3.ascending(subjectsToEnglish[a.category], subjectsToEnglish[b.category]);
                        }
                        return d3.ascending(a.category, b.category);
                    });
                } else if (isRateMode()) {
                    arr.sort(function (a, b) {
                        return d3.descending(shareOf(a), shareOf(b)) ||
                            d3.descending(denominator(a), denominator(b));
                    });
                } else {
                    arr.sort(function (a, b) { return b.frequency - a.frequency; });
                }
                return arr;
            }

            function render(animate) {
                // Layout reflows (resize) must snap; only data/view changes animate.
                var dur = (animate === false) ? 0 : DURATION;

                // Settle the header before measuring: the info panel lives in
                // it and the plot flexes against what the header leaves over, so
                // opening it after the measurement would size the viewBox to a
                // box that no longer exists.
                renderInfo(view.mode);

                // Match the viewBox aspect to the SVG's ACTUAL rendered box, so
                // the drawing fills it exactly — no letterbox band, no overflow.
                // Flex already decided that box; we only mirror it.
                var box = svg.node().getBoundingClientRect();
                var cw = Math.round(box.width) || MAX_WIDTH;
                var boxHeight = Math.round(box.height) || MAX_HEIGHT;
                height = Math.round(MAX_WIDTH * boxHeight / cw);

                svg.attr("viewBox", "0 0 " + width + " " + height);

                var rateMode = isRateMode();
                var vis = visibleData();
                var hidden = data.length - vis.length;

                notice.text(hidden > 0 ? hiddenNotice(hidden, view.minN, view.mode) : "");

                if (legend) {
                    legendPositive.text(view.mode === 'gov' ? t("government prevailed") : t("approved"));
                    legendNegative.text(view.mode === 'gov' ? t("government defeated") : t("rejected"));
                }

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

                // Keep the "pinned" marker through re-renders (mode/sort/filter).
                bar.selectAll("rect")
                    .style("stroke", barStroke)
                    .style("stroke-width", 1.5);

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
                        return scale(rateMode ? shareOf(d) : numerator(d));
                    });

                bar.select("rect.seg-rejected")
                    .attr("fill", REJECTED_COLOR)
                    .transition().duration(dur)
                    .attr("height", barHeight)
                    .attr("x", function (d) {
                        var start = scale(rateMode ? shareOf(d) : numerator(d));
                        return labelWidth + start + (start > 0 ? SEGMENT_GAP : 0);
                    })
                    .attr("width", function (d) {
                        if (!isThemes) return 0;
                        var start = scale(rateMode ? shareOf(d) : numerator(d));
                        var full = scale(rateMode ? 1 : d.frequency);
                        return Math.max(0, full - start - (start > 0 ? SEGMENT_GAP : 0));
                    });

                bar.select("text.value")
                    .attr("dy", ".35em")
                    .attr("text-anchor", "start")
                    .text(function (d) {
                        // n is the mode's denominator, so the reader can tell a
                        // 100% built on 3 roll calls from one built on 90.
                        if (rateMode) return Math.round(shareOf(d) * 100) + "%   n=" + denominator(d);
                        return d.frequency;
                    })
                    .transition().duration(dur)
                    .attr("y", barHeight / 2)
                    .attr("x", function (d) { return labelWidth + barEnd(d) + 10; });

                // Reference line: the slice's overall rate under the current
                // mode. Only meaningful against a percentage axis.
                refG.transition().duration(dur).style("opacity", rateMode ? 1 : 0);
                if (rateMode) {
                    var refRate = baseline();
                    var refX = marginX + labelWidth + scale(refRate);
                    refG.select("line")
                        .transition().duration(dur)
                        .attr("x1", refX).attr("x2", refX)
                        .attr("y1", topMargin).attr("y2", axisY);
                    refG.select("text")
                        .text(t("average") + " " + Math.round(refRate * 100) + "%")
                        .transition().duration(dur)
                        .attr("x", refX + 6).attr("y", topMargin);
                }

                bar.on("mousemove", function (d) {
                    div.style("left", d3.event.pageX + 10 + "px");
                    div.style("top", d3.event.pageY - 25 + "px");
                    div.style("display", "inline-block");

                    var subject = "<strong>" + getCategoryLabel(d.category) + "</strong>";
                    var pt = (typeof language !== 'undefined' && language === PORTUGUESE);

                    if (!isThemes) {
                        div.html(subject + "<br>" + d.frequency);
                        return;
                    }

                    // Spell out the denominator: in government mode it is the
                    // subset with a declared position, not every roll call.
                    if (view.mode === 'gov') {
                        var govPct = d.govDecided ? Math.round(100 * d.govPrevailed / d.govDecided) : 0;
                        div.html(subject + "<br>" + (pt
                            ? govPct + "% de sucesso do governo · " + d.govPrevailed + " de " +
                              d.govDecided + " votações com posição declarada"
                            : govPct + "% government success · " + d.govPrevailed + " of " +
                              d.govDecided + " roll calls with a declared position"));
                        return;
                    }

                    var pct = d.frequency ? Math.round(100 * d.approved / d.frequency) : 0;
                    div.html(subject + "<br>" + (pt
                        ? pct + "% aprovadas · " + d.approved + " de " + d.frequency + " votações"
                        : pct + "% approved · " + d.approved + " of " + d.frequency + " votes"));
                });

                bar.on("mouseout", function () { div.style("display", "none"); });

                // Re-emphasis inside this chart: the focused subject stays lit,
                // the rest recede — the same language the map speaks.
                applyFocus = function () {
                    barsG.selectAll("g.bar")
                        .transition().duration(160)
                        .style("opacity", barOpacity);
                    // Stroke is not animated: it is a state marker, not a value.
                    barsG.selectAll("g.bar").selectAll("rect")
                        .style("stroke", barStroke)
                        .style("stroke-width", 1.5);
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
                            // Cmd/Ctrl held: stack subjects (toggle membership).
                            // Plain click: single subject, or clear if it was the
                            // only one. Empty selection means "all shown".
                            var additive = d3.event.metaKey || d3.event.ctrlKey;
                            if (additive) d3.event.preventDefault();   // macOS ctrl-click opens a context menu

                            if (typeof subjectLinking !== 'undefined') {
                                lockedCategories = subjectLinking.toggleIn(lockedCategories, d.category, additive);
                                subjectLinking.setLock(panelID, lockedCategories);
                            }
                            applyFocus();
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
        lockedCategories = [];
        if (applyFocus) applyFocus();
    };

    return chart;
}
