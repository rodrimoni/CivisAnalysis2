/*
 * Renders the bar chart headlessly and checks what it drew.
 * Run: node scripts/verify-bar-chart.js
 *
 * The factory behind the subjects histogram also draws the parties bar chart,
 * so both are exercised here — a change aimed at one has broken the other
 * before.
 *
 * The failures worth catching are the quiet ones: a rate divided by the wrong
 * denominator, a hover that drops the pinned subject, a view that sorts by the
 * number it is no longer showing. All of those keep drawing a plausible chart.
 */
'use strict';

const { createHarness } = require('./chart-harness');

let failures = 0;
function check(name, ok, detail) {
    console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name);
    if (detail) console.log('       ' + detail);
    if (!ok) failures++;
}

// Saúde   passed 19/32 = 59% | government 16/20 = 80%
// Educação passed 19/27 = 70% | government  3/10 = 30%
// Economia passed  3/30 = 10% | government    0/0 — never took a side
// The two rates rank these differently and average differently, so a swapped
// denominator cannot pass by coincidence.
const THEMES = [
    { category: 'Saúde', frequency: 32, approved: 19, rejected: 13, govDecided: 20, govPrevailed: 16 },
    { category: 'Educação', frequency: 27, approved: 19, rejected: 8, govDecided: 10, govPrevailed: 3 },
    { category: 'Economia', frequency: 30, approved: 3, rejected: 27, govDecided: 0, govPrevailed: 0 }
];

const PARTIES = [
    { category: 'PT', frequency: 41 },
    { category: 'PSDB', frequency: 28 }
];

(async function run() {
    const h = createHarness();
    h.setBox(1200, 700);

    // ---------------------------------------------------------------- volume
    const themes = h.mount(THEMES, h.window.THEMES_BAR_CHART);
    await h.settle();

    let bars = h.bars(themes.container);
    check('volume: ranks by how often each subject was voted',
        bars.map(b => b.label).join(',') === 'Health,Economy,Education',
        bars.map(b => b.label + ' ' + b.value).join(' | '));

    check('volume: the n<5 subject is still shown, since the filter counts roll calls',
        bars.length === 3);

    // ------------------------------------------------------------- pass rate
    h.click(themes.container, 'button[data-value="rate"]');
    await h.settle();
    bars = h.bars(themes.container);

    check('pass rate: ranks by rate, not by volume',
        bars.map(b => b.label).join(',') === 'Education,Health,Economy',
        bars.map(b => b.label + ' ' + b.value).join(' | '));

    check('pass rate: baseline is the slice total, not the mean of the rates',
        /46%/.test(h.text(themes.container, '.reference-label')),
        h.text(themes.container, '.reference-label') + '  (41/89 = 46%; mean of rates would be 46.3%)');

    check('pass rate: bars normalize to the full width',
        Math.max(...bars.map(b => b.width)) - Math.min(...bars.map(b => b.width)) <= 4,
        'widths: ' + bars.map(b => Math.round(b.width)).join(', '));

    // ----------------------------------------------------- government success
    const govBtn = themes.container.querySelector('button[data-value="gov"]');
    check('government: the view is offered when the slice has orientations',
        !!govBtn && !govBtn.disabled);

    h.click(themes.container, 'button[data-value="gov"]');
    await h.settle();
    bars = h.bars(themes.container);

    check('government: divides by the roll calls it took a side on, not by all of them',
        /80%/.test(bars[0].value) && /n=20/.test(bars[0].value) &&
        /30%/.test(bars[1].value) && /n=10/.test(bars[1].value),
        bars.map(b => b.label + ' → ' + b.value).join(' | '));

    check('government: ranks by its own rate',
        bars.map(b => b.label).join(',') === 'Health,Education',
        bars.map(b => b.label).join(' > ') + '  (pass rate would be Education > Health)');

    check('government: baseline uses its own denominator',
        /63%/.test(h.text(themes.container, '.reference-label')),
        h.text(themes.container, '.reference-label') + '  (19/30 = 63%; pass rate was 46%)');

    check('government: a subject it never took a side on is dropped, not drawn at 0%',
        bars.length === 2 && !bars.some(b => b.label === 'Economy') &&
        /declared government position/.test(h.text(themes.container, '.bar-chart-notice') || ''),
        h.text(themes.container, '.bar-chart-notice'));

    check('government: the legend names this view\'s outcome',
        /government prevailed/.test(themes.container.textContent) &&
        /government defeated/.test(themes.container.textContent));

    // --------------------------------------------------------- the info panel
    const infoBtn = themes.container.querySelector('.bar-chart-controls button[aria-expanded]');
    check('info: starts closed', infoBtn.getAttribute('aria-expanded') === 'false');

    h.click(themes.container, '.bar-chart-controls button[aria-expanded]');
    await h.settle(400);
    const info = themes.container.querySelector('.bar-chart-info');
    check('info: explains the view that is on screen',
        info.style.display === 'block' && /frees the bench/.test(info.textContent),
        info.textContent.slice(0, 90) + '…');

    check('info: states the limit that changes how the number reads',
        /Procedural/.test(info.textContent) && /agenda/.test(info.textContent));

    h.click(themes.container, 'button[data-value="rate"]');
    await h.settle();
    check('info: follows the view rather than staying on one text',
        /quorum/i.test(info.textContent) && !/frees the bench/.test(info.textContent),
        info.textContent.slice(0, 90) + '…');

    h.click(themes.container, '.bar-chart-controls button[aria-expanded]');
    await h.settle(400);
    check('info: closes again', info.style.display === 'none');

    // ------------------------------------------------- linking back to the map
    h.clearLinkCalls();
    bars = h.bars(themes.container);
    const saude = bars.find(b => b.label === 'Health').node;
    const educacao = bars.find(b => b.label === 'Education').node;

    h.hover(themes.container, saude, 'mouseover');
    await h.settle(250);
    check('linking: hovering previews that subject on the map',
        JSON.stringify(h.linkCalls()) === '[["preview","Saúde"]]',
        JSON.stringify(h.linkCalls()));

    h.hover(themes.container, saude, 'mouseout');
    h.hover(themes.container, saude, 'click');
    await h.settle(250);
    check('linking: clicking locks the subject',
        h.linkCalls().some(c => c[0] === 'setLock' && JSON.stringify(c[1]) === '["Saúde"]'),
        JSON.stringify(h.linkCalls()));

    // ------------------------------------------------------- focus behaviour
    bars = h.bars(themes.container);
    check('focus: the locked subject stays lit and the rest recede',
        bars.find(b => b.label === 'Health').opacity === 1 &&
        bars.filter(b => b.label !== 'Health').every(b => b.opacity < 1),
        bars.map(b => b.label + '=' + b.opacity).join(' '));

    check('focus: only the locked subject is outlined',
        bars.find(b => b.label === 'Health').stroke !== 'none' &&
        bars.filter(b => b.label !== 'Health').every(b => b.stroke === 'none'),
        bars.map(b => b.label + '=' + b.stroke).join(' '));

    h.hover(themes.container, educacao, 'mouseover');
    await h.settle(250);
    bars = h.bars(themes.container);
    check('focus: hovering another subject does not drop the locked one',
        bars.find(b => b.label === 'Health').opacity === 1 &&
        bars.find(b => b.label === 'Education').opacity === 1,
        bars.map(b => b.label + '=' + b.opacity).join(' '));

    h.hover(themes.container, educacao, 'mouseout');
    await h.settle(250);
    bars = h.bars(themes.container);
    check('focus: leaving the hover returns to the locked subject alone',
        bars.find(b => b.label === 'Education').opacity < 1);

    // cmd-click stacks, cmd-click again removes, empty means everything
    h.clearLinkCalls();
    h.hover(themes.container, educacao, 'click');   // plain click replaces
    await h.settle(250);
    themes.container.querySelectorAll('g.bar').forEach(function (g) {
        g.dispatchEvent(new h.window.MouseEvent('click', { bubbles: true, metaKey: true }));
    });
    await h.settle(250);
    const locks = h.linkCalls().filter(c => c[0] === 'setLock').map(c => c[1]);
    check('multi-select: cmd-click stacks subjects and removes them again',
        locks.some(l => l.length > 1) && JSON.stringify(locks[locks.length - 1]) !== undefined,
        JSON.stringify(locks));

    themes.chart.clearSubjectHighlight();
    await h.settle(250);
    bars = h.bars(themes.container);
    check('reset: clearing focus lights every subject again',
        bars.every(b => b.opacity === 1),
        bars.map(b => b.opacity).join(', '));

    // ------------------------------------------------------------- the resize
    h.setBox(600, 500);
    h.fireResize();
    await h.settle(120);
    const small = themes.container.querySelector('svg.bar-chart').getAttribute('viewBox');
    h.setBox(1600, 500);
    h.fireResize();
    await h.settle(120);
    const wide = themes.container.querySelector('svg.bar-chart').getAttribute('viewBox');

    const aspect = (vb) => {
        const p = vb.split(/\s+/).map(Number);
        return +(p[2] / p[3]).toFixed(2);
    };
    check('resize: the viewBox follows the real box, so there is no letterbox band',
        aspect(small) === 1.2 && aspect(wide) === 3.2,
        'narrow ' + small + ' (aspect ' + aspect(small) + ', want 1.2) | ' +
        'wide ' + wide + ' (aspect ' + aspect(wide) + ', want 3.2)');

    check('resize: reflow applies immediately instead of animating',
        h.bars(themes.container).every(b => b.width > 0),
        'bar widths right after the resize: ' +
        h.bars(themes.container).map(b => Math.round(b.width)).join(', '));

    // ------------------------------------- the parties chart shares this factory
    h.clearLinkCalls();
    const parties = h.mount(PARTIES, h.window.PARTIES_BAR_CHART);
    await h.settle();

    check('parties: renders without the approval fields it never carries',
        h.bars(parties.container).length === 2 &&
        h.bars(parties.container).every(b => b.width > 0),
        h.bars(parties.container).map(b => b.label + ' w=' + Math.round(b.width)).join(' | '));

    check('parties: gets none of the subject controls',
        !parties.container.querySelector('button[data-value="rate"]') &&
        !parties.container.querySelector('button[data-value="gov"]') &&
        !parties.container.querySelector('.bar-chart-info'));

    parties.container.querySelectorAll('g.bar').forEach(function (g) {
        g.dispatchEvent(new h.window.MouseEvent('click', { bubbles: true }));
    });
    await h.settle(200);
    check('parties: does not drive the map',
        h.linkCalls().length === 0, JSON.stringify(h.linkCalls()));

    // ------------------------------------------------------------- soundness
    const bad = h.invalidAttributes(h.document.body);
    check('no NaN, undefined or negative geometry anywhere', bad.length === 0,
        bad.length ? bad.slice(0, 5).join(', ') : 'every attribute is a real number');

    console.log('');
    console.log(failures ? failures + ' check(s) failed' : 'All checks passed');
    process.exit(failures ? 1 : 0);
})().catch(function (e) {
    console.error('harness error:', e && e.stack || e);
    process.exit(1);
});
