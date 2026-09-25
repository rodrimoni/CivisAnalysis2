/*
 * Verifica o carregamento resiliente de motions (data-loader.js).
 * Rodar: node scripts/verify-motion-loader.js
 *
 * O erro que este arquivo existe para pegar é duplo: rajadas de centenas de
 * requisições com queue(20) disparam HTTP 429 em hosts estáticos com rate
 * limit, e o d3.json antigo não expunha o status — no 429 o callback recebia
 * null e a fila travava para sempre no overlay de "Carregando dados".
 *
 * Cobre: sucesso imediato, retry após 429, respeito ao Retry-After, backoff
 * crescente, falha definitiva sem travar a fila, teto de concorrência e
 * status não-retentável (404) falhando rápido.
 */
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var queue = require(path.join(ROOT, 'javascripts', 'external', 'queue.v1.min.js'));

var failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('PASS — ' + name);
    else { console.log('FAIL — ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

// --- Stubs ---------------------------------------------------------------
var ajaxBehaviors = {};   // url -> array de outcomes por tentativa
var ajaxCalls = {};       // url -> timestamps das tentativas
var inFlight = 0;
var maxInFlight = 0;
var notices = [];
var alerts = [];

function nextOutcome(url) {
    var seq = ajaxBehaviors[url];
    if (seq && seq.length > 0) return seq.shift();
    return { ok: true };
}

function $stub(selector) {
    return { text: function (t) { notices.push(t); } };
}
$stub.each = function (obj, fn) {
    Object.keys(obj).forEach(function (k) { fn(k, obj[k]); });
};
$stub.ajax = function (opts) {
    var url = opts.url;
    ajaxCalls[url] = ajaxCalls[url] || [];
    inFlight++;
    if (inFlight > maxInFlight) maxInFlight = inFlight;
    var handlers = {};
    setImmediate(function () {
        inFlight--;
        var out = nextOutcome(url);
        ajaxCalls[url].push(Date.now());
        if (out.ok) {
            handlers.done({ rollCalls: [], theme: 'Economia' });
        } else {
            handlers.fail({
                status: out.status,
                getResponseHeader: function () { return out.retryAfter; }
            }, out.textStatus || 'error');
        }
    });
    return {
        done: function (fn) { handlers.done = fn; return this; },
        fail: function (fn) { handlers.fail = fn; return this; }
    };
};

var fakeRollCalls = [];
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
    CONGRESS_DEFINE: { integerToVote: {} },
    d3: {},
    queue: queue,
    alert: function (t) { alerts.push(t); },
    state: {
        getArrayRollCalls: function () { return fakeRollCalls; },
        getDeputiesArray: function () { return {}; },
        getLanguage: function () { return 'pt'; }
    }
};
sandbox.$ = $stub;
sandbox.window = sandbox;
vm.createContext(sandbox);

var loaderSrc = fs.readFileSync(path.join(ROOT, 'javascripts', 'data', 'data-loader.js'), 'utf8');
vm.runInContext(loaderSrc, sandbox, { filename: 'data-loader.js' });

// Acelera os testes sem mudar a lógica (mesmas constantes, valores menores).
sandbox.MOTION_LOAD_BASE_DELAY_MS = 20;
sandbox.MOTION_LOAD_MAX_DELAY_MS = 200;
sandbox.MOTION_LOAD_REQUEST_TIMEOUT_MS = 5000;

function reset() {
    ajaxBehaviors = {};
    ajaxCalls = {};
    inFlight = 0;
    maxInFlight = 0;
    notices = [];
    alerts = [];
    fakeRollCalls = [];
    sandbox.motions = {};
    sandbox.motionLoadFailures = [];
    sandbox.rollCallInTheDateRange = [];
}

function motionUrl(i) {
    return 'data/motions.min/PL' + i + '2024.json';
}

function makeRange(n) {
    var now = new Date('2024-06-01T12:00:00Z');
    fakeRollCalls = [];
    for (var i = 0; i < n; i++) {
        fakeRollCalls.push({ datetime: now, type: 'PL', number: String(i), year: '2024' });
    }
    return [new Date('2024-01-01T00:00:00Z'), new Date('2024-12-31T00:00:00Z')];
}

function loadRange(n) {
    return new Promise(function (resolve) {
        var range = makeRange(n);
        sandbox.loadMotionsInDateRange(range[0], range[1], function () { resolve(); });
    });
}

function fetchOnce(behavior) {
    return new Promise(function (resolve) {
        var url = 'data/motions.min/PROBE1991.json';
        ajaxBehaviors[url] = behavior;
        sandbox.fetchJsonWithRetry(url, 1, function (data) {
            resolve({ ok: true, data: data });
        }, function (status) {
            resolve({ ok: false, status: status });
        });
    });
}

async function main() {
    // 1. Sucesso imediato, 1 tentativa.
    reset();
    var r1 = await fetchOnce([{ ok: true }]);
    check('sucesso imediato resolve com dados',
        r1.ok && r1.data && Array.isArray(r1.data.rollCalls),
        JSON.stringify(r1));
    check('sucesso imediato usa 1 tentativa',
        (ajaxCalls['data/motions.min/PROBE1991.json'] || []).length === 1);

    // 2. 429 duas vezes, depois sucesso.
    reset();
    sandbox.MOTION_LOAD_MAX_ATTEMPTS = 6;
    var r2 = await fetchOnce([{ status: 429 }, { status: 429 }, { ok: true }]);
    check('429 duas vezes e depois sucesso resolve',
        r2.ok, JSON.stringify(r2));
    check('foram 3 tentativas',
        (ajaxCalls['data/motions.min/PROBE1991.json'] || []).length === 3);
    check('aviso de retry foi exibido no overlay',
        notices.length > 0, 'notices=' + notices.length);

    // 3. Retry-After respeitado.
    reset();
    var t0 = Date.now();
    var r3 = await fetchOnce([{ status: 429, retryAfter: '1' }, { ok: true }]);
    var elapsed = Date.now() - t0;
    check('Retry-After: 1 segura o retry por ~1s',
        r3.ok && elapsed >= 900, 'elapsed=' + elapsed + 'ms');

    // 4. Backoff cresce entre tentativas (sem Retry-After).
    reset();
    await fetchOnce([{ status: 503 }, { status: 503 }, { status: 503 }, { ok: true }]);
    var ts = ajaxCalls['data/motions.min/PROBE1991.json'] || [];
    var gap1 = ts[1] - ts[0], gap2 = ts[2] - ts[1], gap3 = ts[3] - ts[2];
    check('backoff exponencial cresce (gap2 > gap1, gap3 > gap2)',
        ts.length === 4 && gap2 > gap1 && gap3 > gap2,
        'gaps=' + [gap1, gap2, gap3].join(','));

    // 5. Falha definitiva não trava e reporta o status.
    reset();
    sandbox.MOTION_LOAD_MAX_ATTEMPTS = 3;
    var r5 = await fetchOnce([{ status: 429 }, { status: 429 }, { status: 429 }, { status: 429 }]);
    check('falha persistente chama onFailure com o status',
        !r5.ok && r5.status === 429, JSON.stringify(r5));
    check('tentativas param no máximo configurado',
        (ajaxCalls['data/motions.min/PROBE1991.json'] || []).length === 3);

    // 6. 404 não é retentável: falha rápido, 1 tentativa.
    reset();
    var r6 = await fetchOnce([{ status: 404 }]);
    check('404 falha sem retry',
        !r6.ok && (ajaxCalls['data/motions.min/PROBE1991.json'] || []).length === 1);

    // 7. Fila completa com 20 motions respeitando o teto de concorrência.
    reset();
    sandbox.MOTION_LOAD_MAX_ATTEMPTS = 6;
    await loadRange(20);
    check('20 motions carregam e a fila conclui', maxInFlight > 0, 'maxInFlight=' + maxInFlight);
    check('concorrência nunca passa do teto (' + sandbox.MOTION_LOAD_CONCURRENCY + ')',
        maxInFlight <= sandbox.MOTION_LOAD_CONCURRENCY, 'maxInFlight=' + maxInFlight);
    check('nenhuma falha registrada no caminho feliz',
        sandbox.motionLoadFailures.length === 0,
        JSON.stringify(sandbox.motionLoadFailures));

    // 8. Uma motion com falha definitiva não trava a fila e é registrada.
    reset();
    var range = makeRange(5);
    ajaxBehaviors[motionUrl(2)] = [{ status: 429 }, { status: 429 }, { status: 429 },
        { status: 429 }, { status: 429 }, { status: 429 }, { status: 429 }];
    var finished = false;
    sandbox.loadMotionsInDateRange(range[0], range[1], function () { finished = true; });
    await new Promise(function (res) { setTimeout(res, 3000); });
    check('fila conclui mesmo com 1 motion falhando', finished);
    check('motion que falhou foi registrada',
        sandbox.motionLoadFailures.indexOf('PL22024') > -1,
        JSON.stringify(sandbox.motionLoadFailures));

    console.log(failures === 0 ? '\nAll checks passed' : '\n' + failures + ' check(s) failed');
    process.exit(failures === 0 ? 0 : 1);
}

main();
