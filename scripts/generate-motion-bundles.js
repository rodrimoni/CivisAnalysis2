#!/usr/bin/env node
/**
 * Motion Bundles Generator for CivisAnalysis2
 *
 * Packs data/motions.min/*.json into one file per year:
 *   data/bundles/motions-YYYY.json  ->  { "TYPE+NUMBER+YEAR": motion, ... }
 * plus data/bundles/manifest.json describing the set.
 *
 * Why: the app used to fetch hundreds of small motion files per period,
 * tripping rate limiting (HTTP 429) on shared static hosts. One bundle
 * per year turns ~1.000 requests per legislature into ~5.
 *
 * A motion belongs to every year it has a roll call in (same rule the
 * loader uses: start <= datetime <= end). Cross-year motions are rare
 * and duplicated verbatim across those years.
 *
 * Only requires: data/arrayRollCalls.json, data/motions.min/
 *
 * Usage:
 *   node scripts/generate-motion-bundles.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ROLLCALLS_FILE = path.join(ROOT, 'data', 'arrayRollCalls.json');
const MOTIONS_DIR = path.join(ROOT, 'data', 'motions.min');
const BUNDLES_DIR = path.join(ROOT, 'data', 'bundles');

function motionKey(d) {
    return d.type + d.number + d.year;
}

function main() {
    const arrayRollCalls = JSON.parse(fs.readFileSync(ROLLCALLS_FILE, 'utf8'));

    const years = new Set();
    arrayRollCalls.forEach(function (rc) {
        years.add(new Date(rc.datetime).getUTCFullYear());
    });
    const sortedYears = Array.from(years).sort(function (a, b) { return a - b; });
    console.log('Roll calls: ' + arrayRollCalls.length + ', years: ' +
        sortedYears[0] + '..' + sortedYears[sortedYears.length - 1] +
        ' (' + sortedYears.length + ')');

    // Group motion keys by year, mirroring the loader's date-range filter.
    const keysByYear = {};
    sortedYears.forEach(function (y) { keysByYear[y] = {}; });
    const startOf = (y) => new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
    const endOf = (y) => new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));

    arrayRollCalls.forEach(function (rc) {
        const dt = new Date(rc.datetime);
        const y = dt.getUTCFullYear();
        if (startOf(y) <= dt && dt <= endOf(y)) {
            keysByYear[y][motionKey(rc)] = rc;
        }
    });

    fs.mkdirSync(BUNDLES_DIR, { recursive: true });

    const manifest = { generatedAt: new Date().toISOString(), years: {} };
    const seen = new Set();
    let missing = 0;

    sortedYears.forEach(function (y) {
        const keys = Object.keys(keysByYear[y]);
        const bundle = {};
        keys.forEach(function (key) {
            seen.add(key);
            const rc = keysByYear[y][key];
            const file = path.join(MOTIONS_DIR, key + '.json');
            if (!fs.existsSync(file)) {
                missing++;
                console.warn('  [WARN] missing motion file: ' + key + '.json');
                return;
            }
            bundle[key] = JSON.parse(fs.readFileSync(file, 'utf8'));
            // Sanity: the file must describe the motion the roll call points to.
            if (bundle[key].type !== rc.type ||
                String(bundle[key].number) !== String(rc.number) ||
                String(bundle[key].year) !== String(rc.year)) {
                console.warn('  [WARN] key/content mismatch: ' + key);
            }
        });

        const outFile = path.join(BUNDLES_DIR, 'motions-' + y + '.json');
        const json = JSON.stringify(bundle);
        fs.writeFileSync(outFile, json);
        const mb = json.length / (1024 * 1024);
        manifest.years[y] = {
            file: 'data/bundles/motions-' + y + '.json',
            motions: keys.length,
            bytes: json.length
        };
        console.log('  ' + y + ': ' + keys.length + ' motions, ' + mb.toFixed(1) + ' MB' +
            (mb > 80 ? '  [WARN] approaching GitHub 100MB file limit!' : ''));
    });

    manifest.totalMotions = seen.size;
    manifest.missingFiles = missing;
    fs.writeFileSync(
        path.join(BUNDLES_DIR, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
    );

    const totalBytes = Object.values(manifest.years).reduce((s, e) => s + e.bytes, 0);
    console.log('Done: ' + sortedYears.length + ' bundles, ' + seen.size +
        ' unique motions, ' + (totalBytes / (1024 * 1024)).toFixed(0) + ' MB total' +
        (missing > 0 ? ', ' + missing + ' missing files!' : ''));
    if (missing > 0) process.exit(1);
}

main();
