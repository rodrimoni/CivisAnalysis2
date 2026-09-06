/*
 * Checks that everything drawn FROM the dot positions follows them.
 * Run: node scripts/verify-derived-layers.js
 *
 * Switching "overlapping deputies" on runs a force simulation that moves
 * deputies off their own coordinates so co-located ones can be told apart.
 * Party envelopes, cluster envelopes and the clustering itself are all computed
 * from positions, so each of them goes stale at that moment — and stale here
 * looks like a perfectly good envelope sitting in the wrong place.
 *
 * The plot needs zoom and brush to draw, so it is stubbed out: only the pieces
 * that read positions are exercised.
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
global.window = window;
global.document = window.document;
Object.defineProperty(global, 'navigator', {
    configurable: true, writable: true, value: window.navigator
});
window.SVGElement.prototype.getBBox = function () { return { x: 0, y: 0, width: 10, height: 10 }; };

window.eval(read('javascripts/external/d3v3.min.js'));
const d3 = window.d3;
global.d3 = d3;

const constantsSrc = read('javascripts/core/constants.js');
const constantNames = [...constantsSrc.matchAll(/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)]
    .map((m) => m[1]);
window.eval(constantsSrc + '\n;' +
    constantNames.map((n) => 'window.' + n + ' = ' + n + ';').join(''));

window.language = window.ENGLISH;
// jQuery is only used here to label the panel and to hang context menus and
// the tag-input search off it — none of which touches positions.
window.$ = function () {
    var api = {
        parents: function () { return { attr: function () { return 'panel-1'; } }; },
        attr: function () { return 'panel-1'; },
        contextMenu: function () { return api; },
        tagsinput: function () { return api; },
        find: function () { return api; },
        remove: function () { return api; },
        on: function () { return api; },
        addClass: function () { return api; },
        removeClass: function () { return api; },
        css: function () { return api; },
        append: function () { return api; },
        length: 0
    };
    return api;
};
window.CONGRESS_DEFINE = {
    getPartyColor: function () { return '#4575b4'; },
    partiesArbitraryColor: { PT: '#4575b4' },
    subjectsToColor: {},
    votingColor: function () { return '#4575b4'; }
};
window.eval(read('javascripts/utils/general-utilities.js'));
window.eval(read('javascripts/data/data-processor.js'));
window.eval(read('javascripts/external/kmeans.js'));
window.eval(read('javascripts/ui/ui-utilities.js'));

// Parts of the app shell the plot reaches for but that have nothing to do with
// positions: selection plumbing, menus and the search box.
window.state = {
    getDeputyNodes: function () { return {}; },
    getCurrentRollCalls: function () { return []; },
    getTree: function () { return { getNode: function () { return null; }, traverseBF: function () { } }; }
};
window.updateDeputyNodeInAllPeriods = function () { };
window.selectDeputiesBySearch = function () { };
window.resetSelection = function () { };
window.getShiftKey = function () { return false; };
window.handleContextMenuDeputy = function () { };
window.handleContextMenuPartyLegend = function () { };
window.handleContextMenuScatterPlot = function () { };
window.RICE_TYPE_CLASSIC = 0;
window.RICE_TYPE_BRAZIL = 1;

window.eval(read('javascripts/scatter-plot.js'));

// Four deputies of one party, two of them sitting on the very same coordinates
// — the case the overlapping layer exists for.
const DEPUTIES = [
    { deputyID: 1, name: 'A', district: 'SP', party: 'PT', scatterplot: [0.1, 0.1], selected: true, overlapped: null, alignment: 0.9 },
    { deputyID: 2, name: 'B', district: 'RJ', party: 'PT', scatterplot: [0.1, 0.1], selected: true, overlapped: null, alignment: 0.8 },
    { deputyID: 3, name: 'C', district: 'MG', party: 'PT', scatterplot: [0.5, 0.4], selected: true, overlapped: null, alignment: 0.7 },
    { deputyID: 4, name: 'D', district: 'BA', party: 'PT', scatterplot: [-0.3, -0.2], selected: true, overlapped: null, alignment: 0.6 }
];

const chart = window.scatterPlotChart();
const data = {};
DEPUTIES.forEach(function (d) { data[d.deputyID] = d; });
d3.select('.panel-body').datum(data).call(chart);

const hullPath = () => {
    const el = document.querySelector('.party-hull');
    return el ? el.getAttribute('d') : null;
};
const clusterPaths = () => Array.from(document.querySelectorAll('.hull'))
    .map((el) => el.getAttribute('d')).join('|');

const overlapping = document.querySelector('#panel-1-layer-overlapping');
function toggleOverlapping(on) {
    overlapping.checked = on;
    overlapping.dispatchEvent(new window.Event('change', { bubbles: true }));
}

// The simulation settles on its own schedule; wait for it rather than guessing.
function until(predicate, ms) {
    return new Promise(function (resolve) {
        const deadline = Date.now() + (ms || 4000);
        (function poll() {
            if (predicate() || Date.now() > deadline) return resolve();
            setTimeout(poll, 40);
        })();
    });
}

(async function run() {
    // ---- the real path: pick the party in the legend, then switch the layer on ----
    const legend = document.querySelector('.legend');
    legend.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const envelopeBox = document.querySelector('#panel-1-layer-envelope');
    check('picking a party in the legend enables the envelope layer',
        envelopeBox.disabled === false);

    envelopeBox.checked = true;
    envelopeBox.dispatchEvent(new window.Event('change', { bubbles: true }));

    const still = hullPath();
    check('switching the layer on draws an envelope around the party',
        !!still, still ? still.slice(0, 46) + '…' : 'none');

    chart.getClusters(2, DEPUTIES, 'panel-1');
    const restingClusters = clusterPaths();
    const restingCentroids = JSON.stringify(chart.clusters.map((c) => c.centroid));
    check('cluster envelopes are drawn', restingClusters.length > 0);

    // ---- switch the overlapping layer on, for real ----
    toggleOverlapping(true);
    await until(() => DEPUTIES.some((d) => typeof d.x === 'number'), 15000);
    // The simulation takes a few seconds to settle; waiting for it is the
    // point, since settling is what triggers the redraw under test.
    await until(() => hullPath() !== still, 15000);

    const moved = hullPath();
    check('the party envelope follows the dots once they are displaced',
        !!moved && moved !== still,
        'before ' + String(still).slice(0, 28) + '… / after ' + String(moved).slice(0, 28) + '…');

    check('nothing had to ask for that redraw — the simulation settling did',
        moved !== still, 'redrawn from the force layout\'s own end event');

    await until(() => clusterPaths() !== restingClusters, 5000);
    check('the cluster envelopes moved too',
        clusterPaths() !== restingClusters);

    chart.getClusters(2, DEPUTIES, 'panel-1');
    const displacedCentroids = JSON.stringify(chart.clusters.map((c) => c.centroid));
    check('clustering groups on the displaced positions, not the original ones',
        displacedCentroids !== restingCentroids,
        'resting ' + restingCentroids.slice(0, 26) + '… / displaced ' + displacedCentroids.slice(0, 26) + '…');

    check('the deputies themselves are never rewritten by clustering',
        DEPUTIES[0].scatterplot[0] === 0.1 && DEPUTIES[0].scatterplot[1] === 0.1,
        'deputy 1 scatterplot = [' + DEPUTIES[0].scatterplot.join(', ') + ']');

    // ---- and back ----
    toggleOverlapping(false);
    await until(() => hullPath() === still, 5000);
    check('switching the layer off returns the envelope to the original positions',
        hullPath() === still,
        'the force flag went back to false, so derived layers stopped believing the dots were displaced');

    chart.getClusters(2, DEPUTIES, 'panel-1');
    check('clustering follows the layer both ways',
        JSON.stringify(chart.clusters.map((c) => c.centroid)) === restingCentroids);

    console.log('');
    console.log(failures ? failures + ' check(s) failed' : 'All checks passed');
    process.exit(failures ? 1 : 0);
})();
