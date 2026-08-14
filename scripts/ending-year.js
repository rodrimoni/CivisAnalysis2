'use strict';

/**
 * The last year the generators should produce artifacts for.
 *
 * This used to be a constant repeated in all five generator scripts, and it
 * went stale: the 2026 data landed and every generator silently stopped at
 * 2025, producing a complete-looking run with a year missing. Nothing failed —
 * the year simply wasn't there.
 *
 * Reading it from the roll calls removes the yearly edit. The generators exist
 * to cover the data they're given, so the data is the right source.
 *
 * congress-definitions.js keeps its own endingYear because the app needs the
 * bound before any data loads; the two should agree, and this returning a later
 * year than the app's is the signal that the app's needs bumping.
 */

const fs = require('fs');
const path = require('path');

const ROLL_CALLS = path.join(__dirname, '..', 'data', 'arrayRollCalls.json');

function endingYear() {
    const rollCalls = JSON.parse(fs.readFileSync(ROLL_CALLS, 'utf8'));

    let last = -Infinity;
    for (const rc of rollCalls) {
        const year = new Date(rc.datetime).getFullYear();
        if (Number.isFinite(year) && year > last) last = year;
    }

    if (!Number.isFinite(last)) {
        throw new Error('ending-year: no dated roll call found in ' + ROLL_CALLS);
    }
    return last;
}

module.exports = { endingYear };
