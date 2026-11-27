/*
 * Checks the date-only tick labels of the cohesion timelines under Brazilian
 * time, where d3's default format labelled ticks "01 AM" from the Sunday
 * daylight saving time began (no 00:00 that day, so ticks land at 01:00).
 * Run: node scripts/verify-date-axis-format.js
 */
'use strict';
process.env.TZ = 'America/Sao_Paulo'; // before any Date is built

const { dateTickSpecifier } = require('../javascripts/core/date-axis-format.js');

let failures = 0;
function eq(name, actual, expected) {
    const ok = actual === expected;
    console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name + (ok ? '' : ' (got ' + actual + ', want ' + expected + ')'));
    if (!ok) failures++;
}

// The environment really is on Brazilian time with DST in 2017:
// 15 Oct 2017 00:00 did not exist, so the day starts at 01:00.
eq('fixture · 15 Oct 2017 starts at 01:00 under America/Sao_Paulo', new Date(2017, 9, 15).getHours(), 1);

// The ticks d3 produces after the change (01:00, not midnight)
eq('DST Sunday 15 Oct 2017 01:00 → month and day, not an hour', dateTickSpecifier(new Date(2017, 9, 15, 1)), '%b %d');
eq('weekly tick after DST, Sun 22 Oct 2017 01:00 → month and day', dateTickSpecifier(new Date(2017, 9, 22, 1)), '%b %d');
eq('daily tick after DST, Tue 17 Oct 2017 01:00 → weekday and day', dateTickSpecifier(new Date(2017, 9, 17, 1)), '%a %d');

// Same tiers as d3's default on ordinary dates
eq('Sunday (weekly tick) → month and day', dateTickSpecifier(new Date(2019, 9, 6)), '%b %d');
eq('weekday (daily tick) → weekday and day', dateTickSpecifier(new Date(2019, 9, 9)), '%a %d');
eq('first of a month → month name', dateTickSpecifier(new Date(2024, 3, 1)), '%B');
eq('first of January → year', dateTickSpecifier(new Date(2024, 0, 1)), '%Y');
eq('no tier ever asks for the hour',
    ['%b %d', '%a %d', '%B', '%Y'].indexOf(dateTickSpecifier(new Date(2018, 10, 4, 1))) > -1, true);

console.log(failures ? '\n' + failures + ' check(s) failed' : '\nAll date-axis checks passed');
process.exit(failures ? 1 : 0);
