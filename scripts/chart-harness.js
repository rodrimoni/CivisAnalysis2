/*
 * Headless browser for the D3 charts, so their rendering can be verified
 * without opening a page.
 *
 * The app is a script-tag site with globals: there is no module to import and
 * no build step. This mirrors what index.html does — create a window, define
 * the globals the chart reads, eval the same files in the same order — which
 * is why the chart runs here unmodified.
 *
 * The real subject-linking module is loaded rather than faked, so the selection
 * rule under test is the one that ships. Only `state` is stubbed, since the
 * panel tree belongs to the app shell and not to the chart.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function createHarness(options) {
    const opts = options || {};

    const dom = new JSDOM(
        '<!doctype html><html><body><div class="toolTip"></div></body></html>',
        { pretendToBeVisual: true, runScripts: 'outside-only' }
    );
    const { window } = dom;
    const { document } = window;

    // d3 v3 reads window/document off the global object at eval time.
    global.window = window;
    global.document = document;
    // Node ships a read-only global navigator, so assignment would throw.
    Object.defineProperty(global, 'navigator', {
        configurable: true, writable: true, value: window.navigator
    });

    // --- jsdom gaps the chart would otherwise hit ---

    // No text metrics: width proportional to length is enough for the chart to
    // reserve a stable label gutter.
    window.SVGElement.prototype.getBBox = function () {
        return { x: 0, y: 0, width: (this.textContent || '').length * 14, height: 30 };
    };

    // No SVGAnimatedTransformList. d3 v3 uses this same path to parse the
    // TARGET of a transform transition, so a stub that returns nothing makes
    // the target vanish and the attribute end up empty — which silently breaks
    // any assertion about bar ordering. The chart only ever translates, so
    // reading the matrix back off the attribute keeps the end state exact.
    Object.defineProperty(window.SVGElement.prototype, 'transform', {
        configurable: true,
        get: function () {
            const el = this;
            return {
                baseVal: {
                    consolidate: function () {
                        const m = /translate\(\s*([-\d.eE+]+)[\s,]+([-\d.eE+]+)/
                            .exec(el.getAttribute('transform') || '');
                        return {
                            matrix: {
                                a: 1, b: 0, c: 0, d: 1,
                                e: m ? parseFloat(m[1]) : 0,
                                f: m ? parseFloat(m[2]) : 0
                            }
                        };
                    }
                }
            };
        }
    });

    // No layout engine: every box is 0x0, so the chart would divide by zero
    // when matching its viewBox to the rendered box. Tests drive this instead.
    let box = { width: 0, height: 0 };
    window.Element.prototype.getBoundingClientRect = function () {
        return {
            width: box.width, height: box.height,
            top: 0, left: 0, right: box.width, bottom: box.height, x: 0, y: 0
        };
    };

    // No ResizeObserver: keep the callbacks so a resize can be fired on demand.
    const resizeCallbacks = [];
    window.ResizeObserver = function (cb) {
        this.observe = function () { resizeCallbacks.push(cb); };
        this.disconnect = function () { };
    };

    // --- d3 ---
    window.eval(read('javascripts/external/d3v3.min.js'));
    const d3 = window.d3;
    global.d3 = d3;

    // --- app globals the chart reads ---
    // constants.js declares with `const`, which creates a lexical global rather
    // than a property of window — and lexical globals do not carry across
    // separate eval calls, so bar-chart.js would not see them. Bridging each
    // name onto window inside the SAME eval makes them resolve normally.
    const constantsSrc = read('javascripts/core/constants.js');
    const constantNames = [...constantsSrc.matchAll(/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)]
        .map((m) => m[1]);
    window.eval(constantsSrc + '\n;' +
        constantNames.map((n) => 'window.' + n + ' = ' + n + ';').join(''));
    window.MAX_WIDTH = 1920;
    window.MAX_HEIGHT = 1080;
    window.language = opts.language || window.ENGLISH;
    window.translator = undefined;          // dict.js only builds it in pt mode
    window.subjectsToEnglish = {
        'Saúde': 'Health', 'Educação': 'Education', 'Economia': 'Economy',
        'Meio Ambiente': 'Environment', 'Defesa': 'Defence'
    };
    window.CONGRESS_DEFINE = {
        subjectsToColor: {
            'Saúde': '#4c72b0', 'Educação': '#dd8452', 'Economia': '#55a868',
            'Meio Ambiente': '#c44e52', 'Defesa': '#8172b3'
        },
        getPartyColor: function (p) { return p === 'PT' ? '#c0392b' : '#2980b9'; }
    };

    // Only $(node).parents('.panel').attr('id') is used, to label the panel.
    window.$ = function (node) {
        const panel = node && node.closest ? node.closest('.panel') : null;
        const id = panel ? panel.getAttribute('id') : 'panel-0';
        return { parents: function () { return { attr: function () { return id; } }; } };
    };

    // --- the map the subject views link back to ---
    const linkCalls = [];
    let subjectLock = null;
    const mapChart = {
        setSubjectPreview: function (theme) { linkCalls.push(['preview', theme]); },
        setSubjectLock: function (themes, owner) {
            subjectLock = { themes: themes.slice(), ownerPanelID: owner };
            linkCalls.push(['setLock', themes.slice()]);
        },
        getSubjectLock: function () { return subjectLock; }
    };
    const mapNode = { typeChart: window.ROLLCALLS_HEATMAP, chart: mapChart, parent: null };
    window.state = {
        getTree: function () {
            return { getNode: function () { return mapNode; }, traverseBF: function () { } };
        }
    };

    window.eval(read('javascripts/utils/general-utilities.js'));
    window.eval(read('javascripts/core/subject-linking.js'));
    window.eval(read('javascripts/bar-chart.js'));

    let panelSeq = 0;

    return {
        window, document, d3,

        /** Mount a chart in a fresh panel. Returns { container, chart, panelID }. */
        mount: function (data, typeChart) {
            const id = 'panel-' + (++panelSeq);
            const panel = document.createElement('div');
            panel.className = 'panel';
            panel.setAttribute('id', id);
            const body = document.createElement('div');
            body.className = 'panel-body';
            panel.appendChild(body);
            document.body.appendChild(panel);

            const chart = window.barChart(typeChart);
            d3.select(body).datum(data).call(chart);
            return { container: body, chart: chart, panelID: id };
        },

        /** d3 transitions are async; assertions before they land pass vacuously. */
        settle: function (ms) {
            return new Promise(function (r) { setTimeout(r, ms === undefined ? 900 : ms); });
        },

        /** Drive the real control rather than calling the handler directly. */
        click: function (root, selector, modifiers) {
            const el = root.querySelector(selector);
            if (!el) throw new Error('no element for ' + selector);
            el.dispatchEvent(new window.MouseEvent('click', Object.assign(
                { bubbles: true, cancelable: true }, modifiers || {})));
            return el;
        },

        hover: function (root, node, type) {
            node.dispatchEvent(new window.MouseEvent(type, { bubbles: true }));
        },

        /**
         * Bars in the order they appear on screen. They are keyed by category,
         * so switching views leaves them where they are in the DOM and moves
         * them by transform — reading document order would report the ordering
         * of whichever view rendered first.
         */
        bars: function (root) {
            return Array.from(root.querySelectorAll('g.bar')).map(function (g) {
                const m = /translate\(\s*[-\d.]+\s*,\s*([-\d.]+)/.exec(g.getAttribute('transform') || '');
                const approved = g.querySelector('rect.seg-approved');
                const rejected = g.querySelector('rect.seg-rejected');
                return {
                    node: g,
                    y: m ? parseFloat(m[1]) : 0,
                    label: (g.querySelector('text.label') || {}).textContent,
                    value: ((g.querySelector('text.value') || {}).textContent || '').trim(),
                    opacity: parseFloat(g.style.opacity || '1'),
                    stroke: approved ? (approved.style.stroke || 'none') : 'none',
                    width: (approved ? parseFloat(approved.getAttribute('width')) : 0) +
                        (rejected ? parseFloat(rejected.getAttribute('width')) : 0)
                };
            }).sort(function (a, b) { return a.y - b.y; });
        },

        text: function (root, selector) {
            const el = root.querySelector(selector);
            return el ? (el.textContent || '').trim() : null;
        },

        setBox: function (w, h) { box = { width: w, height: h }; },
        fireResize: function () { resizeCallbacks.forEach(function (cb) { cb(); }); },

        linkCalls: function () { return linkCalls.slice(); },
        clearLinkCalls: function () { linkCalls.length = 0; },

        /** Every attribute the chart writes that would render as broken SVG. */
        invalidAttributes: function (root) {
            const bad = [];
            root.querySelectorAll('rect, line, text, g').forEach(function (el) {
                ['x', 'y', 'x1', 'x2', 'y1', 'y2', 'width', 'height'].forEach(function (a) {
                    if (!el.hasAttribute(a)) return;
                    const v = el.getAttribute(a);
                    if (/NaN|undefined|Infinity/.test(v)) {
                        bad.push(el.tagName + '[' + a + ']="' + v + '"');
                    } else if ((a === 'width' || a === 'height') && parseFloat(v) < 0) {
                        // Only extents can't go negative. Negative coordinates
                        // are ordinary: the axis draws its grid with a negative
                        // tick size so the lines reach up across the plot.
                        bad.push(el.tagName + '[' + a + ']=' + v);
                    }
                });
            });
            return bad;
        }
    };
}

module.exports = { createHarness };
