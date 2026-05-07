#!/usr/bin/env node
/**
 * Timeline Crop Extent Generator for CivisAnalysis2
 *
 * Node.js equivalent of the browser-side calcExtentValuesByYear() function.
 * Reads precalculated year files and extracts the Y-axis extent (min/max of
 * scatterplot[1]) for each year. Writes to javascripts/timeline-crop-extent.js.
 *
 * Usage:
 *   node scripts/generate-timeline-crop-extent.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, '..');
const PRECALC_DIR = path.join(BASE_DIR, 'data', 'precalc', 'pca');
const OUTPUT_FILE = path.join(BASE_DIR, 'javascripts', 'timeline-crop-extent.js');

const STARTING_YEAR = 1991;
const ENDING_YEAR = 2025;

// ============================================================
// Calculate extents from precalc files
// ============================================================
const extents = {};

for (let year = STARTING_YEAR; year <= ENDING_YEAR; year++) {
    const filePath = path.join(PRECALC_DIR, `year.${year}.json`);

    if (!fs.existsSync(filePath)) {
        console.warn(`Warning: ${filePath} not found, skipping year ${year}.`);
        continue;
    }

    const precalc = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const yValues = precalc.deputyNodes.map(d => d.scatterplot[1]);
    const min = Math.min(...yValues);
    const max = Math.max(...yValues);

    // Round to 4 significant digits (matching original precision)
    extents[year] = [+min.toPrecision(4), +max.toPrecision(4)];

    console.log(`Year ${year}: [${extents[year]}]`);
}

// ============================================================
// Write output file
// ============================================================
const output = 'var TIMELINE_CROP_EXTENT = ' + JSON.stringify(extents);
fs.writeFileSync(OUTPUT_FILE, output, 'utf8');

console.log(`\nDone! Written to ${path.relative(BASE_DIR, OUTPUT_FILE)}`);
console.log(`Years: ${Object.keys(extents).length}`);
