// Verifies the government-orientation rule against real motion data.
// Run: node scripts/verify-government-rule.js
//
// The failure this guards against is quiet: swap govDecided for frequency as the
// denominator, or let "Liberado" count as a defeat, and every number stays
// plausible while the chart says something false. So the checks below pin the
// denominator itself, not just the arithmetic.
const fs = require('fs');
const path = require('path');
const { governmentWanted, didGovernmentPrevail } = require('../javascripts/data/data-processor.js');

// Raw motion files store `vote` as an integer; the app maps it to a string at
// load (data-loader.js:156). Mirror that so we test the runtime shape.
const INT_TO_VOTE = { 0: 'Sim', 1: 'Não', 2: 'Abstenção', 3: 'Obstrução', 4: 'Art. 17', 5: 'Branco' };
const MOTIONS_DIR = path.join(__dirname, '..', 'data', 'motions.min');

function loadRuntimeRollCalls(file) {
    const m = JSON.parse(fs.readFileSync(path.join(MOTIONS_DIR, file)));
    return (m.rollCalls || []).map(function (rc) {
        return {
            summary: rc.summary,
            orientations: rc.orientations,
            votes: (rc.votes || []).map(function (v) { return { vote: INT_TO_VOTE[v.vote] }; })
        };
    });
}

let failures = 0;
function assert(name, actual, expected) {
    const ok = actual === expected;
    console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name + ' (got ' + actual + ', want ' + expected + ')');
    if (!ok) failures++;
}

// ---- direction: only Sim/Não are positions ----
assert('"Sim" → wanted it to pass', governmentWanted({ orientations: { 'GOV.': 'Sim' } }), true);
assert('"Não" → wanted it to fail', governmentWanted({ orientations: { 'GOV.': 'Não' } }), false);
assert('"Liberado" → no position (not a defeat)', governmentWanted({ orientations: { 'GOV.': 'Liberado' } }), null);
assert('"Obstrução" → tactic, not a verdict', governmentWanted({ orientations: { 'GOV.': 'Obstrução' } }), null);
assert('other blocs only → no position', governmentWanted({ orientations: { 'PT': 'Sim', 'Minoria': 'Não' } }), null);
assert('no orientations at all → no position', governmentWanted({ summary: 'Aprovado.' }), null);
// The API pads its values ("Sim            "), so trimming is load-bearing.
assert('padded value still reads as a position', governmentWanted({ orientations: { 'GOV.': 'Sim    ' } }), true);

// ---- outcome: a rejection can be a government win ----
assert('asked to pass, matter passed → prevailed',
    didGovernmentPrevail({ orientations: { 'GOV.': 'Sim' }, summary: 'Aprovado o Requerimento.', votes: [] }), true);
assert('asked to reject, matter rejected → prevailed',
    didGovernmentPrevail({ orientations: { 'GOV.': 'Não' }, summary: 'Rejeitado o Requerimento.', votes: [] }), true);
assert('asked to reject, matter passed → defeated',
    didGovernmentPrevail({ orientations: { 'GOV.': 'Não' }, summary: 'Aprovado o Requerimento.', votes: [] }), false);
assert('no position → outside the tally entirely',
    didGovernmentPrevail({ orientations: { 'GOV.': 'Liberado' }, summary: 'Aprovado.', votes: [] }), null);

// ---- the sigla is normalized at capture, so "Governo" never reaches here ----
const files = fs.readdirSync(MOTIONS_DIR).filter(function (f) { return f.endsWith('.json'); });
let stray = 0, declared = 0, prevailed = 0, total = 0;
const GOV_VARIANT = /^(gov\.?|governo|apoio ao governo)$/i;

files.forEach(function (file) {
    loadRuntimeRollCalls(file).forEach(function (rc) {
        total++;
        if (rc.orientations) {
            Object.keys(rc.orientations).forEach(function (sigla) {
                if (sigla !== 'GOV.' && GOV_VARIANT.test(sigla.trim())) stray++;
            });
        }
        const outcome = didGovernmentPrevail(rc);
        if (outcome === null) return;
        declared++;
        if (outcome) prevailed++;
    });
});

assert('no un-normalized government sigla survives in the data', stray, 0);

// A real roll call where the government asked for rejection and got it — the
// case an approval-rate metric would score as a government defeat.
const wonByRejection = files.some(function (file) {
    return loadRuntimeRollCalls(file).some(function (rc) {
        return governmentWanted(rc) === false && didGovernmentPrevail(rc) === true;
    });
});
assert('the data contains wins obtained through rejection', wonByRejection, true);

console.log('');
console.log('Over ' + total + ' roll calls: ' + declared + ' with a declared government position (' +
    (100 * declared / total).toFixed(1) + '%), government prevailed in ' + prevailed +
    ' (' + (100 * prevailed / declared).toFixed(1) + '%).');

process.exit(failures ? 1 : 0);
