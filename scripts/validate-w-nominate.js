#!/usr/bin/env node
/**
 * W-NOMINATE Validation: JS vs R wnominate package
 * Tests multiple periods to verify results aren't overfitted.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

require(path.join(__dirname, '..', 'javascripts', 'external', 'numeric-1.2.6.js'));
const wNominateModule = require(path.join(__dirname, '..', 'javascripts', 'w-nominate.js'));

const BASE_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const TMP_DIR = path.join(BASE_DIR, 'scripts', 'tmp_validate');

const TARGET_YEARS = [2003, 2007, 2015, 2019, 2021];
const MAX_DEPUTIES = 513;

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// ---- Load Data ----
console.log('=== W-NOMINATE Multi-Period Validation: JS vs R ===\n');
console.log('Loading data...');
const deputies = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'deputies.json'), 'utf8'));
const arrayRollCalls = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'arrayRollCalls.json'), 'utf8'));

const motionGroups = {};
arrayRollCalls.forEach(function (rc, idx) {
    const key = rc.type + rc.number + rc.year;
    if (!motionGroups[key]) motionGroups[key] = [];
    motionGroups[key].push({ idx: idx, rc: rc });
});

const motionsDir = path.join(DATA_DIR, 'motions.min');
const votesByRollCall = new Array(arrayRollCalls.length).fill(null);
let loaded = 0;
Object.keys(motionGroups).forEach(function (key) {
    const entries = motionGroups[key];
    const filePath = path.join(motionsDir, key + '.json');
    if (!fs.existsSync(filePath)) return;
    try {
        const motion = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (!motion.rollCalls) return;
        entries.forEach(function (entry) {
            for (let r = 0; r < motion.rollCalls.length; r++) {
                const mrc = motion.rollCalls[r];
                if (mrc.datetime === entry.rc.datetime && mrc.votes) {
                    votesByRollCall[entry.idx] = mrc.votes;
                    loaded++;
                    break;
                }
            }
        });
    } catch (err) {}
});
console.log('  Loaded votes for ' + loaded + ' roll calls\n');

const rcDatetimes = arrayRollCalls.map(rc => new Date(rc.datetime));

// ---- Helpers ----
function pearson(xs, ys) {
    const n = xs.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += xs[i]; sumY += ys[i];
        sumXY += xs[i] * ys[i];
        sumX2 += xs[i] * xs[i];
        sumY2 += ys[i] * ys[i];
    }
    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return den === 0 ? 0 : num / den;
}

function kendallTau(xs, ys) {
    const n = xs.length;
    let concordant = 0, discordant = 0;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const dx = xs[i] - xs[j];
            const dy = ys[i] - ys[j];
            if (dx * dy > 0) concordant++;
            else if (dx * dy < 0) discordant++;
        }
    }
    const total = concordant + discordant;
    return total === 0 ? 0 : (concordant - discordant) / total;
}

// ---- Results table ----
const results = [];

for (const TARGET_YEAR of TARGET_YEARS) {
    console.log('━'.repeat(60));
    console.log('  Year ' + TARGET_YEAR);
    console.log('━'.repeat(60));

    const pStart = new Date(TARGET_YEAR, 0, 1);
    const pEnd = new Date(TARGET_YEAR + 1, 0, 1);

    const periodRCs = [];
    for (let j = 0; j < arrayRollCalls.length; j++) {
        if (rcDatetimes[j] >= pStart && rcDatetimes[j] <= pEnd && votesByRollCall[j]) {
            periodRCs.push(j);
        }
    }
    console.log('  Roll calls: ' + periodRCs.length);

    if (periodRCs.length < 30) {
        console.log('  SKIPPED (too few roll calls)\n');
        continue;
    }

    // Build matrix
    const deputyData = {};
    for (let ri = 0; ri < periodRCs.length; ri++) {
        const votes = votesByRollCall[periodRCs[ri]];
        for (let vi = 0; vi < votes.length; vi++) {
            const v = votes[vi];
            if (v.deputyID < 0 || v.deputyID >= deputies.length) continue;
            let party = v.party;
            if (party === 'Solidaried') party = 'SDD';
            if (party === 'S.Part.') party = 'NoParty';
            if (!deputyData[v.deputyID]) deputyData[v.deputyID] = { votes: [], numVotes: 0 };
            deputyData[v.deputyID].votes.push({ localRC: ri, v: v.vote, party: party });
            deputyData[v.deputyID].numVotes++;
        }
    }

    let depEntries = Object.keys(deputyData).map(id => ({ id: parseInt(id), numVotes: deputyData[id].numVotes }));
    depEntries.sort((a, b) => b.numVotes - a.numVotes);
    depEntries = depEntries.slice(0, Math.min(MAX_DEPUTIES, depEntries.length));
    const depIDs = depEntries.map(d => d.id);
    const N = depIDs.length, M = periodRCs.length;
    console.log('  Deputies: ' + N + ', Roll calls: ' + M);

    const wMatrix = [];
    for (let i = 0; i < N; i++) wMatrix.push(new Array(M).fill(9));
    for (let di = 0; di < N; di++) {
        const dv = deputyData[depIDs[di]].votes;
        for (let vi = 0; vi < dv.length; vi++) {
            if (dv[vi].v === 0) wMatrix[di][dv[vi].localRC] = 1;
            else if (dv[vi].v === 1) wMatrix[di][dv[vi].localRC] = 6;
        }
    }

    // Polarity anchors
    const voteCounts = [];
    for (let i = 0; i < N; i++) {
        let c = 0;
        for (let j = 0; j < M; j++) if (wMatrix[i][j] === 1 || wMatrix[i][j] === 6) c++;
        voteCounts.push({ idx: i, count: c });
    }
    voteCounts.sort((a, b) => b.count - a.count);
    const pol1 = voteCounts[0].idx;
    const pol2 = voteCounts[1].idx;

    // ---- JS ----
    const jsStart = Date.now();
    let jsResult;
    try {
        jsResult = wNominateModule.wNominate(wMatrix, {
            maxIter: 100,
            trials: 3,
            polarity: [pol1, pol2]
        });
    } catch (e) {
        console.log('  JS FAILED: ' + e.message + '\n');
        continue;
    }
    const jsTime = ((Date.now() - jsStart) / 1000).toFixed(1);
    console.log('  JS: ' + jsTime + 's, cc=' + jsResult.fits.correctClass.toFixed(1) + '%, beta=' + jsResult.beta.toFixed(1));

    const jsCoords = {};
    for (let fi = 0; fi < jsResult.legIndices.length; fi++) {
        const matIdx = jsResult.legIndices[fi];
        jsCoords[depIDs[matIdx]] = [jsResult.legislators[fi].coord1D, jsResult.legislators[fi].coord2D];
    }

    // ---- R ----
    let csvRows = [];
    for (let i = 0; i < N; i++) csvRows.push(wMatrix[i].join(','));
    fs.writeFileSync(path.join(TMP_DIR, 'vote_matrix.csv'), csvRows.join('\n'));
    fs.writeFileSync(path.join(TMP_DIR, 'dep_ids.csv'), depIDs.join('\n'));
    fs.writeFileSync(path.join(TMP_DIR, 'polarity.csv'), (pol1 + 1) + ',' + (pol2 + 1));

    const rScript = `
library(wnominate); library(pscl); library(jsonlite)
mat <- as.matrix(read.csv("${path.join(TMP_DIR, 'vote_matrix.csv')}", header=FALSE))
dep_ids <- scan("${path.join(TMP_DIR, 'dep_ids.csv')}", quiet=TRUE)
pol <- scan("${path.join(TMP_DIR, 'polarity.csv')}", sep=",", quiet=TRUE)
rc_obj <- rollcall(mat, yea=1, nay=6, missing=9, notInLegis=0, legis.names=as.character(dep_ids))
result <- wnominate(rc_obj, dims=2, polarity=c(pol[1], pol[2]), verbose=FALSE, trials=1)
out <- data.frame(depID=dep_ids, coord1D=result$legislators$coord1D, coord2D=result$legislators$coord2D)
write.csv(out, "${path.join(TMP_DIR, 'r_coords.csv')}", row.names=FALSE)
cat(round(result$fits["correctclass2D"], 2))
`;

    let rCC = '?';
    try {
        rCC = execSync('Rscript -e \'' + rScript.replace(/'/g, "'\\''") + '\'', {
            cwd: BASE_DIR, encoding: 'utf8', timeout: 120000
        }).trim().split('\n').pop();
    } catch (e) {
        console.log('  R FAILED\n');
        continue;
    }
    console.log('  R: cc=' + rCC + '%');

    // ---- Compare ----
    const rCoordsRaw = fs.readFileSync(path.join(TMP_DIR, 'r_coords.csv'), 'utf8');
    const rLines = rCoordsRaw.trim().split('\n').slice(1);
    const rCoords = {};
    rLines.forEach(line => {
        const parts = line.split(',');
        const depID = parseInt(parts[0].replace(/"/g, ''));
        const c1 = parseFloat(parts[1]);
        const c2 = parseFloat(parts[2]);
        if (!isNaN(c1) && !isNaN(c2)) rCoords[depID] = [c1, c2];
    });

    const commonIDs = Object.keys(jsCoords).filter(id => rCoords[id] !== undefined).map(Number);

    if (commonIDs.length < 10) {
        console.log('  Too few common legislators\n');
        continue;
    }

    const jsD1 = commonIDs.map(id => jsCoords[id][0]);
    const jsD2 = commonIDs.map(id => jsCoords[id][1]);
    const rD1 = commonIDs.map(id => rCoords[id][0]);
    const rD2 = commonIDs.map(id => rCoords[id][1]);

    const pD1 = Math.max(Math.abs(pearson(jsD1, rD1)), Math.abs(pearson(jsD1, rD1.map(x => -x))));
    const pD2 = Math.max(Math.abs(pearson(jsD2, rD2)), Math.abs(pearson(jsD2, rD2.map(x => -x))));
    const kD1 = kendallTau(jsD1, rD1);
    const kD2 = kendallTau(jsD2, rD2);

    console.log('  Pearson:  dim1=' + pD1.toFixed(3) + (pD1 > 0.95 ? ' ✓' : ' ✗') +
                '  dim2=' + pD2.toFixed(3) + (pD2 > 0.95 ? ' ✓' : ' ✗'));
    console.log('  Kendall:  dim1=' + Math.abs(kD1).toFixed(3) + '  dim2=' + Math.abs(kD2).toFixed(3));
    console.log('');

    results.push({
        year: TARGET_YEAR, N: N, M: M,
        jsTime: parseFloat(jsTime), jsCC: jsResult.fits.correctClass,
        rCC: parseFloat(rCC),
        pearsonD1: pD1, pearsonD2: pD2,
        kendallD1: Math.abs(kD1), kendallD2: Math.abs(kD2)
    });
}

// ---- Summary ----
console.log('\n' + '═'.repeat(60));
console.log('  SUMMARY');
console.log('═'.repeat(60));
console.log('');
console.log('Year | N   x M   | JS time | Pearson D1 | Pearson D2 | Kendall D1 | Kendall D2');
console.log('-----|-----------|---------|------------|------------|------------|----------');

let totalTime = 0;
let avgPD1 = 0, avgPD2 = 0, avgKD1 = 0, avgKD2 = 0;
for (const r of results) {
    console.log(r.year + ' | ' +
        String(r.N).padStart(3) + ' x ' + String(r.M).padStart(3) + ' | ' +
        (r.jsTime + 's').padStart(7) + ' | ' +
        r.pearsonD1.toFixed(3).padStart(10) + ' | ' +
        r.pearsonD2.toFixed(3).padStart(10) + ' | ' +
        r.kendallD1.toFixed(3).padStart(10) + ' | ' +
        r.kendallD2.toFixed(3).padStart(10));
    totalTime += r.jsTime;
    avgPD1 += r.pearsonD1;
    avgPD2 += r.pearsonD2;
    avgKD1 += r.kendallD1;
    avgKD2 += r.kendallD2;
}

const n = results.length;
console.log('-----|-----------|---------|------------|------------|------------|----------');
console.log(' AVG |           | ' + (totalTime / n).toFixed(1) + 's'.padStart(6) + ' | ' +
    (avgPD1 / n).toFixed(3).padStart(10) + ' | ' +
    (avgPD2 / n).toFixed(3).padStart(10) + ' | ' +
    (avgKD1 / n).toFixed(3).padStart(10) + ' | ' +
    (avgKD2 / n).toFixed(3).padStart(10));
console.log('');
console.log('Total JS time: ' + totalTime.toFixed(1) + 's for ' + n + ' periods');
console.log('Avg JS time per period: ' + (totalTime / n).toFixed(1) + 's');

// Cleanup
try { fs.rmSync(TMP_DIR, { recursive: true }); } catch (e) {}
