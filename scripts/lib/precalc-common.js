/**
 * Shared pieces of the precalc generators (MDS and UMAP).
 *
 * Mirrors the pipeline of generate-pca-precalc.js — same periods, same deputy
 * filter (top 513 by vote count, ties by deputyID), same vote encoding, same
 * party alignment and the same government-to-3rd-quadrant flip — so that a
 * precalculated period matches what the browser computes on the fly.
 *
 * The projections themselves come from the browser's own
 * javascripts/dimensionality-reduction.js, evaluated here unmodified, so the
 * generator cannot drift from the code the user runs.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE_DIR = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const JS_DIR = path.join(BASE_DIR, 'javascripts');

// numeric.js defines the global `numeric` used by the browser DR code.
require(path.join(JS_DIR, 'external', 'numeric-1.2.6.js'));

const { calcPartyAlignment } = require(path.join(JS_DIR, 'core', 'party-alignment.js'));
const { calcVoteDistanceMatrix } = require(path.join(JS_DIR, 'core', 'vote-distance.js'));

const MAX_DEPUTIES = 513;
const STARTING_YEAR = 1991;
const ENDING_YEAR = require('../ending-year').endingYear();

const LEGISLATURES = [
    { name: '49th Legislature', regimeParty: 'PFL', period: [new Date(1991, 1, 1), new Date(1995, 0, 31)] },
    { name: '50th Legislature', regimeParty: 'PFL', period: [new Date(1995, 1, 1), new Date(1999, 0, 31)] },
    { name: '51st Legislature', regimeParty: 'PSDB', period: [new Date(1999, 1, 1), new Date(2003, 0, 31)] },
    { name: '52nd Legislature', regimeParty: 'PT', period: [new Date(2003, 1, 1), new Date(2007, 0, 31)] },
    { name: '53rd Legislature', regimeParty: 'PT', period: [new Date(2007, 1, 1), new Date(2011, 0, 31)] },
    { name: '54th Legislature', regimeParty: 'PT', period: [new Date(2011, 1, 1), new Date(2015, 0, 31)] },
    { name: '55th Legislature', regimeParty: 'PMDB', period: [new Date(2015, 1, 1), new Date(2019, 0, 31)] },
    { name: '56th Legislature', regimeParty: 'PL', period: [new Date(2019, 1, 1), new Date(2023, 0, 31)] },
    { name: '57th Legislature', regimeParty: 'PT', period: [new Date(2023, 1, 1), new Date(2027, 0, 31)] },
];

const PRESIDENTS = [
    { name: 'Collor (PRN)', period: [new Date(1991, 0, 1), new Date(1992, 11, 29)] },
    { name: 'Itamar (PMDB)', period: [new Date(1992, 11, 29), new Date(1995, 0, 1)] },
    { name: 'FHC (PSDB) 1st', period: [new Date(1995, 0, 1), new Date(1999, 0, 1)] },
    { name: 'FHC (PSDB) 2nd', period: [new Date(1999, 0, 1), new Date(2003, 0, 1)] },
    { name: 'Lula (PT) 1st', period: [new Date(2003, 0, 1), new Date(2007, 0, 1)] },
    { name: 'Lula (PT) 2nd', period: [new Date(2007, 0, 1), new Date(2011, 0, 1)] },
    { name: 'Dilma (PT) 1st', period: [new Date(2011, 0, 1), new Date(2015, 0, 1)] },
    { name: 'Dilma (PT)', period: [new Date(2015, 0, 1), new Date(2016, 4, 12)] },
    { name: 'Temer (PMDB)', period: [new Date(2016, 4, 13), new Date(2019, 0, 1)] },
    { name: 'Bolsonaro (PSL)', period: [new Date(2019, 0, 1), new Date(2023, 0, 1)] },
    { name: 'Lula (PT)', period: [new Date(2023, 0, 1), new Date(2027, 0, 1)] },
];

const PERIODS = { year: [], legislature: LEGISLATURES, president: PRESIDENTS };
for (let y = STARTING_YEAR; y <= ENDING_YEAR; y++) {
    PERIODS.year.push({ name: 'Year ' + y, period: [new Date(y, 0, 1), new Date(y + 1, 0, 1)] });
}

const VOTE_LABELS = ['Sim', 'Não', 'Abstenção', 'Obstrução', 'Art. 17', 'Branco'];

function normalizeParty(party) {
    if (party === 'Solidaried') return 'SDD';
    if (party === 'S.Part.') return 'NoParty';
    return party;
}

// ------------------------------------------------------------
// Browser DR code
// ------------------------------------------------------------

/**
 * Evaluates javascripts/dimensionality-reduction.js with the same globals the
 * page provides: numeric (already loaded), UMAP (same umap-js bundle the page
 * loads from the CDN) and Math.seedrandom (same seedrandom version).
 */
function loadBrowserDR() {
    if (!global.window) global.window = global; // the UMD bundle reads `window`
    const umapBundle = require('umap-js/lib/umap-js.min.js');
    global.UMAP = umapBundle.UMAP;
    Math.seedrandom = require('seedrandom');

    vm.runInThisContext(fs.readFileSync(path.join(JS_DIR, 'dimensionality-reduction.js'), 'utf8'),
        { filename: 'dimensionality-reduction.js' });

    // The browser functions log whole matrices; keep generator output readable.
    function quiet(fn) {
        return function () {
            const log = console.log;
            console.log = function () { };
            try { return fn.apply(null, arguments); } finally { console.log = log; }
        };
    }
    const calcMDS = quiet(global.calcMDS);
    const calcUMAP = quiet(global.calcUMAP);

    return {
        /** classical MDS over a distance matrix → Promise<number[][]> */
        mds: function (distances) {
            return new Promise(function (resolve) { calcMDS(distances, function (r) { resolve(r.deputies); }); });
        },
        /** seeded UMAP over the vote matrix → Promise<number[][]> */
        umap: function (matrix) {
            return new Promise(function (resolve) { calcUMAP(matrix, function (r) { resolve(r.deputies); }); });
        },
    };
}

// ------------------------------------------------------------
// Data
// ------------------------------------------------------------

function loadAllData() {
    const deputies = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'deputies.json'), 'utf8'));
    const arrayRollCalls = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'arrayRollCalls.json'), 'utf8'));

    const motionGroups = {};
    arrayRollCalls.forEach(function (rc, idx) {
        const key = rc.type + rc.number + rc.year;
        (motionGroups[key] = motionGroups[key] || []).push({ idx: idx, rc: rc });
    });

    const motionsDir = path.join(DATA_DIR, 'motions.min');
    const votesByRollCall = new Array(arrayRollCalls.length).fill(null);
    let loaded = 0, failed = 0;

    Object.keys(motionGroups).forEach(function (key) {
        const filePath = path.join(motionsDir, key + '.json');
        if (!fs.existsSync(filePath)) { failed++; return; }
        try {
            const motion = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (!motion.rollCalls) { failed++; return; }
            motionGroups[key].forEach(function (entry) {
                for (let r = 0; r < motion.rollCalls.length; r++) {
                    const mrc = motion.rollCalls[r];
                    if (mrc.datetime === entry.rc.datetime && mrc.votes) {
                        votesByRollCall[entry.idx] = mrc.votes;
                        loaded++;
                        break;
                    }
                }
            });
        } catch (err) { failed++; }
    });

    return {
        deputies: deputies,
        arrayRollCalls: arrayRollCalls,
        votesByRollCall: votesByRollCall,
        rcDatetimes: arrayRollCalls.map(function (rc) { return new Date(rc.datetime); }),
        stats: { deputies: deputies.length, rollCalls: arrayRollCalls.length, loaded: loaded, failed: failed },
    };
}

/**
 * Builds everything a projection needs for one period, exactly as
 * generate-pca-precalc.js does. Returns { skip: reason } when the period is
 * too small to project.
 */
function buildPeriod(data, period) {
    const pStart = period.period[0], pEnd = period.period[1];
    const periodRCs = [];
    for (let j = 0; j < data.arrayRollCalls.length; j++) {
        if (data.rcDatetimes[j] >= pStart && data.rcDatetimes[j] <= pEnd && data.votesByRollCall[j]) periodRCs.push(j);
    }
    if (periodRCs.length < 5) return { skip: periodRCs.length + ' rollcalls' };

    const deputyData = {};
    periodRCs.forEach(function (globalJ, ri) {
        data.votesByRollCall[globalJ].forEach(function (v) {
            if (v.deputyID < 0 || v.deputyID >= data.deputies.length) return;
            const d = deputyData[v.deputyID] = deputyData[v.deputyID] || { votes: [], numVotes: 0 };
            d.votes.push({ localRC: ri, v: v.vote, party: normalizeParty(v.party) });
            d.numVotes++;
        });
    });

    // Top 513 by vote count; Object.keys gives ascending deputyID and the sort
    // is stable, so ties keep deputyID order — the same as the browser.
    const depIDs = Object.keys(deputyData)
        .map(function (id) { return { id: parseInt(id, 10), numVotes: deputyData[id].numVotes }; })
        .sort(function (a, b) { return b.numVotes - a.numVotes; })
        .slice(0, MAX_DEPUTIES)
        .map(function (d) { return d.id; });

    const N = depIDs.length, M = periodRCs.length;
    if (N < 10) return { skip: 'N=' + N };

    const depIdxMap = {};
    depIDs.forEach(function (id, i) { depIdxMap[id] = i; });

    // Vote encoding: Sim → 1, Não → -1, anything else → 0
    const matrix = numeric.rep([N, M], 0);
    const parties = new Array(N).fill('');
    depIDs.forEach(function (depID, di) {
        let lastRC = -1;
        deputyData[depID].votes.forEach(function (dv) {
            matrix[di][dv.localRC] = dv.v === 0 ? 1 : (dv.v === 1 ? -1 : 0);
            if (dv.localRC > lastRC) { lastRC = dv.localRC; parties[di] = dv.party; }
        });
    });

    const alignmentInput = periodRCs.map(function (globalJ) {
        const out = [];
        data.votesByRollCall[globalJ].forEach(function (v) {
            if (v.deputyID < 0 || v.deputyID >= data.deputies.length) return;
            const row = depIdxMap[v.deputyID];
            out.push({ row: row === undefined ? null : row, party: normalizeParty(v.party), vote: VOTE_LABELS[v.vote] });
        });
        return out;
    });
    const alignments = calcPartyAlignment(N, alignmentInput);

    return { depIDs: depIDs, matrix: matrix, parties: parties, alignments: alignments, N: N, M: M, end: pEnd };
}

// ------------------------------------------------------------
// Output
// ------------------------------------------------------------

function getGovernmentParty(endDate) {
    for (let i = 0; i < LEGISLATURES.length; i++) {
        const leg = LEGISLATURES[i];
        if (leg.period[0] < endDate && leg.period[1] >= endDate) return leg.regimeParty;
    }
    if (endDate <= LEGISLATURES[0].period[1]) return LEGISLATURES[0].regimeParty;
    return LEGISLATURES[LEGISLATURES.length - 1].regimeParty;
}

function setGovTo3rdQuadrant(deputyNodes, endDate) {
    const governmentParty = getGovernmentParty(endDate);
    if (!governmentParty) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    deputyNodes.forEach(function (d) {
        const x = d.scatterplot[0], y = d.scatterplot[1];
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
    });
    const bisectorX = minX + (maxX - minX) / 2;
    const bisectorY = minY + (maxY - minY) / 2;

    let avgX = 0, avgY = 0, count = 0;
    deputyNodes.forEach(function (d) {
        if (d.party === governmentParty) { avgX += d.scatterplot[0]; avgY += d.scatterplot[1]; count++; }
    });
    if (count === 0) return;
    avgX /= count; avgY /= count;

    const scaleX = avgX > bisectorX ? -1 : 1;
    const scaleY = avgY < bisectorY ? -1 : 1;
    deputyNodes.forEach(function (d) {
        d.scatterplot[0] *= scaleX;
        d.scatterplot[1] *= scaleY;
    });
}

function toDeputyNodes(built, positions) {
    const nodes = built.depIDs.map(function (depID, i) {
        return {
            deputyID: depID,
            scatterplot: [Number(positions[i][0].toPrecision(4)), Number(positions[i][1].toPrecision(4))],
            party: built.parties[i] || '',
            alignment: built.alignments[i],
        };
    });
    setGovTo3rdQuadrant(nodes, built.end);
    return nodes;
}

/** Iterates every standard period as { periodType, id, period, filename }. */
function eachPeriod(fn) {
    Object.keys(PERIODS).forEach(function (periodType) {
        PERIODS[periodType].forEach(function (period, pidx) {
            const id = periodType === 'year' ? STARTING_YEAR + pidx : pidx;
            fn({ periodType: periodType, id: id, period: period, filename: periodType + '.' + id + '.json' });
        });
    });
}

module.exports = {
    DATA_DIR: DATA_DIR,
    PERIODS: PERIODS,
    calcVoteDistanceMatrix: calcVoteDistanceMatrix,
    loadBrowserDR: loadBrowserDR,
    loadAllData: loadAllData,
    buildPeriod: buildPeriod,
    toDeputyNodes: toDeputyNodes,
    eachPeriod: eachPeriod,
};
