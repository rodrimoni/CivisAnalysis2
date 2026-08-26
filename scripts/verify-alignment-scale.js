/*
 * Verifies the alignment-to-opacity scale used by the scatterplot.
 * Run: node scripts/verify-alignment-scale.js
 *
 * The failure this guards against is invisible on screen: map alignment across
 * the absolute 0–1 range and every deputy in a disciplined party comes out at
 * roughly the same opacity, so the layer looks like it is working while showing
 * nothing. The checks below pin the stretch to the compared set.
 */
'use strict';

const path = require('path');
const { alignmentOpacityScale } = require('../javascripts/utils/general-utilities.js');

let failures = 0;
function check(name, ok, detail) {
    console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name);
    if (detail) console.log('       ' + detail);
    if (!ok) failures++;
}
const near = (a, b) => Math.abs(a - b) < 1e-6;

// The case the feature exists for: PT in the 57th runs 0.95–1.00.
const PT = [0.95, 0.96, 0.97, 0.98, 0.99, 1.00];
const scale = alignmentOpacityScale(PT);

check('the least aligned of the set drops to the floor',
    near(scale(0.95), 0.15), 'scale(0.95) = ' + scale(0.95));
check('the most aligned reaches full opacity',
    near(scale(1.00), 1), 'scale(1.00) = ' + scale(1.00));
check('the middle of the set lands in the middle of the ramp',
    near(scale(0.975), 0.575), 'scale(0.975) = ' + scale(0.975));

// Against the absolute mapping this replaces: 0.2 + a*0.8 over the same set
// spans 0.96–1.00, a four-point spread nobody can see.
const absoluteSpread = (0.2 + 1.0 * 0.8) - (0.2 + 0.95 * 0.8);
const stretchedSpread = scale(1.00) - scale(0.95);
check('the stretch turns an invisible spread into a usable one',
    stretchedSpread > 10 * absoluteSpread,
    'absolute spread ' + absoluteSpread.toFixed(2) +
    ' vs stretched ' + stretchedSpread.toFixed(2));

// A wide selection must not be squashed by the same rule.
const mixed = alignmentOpacityScale([0.19, 0.6, 1.0]);
check('a wide set still uses the whole ramp',
    near(mixed(0.19), 0.15) && near(mixed(1.0), 1),
    'min → ' + mixed(0.19) + ', max → ' + mixed(1.0));

check('ordering is preserved',
    mixed(0.19) < mixed(0.6) && mixed(0.6) < mixed(1.0),
    [mixed(0.19), mixed(0.6), mixed(1.0)].map(v => v.toFixed(2)).join(' < '));

// A party that voted as one bloc has nothing to rank, and a ramp there would
// invent differences that are not in the data.
const flat = alignmentOpacityScale([0.9, 0.9, 0.9]);
check('a set with no spread stays uniform instead of inventing a ramp',
    near(flat(0.9), 1), 'scale(0.9) = ' + flat(0.9));

const single = alignmentOpacityScale([0.42]);
check('a single deputy is fully opaque, not fully transparent',
    near(single(0.42), 1), 'scale(0.42) = ' + single(0.42));

check('an empty selection yields no scale at all',
    alignmentOpacityScale([]) === null && alignmentOpacityScale(null) === null);

// Deputies with no alignment on record must not read as least-aligned.
check('a missing alignment is left fully opaque',
    near(scale(undefined), 1) && near(scale(null), 1) && near(scale(NaN), 1));

check('values outside the set are clamped, not extrapolated',
    near(scale(0.1), 0.15) && near(scale(5), 1),
    'below → ' + scale(0.1) + ', above → ' + scale(5));

check('the floor is configurable',
    near(alignmentOpacityScale([0, 1], 0.4)(0), 0.4));

console.log('');
console.log(failures ? failures + ' check(s) failed' : 'All checks passed');
process.exit(failures ? 1 : 0);
