/*
 * Checks the context menus against the code that answers them.
 * Run: node scripts/verify-context-menus.js
 *
 * Two things here fail silently. The handlers dispatch on the anchor's id
 * (`selectedMenu.context.id === "scatter-plot-pca"`), so renaming an id while
 * editing labels leaves a menu entry that opens nothing. And a label without a
 * dictionary entry simply renders in English for Portuguese readers — which is
 * what five of these were doing before this pass.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const dict = fs.readFileSync(path.join(ROOT, 'javascripts/dict.js'), 'utf8');
const handlers = fs.readFileSync(path.join(ROOT, 'javascripts/events/event-handlers.js'), 'utf8');

let failures = 0;
function check(name, ok, detail) {
    console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name);
    if (detail) console.log('       ' + detail);
    if (!ok) failures++;
}

// ---- parse the menus out of the page ----
const menus = [...html.matchAll(/<ul id="(contextMenu\w+)"[\s\S]*?<\/ul>/g)].map((m) => {
    const block = m[0];
    return {
        id: m[1],
        block: block,
        anchors: [...block.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((a) => {
            const attrs = a[1];
            const idMatch = /id="([^"]+)"/.exec(attrs);
            const classMatch = /class="([^"]*)"/.exec(attrs);
            return {
                id: idMatch ? idMatch[1] : null,
                label: a[2].trim(),
                translated: !!(classMatch && /\btrn\b/.test(classMatch[1]))
            };
        }),
        headers: [...block.matchAll(/class="dropdown-header"[^>]*>\s*<span class="trn">([^<]+)<\/span>/g)]
            .map((h) => h[1].trim())
    };
});

check('every context menu on the page was found', menus.length === 5,
    menus.map((m) => m.id).join(', '));

// ---- the pattern: a heading that says what the list does ----
menus.forEach((menu) => {
    check(menu.id + ': opens with "Create visualization"',
        menu.headers[0] === 'Create visualization',
        'headings: ' + (menu.headers.join(' / ') || 'none'));
});

// ---- ids are the contract with the handlers ----
// Two dispatch styles are in use — a chain of `context.id === "..."` and a
// lookup table keyed by id — so match the id as a quoted literal either way.
const quoted = new Set([...handlers.matchAll(/['"]([a-z][a-z0-9-]{3,})['"]/gi)].map((m) => m[1]));
const present = new Set(menus.flatMap((m) => m.anchors.map((a) => a.id)).filter(Boolean));

const orphanedEntries = [...present].filter((id) => !quoted.has(id));

// The reverse direction: an id the handlers still name but the page no longer
// offers. Only ids that look like menu entries, so ordinary strings are ignored.
const referenced = new Set(
    [...handlers.matchAll(/selectedMenu\.context\.id\s*===\s*['"]([^'"]+)['"]/g)].map((m) => m[1])
);
const missingEntries = [...referenced].filter((id) => !present.has(id));

check('every menu entry is one a handler answers',
    orphanedEntries.length === 0,
    orphanedEntries.length ? 'no handler for: ' + orphanedEntries.join(', ')
        : [...present].length + ' entries, all handled');

check('no handler is left pointing at an entry that no longer exists',
    missingEntries.length === 0,
    missingEntries.length ? 'handled but absent from the page: ' + missingEntries.join(', ')
        : referenced.size + ' handled ids all present');

menus.forEach((menu) => {
    const anonymous = menu.anchors.filter((a) => !a.id);
    check(menu.id + ': every entry carries the id its handler dispatches on',
        anonymous.length === 0,
        anonymous.length ? anonymous.map((a) => '"' + a.label + '"').join(', ') : 'ok');
});

// ---- labels have to exist in the dictionary, or Portuguese silently gets English ----
function inDictionary(label) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('^\\s*"' + escaped + '":', 'm').test(dict);
}

// Acronyms are the same in both languages and are deliberately left untranslated.
const untranslatedByDesign = new Set(['PCA', 'MDS', 't-SNE', 'UMAP', 'W-NOMINATE']);

const untranslated = [];
const missingFromDict = [];
menus.forEach((menu) => {
    menu.anchors.forEach((a) => {
        if (untranslatedByDesign.has(a.label)) return;
        if (!a.translated) untranslated.push(menu.id + ' → "' + a.label + '"');
        else if (!inDictionary(a.label)) missingFromDict.push(menu.id + ' → "' + a.label + '"');
    });
    menu.headers.forEach((h) => {
        if (!inDictionary(h)) missingFromDict.push(menu.id + ' → heading "' + h + '"');
    });
});

check('every label is marked for translation',
    untranslated.length === 0,
    untranslated.length ? untranslated.join(', ') : 'all labels carry class="trn"');

check('every label has a Portuguese entry',
    missingFromDict.length === 0,
    missingFromDict.length ? 'no translation for: ' + missingFromDict.join(', ')
        : 'every label and heading resolves');

// ---- and nothing is left describing a label that no longer exists ----
const stale = [...dict.matchAll(/^\s*"(Create a [^"]+|Show [A-Z][^"]+)":/gm)].map((m) => m[1]);
check('the dictionary carries no entry for a label that was replaced',
    stale.length === 0,
    stale.length ? 'stale: ' + stale.join(', ') : 'no leftovers');

console.log('');
console.log(failures ? failures + ' check(s) failed' : 'All checks passed');
process.exit(failures ? 1 : 0);
