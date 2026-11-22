#!/usr/bin/env node
/**
 * MDS / UMAP Precalc Generator for CivisAnalysis2
 *
 * Generates precalculated scatter plot data for all standard periods (years,
 * legislatures, presidential terms) for the deterministic techniques that the
 * browser otherwise computes on the fly:
 *   - MDS:  classical MDS over the shared vote-distance matrix
 *   - UMAP: umap-js with the same fixed seed the browser uses
 *
 * t-SNE is intentionally not precalculated: its initialization is random and
 * unseeded, and it runs for a fixed wall-clock budget, so a single stored
 * result would not represent the technique.
 *
 * Output format is the same as the PCA precalc (deputyID, scatterplot, party,
 * alignment), saved to data/precalc/<technique>/.
 *
 * Usage: node scripts/generate-dr-precalc.js mds|umap [--only <filename>]
 *   e.g. node scripts/generate-dr-precalc.js umap --only legislature.8.json
 */
'use strict';

const fs = require('fs');
const path = require('path');
const C = require('./lib/precalc-common');

const TECHNIQUES = ['mds', 'umap'];

async function main() {
    const args = process.argv.slice(2);
    const technique = (args[0] || '').toLowerCase();
    if (TECHNIQUES.indexOf(technique) === -1) {
        console.error('Usage: node scripts/generate-dr-precalc.js ' + TECHNIQUES.join('|') + ' [--only <filename>]');
        process.exit(1);
    }
    const onlyIdx = args.indexOf('--only');
    const only = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

    console.log('=== ' + technique.toUpperCase() + ' Precalc Generator ===\n');
    const startTime = Date.now();

    const dr = C.loadBrowserDR();
    console.log('Loading data...');
    const data = C.loadAllData();
    console.log('  Deputies: ' + data.stats.deputies + ', roll calls: ' + data.stats.rollCalls +
        ' (votes loaded for ' + data.stats.loaded + ', ' + data.stats.failed + ' failed)');

    const outputDir = path.join(C.DATA_DIR, 'precalc', technique);
    fs.mkdirSync(outputDir, { recursive: true });

    const jobs = [];
    C.eachPeriod(function (p) { if (!only || p.filename === only) jobs.push(p); });

    let written = 0;
    for (const p of jobs) {
        const built = C.buildPeriod(data, p.period);
        if (built.skip) {
            console.log('  ' + p.period.name + ': skipped (' + built.skip + ')');
            continue;
        }
        const t0 = Date.now();
        const positions = technique === 'mds'
            ? await dr.mds(C.calcVoteDistanceMatrix(built.matrix))
            : await dr.umap(built.matrix);

        const deputyNodes = C.toDeputyNodes(built, positions);
        fs.writeFileSync(path.join(outputDir, p.filename), JSON.stringify({ deputyNodes: deputyNodes }));
        written++;
        console.log('  ' + p.period.name + ': N=' + built.N + ', M=' + built.M + ' -> ' + p.filename +
            ' (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
    }

    console.log('\nWritten ' + written + ' files to ' + outputDir);
    console.log('Done in ' + ((Date.now() - startTime) / 1000).toFixed(1) + 's');
}

main().catch(function (err) { console.error(err); process.exit(1); });
