/*
 * Verifica os bundles anuais de motions e o fast path do loader.
 * Rodar: node scripts/verify-motion-bundles.js
 * (Gerar antes: node scripts/generate-motion-bundles.js)
 *
 * O erro que este arquivo existe para pegar é a divergência silenciosa
 * entre data/motions.min/ e data/bundles/: uma motion nova sem bundle
 * volta a cair no modo per-file (lento, sujeito a 429), e um bundle com
 * conteúdo diferente do arquivo-fonte corrompe a análise sem sintoma.
 *
 * Cobre: manifest cobre todos os anos; toda motion referenciada está em
 * ao menos um bundle; conteúdo do bundle é idêntico ao arquivo-fonte;
 * o loader resolve o período só com bundles (zero reqs per-file); e sem
 * bundle o loader recai no per-file e completa igual.
 */
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var assert = require('assert');

var ROOT = path.join(__dirname, '..');
var queue = require(path.join(ROOT, 'javascripts', 'external', 'queue.v1.min.js'));

var failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('PASS — ' + name);
    else { console.log('FAIL — ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

function motionKey(d) {
    return d.type + d.number + d.year;
}

// --- Parte 1: estática, direto no disco ----------------------------------
var arrayRollCalls = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'data', 'arrayRollCalls.json'), 'utf8'));
var manifest = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'data', 'bundles', 'manifest.json'), 'utf8'));

var years = new Set(arrayRollCalls.map(function (rc) {
    return new Date(rc.datetime).getUTCFullYear();
}));

var missingYears = Array.from(years).filter(function (y) { return !manifest.years[y]; });
check('manifest cobre todos os anos dos roll calls (' + years.size + ')',
    missingYears.length === 0, 'faltando: ' + missingYears.join(','));

var needed = {};
arrayRollCalls.forEach(function (rc) { needed[motionKey(rc)] = true; });

var covered = {};
var mismatch = [];
var bundleBytes = 0;
Object.keys(manifest.years).forEach(function (y) {
    var entry = manifest.years[y];
    var file = path.join(ROOT, entry.file);
    if (!fs.existsSync(file)) {
        check('bundle existe: ' + entry.file, false);
        return;
    }
    var bundle = JSON.parse(fs.readFileSync(file, 'utf8'));
    bundleBytes += fs.statSync(file).size;
    Object.keys(bundle).forEach(function (key) {
        covered[key] = true;
        var srcFile = path.join(ROOT, 'data', 'motions.min', key + '.json');
        if (!fs.existsSync(srcFile)) { mismatch.push(key + ' (fonte ausente)'); return; }
        try {
            assert.deepStrictEqual(bundle[key], JSON.parse(fs.readFileSync(srcFile, 'utf8')));
        } catch (e) {
            mismatch.push(key + ' (conteúdo diverge)');
        }
    });
});
check('bundle existe: ' + Object.keys(manifest.years).length + ' arquivos', true);

var uncovered = Object.keys(needed).filter(function (k) { return !covered[k]; });
check('toda motion referenciada está em ao menos um bundle (' +
    Object.keys(needed).length + ')',
    uncovered.length === 0, 'descobertas: ' + uncovered.slice(0, 5).join(','));

check('conteúdo do bundle é idêntico ao arquivo-fonte',
    mismatch.length === 0, mismatch.slice(0, 5).join('; '));

var biggest = Object.keys(manifest.years).map(function (y) {
    return manifest.years[y].bytes;
}).sort(function (a, b) { return b - a; })[0];
check('maior bundle abaixo do limite de 100MB do GitHub',
    biggest < 100 * 1024 * 1024, (biggest / 1048576).toFixed(1) + ' MB');
console.log('       bundles: ' + (bundleBytes / 1048576).toFixed(0) + ' MB no total');

// --- Parte 2: loader via vm ----------------------------------------------
var failUrls = {};   // url -> status para injetar falha
var perFileRequests = 0;
var bundleRequests = 0;

function $stub(selector) {
    return { text: function () { } };
}
$stub.each = function (obj, fn) {
    Object.keys(obj).forEach(function (k) { fn(k, obj[k]); });
};
$stub.ajax = function (opts) {
    var url = opts.url;
    if (url.indexOf('data/bundles/') === 0) bundleRequests++;
    else perFileRequests++;
    var handlers = {};
    setImmediate(function () {
        if (failUrls[url]) {
            handlers.fail({ status: failUrls[url], getResponseHeader: function () { return null; } }, 'error');
            return;
        }
        try {
            handlers.done(JSON.parse(fs.readFileSync(path.join(ROOT, url), 'utf8')));
        } catch (e) {
            handlers.fail({ status: 404, getResponseHeader: function () { return null; } }, 'error');
        }
    });
    return {
        done: function (fn) { handlers.done = fn; return this; },
        fail: function (fn) { handlers.fail = fn; return this; }
    };
};

var deputyProxy = new Proxy({}, {
    get: function () { return { name: 'Deputado Teste', district: 'XX' }; }
});
var sandboxRollCalls = arrayRollCalls.map(function (rc, i) {
    return {
        type: rc.type, number: rc.number, year: rc.year,
        datetime: new Date(rc.datetime), rollCallID: i
    };
});

var sandbox = {
    console: console,
    setTimeout: setTimeout,
    Math: Math,
    Object: Object,
    Array: Array,
    Date: Date,
    isNaN: isNaN,
    parseInt: parseInt,
    ENGLISH: 'en',
    CONGRESS_DEFINE: { integerToVote: { 0: 'Sim', 1: 'Não', 2: 'Abstenção', 3: 'Obstrução', 4: 'Art. 17', 5: 'Branco' } },
    d3: {},
    queue: queue,
    alert: function () { },
    state: {
        getArrayRollCalls: function () { return sandboxRollCalls; },
        getDeputiesArray: function () { return deputyProxy; },
        getLanguage: function () { return 'pt'; }
    }
};
sandbox.$ = $stub;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'javascripts', 'data', 'data-loader.js'), 'utf8'),
    sandbox, { filename: 'data-loader.js' });
sandbox.MOTION_LOAD_MAX_ATTEMPTS = 2;

function resetLoader() {
    sandbox.motions = {};
    sandbox.motionLoadFailures = [];
    sandbox.motionsToLoadPending = {};
    sandbox.rollCallInTheDateRange = [];
    failUrls = {};
    perFileRequests = 0;
    bundleRequests = 0;
}

function loadYear(year) {
    return new Promise(function (resolve) {
        sandbox.loadMotionsInDateRange(
            new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
            function () { resolve(); });
    });
}

function expectedKeys(year) {
    var keys = {};
    arrayRollCalls.forEach(function (rc) {
        if (new Date(rc.datetime).getUTCFullYear() === year) keys[motionKey(rc)] = true;
    });
    return Object.keys(keys);
}

async function main() {
    // A. Com bundles: zero requisições per-file, motions com votos.
    resetLoader();
    await loadYear(2023);
    var keys23 = expectedKeys(2023);
    var loaded23 = Object.keys(sandbox.motions).filter(function (k) {
        return sandbox.motions[k] && sandbox.motions[k].rollCalls;
    });
    check('2023 resolve só com bundle (' + keys23.length + ' motions)',
        loaded23.length === keys23.length && bundleRequests >= 1,
        'loaded=' + loaded23.length + ' bundles=' + bundleRequests);
    check('zero requisições per-file com bundles presentes', perFileRequests === 0,
        'perFile=' + perFileRequests);
    var withVotes = loaded23.filter(function (k) {
        return sandbox.motions[k].rollCalls.some(function (rc) {
            return rc.votes && rc.votes.length > 0 && rc.theme;
        });
    });
    check('motions do bundle vêm com votos e tema processados',
        withVotes.length === loaded23.length, withVotes.length + '/' + loaded23.length);

    // B. Sem bundle (404): fallback per-file completa igual.
    resetLoader();
    failUrls['data/bundles/motions-2024.json'] = 404;
    await loadYear(2024);
    var keys24 = expectedKeys(2024);
    var loaded24 = Object.keys(sandbox.motions).filter(function (k) {
        return sandbox.motions[k] && sandbox.motions[k].rollCalls;
    });
    check('sem bundle, fallback per-file completa 2024 (' + keys24.length + ' motions)',
        loaded24.length === keys24.length, 'loaded=' + loaded24.length);
    check('fallback realmente usou per-file', perFileRequests > 0,
        'perFile=' + perFileRequests);

    console.log(failures === 0 ? '\nAll checks passed' : '\n' + failures + ' check(s) failed');
    process.exit(failures === 0 ? 0 : 1);
}

main();
