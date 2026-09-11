/*
 * Verifica a medida de concordância entre dois grupos.
 * Rodar: node scripts/verify-vote-agreement.js
 *
 * O erro que este arquivo existe para pegar é silencioso: a barra continua
 * desenhando um número plausível se a agregação do tema usar média simples em
 * vez de ponderação por duplas, ou se um grupo ausente devolver 0 em vez de
 * ausência.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { calcGroupAgreementForRcs } = require('../javascripts/core/vote-agreement.js');

let failures = 0;
function check(name, ok, detail) {
    console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name);
    if (detail) console.log('       ' + detail);
    if (!ok) failures++;
}
const near = (a, b) => Math.abs(a - b) < 1e-9;

// Monta uma votação com N deputados de um partido votando Sim e M votando Não.
function rollCall(spec) {
    let id = 0;
    const votes = [];
    Object.keys(spec).forEach(function (party) {
        for (let i = 0; i < spec[party].sim; i++) votes.push({ deputyID: id++, party: party, vote: 'Sim' });
        for (let i = 0; i < spec[party].nao; i++) votes.push({ deputyID: id++, party: party, vote: 'Não' });
    });
    return { votes: votes };
}
const G = (p) => ({ parties: [p], deputyIDs: [] });

// ---- os quatro casos da tabela de leitura ----
check('unânimes do mesmo lado → 100%',
    near(calcGroupAgreementForRcs(
        [rollCall({ A: { sim: 10, nao: 0 }, B: { sim: 20, nao: 0 } })], G('A'), G('B')).agreement, 1));

check('unânimes em lados opostos → 0%',
    near(calcGroupAgreementForRcs(
        [rollCall({ A: { sim: 10, nao: 0 }, B: { sim: 0, nao: 20 } })], G('A'), G('B')).agreement, 0));

check('um unânime, o outro dividido ao meio → 50%',
    near(calcGroupAgreementForRcs(
        [rollCall({ A: { sim: 10, nao: 0 }, B: { sim: 10, nao: 10 } })], G('A'), G('B')).agreement, 0.5));

check('os dois divididos ao meio → 50%',
    near(calcGroupAgreementForRcs(
        [rollCall({ A: { sim: 10, nao: 10 }, B: { sim: 10, nao: 10 } })], G('A'), G('B')).agreement, 0.5));

// ---- a agregação do tema é ponderada por duplas ----
// Votação 1: 2×2 duplas, todas concordam  -> 4 de 4
// Votação 2: 10×10 duplas, nenhuma concorda -> 0 de 100
// ponderada por duplas: 4/104 = 0,0385 | média simples seria (1 + 0)/2 = 0,5
const duasVotacoes = [
    rollCall({ A: { sim: 2, nao: 0 }, B: { sim: 2, nao: 0 } }),
    rollCall({ A: { sim: 10, nao: 0 }, B: { sim: 0, nao: 10 } })
];
const agg = calcGroupAgreementForRcs(duasVotacoes, G('A'), G('B'));
check('a agregação do tema pondera por duplas, não por média simples',
    near(agg.agreement, 4 / 104),
    'obtido ' + agg.agreement.toFixed(4) + ' | ponderado 0.0385 | média simples seria 0.5000');

check('totalPairs soma todas as duplas possíveis do tema',
    agg.totalPairs === 104, 'obtido ' + agg.totalPairs);

check('rollCallCount conta só as votações em que os dois grupos votaram',
    agg.rollCallCount === 2, 'obtido ' + agg.rollCallCount);

// ---- ausência não é oposição ----
const semB = calcGroupAgreementForRcs(
    [rollCall({ A: { sim: 10, nao: 0 } })], G('A'), G('B'));
check('grupo sem voto no tema → agreement null, nunca 0',
    semB.agreement === null && semB.rollCallCount === 0,
    'agreement=' + semB.agreement + ' rollCallCount=' + semB.rollCallCount);

check('votação em que só um grupo votou é ignorada, não zerada',
    near(calcGroupAgreementForRcs([
        rollCall({ A: { sim: 4, nao: 0 }, B: { sim: 4, nao: 0 } }),
        rollCall({ A: { sim: 9, nao: 0 } })
    ], G('A'), G('B')).agreement, 1));

// ---- independência de tamanho: a regressão do defeito que motivou a mudança ----
// Referência de 68 deputados unida, comparador em oposição total.
// O Rice da união dava 86% / 68% / 0% / 38% conforme o tamanho.
const tamanhos = [5, 13, 68, 150].map(function (n) {
    return calcGroupAgreementForRcs(
        [rollCall({ REF: { sim: 68, nao: 0 }, CMP: { sim: 0, nao: n } })], G('REF'), G('CMP')).agreement;
});
check('oposição total dá 0% qualquer que seja o tamanho do comparador',
    tamanhos.every(function (v) { return near(v, 0); }),
    '5/13/68/150 deputados → ' + tamanhos.map(function (v) { return (100 * v).toFixed(0) + '%'; }).join(', '));

// ---- a forma fechada bate com a enumeração explícita, em dados reais ----
const INT_TO_VOTE = { 0: 'Sim', 1: 'Não', 2: 'Abstenção', 3: 'Obstrução', 4: 'Art. 17', 5: 'Branco' };
const motion = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'data', 'motions.min', 'CMC12024.json'), 'utf8'));
const realRc = {
    votes: motion.rollCalls[0].votes.map(function (v) {
        return { deputyID: v.deputyID, party: v.party, vote: INT_TO_VOTE[v.vote] };
    })
};
const pt = realRc.votes.filter(function (v) { return v.party === 'PT' && (v.vote === 'Sim' || v.vote === 'Não'); });
const pl = realRc.votes.filter(function (v) { return v.party === 'PL' && (v.vote === 'Sim' || v.vote === 'Não'); });
let iguais = 0;
pt.forEach(function (a) { pl.forEach(function (b) { if (a.vote === b.vote) iguais++; }); });
const enumerado = iguais / (pt.length * pl.length);
const daFuncao = calcGroupAgreementForRcs([realRc], G('PT'), G('PL')).agreement;
check('a fórmula devolve o mesmo que enumerar todas as duplas, em votação real',
    near(enumerado, daFuncao),
    'CMC 1/2024 · PT ' + pt.length + ' × PL ' + pl.length + ' = ' + (pt.length * pl.length) +
    ' duplas, ' + iguais + ' concordantes → enumerado ' + enumerado.toFixed(6) +
    ' | função ' + daFuncao.toFixed(6));

console.log('');
console.log(failures ? failures + ' check(s) failed' : 'All checks passed');
process.exit(failures ? 1 : 0);
