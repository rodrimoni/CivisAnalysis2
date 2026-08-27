/*
 * Renders the scatterplot's layer panel headlessly and checks its behaviour.
 * Run: node scripts/verify-layer-panel.js
 *
 * The plot itself needs a force simulation, zoom and brush, so it is skipped:
 * createScatterPlotChart is replaced with a no-op and only the controls are
 * built. That is the part that keeps regressing, and it turns out to be
 * reachable without any of the rest.
 *
 * These checks exist because the panel failed in a way that still looked
 * plausible — collapsing hid a wrapper the rows had never been put inside, so
 * the button changed its icon and nothing else moved.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let failures = 0;
function check(name, ok, detail) {
    console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name);
    if (detail) console.log('       ' + detail);
    if (!ok) failures++;
}

const dom = new JSDOM(
    '<!doctype html><html><body><div class="toolTip"></div>' +
    '<div id="panel-1" class="panel"><div class="panel-body"></div></div></body></html>',
    { pretendToBeVisual: true, runScripts: 'outside-only' }
);
const { window } = dom;
const { document } = window;
global.window = window;
global.document = document;
Object.defineProperty(global, 'navigator', {
    configurable: true, writable: true, value: window.navigator
});
window.SVGElement.prototype.getBBox = function () {
    return { x: 0, y: 0, width: 10, height: 10 };
};

window.eval(read('javascripts/external/d3v3.min.js'));
const d3 = window.d3;
global.d3 = d3;

// constants.js declares with `const`, a lexical global that does not carry
// across separate eval calls; bridge each name onto window in the same eval.
const constantsSrc = read('javascripts/core/constants.js');
const constantNames = [...constantsSrc.matchAll(/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)]
    .map((m) => m[1]);
window.eval(constantsSrc + '\n;' +
    constantNames.map((n) => 'window.' + n + ' = ' + n + ';').join(''));

window.language = window.ENGLISH;
// Only $(node).parents('.panel').attr('id') is used, to label the panel.
window.$ = function () {
    return { parents: function () { return { attr: function () { return 'panel-1'; } }; } };
};

window.eval(read('javascripts/utils/general-utilities.js'));
window.eval(read('javascripts/scatter-plot.js'));

const chart = window.scatterPlotChart();
chart.createScatterPlotChart = function () { };     // controls only
d3.select('.panel-body').datum({}).call(chart);

const body = document.querySelector('.panel-body');
const panel = body.querySelector('.layer-panel');
const collapsible = panel.querySelector('.layer-panel-body');
const rows = Array.from(panel.querySelectorAll('.layer-row'));
const collapseBtn = panel.querySelector('.layer-panel-collapse');
const icon = () => collapseBtn.querySelector('i').className;
const title = () => panel.querySelector('.layer-panel-title').textContent;
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

check('the panel offers all three layers',
    !!panel && rows.length === 3,
    rows.map((r) => r.querySelector('.layer-name').textContent).join(' | '));

// The bug this file was written for: the rows lived beside the collapsible
// wrapper instead of inside it, so hiding it hid nothing.
check('every row sits inside the part that collapses',
    rows.every((r) => collapsible.contains(r)),
    rows.filter((r) => collapsible.contains(r)).length + '/3 inside .layer-panel-body');

check('it starts open',
    collapsible.style.display !== 'none' && /glyphicon-minus/.test(icon()));

click(collapseBtn);
check('collapsing actually hides the rows, not just the icon',
    collapsible.style.display === 'none' && /glyphicon-plus/.test(icon()),
    'display=' + collapsible.style.display + ' icon=' + icon());

click(collapseBtn);
check('expanding brings them back', collapsible.style.display !== 'none');

// Folded away is not the same as switched off.
const firstBox = rows[0].querySelector('input[type="checkbox"]');
firstBox.checked = true;
firstBox.dispatchEvent(new window.Event('change', { bubbles: true }));
click(collapseBtn);
check('collapsed, the heading says how many layers are drawing',
    /·\s*1/.test(title()), 'heading = "' + title() + '"');

click(collapseBtn);
firstBox.checked = false;
firstBox.dispatchEvent(new window.Event('change', { bubbles: true }));
click(collapseBtn);
check('the count disappears once nothing is drawing',
    !/·/.test(title()), 'heading = "' + title() + '"');
click(collapseBtn);

// Both party layers describe a chosen party, so neither works without one.
const disabled = rows.filter((r) => r.classList.contains('is-disabled'));
check('the two party layers start disabled, not hidden',
    disabled.length === 2 && disabled.every((r) => r.offsetParent !== undefined),
    disabled.map((r) => r.querySelector('.layer-name').textContent).join(', '));

check('a disabled layer cannot be switched on',
    disabled.every((r) => r.querySelector('input').disabled === true));

check('every layer explains itself on hover',
    rows.every((r) => {
        const mark = r.querySelector('.layer-info');
        return mark && (mark.getAttribute('aria-label') || '').length > 20;
    }),
    rows.map((r) => (r.querySelector('.layer-info').getAttribute('aria-label') || '').slice(0, 28) + '…')
        .join(' | '));

console.log('');
console.log(failures ? failures + ' check(s) failed' : 'All checks passed');
process.exit(failures ? 1 : 0);
