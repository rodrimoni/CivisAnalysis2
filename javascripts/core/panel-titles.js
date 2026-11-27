/**
 * Panel Titles
 *
 * Single source for the title and subtitle of every panel, so each view says
 * exactly what it shows and all views say it the same way:
 *
 *   <View>[ (technique)][: <group>] · <period>
 *   <exact date range>
 *
 * The period comes from the real date range of the panel (never from the
 * year-only `period-YYYY-YYYY` key), and it is described by kind:
 *   - legislature / presidential term: its name ("53rd Legislature")
 *   - calendar year: "2019"
 *   - free brush selection: month precision ("Jan 2019 – Jun 2022")
 *
 * Range ends follow the app's convention: a year is [1 Jan y, 1 Jan y+1] and the
 * brush end is the first instant after the selection, so the last day shown is
 * the one just before the end. Legislatures and presidential terms keep the
 * nominal dates from CONGRESS_DEFINE.
 *
 * The Timeline of Selected draws precomputed *calendar-year* spectra, so for a
 * free selection it only shows the years entirely inside it (a partial year
 * would show positions computed with votes outside the selection).
 *
 * Pure functions: the browser wrapper (`panelTitle`) feeds the globals, the
 * verification script feeds fixtures.
 */

var PANEL_TITLE_SEPARATOR = ' · ';

var PANEL_VIEW_NAMES = {
    spectrum: { en: 'Political Spectrum', pt: 'Espectro político' },
    similarity: { en: 'Similarity Graph', pt: 'Grafo de similaridade' },
    infographic: { en: 'Chamber Infographic', pt: 'Infográfico da Câmara' },
    map: { en: 'Map of Roll Calls', pt: 'Mapa de Votações' },
    subjects: { en: 'Subjects', pt: 'Temas' },
    comparison: { en: 'Cohesion Comparison', pt: 'Comparação de coesão' },
    agreement: { en: 'Agreement by Subject', pt: 'Concordância por tema' },
    crop: { en: 'Timeline of Selected', pt: 'Linha do tempo da seleção' },
    deputiesCohesion: { en: 'Deputies Cohesion Timeline', pt: 'Linha do tempo de coesão dos deputados' },
    partyMetrics: { en: 'Party Metrics', pt: 'Métricas do partido' },
    cohesionTimeline: { en: 'Cohesion Timeline', pt: 'Linha do tempo de coesão' },
    // Cohesion Timeline of several parties, named as the chart names itself
    // ("Coalition Cohesion Over Time"); its parties go to the subtitle.
    coalitionCohesion: { en: 'Coalition Cohesion', pt: 'Coesão da coalizão' }
};

// A group of many parties would push the title past the panel's buttons:
// name the first few and count the rest; the full list goes in the tooltip.
var PANEL_GROUP_MAX = 4;

function summarizeGroup(group) {
    if (!Array.isArray(group)) return group;
    if (group.length <= PANEL_GROUP_MAX) return group.join(', ');
    return group.slice(0, PANEL_GROUP_MAX).join(', ') + ' +' + (group.length - PANEL_GROUP_MAX);
}

function fullGroup(group) { return Array.isArray(group) ? group.join(', ') : group; }

var PANEL_MONTHS = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    pt: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
};

var PANEL_PHRASES = {
    completeYears: { en: 'Complete years within ', pt: 'Anos completos em ' },
    noCompleteYear: { en: 'No complete year within ', pt: 'Nenhum ano completo em ' }
};

function panelLang(lang) { return lang === 'pt' ? 'pt' : 'en'; }

/** The last instant covered by an exclusive end. */
function lastCoveredDay(end) { return new Date(end.getTime() - 1); }

function formatDay(date, lang) {
    return date.getDate() + ' ' + PANEL_MONTHS[panelLang(lang)][date.getMonth()] + ' ' + date.getFullYear();
}

function formatMonth(date, lang) {
    return PANEL_MONTHS[panelLang(lang)][date.getMonth()] + ' ' + date.getFullYear();
}

function formatDayRange(start, endInclusive, lang) {
    return formatDay(start, lang) + ' – ' + formatDay(endInclusive, lang);
}

function sameInstant(a, b) { return a.getTime() === b.getTime(); }

/**
 * Identify a date range against the app's named periods.
 * @param {Date[]} range - [start, end]
 * @param {Object} defs - { years, legislatures, presidents } as in CONGRESS_DEFINE
 * @returns {{kind: string, index: (number|undefined), item: (Object|undefined)}}
 */
function classifyPeriod(range, defs) {
    var kinds = [['year', defs.years || []], ['legislature', defs.legislatures || []], ['president', defs.presidents || []]];
    for (var k = 0; k < kinds.length; k++) {
        var list = kinds[k][1];
        for (var i = 0; i < list.length; i++) {
            if (sameInstant(list[i].period[0], range[0]) && sameInstant(list[i].period[1], range[1]))
                return { kind: kinds[k][0], index: i, item: list[i] };
        }
    }
    return { kind: 'period' };
}

/**
 * Describe a range as a title label plus the exact dates for the subtitle.
 * @param {Date[]} range
 * @param {Object} defs - CONGRESS_DEFINE-like
 * @param {string} lang - 'en' | 'pt'
 * @param {Function} [translate] - maps an English period name to the UI language
 */
function describePeriod(range, defs, lang, translate) {
    var tr = translate || function (s) { return s; };
    var c = classifyPeriod(range, defs);
    if (c.kind === 'legislature' || c.kind === 'president') {
        // The dictionary abbreviates terms for the timeline ("2º Man");
        // a title has room for the full word.
        var name = String(tr(c.item.name)).replace(/º Man$/, 'º Mandato');
        return {
            kind: c.kind,
            label: name,
            subtitle: formatDayRange(c.item.period[0], c.item.period[1], lang)
        };
    }
    var last = lastCoveredDay(range[1]);
    if (c.kind === 'year') {
        return {
            kind: 'year',
            label: String(range[0].getFullYear()),
            subtitle: formatDayRange(range[0], last, lang)
        };
    }
    var startLabel = formatMonth(range[0], lang);
    var endLabel = formatMonth(last, lang);
    return {
        kind: 'period',
        label: startLabel === endLabel ? startLabel : startLabel + ' – ' + endLabel,
        subtitle: formatDayRange(range[0], last, lang)
    };
}

/**
 * Calendar years entirely inside a range: [firstYear, lastYear] (inclusive),
 * or null when there is none.
 */
function completeYearsWithin(range) {
    var start = range[0], end = range[1];
    var first = (start.getMonth() === 0 && start.getDate() === 1 && start.getHours() === 0 &&
        start.getMinutes() === 0 && start.getSeconds() === 0 && start.getMilliseconds() === 0)
        ? start.getFullYear() : start.getFullYear() + 1;
    var last = end.getFullYear() - 1; // 1 Jan of end's year is always <= end
    return first <= last ? [first, last] : null;
}

/**
 * Years drawn by the Timeline of Selected for a parent range, as the
 * [start, end) period the chart expects (one column per year in
 * d3.range(start.year, end.year)). Named periods keep their own span, as
 * before; free selections keep only their complete years.
 * @returns {{period: (Date[]|null), years: (number[]|null), kind: string}}
 */
function cropPeriod(range, defs) {
    var c = classifyPeriod(range, defs);
    if (c.kind === 'legislature' || c.kind === 'president') {
        // Same columns as before (start year .. year before the end), but the
        // axis is snapped to 1 Jan: a legislature ends on 31 Jan, and that
        // extra month used to leave an empty strip after the last column.
        var first = c.item.period[0].getFullYear();
        var last = c.item.period[1].getFullYear() - 1;
        return {
            kind: c.kind,
            period: [new Date(first, 0, 1), new Date(last + 1, 0, 1)],
            years: [first, last]
        };
    }
    if (c.kind === 'year') return { kind: 'year', period: null, years: null };
    var years = completeYearsWithin(range);
    if (!years) return { kind: 'period', period: null, years: null };
    return {
        kind: 'period',
        period: [new Date(years[0], 0, 1), new Date(years[1] + 1, 0, 1)],
        years: years
    };
}

/** The crop needs at least two yearly columns. */
function canCrop(range, defs) {
    var p = cropPeriod(range, defs);
    return p.years !== null && p.years[1] - p.years[0] >= 1;
}

function escapeTitle(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Build a panel title.
 * @param {string} view - key of PANEL_VIEW_NAMES
 * @param {Date[]} range - the panel's real date range
 * @param {Object} opts - { lang, defs, translate, technique, group }
 * @returns {{text: string, subtitle: string, html: string}}
 */
function buildPanelTitle(view, range, opts) {
    opts = opts || {};
    var lang = panelLang(opts.lang);
    var names = PANEL_VIEW_NAMES[view];
    if (!names) throw new Error('Unknown panel view: ' + view);

    // Several parties do not fit the title line of a default-size panel: the
    // view becomes the coalition one and the parties move to the subtitle.
    var multiGroup = Array.isArray(opts.group) && opts.group.length > 1;
    if (multiGroup && view === 'cohesionTimeline') names = PANEL_VIEW_NAMES.coalitionCohesion;

    var head = names[lang];
    if (opts.technique) head += ' (' + opts.technique + ')';
    var fullHead = head;
    var hasGroup = Array.isArray(opts.group) ? opts.group.length > 0 : !!opts.group;
    var groupLine = null, fullGroupLine = null;
    if (hasGroup && multiGroup) {
        groupLine = summarizeGroup(opts.group);
        fullGroupLine = fullGroup(opts.group);
    } else if (hasGroup) {
        head += ': ' + fullGroup(opts.group);
        fullHead = head;
    }

    var period = describePeriod(range, opts.defs || {}, lang, opts.translate);
    var label = period.label;
    var subtitle = period.subtitle;

    if (view === 'crop' && period.kind === 'period') {
        var years = completeYearsWithin(range);
        if (years) {
            label = years[0] === years[1] ? String(years[0]) : years[0] + '–' + years[1];
            subtitle = PANEL_PHRASES.completeYears[lang] + period.subtitle;
        } else {
            subtitle = PANEL_PHRASES.noCompleteYear[lang] + period.subtitle;
        }
    }

    var fullSubtitle = subtitle;
    if (groupLine) {
        fullSubtitle = fullGroupLine + PANEL_TITLE_SEPARATOR + subtitle;
        subtitle = groupLine + PANEL_TITLE_SEPARATOR + subtitle;
    }

    var text = head + PANEL_TITLE_SEPARATOR + label;
    var fullText = fullHead + PANEL_TITLE_SEPARATOR + label;
    // One span for the title, one for the subtitle: the "custom title" editor
    // (ui-menu-factory.js) demotes the first span after the icon to a subtitle.
    // Both are clipped with an ellipsis in narrow panels (windows-system.css),
    // so each carries its full text as a tooltip.
    // The head (view and group) shrinks first; the period is never clipped.
    var html = '<span class="panel-main-title" title="' + escapeTitle(fullText) + '">' +
        '<span class="panel-title-head">' + escapeTitle(head) + '</span>' +
        '<span class="panel-title-period">' + escapeTitle(PANEL_TITLE_SEPARATOR + label) + '</span>' +
        '</span>' +
        '<br><span class="panel-subtitle" title="' + escapeTitle(fullSubtitle) + '">' + escapeTitle(subtitle) + '</span>';
    return { text: text, fullText: fullText, subtitle: subtitle, fullSubtitle: fullSubtitle, html: html };
}

/**
 * Browser wrapper: reads the UI language, the dictionary and CONGRESS_DEFINE.
 * @returns {{title: string, prettyTitle: string}} ready for a chartObj
 */
function panelTitle(view, range, opts) {
    opts = opts || {};
    if (!range) { // should not happen; keep the view name rather than fail
        var name = PANEL_VIEW_NAMES[view] ? PANEL_VIEW_NAMES[view].en : view;
        return { title: '<span>' + name + '</span>', prettyTitle: name };
    }
    var isPt = (typeof language !== 'undefined' && typeof PORTUGUESE !== 'undefined' && language === PORTUGUESE);
    var built = buildPanelTitle(view, range, {
        lang: isPt ? 'pt' : 'en',
        defs: (typeof CONGRESS_DEFINE !== 'undefined') ? CONGRESS_DEFINE : {},
        translate: (typeof t === 'function') ? t : null,
        technique: opts.technique,
        group: opts.group
    });
    return { title: built.html, prettyTitle: built.text };
}

// Node-only export for the verification script (ignored in the browser).
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        buildPanelTitle: buildPanelTitle,
        describePeriod: describePeriod,
        classifyPeriod: classifyPeriod,
        completeYearsWithin: completeYearsWithin,
        cropPeriod: cropPeriod,
        canCrop: canCrop,
        PANEL_VIEW_NAMES: PANEL_VIEW_NAMES,
        summarizeGroup: summarizeGroup
    };
}
