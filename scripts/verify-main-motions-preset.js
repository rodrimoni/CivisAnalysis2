/*
 * Verifica o preset "Proposições principais / Main motions" do filtro
 * de tipos de proposição.
 * Rodar: node scripts/verify-main-motions-preset.js
 *
 * O erro que este arquivo existe para pegar é silencioso: como o preset
 * entra uma vez em cada um dos 3 builders e cobre 7 painéis, esquecer um
 * builder (ou o disparo do apply) deixa um painel sem o atalho sem nenhum
 * sintoma além da ausência do link no menu da engrenagem.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const factory = fs.readFileSync(
    path.join(ROOT, 'javascripts', 'ui', 'ui-menu-factory.js'), 'utf8');
const initializer = fs.readFileSync(
    path.join(ROOT, 'javascripts', 'charts', 'chart-initializer.js'), 'utf8');

let failures = 0;
function check(name, ok, detail) {
    console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name);
    if (detail) console.log('       ' + detail);
    if (!ok) failures++;
}

const EXPECTED = ['MPV', 'PEC', 'PL', 'PLN', 'PLP'];
const def = /var MAIN_MOTION_TYPES = \[([^\]]*)\]/.exec(factory);
const defined = def ? def[1].split(',').map((s) => s.trim().replace(/['"]/g, '')) : [];
check('preset contém exatamente MPV, PEC, PL, PLN, PLP',
    EXPECTED.length === defined.length && EXPECTED.every((t) => defined.includes(t)),
    'definido: ' + defined.join(', '));

const builders = ['addFilterMotionTypeMenu', 'addFilterMotionTypeChart', 'addSubjectTypeFilters'];
builders.forEach((name) => {
    const body = factory.slice(factory.indexOf('function ' + name));
    const nextFn = body.slice(('function ' + name).length).search(/\nfunction /);
    const block = nextFn === -1 ? body : body.slice(0, nextFn);
    check(name + ' tem o rodapé de atalho colado no campo',
        block.includes('mainMotionsPresetFooter()') &&
        block.includes('motion-type-box'));
    check(name + ' preenche via applyMainMotionsPreset',
        block.includes('applyMainMotionsPreset('));
});
check('campo de tipos não divide mais a linha com o preset',
    !factory.includes('mainMotionsPresetButton'));
check('rodapé fica no mesmo wrapper do input (o plugin insere a caixa antes dele)',
    /motion-type-box[\s\S]*?filterMotions[\s\S]*?mainMotionsPresetFooter\(\)/.test(factory));
check('atalho é botão nomeado, sem ícone sem rótulo',
    factory.includes('btn btn-xs btn-default presetMainMotions') &&
    factory.includes('mainMotionsPresetLabel()') &&
    !factory.includes('btn btn-default presetMainMotions') &&
    !factory.includes('fa-star'));
check('helper ordena igual ao setupFilterTagsinput (evita tag duplicada)',
    /d3\.entries\(optionValues\.slice\(\)\.sort\(\)\)/.test(factory));

// Nos painéis ao vivo o apply vem do itemAdded do próprio plugin;
// no com Reload o preset precisa disparar o reload sozinho.
const chartBlock = factory.slice(factory.indexOf('function addFilterMotionTypeChart'));
check('preset dos painéis ao vivo reaproveita o itemAdded (sem apply manual)',
    !/motion-preset-chip[\s\S]{0,400}?setMotionTypeFilter|selectRollCallsByFilter/.test(
        chartBlock.slice(0, chartBlock.indexOf('function addPartyFilter'))));
const reloadBlock = factory.slice(factory.indexOf('function addSubjectTypeFilters'));
check('preset do scatterplot/grafo dispara o Reload sozinho',
    reloadBlock.includes(".reloadFilters').click()"));

check('rótulos PT e EN presentes',
    factory.includes('Proposições principais') && factory.includes('Main motions'));
check('helper só adiciona tipos presentes no período',
    factory.includes('entries.filter') && factory.includes('if (match)'));

const panels = [
    ['addFilterMotionTypeMenu', 1],       // mapa de votações
    ['addFilterMotionTypeChart', 4],      // party metrics, timeline, comparison, agreement
    ['addSubjectTypeFilters', 2]          // scatterplot, similaridade
];
panels.forEach(([name, expected]) => {
    const calls = (initializer.match(new RegExp(name + '\\(', 'g')) || []).length;
    check('chart-initializer liga ' + expected + ' painel(is) via ' + name,
        calls === expected, 'chamadas: ' + calls);
});

console.log(failures === 0 ? '\nAll checks passed' : '\n' + failures + ' check(s) failed');
process.exit(failures === 0 ? 0 : 1);
