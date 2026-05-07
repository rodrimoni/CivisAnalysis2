#!/usr/bin/env node
/**
 * Deputies Nodes By Year Generator for CivisAnalysis2
 *
 * Node.js equivalent of the browser-side loadScatterPlotDataByYear() function.
 * Reads precalculated year files and aggregates each deputy's scatterplot
 * positions across all years. Writes to data/deputiesNodesByYear.json.
 *
 * Usage:
 *   node scripts/generate-deputies-nodes-by-year.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const PRECALC_DIR = path.join(DATA_DIR, 'precalc', 'pca');
const OUTPUT_FILE = path.join(DATA_DIR, 'deputiesNodesByYear.json');

const STARTING_YEAR = 1991;
const ENDING_YEAR = 2025;

// Load deputies for name lookup
console.log('Loading deputies...');
const deputiesArray = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'deputies.json'), 'utf8'));

// ============================================================
// Aggregate deputy nodes across all years
// ============================================================
const deputiesNodesYearsArray = [];

for (let year = STARTING_YEAR; year <= ENDING_YEAR; year++) {
    const filePath = path.join(PRECALC_DIR, `year.${year}.json`);

    if (!fs.existsSync(filePath)) {
        console.warn(`Warning: ${filePath} not found, skipping year ${year}.`);
        continue;
    }

    const precalc = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    precalc.deputyNodes.forEach(function (precalcDeputy) {
        const id = precalcDeputy.deputyID;

        if (deputiesNodesYearsArray[id] === undefined) {
            deputiesNodesYearsArray[id] = {
                deputyID: id,
                name: deputiesArray[id].name,
                nodes: []
            };
        }

        deputiesNodesYearsArray[id].nodes.push({
            year: year,
            party: precalcDeputy.party,
            scatterplot: precalcDeputy.scatterplot
        });
    });

    console.log(`Year ${year}: ${precalc.deputyNodes.length} deputies.`);
}

// ============================================================
// Write output
// ============================================================
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(deputiesNodesYearsArray), 'utf8');

// Count non-null entries
let count = 0;
for (let i = 0; i < deputiesNodesYearsArray.length; i++) {
    if (deputiesNodesYearsArray[i]) count++;
}

console.log(`\nDone! Written to ${path.relative(BASE_DIR, OUTPUT_FILE)}`);
console.log(`Deputies: ${count}`);
console.log(`Array length: ${deputiesNodesYearsArray.length}`);
