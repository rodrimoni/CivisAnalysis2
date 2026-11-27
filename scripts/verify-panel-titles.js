/*
 * Checks every panel title against the format in javascripts/core/panel-titles.js:
 *
 *   <View>[ (technique)][: <group>] · <period>     +  subtitle with exact dates
 *
 * for each view and each kind of period (legislature, presidential term,
 * calendar year, free brush selection), in English and Portuguese, plus the
 * Timeline of Selected rule (only calendar years entirely inside a free
 * selection) and the menu gate that depends on it.
 *
 * Run: node scripts/verify-panel-titles.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const titles = require('../javascripts/core/panel-titles.js');
const { buildPanelTitle, cropPeriod, canCrop, completeYearsWithin } = titles;

// ---- the app's real period definitions (browser file, loaded in a sandbox) ----
function loadCongressDefine() {
    // Only the period tables are needed: stop before the color scales and the
    // party traces, which depend on other browser globals.
    const full = fs.readFileSync(path.join(__dirname, '..', 'javascripts', 'congress-definitions.js'), 'utf8');
    const src = full.slice(0, full.indexOf('CONGRESS_DEFINE.votingColor'));
    const chain = new Proxy(function () { return chain; }, { get: () => chain, apply: () => chain });
    const sandbox = {
        $: { map: (arr, f) => arr.map(f) },
        d3: new Proxy({
            range: (a, b) => { const r = []; for (let i = a; i < (b === undefined ? a : b); i++) r.push(i); return b === undefined ? Array.from({ length: a }, (_, i) => i) : r; }
        }, { get: (o, k) => (k in o ? o[k] : chain) }),
        Date: Date
    };
    vm.createContext(sandbox);
    vm.runInContext(src + '\nthis.CONGRESS_DEFINE = CONGRESS_DEFINE;', sandbox);
    return sandbox.CONGRESS_DEFINE;
}
const DEFS = loadCongressDefine();

// Portuguese names, as the dictionary gives them
const dictSrc = fs.readFileSync(path.join(__dirname, '..', 'javascripts', 'dict.js'), 'utf8');
function ptName(en) {
    const m = new RegExp('"' + en.replace(/[()]/g, '\\$&') + '":\\s*{\\s*br:\\s*"([^"]+)"').exec(dictSrc);
    return m ? m[1] : en;
}

let failures = 0;
function eq(name, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name + (ok ? '' : '\n       got  ' + JSON.stringify(actual) + '\n       want ' + JSON.stringify(expected)));
    if (!ok) failures++;
}

const en = (view, range, extra) => buildPanelTitle(view, range, Object.assign({ lang: 'en', defs: DEFS }, extra || {}));
const pt = (view, range, extra) => buildPanelTitle(view, range, Object.assign({ lang: 'pt', defs: DEFS, translate: ptName }, extra || {}));

// ---- periods used across the checks ----
const LEG53 = DEFS.legislatures.find(l => l.name === '53rd Legislature').period;
const LULA2 = DEFS.presidents.find(p => p.name === 'Lula (PT) 2nd Term').period;
const Y2019 = DEFS.years.find(y => y.name === 2019).period;
const FREE = [new Date(2019, 0, 1), new Date(2022, 6, 1)];      // brush 1/1/2019 → 7/1/2022
const FREE_JAN = [new Date(2019, 0, 1), new Date(2027, 0, 1)];  // ends exactly on 1 Jan
const FREE_MID = [new Date(2019, 5, 1), new Date(2022, 6, 1)];  // starts mid-year
const FREE_FEB = [new Date(2019, 1, 1), new Date(2020, 8, 1)];  // the "Subjects: 2019 to 2020" case

// ---- 0. ordinals and names ----
eq('legislature ordinals are English ordinals (51st, 52nd, 53rd)',
    DEFS.legislatures.map(l => l.name).filter(n => /\b(51|52|53)/.test(n)),
    ['51st Legislature', '52nd Legislature', '53rd Legislature']);
eq('every legislature has a Portuguese name in the dictionary',
    DEFS.legislatures.filter(l => ptName(l.name) === l.name).map(l => l.name), []);

// ---- 1. every view, every kind of period (English) ----
const VIEWS = [
    ['spectrum', { technique: 'PCA' }, 'Political Spectrum (PCA)'],
    ['spectrum', { technique: 'W-NOMINATE' }, 'Political Spectrum (W-NOMINATE)'],
    ['similarity', {}, 'Similarity Graph'],
    ['infographic', {}, 'Chamber Infographic'],
    ['map', {}, 'Map of Roll Calls'],
    ['subjects', {}, 'Subjects'],
    ['comparison', {}, 'Cohesion Comparison'],
    ['agreement', {}, 'Agreement by Subject'],
    ['deputiesCohesion', {}, 'Deputies Cohesion Timeline'],
    ['partyMetrics', { group: 'PT' }, 'Party Metrics: PT'],
    ['cohesionTimeline', { group: 'PT, PSOL' }, 'Cohesion Timeline: PT, PSOL']
];
VIEWS.forEach(([view, extra, head]) => {
    eq(view + ' · legislature', [en(view, LEG53, extra).text, en(view, LEG53, extra).subtitle],
        [head + ' · 53rd Legislature', '1 Feb 2007 – 31 Jan 2011']);
    eq(view + ' · presidential term', [en(view, LULA2, extra).text, en(view, LULA2, extra).subtitle],
        [head + ' · Lula (PT) 2nd Term', '1 Jan 2007 – 1 Jan 2011']);
    eq(view + ' · year', [en(view, Y2019, extra).text, en(view, Y2019, extra).subtitle],
        [head + ' · 2019', '1 Jan 2019 – 31 Dec 2019']);
    eq(view + ' · free selection', [en(view, FREE, extra).text, en(view, FREE, extra).subtitle],
        [head + ' · Jan 2019 – Jun 2022', '1 Jan 2019 – 30 Jun 2022']);
});

// ---- 2. the cases reported in QA ----
eq('free selection ending on 1 Jan closes the previous year (was "to 2027")',
    en('map', FREE_JAN).text, 'Map of Roll Calls · Jan 2019 – Dec 2026');
eq('subjects keep the months of the parent selection (was "Subjects: 2019 to 2020")',
    [en('subjects', FREE_FEB).text, en('subjects', FREE_FEB).subtitle],
    ['Subjects · Feb 2019 – Aug 2020', '1 Feb 2019 – 31 Aug 2020']);
eq('selection inside one month shows that month once',
    en('map', [new Date(2020, 2, 1), new Date(2020, 3, 1)]).text, 'Map of Roll Calls · Mar 2020');

// ---- 3. Timeline of Selected: complete calendar years only ----
eq('crop · free selection drops the partial last year (2022)',
    [en('crop', FREE).text, en('crop', FREE).subtitle],
    ['Timeline of Selected · 2019–2021', 'Complete years within 1 Jan 2019 – 30 Jun 2022']);
eq('crop · free selection drops the partial first year (2019)',
    en('crop', FREE_MID).text, 'Timeline of Selected · 2020–2021');
eq('crop · selection ending on 1 Jan keeps the last full year',
    en('crop', FREE_JAN).text, 'Timeline of Selected · 2019–2026');
eq('crop · legislature keeps its own span and name',
    [en('crop', LEG53).text, en('crop', LEG53).subtitle],
    ['Timeline of Selected · 53rd Legislature', '1 Feb 2007 – 31 Jan 2011']);

eq('crop columns · free selection', cropPeriod(FREE, DEFS).years, [2019, 2021]);
eq('crop columns · period handed to the chart is [1 Jan first, 1 Jan last+1)',
    cropPeriod(FREE, DEFS).period.map(d => d.getTime()), [new Date(2019, 0, 1).getTime(), new Date(2022, 0, 1).getTime()]);
eq('crop columns · legislature unchanged (2007–2010)', cropPeriod(LEG53, DEFS).years, [2007, 2010]);
eq('crop axis · legislature snapped to 1 Jan, no empty month after the last column',
    cropPeriod(LEG53, DEFS).period.map(d => d.getTime()), [new Date(2007, 0, 1).getTime(), new Date(2011, 0, 1).getTime()]);
eq('complete years · none inside Jun 2019 – Mar 2020', completeYearsWithin([new Date(2019, 5, 1), new Date(2020, 2, 1)]), null);

eq('menu gate · two complete years → enabled', canCrop([new Date(2019, 0, 1), new Date(2021, 0, 1)], DEFS), true);
eq('menu gate · one complete year → disabled', canCrop([new Date(2019, 0, 1), new Date(2020, 6, 1)], DEFS), false);
eq('menu gate · calendar year → disabled', canCrop(Y2019, DEFS), false);
eq('menu gate · legislature → enabled', canCrop(LEG53, DEFS), true);

// ---- 4. Portuguese ----
eq('pt · legislature', [pt('map', LEG53).text, pt('map', LEG53).subtitle],
    ['Mapa de Votações · 53ª Legislatura', '1 fev 2007 – 31 jan 2011']);
eq('pt · presidential term spelled out', pt('spectrum', LULA2, { technique: 'PCA' }).text,
    'Espectro político (PCA) · Lula (PT) 2º Mandato');
eq('pt · free selection', pt('subjects', FREE_FEB).text, 'Temas · fev 2019 – ago 2020');
eq('pt · crop subtitle', pt('crop', FREE).subtitle, 'Anos completos em 1 jan 2019 – 30 jun 2022');

// ---- 5. HTML shape expected by the custom-title editor ----
const html = en('partyMetrics', FREE, { group: 'PT' }).html;
eq('html · one title span then the subtitle span, each with its full text as tooltip',
    html, '<span class="panel-main-title" title="Party Metrics: PT · Jan 2019 – Jun 2022">' +
    '<span class="panel-title-head">Party Metrics: PT</span><span class="panel-title-period"> · Jan 2019 – Jun 2022</span></span>' +
    '<br><span class="panel-subtitle" title="1 Jan 2019 – 30 Jun 2022">1 Jan 2019 – 30 Jun 2022</span>');

// ---- 5b. several parties: coalition title, parties in the subtitle ----
const FOUR = ['PT', 'PDT', 'PMDB', 'PTB'];
const SEVEN = ['PSOL', 'PT', 'PSDB', 'SDD', 'Missão', 'CIDADANIA', 'NOVO'];
const four = en('cohesionTimeline', LEG53, { group: FOUR });
eq('several parties · coalition title, period kept',
    four.text, 'Coalition Cohesion · 53rd Legislature');
eq('several parties · parties lead the subtitle',
    four.subtitle, 'PT, PDT, PMDB, PTB · 1 Feb 2007 – 31 Jan 2011');
const seven = en('cohesionTimeline', LEG53, { group: SEVEN });
eq('many parties · subtitle names four and counts the rest',
    seven.subtitle, 'PSOL, PT, PSDB, SDD +3 · 1 Feb 2007 – 31 Jan 2011');
eq('many parties · tooltip keeps every party',
    seven.fullSubtitle, 'PSOL, PT, PSDB, SDD, Missão, CIDADANIA, NOVO · 1 Feb 2007 – 31 Jan 2011');
eq('several parties · pt', pt('cohesionTimeline', LEG53, { group: FOUR }).text, 'Coesão da coalizão · 53ª Legislatura');
eq('one party in an array · stays in the title', en('cohesionTimeline', LEG53, { group: ['PT'] }).text,
    'Cohesion Timeline: PT · 53rd Legislature');
eq('empty group · no dangling colon', en('cohesionTimeline', LEG53, { group: [] }).text,
    'Cohesion Timeline · 53rd Legislature');

// ---- 6. no handler builds titles by hand any more ----
const handlers = fs.readFileSync(path.join(__dirname, '..', 'javascripts', 'events', 'event-handlers.js'), 'utf8');
eq('event-handlers.js · no toLocaleDateString in titles', (handlers.match(/toLocaleDateString/g) || []).length, 0);
eq('event-handlers.js · no year-only key parsed back into dates', /new Date\(lastYear, 0, 1\)/.test(handlers), false);

console.log(failures ? '\n' + failures + ' check(s) failed' : '\nAll panel-title checks passed');
process.exit(failures ? 1 : 0);
