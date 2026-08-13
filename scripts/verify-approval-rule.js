// Verifies isRollCallApproved against real motion data, including the PEC 3/5
// quorum case. Run: node scripts/verify-approval-rule.js
const fs = require('fs');
const path = require('path');
const { isRollCallApproved } = require('../javascripts/data/data-processor.js');

// Raw motion files store `vote` as an integer; the app maps it to a string at
// load (data-loader.js:156). Mirror that so we test the runtime shape.
const INT_TO_VOTE = { 0: 'Sim', 1: 'Não', 2: 'Abstenção', 3: 'Obstrução', 4: 'Art. 17', 5: 'Branco' };

function loadRuntimeRollCalls(file) {
    const m = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'motions.min', file)));
    return (m.rollCalls || []).map(function (rc) {
        return { summary: rc.summary, votes: (rc.votes || []).map(function (v) { return { vote: INT_TO_VOTE[v.vote] }; }) };
    });
}

function pick(file, needle) {
    const rc = loadRuntimeRollCalls(file).find(function (r) { return (r.summary || '').indexOf(needle) > -1; });
    if (!rc) throw new Error('Fixture not found in ' + file + ': ' + needle);
    return rc;
}

let failures = 0;
function assert(name, actual, expected) {
    const ok = actual === expected;
    console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name + ' (got ' + actual + ', want ' + expected + ')');
    if (!ok) failures++;
}

// 1. PEC rejected by 3/5 quorum despite Sim>Não → verdict wins → rejected
assert('PEC quorum rejection (Sim 303 > Não 127) → rejected',
    isRollCallApproved(pick('PEC1012003.json', 'Rejeitado o Substitutivo')), false);
// 2. Clear approval verdict → approved
assert('Clear "Aprovado o parecer" → approved',
    isRollCallApproved(pick('CMC12024.json', 'Aprovado o parecer')), true);
// 3. Clear rejection verdict → rejected
assert('Clear "Rejeitada a Emenda" → rejected',
    isRollCallApproved(pick('MPV10142020.json', 'Rejeitada a Emenda de Comissão')), false);
// 4. No verdict word ("Mantido o texto"), Sim majority → tally fallback → approved
assert('No-verdict "Mantido o texto" (Sim 278 > Não 126) → approved (tally)',
    isRollCallApproved(pick('MPV10162020.json', 'Mantido o texto')), true);
// 5. Empty summary + no votes → tally 0>0 false → rejected
assert('Empty summary, no votes → rejected',
    isRollCallApproved({ summary: '', votes: [] }), false);

process.exit(failures ? 1 : 0);
