#!/usr/bin/env node
/**
 * Parties Traces Generator for CivisAnalysis2
 *
 * Node.js equivalent of the browser-side createTraces1by1() function.
 * Calculates party center positions and sizes for each year using SVD (PCA),
 * then writes the result to javascripts/parties-traces.js.
 *
 * Usage:
 *   node scripts/generate-parties-traces.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const numeric = require(path.join(__dirname, '..', 'javascripts', 'external', 'numeric-1.2.6.js'));

const BASE_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const OUTPUT_FILE = path.join(BASE_DIR, 'javascripts', 'parties-traces.js');

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

// Vote string to integer mapping
const VOTE_TO_INT = { "Sim": 1, "Não": -1, "Abstenção": 0, "Obstrução": 0, "Art. 17": 0, "Branco": 0 };
const INT_TO_VOTE = ["Sim", "Não", "Abstenção", "Obstrução", "Art. 17", "Branco"];

// ============================================================
// Data Loading
// ============================================================
console.log('Loading deputies...');
const deputiesArray = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'deputies.json'), 'utf8'));

console.log('Loading roll calls...');
const arrayRollCalls = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'arrayRollCalls.json'), 'utf8'));
arrayRollCalls.forEach((rc, i) => {
    rc.datetime = new Date(rc.datetime);
    rc.rollCallID = i;
});

console.log('Loading motions...');
const motionsDir = path.join(DATA_DIR, 'motions.min');
const motionFiles = fs.readdirSync(motionsDir).filter(f => f.endsWith('.json'));
const motions = {};
for (const file of motionFiles) {
    const key = file.replace('.json', '');
    try {
        motions[key] = JSON.parse(fs.readFileSync(path.join(motionsDir, file), 'utf8'));
    } catch (e) {
        console.warn(`Warning: could not load motion ${file}: ${e.message}`);
    }
}
console.log(`Loaded ${Object.keys(motions).length} motions.`);

// ============================================================
// Core Functions (ported from browser code)
// ============================================================

/**
 * Get roll calls within a date range and attach motion vote data
 */
function getRollCallsInRange(startDate, endDate) {
    const rollCallsInRange = arrayRollCalls.filter(rc =>
        startDate <= rc.datetime && rc.datetime <= endDate
    );

    const deputiesInRange = {};

    for (const rc of rollCallsInRange) {
        const motionKey = rc.type + rc.number + rc.year;
        const motion = motions[motionKey];
        if (!motion) continue;

        // Find the matching roll call in the motion
        for (const mrc of motion.rollCalls) {
            const mrcDate = new Date(mrc.datetime);
            if (mrcDate.toUTCString() === rc.datetime.toUTCString()) {
                // Copy vote data to the roll call
                if (mrc.votes) {
                    rc.votes = mrc.votes.map(v => ({
                        ...v,
                        vote: INT_TO_VOTE[v.vote],
                        party: v.party === 'Solidaried' ? 'SDD' : (v.party === 'S.Part.' ? 'NoParty' : v.party)
                    }));
                }
                break;
            }
        }
    }

    // Filter roll calls that have votes
    const validRollCalls = rollCallsInRange.filter(rc => rc.votes && rc.votes.length > 0);

    // Build deputies in range
    for (const rc of validRollCalls) {
        for (const vote of rc.votes) {
            if (deputiesArray[vote.deputyID]) {
                deputiesInRange[vote.deputyID] = {
                    ...deputiesArray[vote.deputyID],
                    party: vote.party
                };
            }
        }
    }

    return { rollCalls: validRollCalls, deputies: deputiesInRange };
}

/**
 * Filter to top 513 most active deputies (matching filter513DeputiesMorePresent)
 */
function filterDeputies(rollCalls, deputiesInRange) {
    // Count votes per deputy
    const numVotes = {};
    for (const rc of rollCalls) {
        for (const vote of rc.votes) {
            numVotes[vote.deputyID] = (numVotes[vote.deputyID] || 0) + 1;
        }
    }

    // Assign numVotes
    for (const id in deputiesInRange) {
        deputiesInRange[id].numVotes = numVotes[id] || 0;
    }

    // Sort by numVotes desc, take top 513
    let deputies = Object.values(deputiesInRange);
    deputies.sort((a, b) => b.numVotes - a.numVotes);
    deputies = deputies.slice(0, Math.min(513, deputies.length));

    // Assign svdKey
    deputies.forEach((dep, i) => {
        dep.svdKey = i;
        deputiesInRange[dep.deputyID].svdKey = i;
    });

    return deputies;
}

/**
 * Create vote matrix (deputies x roll calls)
 */
function createMatrix(filteredDeputies, rollCalls, deputiesInRange) {
    const numDeps = filteredDeputies.length;
    const numRCs = rollCalls.length;
    const matrix = [];
    for (let i = 0; i < numDeps; i++) {
        matrix[i] = new Array(numRCs).fill(0);
    }

    rollCalls.forEach((rc, rcIdx) => {
        if (!rc.votes) return;
        for (const vote of rc.votes) {
            const dep = deputiesInRange[vote.deputyID];
            if (dep && dep.svdKey !== undefined && dep.svdKey !== null) {
                matrix[dep.svdKey][rcIdx] = VOTE_TO_INT[vote.vote] || 0;
            }
        }
    });

    return matrix;
}

/**
 * Calculate SVD and return 2D positions (matching calcSVD)
 */
function calcSVD(matrix) {
    const transposeToSVD = matrix.length < matrix[0].length;
    let m = transposeToSVD ? numeric.transpose(matrix) : matrix;

    const svd = numeric.svd(m);
    const eigenValues = numeric.sqrt(svd.S);

    let data_deputies;
    if (transposeToSVD) {
        data_deputies = svd.V.map(row => numeric.mul(row, eigenValues).splice(0, 2));
    } else {
        data_deputies = svd.U.map(row => numeric.mul(row, eigenValues).splice(0, 2));
    }

    return data_deputies;
}

/**
 * Create deputy nodes from SVD data (matching createDeputyNodes)
 */
function createDeputyNodes(svdPositions, filteredDeputies) {
    const nodes = [];
    for (let i = 0; i < filteredDeputies.length; i++) {
        const dep = filteredDeputies[i];
        nodes[dep.deputyID] = {
            name: dep.name,
            district: dep.district,
            deputyID: dep.deputyID,
            party: dep.party,
            scatterplot: svdPositions[i],
            selected: true,
            overlapped: null
        };
    }
    return nodes;
}

/**
 * Adjust scale so government party is in 3rd quadrant (matching setGovernmentTo3rdQuadrant)
 */
function setGovernmentTo3rdQuadrant(deputyNodes, endDate) {
    const nodes = deputyNodes.filter(n => n !== undefined);

    // Find government party for this period
    let governmentParty;
    for (const leg of LEGISLATURES) {
        if (leg.period[0] < endDate && leg.period[1] >= endDate) {
            governmentParty = leg.regimeParty;
        }
    }

    if (!governmentParty) {
        console.warn(`  No government party found for date ${endDate}`);
        return;
    }

    // Calculate extent and bisectors
    const xs = nodes.map(n => n.scatterplot[0]);
    const ys = nodes.map(n => n.scatterplot[1]);
    const extentX = [Math.min(...xs), Math.max(...xs)];
    const extentY = [Math.min(...ys), Math.max(...ys)];
    const bisectorX = extentX[0] + (extentX[1] - extentX[0]) / 2;
    const bisectorY = extentY[0] + (extentY[1] - extentY[0]) / 2;

    // Calculate government party average position
    let avgX = 0, avgY = 0, count = 0;
    for (const n of nodes) {
        if (n.party === governmentParty) {
            avgX += n.scatterplot[0];
            avgY += n.scatterplot[1];
            count++;
        }
    }
    if (count === 0) {
        console.warn(`  Government party ${governmentParty} not found in nodes`);
        return;
    }
    avgX /= count;
    avgY /= count;

    // Flip axes to put government in 3rd quadrant (negative x, positive y)
    const scaleX = avgX > bisectorX ? -1 : 1;
    const scaleY = avgY < bisectorY ? -1 : 1;

    for (const n of nodes) {
        n.scatterplot[0] *= scaleX;
        n.scatterplot[1] *= scaleY;
    }
}

/**
 * Calculate party size and center (matching calcPartiesSizeAndCenter)
 */
function calcPartiesSizeAndCenter(deputyNodes) {
    const nodes = deputyNodes.filter(n => n !== undefined);
    const parties = {};

    for (const dep of nodes) {
        if (!parties[dep.party]) {
            parties[dep.party] = { size: 0, selected: 0, center: [0, 0], stdev: [0, 0] };
        }
        parties[dep.party].size++;
        if (dep.selected) parties[dep.party].selected++;
        parties[dep.party].center[0] += dep.scatterplot[0];
        parties[dep.party].center[1] += dep.scatterplot[1];
        parties[dep.party].stdev[0] += Math.pow(dep.scatterplot[0], 2);
        parties[dep.party].stdev[1] += Math.pow(dep.scatterplot[1], 2);
    }

    for (const party in parties) {
        const p = parties[party];
        p.stdev[0] = Math.sqrt((p.stdev[0] - Math.pow(p.center[0], 2) / p.size) / (p.size - 1));
        p.stdev[1] = Math.sqrt((p.stdev[1] - Math.pow(p.center[1], 2) / p.size) / (p.size - 1));
        p.center[0] /= p.size;
        p.center[1] /= p.size;
    }

    return parties;
}

/**
 * Merge party traces for renamed parties (matching the merge logic in calcThePartyTracesByYear)
 */
function mergeObjects(obj1, obj2) {
    const result = {};
    if (obj1) for (const k in obj1) result[k] = obj1[k];
    if (obj2) for (const k in obj2) result[k] = obj2[k];
    return result;
}

// ============================================================
// Main: Calculate traces year by year
// ============================================================
const partyTrace = {};
const yearPartyExtent = {};

console.log('\nCalculating party traces year by year...\n');

for (let year = STARTING_YEAR; year <= ENDING_YEAR; year++) {
    const periodStart = new Date(year, 0, 1);
    const periodEnd = new Date(year + 1, 0, 1);

    process.stdout.write(`Year ${year}... `);

    // 1. Load data for this period
    const { rollCalls, deputies: deputiesInRange } = getRollCallsInRange(periodStart, periodEnd);

    if (rollCalls.length === 0) {
        console.log('no roll calls, skipping.');
        continue;
    }

    // 2. Filter deputies
    const filteredDeputies = filterDeputies(rollCalls, deputiesInRange);

    if (filteredDeputies.length < 3) {
        console.log(`only ${filteredDeputies.length} deputies, skipping.`);
        continue;
    }

    // 3. Create vote matrix
    const matrix = createMatrix(filteredDeputies, rollCalls, deputiesInRange);

    // 4. SVD
    const svdPositions = calcSVD(matrix);

    // 5. Create deputy nodes
    const deputyNodes = createDeputyNodes(svdPositions, filteredDeputies);

    // 6. Scale adjustment (government to 3rd quadrant)
    setGovernmentTo3rdQuadrant(deputyNodes, periodEnd);

    // 7. Calculate party centers
    const parties = calcPartiesSizeAndCenter(deputyNodes);

    // 8. Store traces
    for (const party in parties) {
        if (!partyTrace[party]) partyTrace[party] = {};
        partyTrace[party][year] = {
            center: parties[party].center,
            size: parties[party].size
        };
    }

    // 9. Store extent
    const partyEntries = Object.entries(parties);
    const yValues = partyEntries.map(([, v]) => v.center[1]);
    yearPartyExtent[year] = [Math.min(...yValues), Math.max(...yValues)];

    console.log(`${rollCalls.length} roll calls, ${filteredDeputies.length} deputies, ${Object.keys(parties).length} parties.`);
}

// ============================================================
// Merge renamed parties (same logic as browser code)
// ============================================================
console.log('\nMerging renamed parties...');

partyTrace['DEM'] = mergeObjects(partyTrace['PFL'], partyTrace['DEM']);
partyTrace['União'] = mergeObjects(partyTrace['DEM'], partyTrace['União']);
partyTrace['PL'] = mergeObjects(partyTrace['PR'], partyTrace['PL']);
partyTrace['PP'] = mergeObjects(partyTrace['PPB'], partyTrace['PP']);
partyTrace['Podemos'] = mergeObjects(partyTrace['PTN'], partyTrace['Podemos']);
partyTrace['MDB'] = mergeObjects(partyTrace['PMDB'], partyTrace['MDB']);
partyTrace['CIDADANIA'] = mergeObjects(partyTrace['PPS'], partyTrace['CIDADANIA']);

delete partyTrace['DEM'];
delete partyTrace['PFL'];
delete partyTrace['PR'];
delete partyTrace['PPB'];
delete partyTrace['PTN'];
delete partyTrace['PMDB'];
delete partyTrace['PPS'];

// ============================================================
// Write output
// ============================================================
const saveTrace = {
    extents: yearPartyExtent,
    traces: partyTrace
};

const output = 'var PARTIES_TRACES = ' + JSON.stringify(saveTrace);
fs.writeFileSync(OUTPUT_FILE, output, 'utf8');

console.log(`\nDone! Written to ${path.relative(BASE_DIR, OUTPUT_FILE)}`);
console.log(`Parties: ${Object.keys(partyTrace).length}`);
console.log(`Years: ${Object.keys(yearPartyExtent).length}`);
