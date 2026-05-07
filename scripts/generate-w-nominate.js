#!/usr/bin/env node
/**
 * W-NOMINATE Precalc Generator for CivisAnalysis2
 *
 * Generates W-NOMINATE precalculated scatter plot data for all standard periods.
 * Replicates the browser-based calculatePrecalc() logic using W-NOMINATE instead of PCA:
 *   1. Load motions for the period
 *   2. Filter top 513 deputies by vote count
 *   3. Build vote matrix (deputies × rollcalls) with W-NOMINATE encoding (1/6/9)
 *   4. Run W-NOMINATE algorithm → 2D coordinates
 *   5. Apply setGovernmentTo3rdQuadrant
 *   6. Compute party alignment
 *   7. Save to data/precalc/w-nominate/
 *
 * Usage: node scripts/generate-w-nominate.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Load numeric.js (required before w-nominate.js)
require(path.join(__dirname, '..', 'javascripts', 'external', 'numeric-1.2.6.js'));

// Load W-NOMINATE module
const wNominateModule = require(path.join(__dirname, '..', 'javascripts', 'w-nominate.js'));

const BASE_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const OUTPUT_DIR = path.join(DATA_DIR, 'precalc', 'w-nominate');

const MAX_DEPUTIES = 513;

// ============================================================
// Period Definitions (matching congress-definitions.js)
// ============================================================
const STARTING_YEAR = 1991;
const ENDING_YEAR = 2025;

const LEGISLATURES = [
    { name: '49th Legislature', regimeParty: 'PFL', period: [new Date(1991, 1, 1), new Date(1995, 0, 31)] },
    { name: '50th Legislature', regimeParty: 'PFL', period: [new Date(1995, 1, 1), new Date(1999, 0, 31)] },
    { name: '51th Legislature', regimeParty: 'PSDB', period: [new Date(1999, 1, 1), new Date(2003, 0, 31)] },
    { name: '52th Legislature', regimeParty: 'PT', period: [new Date(2003, 1, 1), new Date(2007, 0, 31)] },
    { name: '53th Legislature', regimeParty: 'PT', period: [new Date(2007, 1, 1), new Date(2011, 0, 31)] },
    { name: '54th Legislature', regimeParty: 'PT', period: [new Date(2011, 1, 1), new Date(2015, 0, 31)] },
    { name: '55th Legislature', regimeParty: 'PMDB', period: [new Date(2015, 1, 1), new Date(2019, 0, 31)] },
    { name: '56th Legislature', regimeParty: 'PL', period: [new Date(2019, 1, 1), new Date(2023, 0, 31)] },
    { name: '57th Legislature', regimeParty: 'PT', period: [new Date(2023, 1, 1), new Date(2026, 0, 31)] },
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
    { name: 'Lula (PT)', period: [new Date(2023, 0, 1), new Date(2026, 0, 1)] },
];

const PERIODS = { year: [], legislature: LEGISLATURES, president: PRESIDENTS };
for (var y = STARTING_YEAR; y <= ENDING_YEAR; y++) {
    PERIODS.year.push({ name: 'Year ' + y, period: [new Date(y, 0, 1), new Date(y + 1, 0, 1)] });
}

// ============================================================
// Helpers
// ============================================================

function getGovernmentParty(endDate) {
    for (var i = 0; i < LEGISLATURES.length; i++) {
        var leg = LEGISLATURES[i];
        if (leg.period[0] < endDate && leg.period[1] >= endDate) return leg.regimeParty;
    }
    if (endDate <= LEGISLATURES[0].period[1]) return LEGISLATURES[0].regimeParty;
    return LEGISLATURES[LEGISLATURES.length - 1].regimeParty;
}

function setGovTo3rdQuadrant(deputyNodes, endDate) {
    var governmentParty = getGovernmentParty(endDate);
    if (!governmentParty) return;

    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (var i = 0; i < deputyNodes.length; i++) {
        var x = deputyNodes[i].scatterplot[0], y = deputyNodes[i].scatterplot[1];
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    var bisectorX = minX + (maxX - minX) / 2;
    var bisectorY = minY + (maxY - minY) / 2;

    var avgX = 0, avgY = 0, count = 0;
    for (var i = 0; i < deputyNodes.length; i++) {
        if (deputyNodes[i].party === governmentParty) {
            avgX += deputyNodes[i].scatterplot[0];
            avgY += deputyNodes[i].scatterplot[1];
            count++;
        }
    }
    if (count === 0) return;
    avgX /= count; avgY /= count;

    var scaleX = 1, scaleY = 1;
    if (avgX > bisectorX) scaleX = -1;
    if (avgY < bisectorY) scaleY = -1;

    for (var i = 0; i < deputyNodes.length; i++) {
        deputyNodes[i].scatterplot[0] *= scaleX;
        deputyNodes[i].scatterplot[1] *= scaleY;
    }
}

// ============================================================
// Alignment Computation (same as data-processor.js)
// ============================================================
function computeAlignment(N, M, observedByDep, observedByRC, deputyPartyInRC) {
    var partyMaj = {};
    for (var j = 0; j < M; j++) {
        var pv = {};
        for (var e = 0; e < observedByRC[j].length; e++) {
            var ob = observedByRC[j][e];
            var party = deputyPartyInRC[ob.i + ',' + j];
            if (!party) continue;
            if (!pv[party]) pv[party] = { pos: 0, neg: 0 };
            if (ob.v === 1) pv[party].pos++; else pv[party].neg++;
        }
        var maj = {};
        var parties = Object.keys(pv);
        for (var p = 0; p < parties.length; p++) {
            maj[parties[p]] = pv[parties[p]].pos >= pv[parties[p]].neg ? 1 : -1;
        }
        partyMaj[j] = maj;
    }

    var alignments = {};
    for (var i = 0; i < N; i++) {
        var aligned = 0, total = 0;
        for (var e = 0; e < observedByDep[i].length; e++) {
            var ob = observedByDep[i][e];
            var party = deputyPartyInRC[i + ',' + ob.j];
            if (!party) continue;
            var maj = partyMaj[ob.j];
            if (maj && maj[party] !== undefined) {
                if (ob.v === maj[party]) aligned++;
                total++;
            }
        }
        alignments[i] = total > 0 ? parseFloat((aligned / total).toFixed(2)) : 0;
    }
    return alignments;
}

// ============================================================
// Data Loading
// ============================================================
function loadAllData() {
    console.log('Loading data...');
    var deputies = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'deputies.json'), 'utf8'));
    console.log('  Deputies: ' + deputies.length);

    var arrayRollCalls = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'arrayRollCalls.json'), 'utf8'));
    console.log('  Roll calls: ' + arrayRollCalls.length);

    var motionGroups = {};
    arrayRollCalls.forEach(function (rc, idx) {
        var key = rc.type + rc.number + rc.year;
        if (!motionGroups[key]) motionGroups[key] = [];
        motionGroups[key].push({ idx: idx, rc: rc });
    });

    var motionsDir = path.join(DATA_DIR, 'motions.min');
    var votesByRollCall = new Array(arrayRollCalls.length).fill(null);
    var loaded = 0, failed = 0;

    var keys = Object.keys(motionGroups);
    for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        var entries = motionGroups[key];
        var filePath = path.join(motionsDir, key + '.json');
        if (!fs.existsSync(filePath)) { failed++; continue; }
        try {
            var motion = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (!motion.rollCalls) { failed++; continue; }
            for (var e = 0; e < entries.length; e++) {
                var entry = entries[e];
                for (var r = 0; r < motion.rollCalls.length; r++) {
                    var mrc = motion.rollCalls[r];
                    if (mrc.datetime === entry.rc.datetime && mrc.votes) {
                        votesByRollCall[entry.idx] = mrc.votes;
                        loaded++;
                        break;
                    }
                }
            }
        } catch (err) { failed++; }
    }

    console.log('  Loaded votes for ' + loaded + ' roll calls (' + failed + ' failed)');
    return { deputies: deputies, arrayRollCalls: arrayRollCalls, votesByRollCall: votesByRollCall };
}

// ============================================================
// MAIN
// ============================================================
function main() {
    console.log('=== W-NOMINATE Precalc Generator ===\n');

    var startTime = Date.now();
    var rawData = loadAllData();
    var deputies = rawData.deputies;
    var arrayRollCalls = rawData.arrayRollCalls;
    var votesByRollCall = rawData.votesByRollCall;
    var rcDatetimes = arrayRollCalls.map(function (rc) { return new Date(rc.datetime); });

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    var filesWritten = 0;
    var periodTypes = Object.keys(PERIODS);

    for (var pt = 0; pt < periodTypes.length; pt++) {
        var periodType = periodTypes[pt];
        var periods = PERIODS[periodType];

        for (var pidx = 0; pidx < periods.length; pidx++) {
            var period = periods[pidx];
            var pStart = period.period[0], pEnd = period.period[1];

            // Find rollcalls in this period
            var periodRCs = [];
            for (var j = 0; j < arrayRollCalls.length; j++) {
                if (rcDatetimes[j] >= pStart && rcDatetimes[j] <= pEnd && votesByRollCall[j]) {
                    periodRCs.push(j);
                }
            }
            if (periodRCs.length < 5) {
                console.log('  ' + period.name + ': skipped (' + periodRCs.length + ' rollcalls)');
                continue;
            }

            // Collect deputies and their vote counts
            var deputyData = {}; // deputyID -> {votes: [{localRC, v, party}], numVotes: count}
            for (var ri = 0; ri < periodRCs.length; ri++) {
                var globalJ = periodRCs[ri];
                var votes = votesByRollCall[globalJ];
                for (var vi = 0; vi < votes.length; vi++) {
                    var v = votes[vi];
                    if (v.deputyID < 0 || v.deputyID >= deputies.length) continue;
                    var party = v.party;
                    if (party === 'Solidaried') party = 'SDD';
                    if (party === 'S.Part.') party = 'NoParty';

                    if (!deputyData[v.deputyID]) deputyData[v.deputyID] = { votes: [], numVotes: 0 };
                    deputyData[v.deputyID].votes.push({ localRC: ri, v: v.vote, party: party });
                    deputyData[v.deputyID].numVotes++;
                }
            }

            // Filter: top 513 deputies by vote count (same as browser)
            var depEntries = Object.keys(deputyData).map(function (id) {
                return { id: parseInt(id), numVotes: deputyData[id].numVotes };
            });
            depEntries.sort(function (a, b) { return b.numVotes - a.numVotes; });
            var selectedDeps = depEntries.slice(0, Math.min(MAX_DEPUTIES, depEntries.length));

            var depIDs = selectedDeps.map(function (d) { return d.id; });
            var depIdxMap = {};
            for (var i = 0; i < depIDs.length; i++) depIdxMap[depIDs[i]] = i;

            var N = depIDs.length;
            var M = periodRCs.length;

            if (N < 10) {
                console.log('  ' + period.name + ': skipped (N=' + N + ')');
                continue;
            }

            // Build dense vote matrix (N x M) with W-NOMINATE encoding
            // Vote encoding: Sim(0)->1 (yea), Não(1)->6 (nay), rest->9 (missing)
            var wMatrix = [];
            for (var i = 0; i < N; i++) {
                var row = new Array(M).fill(9);
                wMatrix.push(row);
            }

            // Build alignment data structures (using 1/-1 encoding, same as PCA)
            var observedByDep = [], observedByRC = [];
            for (var i = 0; i < N; i++) observedByDep.push([]);
            for (var j = 0; j < M; j++) observedByRC.push([]);
            var deputyPartyInRC = {};

            for (var di = 0; di < depIDs.length; di++) {
                var depID = depIDs[di];
                var dv = deputyData[depID].votes;
                for (var vi = 0; vi < dv.length; vi++) {
                    var rawVote = dv[vi].v;

                    // W-NOMINATE matrix encoding
                    if (rawVote === 0) {
                        wMatrix[di][dv[vi].localRC] = 1;      // Sim/Yea
                    } else if (rawVote === 1) {
                        wMatrix[di][dv[vi].localRC] = 6;      // Não/Nay
                    }
                    // else: leave as 9 (missing)

                    // Alignment encoding (1/-1, skip missing)
                    var alignVal;
                    if (rawVote === 0) alignVal = 1;
                    else if (rawVote === 1) alignVal = -1;
                    else continue;

                    var entry = { i: di, j: dv[vi].localRC, v: alignVal };
                    observedByDep[di].push(entry);
                    observedByRC[dv[vi].localRC].push(entry);
                    deputyPartyInRC[di + ',' + dv[vi].localRC] = dv[vi].party;
                }
            }

            // Run W-NOMINATE
            var result;
            try {
                result = wNominateModule.wNominate(wMatrix, { maxIter: 100 });
            } catch (err) {
                console.log('  ' + period.name + ': W-NOMINATE error: ' + err.message);
                continue;
            }

            // Map result back to depIDs using legIndices
            // result.legIndices[k] = row index in wMatrix that was kept
            // result.legislators[k] = {coord1D, coord2D} for that row
            var positionByDepIdx = {};
            for (var k = 0; k < result.legIndices.length; k++) {
                var origRow = result.legIndices[k];
                positionByDepIdx[origRow] = result.legislators[k];
            }

            // Get last party per deputy (matching browser's refreshDeputies behavior)
            var deputyParties = {};
            for (var di = 0; di < depIDs.length; di++) {
                var depID = depIDs[di];
                var dv = deputyData[depID].votes;
                var lastParty = '', lastRC = -1;
                for (var vi = 0; vi < dv.length; vi++) {
                    if (dv[vi].localRC > lastRC) {
                        lastRC = dv[vi].localRC;
                        lastParty = dv[vi].party;
                    }
                }
                deputyParties[di] = lastParty;
            }

            // Compute alignment
            var alignments = computeAlignment(N, M, observedByDep, observedByRC, deputyPartyInRC);

            // Build output nodes (only deputies that survived W-NOMINATE filtering)
            var deputyNodes = [];
            for (var i = 0; i < N; i++) {
                var pos = positionByDepIdx[i];
                if (!pos) continue; // filtered out by minVotes/lop

                deputyNodes.push({
                    deputyID: depIDs[i],
                    scatterplot: [Number(pos.coord1D.toPrecision(4)), Number(pos.coord2D.toPrecision(4))],
                    party: deputyParties[i] || '',
                    alignment: alignments[i] || 0
                });
            }

            if (deputyNodes.length === 0) {
                console.log('  ' + period.name + ': skipped (no deputies after W-NOMINATE filtering)');
                continue;
            }

            // Apply setGovernmentTo3rdQuadrant
            setGovTo3rdQuadrant(deputyNodes, pEnd);

            // Save
            var id = periodType === 'year' ? STARTING_YEAR + pidx : pidx;
            var filename = periodType + '.' + id + '.json';
            fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify({ deputyNodes: deputyNodes }));
            filesWritten++;

            console.log('  ' + period.name + ': N=' + N + ' (kept=' + deputyNodes.length + '), M=' + M + ' -> ' + filename);
        }
    }

    console.log('\nWritten ' + filesWritten + ' files to ' + OUTPUT_DIR);
    var elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('Done in ' + elapsed + 's');
}

main();
