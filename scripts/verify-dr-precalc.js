/*
 * Verifica que o precalc de MDS e UMAP é o que o navegador calcularia na hora.
 * Rodar: node scripts/verify-dr-precalc.js
 *
 * Monta, para alguns períodos, rollCallInTheDateRange e deputiesInTheDateRange
 * no formato do navegador e roda as funções do próprio navegador
 * (data-processor.js e dimensionality-reduction.js, sem modificação):
 * filterDeputies → createMatrixDeputiesPerRollCall → createMatrixDistanceDeputies
 * → calcMDS / calcUMAP, e calculateDeputiesAligment. Compara com
 * data/precalc/<técnica>/<período>.json.
 *
 * As coordenadas são comparadas em valor absoluto: o precalc já vem com o
 * governo virado para o 3º quadrante, o que só troca sinais de eixo.
 *
 * Também verifica a regra de distância (core/vote-distance.js), inclusive o
 * caso que a versão antiga errava: par sem nenhuma coincidência → 100, não 0.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const C = require('./lib/precalc-common');

const ROOT = path.join(__dirname, '..');
let failures = 0;
function check(name, ok, detail) {
    console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name);
    if (detail) console.log('       ' + detail);
    if (!ok) failures++;
}

// ---- regra de distância ----
{
    const D = C.calcVoteDistanceMatrix([[1, 1, -1], [-1, -1, 1], [1, 1, -1]]);
    check('par sem nenhuma coincidência tem distância 100', D[0][1] === 100 && D[1][0] === 100, JSON.stringify(D));
    check('par idêntico tem distância 0', D[0][2] === 0, JSON.stringify(D));
    check('diagonal é 0', D[0][0] === 0 && D[1][1] === 0);
    const P = C.calcVoteDistanceMatrix([[1, 0], [1, -1]]);
    check('uma coincidência em duas votações → 50', P[0][1] === 50, JSON.stringify(P));
}

// ---- navegador vs precalc ----
const dr = C.loadBrowserDR();
global.$ = {
    map: function (obj, fn) {
        const out = [];
        Object.keys(obj).forEach(function (k) { const r = fn(obj[k], k); if (r !== undefined && r !== null) out.push(r); });
        return out;
    },
    each: function (obj, fn) { Object.keys(obj).forEach(function (k) { fn(k, obj[k]); }); },
};
global.calcPartyAlignment = require('../javascripts/core/party-alignment.js').calcPartyAlignment;
global.calcVoteDistanceMatrix = C.calcVoteDistanceMatrix;
const quietLog = console.log;
console.log = function () { };
vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'javascripts/data/data-processor.js'), 'utf8'),
    { filename: 'data-processor.js' });
console.log = quietLog;

const VOTE_LABELS = ['Sim', 'Não', 'Abstenção', 'Obstrução', 'Art. 17', 'Branco'];
function normalizeParty(p) { return p === 'Solidaried' ? 'SDD' : (p === 'S.Part.' ? 'NoParty' : p); }

/** rollCallInTheDateRange / deputiesInTheDateRange as the browser builds them. */
function setBrowserRange(data, period) {
    global.rollCallInTheDateRange = [];
    global.deputiesInTheDateRange = {};
    for (let j = 0; j < data.arrayRollCalls.length; j++) {
        const t = data.rcDatetimes[j];
        if (!(t >= period.period[0] && t <= period.period[1]) || !data.votesByRollCall[j]) continue;
        const votes = data.votesByRollCall[j]
            .filter(function (v) { return v.deputyID >= 0 && v.deputyID < data.deputies.length; })
            .map(function (v) { return { deputyID: v.deputyID, vote: VOTE_LABELS[v.vote], party: normalizeParty(v.party) }; });
        rollCallInTheDateRange.push({ votes: votes });
        votes.forEach(function (v) {
            deputiesInTheDateRange[v.deputyID] = deputiesInTheDateRange[v.deputyID] || { deputyID: v.deputyID };
            deputiesInTheDateRange[v.deputyID].party = v.party;
        });
    }
}

function round4(x) { return Number(x.toPrecision(4)); }

async function compare(data, technique, periodType, idx, filename) {
    const period = C.PERIODS[periodType][periodType === 'year' ? idx - 1991 : idx];
    setBrowserRange(data, period);

    const log = console.log; console.log = function () { };
    const filtered = filterDeputies();
    const matrix = createMatrixDeputiesPerRollCall(filtered);
    const alignment = calculateDeputiesAligment(filtered);
    console.log = log;

    const positions = technique === 'mds'
        ? await dr.mds(createMatrixDistanceDeputies(matrix))
        : await dr.umap(matrix);

    const precalc = JSON.parse(fs.readFileSync(path.join(C.DATA_DIR, 'precalc', technique, filename), 'utf8')).deputyNodes;
    const byId = {};
    precalc.forEach(function (n) { byId[n.deputyID] = n; });

    let sameSet = precalc.length === filtered.length, posDiff = 0, alignDiff = 0;
    filtered.forEach(function (dep, i) {
        const n = byId[dep.deputyID];
        if (!n) { sameSet = false; return; }
        posDiff = Math.max(posDiff,
            Math.abs(Math.abs(round4(positions[i][0])) - Math.abs(n.scatterplot[0])),
            Math.abs(Math.abs(round4(positions[i][1])) - Math.abs(n.scatterplot[1])));
        if (alignment[i] !== n.alignment) alignDiff++;
    });

    check(technique.toUpperCase() + ' ' + filename + ': mesmos deputados, coordenadas e alinhamento do navegador',
        sameSet && posDiff === 0 && alignDiff === 0,
        'N=' + filtered.length + ', maior diferença de coordenada=' + posDiff + ', alinhamentos diferentes=' + alignDiff);
}

(async function () {
    const data = C.loadAllData();
    const cases = [
        ['legislature', 8, 'legislature.8.json'],  // 57ª legislatura (estudo de caso)
        ['president', 0, 'president.0.json'],      // Collor
        ['year', 2020, 'year.2020.json'],          // ano em que o bug antigo da distância aparecia
    ];
    for (const technique of ['mds', 'umap']) {
        for (const c of cases) await compare(data, technique, c[0], c[1], c[2]);
    }
    console.log(failures ? '\n' + failures + ' falha(s)' : '\nTudo certo');
    process.exit(failures ? 1 : 0);
})();
