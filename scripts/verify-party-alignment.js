/*
 * Verifica a regra de alinhamento deputado-partido (core/party-alignment.js).
 * Rodar: node scripts/verify-party-alignment.js
 *
 * Os erros que este arquivo existe para pegar são silenciosos: o número
 * continua plausível se obstrução voltar a contar como desalinhamento, se o
 * partido for o atual em vez do da data da votação, ou se "sem dado" virar 0.
 */
'use strict';

const { calcPartyAlignment } = require('../javascripts/core/party-alignment.js');

let failures = 0;
function check(name, ok, detail) {
    console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name);
    if (detail) console.log('       ' + detail);
    if (!ok) failures++;
}

// Votos de uma votação: [row, party, vote]; row null = deputado fora do gráfico.
const rc = (...votes) => votes.map(([row, party, vote]) => ({ row, party, vote }));
// N votos de figurantes (fora do gráfico) para compor a maioria do partido.
const extras = (n, party, vote) => Array.from({ length: n }, () => ({ row: null, party, vote }));

// ---- obstrução fica fora, dos dois lados ----
{
    // Bancada obstrui em bloco; 3 votam Não, 2 votam Sim. Maioria = Não.
    const votes = rc([0, 'A', 'Obstrução'], [1, 'A', 'Sim'], [2, 'A', 'Não'])
        .concat(extras(9, 'A', 'Obstrução'), extras(2, 'A', 'Não'), extras(1, 'A', 'Sim'));
    const r = calcPartyAlignment(3, [votes]);
    check('quem obstrui não entra na conta (null, não 0)', r[0] === null, JSON.stringify(r));
    check('obstrução não conta como Não na maioria: Sim contra maioria Não → 0', r[1] === 0, JSON.stringify(r));
    check('Não com a maioria Não → 1', r[2] === 1, JSON.stringify(r));
}

// ---- abstenção, Art. 17 e Branco também ficam fora ----
{
    const r = calcPartyAlignment(1, [
        rc([0, 'A', 'Abstenção'], [null, 'A', 'Sim']),
        rc([0, 'A', 'Art. 17'], [null, 'A', 'Sim']),
        rc([0, 'A', 'Sim'], [null, 'A', 'Sim'])
    ]);
    check('só a votação com Sim/Não do deputado entra', r[0] === 1, JSON.stringify(r));
}

// ---- empate dentro do partido: a votação não entra para aquele partido ----
{
    const r = calcPartyAlignment(2, [
        rc([0, 'A', 'Sim'], [null, 'A', 'Não']),          // A empata
        rc([1, 'B', 'Sim'], [null, 'B', 'Sim'], [null, 'B', 'Não'])
    ]);
    check('empate no partido → votação descartada', r[0] === null, JSON.stringify(r));
    check('outro partido na mesma rodada não é afetado', r[1] === 1, JSON.stringify(r));
}

// ---- partido na data da votação, não o atual ----
{
    // Deputado 0 vota Sim nas duas; em 1 estava em A (maioria Sim), em 2 em B (maioria Não).
    const r = calcPartyAlignment(1, [
        rc([0, 'A', 'Sim']).concat(extras(5, 'A', 'Sim')),
        rc([0, 'B', 'Sim']).concat(extras(5, 'B', 'Não'))
    ]);
    check('troca de partido: cada votação usa o partido daquela data → 0.5', r[0] === 0.5, JSON.stringify(r));
}

// ---- a maioria conta quem não está no gráfico ----
{
    // Único deputado plotado do partido vota Sim, mas a bancada inteira votou Não.
    const r = calcPartyAlignment(1, [rc([0, 'A', 'Sim']).concat(extras(20, 'A', 'Não'))]);
    check('maioria usa todos os votantes do partido, não só os plotados', r[0] === 0, JSON.stringify(r));
}

// ---- 0 é dado real; null é ausência de dado ----
{
    const r = calcPartyAlignment(2, [
        rc([0, 'A', 'Não']).concat(extras(4, 'A', 'Sim')),
        rc([0, 'A', 'Não']).concat(extras(4, 'A', 'Sim'))
    ]);
    check('sempre contra o partido → 0', r[0] === 0, JSON.stringify(r));
    check('deputado sem nenhum voto → null', r[1] === null, JSON.stringify(r));
}

// ---- arredondamento em duas casas ----
{
    const agree = rc([0, 'A', 'Sim']).concat(extras(3, 'A', 'Sim'));
    const against = rc([0, 'A', 'Não']).concat(extras(3, 'A', 'Sim'));
    const r = calcPartyAlignment(1, [agree, agree, against]);
    check('2 de 3 → 0.67', r[0] === 0.67, JSON.stringify(r));
}

// ---- entradas degeneradas ----
check('sem votações → todos null',
    JSON.stringify(calcPartyAlignment(2, [])) === '[null,null]');
check('votação sem votos (secreta) é ignorada',
    JSON.stringify(calcPartyAlignment(1, [[], rc([0, 'A', 'Sim'])])) === '[1]');
check('voto sem partido não entra',
    JSON.stringify(calcPartyAlignment(1, [rc([0, '', 'Sim'])])) === '[null]');

console.log(failures ? '\n' + failures + ' falha(s)' : '\nTudo certo.');
process.exit(failures ? 1 : 0);
