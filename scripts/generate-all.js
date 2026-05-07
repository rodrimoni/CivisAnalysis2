#!/usr/bin/env node
/**
 * Master Generator for CivisAnalysis2
 *
 * Runs all data generation scripts in the correct order.
 * Only requires: data/deputies.json, data/arrayRollCalls.json, data/motions.min/
 *
 * Pipeline:
 *   1. PCA precalc        → data/precalc/pca/*.json
 *   2. W-NOMINATE precalc → data/precalc/w-nominate/*.json  (JavaScript implementation)
 *   3. Parties traces     → javascripts/parties-traces.js   (parallel with 2)
 *   4. Timeline crop extent → javascripts/timeline-crop-extent.js (needs PCA)
 *   5. Deputies nodes by year → data/deputiesNodesByYear.json (needs PCA)
 *
 * Usage:
 *   node scripts/generate-all.js [options]
 *
 * Options:
 *   --skip-pca         Skip PCA precalc generation
 *   --skip-w-nominate  Skip W-NOMINATE generation
 *   --skip-traces      Skip parties traces generation
 *   --only <name>      Run only a specific step (pca, w-nominate, traces, extent, nodes)
 */
'use strict';

const { execSync } = require('child_process');
const path = require('path');

const SCRIPTS_DIR = __dirname;

// ============================================================
// CLI Arguments
// ============================================================
const args = process.argv.slice(2);
const skipPca = args.includes('--skip-pca');
const skipWNominate = args.includes('--skip-w-nominate');
const skipTraces = args.includes('--skip-traces');
const onlyIdx = args.indexOf('--only');
const only = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

// ============================================================
// Runner
// ============================================================
function run(name, command) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${name}`);
    console.log(`  ${command}`);
    console.log(`${'='.repeat(60)}\n`);

    const start = Date.now();
    try {
        execSync(command, { stdio: 'inherit', cwd: path.join(SCRIPTS_DIR, '..') });
    } catch (e) {
        console.error(`\n[ERROR] ${name} failed with exit code ${e.status}`);
        process.exit(e.status || 1);
    }
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n  Done in ${elapsed}s`);
}

// ============================================================
// Pipeline
// ============================================================
const totalStart = Date.now();

console.log('CivisAnalysis2 — Full Data Generation Pipeline');
console.log('================================================');

// Step 1: PCA precalc (required by steps 4 and 5)
if (only === 'pca' || (!only && !skipPca)) {
    run('Step 1/5: PCA Precalc (year, legislature, president)',
        `node "${path.join(SCRIPTS_DIR, 'generate-pca-precalc.js')}"`);
}

// Step 2: W-NOMINATE precalc (JavaScript implementation)
if (only === 'w-nominate' || (!only && !skipWNominate)) {
    run('Step 2/5: W-NOMINATE Precalc (JS)',
        `node "${path.join(SCRIPTS_DIR, 'generate-w-nominate.js')}"`);
}

// Step 3: Parties traces (own SVD from raw data)
if (only === 'traces' || (!only && !skipTraces)) {
    run('Step 3/5: Parties Traces',
        `node "${path.join(SCRIPTS_DIR, 'generate-parties-traces.js')}"`);
}

// Step 4: Timeline crop extent (reads PCA precalc)
if (only === 'extent' || !only) {
    run('Step 4/5: Timeline Crop Extent',
        `node "${path.join(SCRIPTS_DIR, 'generate-timeline-crop-extent.js')}"`);
}

// Step 5: Deputies nodes by year (reads PCA precalc)
if (only === 'nodes' || !only) {
    run('Step 5/5: Deputies Nodes By Year',
        `node "${path.join(SCRIPTS_DIR, 'generate-deputies-nodes-by-year.js')}"`);
}

const totalElapsed = ((Date.now() - totalStart) / 1000).toFixed(1);
console.log(`\n${'='.repeat(60)}`);
console.log(`  All done! Total time: ${totalElapsed}s`);
console.log(`${'='.repeat(60)}`);
