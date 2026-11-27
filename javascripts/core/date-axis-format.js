/**
 * Date-only tick labels for the cohesion timelines (d3 v3 time axes).
 *
 * d3's default time format picks the label from the time of day: a tick that
 * is not at midnight is labelled with its hour. In Brazil, until 2019,
 * daylight saving time began at midnight on a Sunday, so that day had no
 * 00:00 and its local "start of day" was 01:00. d3's day and week ticks then
 * land at 01:00 from that Sunday on, and the axis showed "01 AM" instead of
 * dates whenever the zoom covered a few weeks after the change (e.g. the
 * second half of October 2017), for any user on Brazilian time.
 *
 * These charts aggregate by month or year and never need the hour, so the
 * label is chosen from the date alone, with the same tiers as d3's default:
 * weekday + day, month + day, month, year.
 *
 * Pure chooser + d3 wrapper: scripts/verify-date-axis-format.js tests the
 * chooser under America/Sao_Paulo.
 */

/**
 * @param {Date} date - a tick
 * @returns {string} d3 time format specifier for its label
 */
function dateTickSpecifier(date) {
    if (date.getDate() !== 1) {
        // Weekly ticks fall on Sundays: name the month; daily ones name the weekday.
        return date.getDay() === 0 ? '%b %d' : '%a %d';
    }
    if (date.getMonth() !== 0) return '%B';
    return '%Y';
}

/**
 * Tick format for a d3 v3 axis on a time scale.
 * @returns {Function} date -> label
 */
function dateOnlyTickFormat() {
    var cache = {};
    return function (date) {
        var spec = dateTickSpecifier(date);
        if (!cache[spec]) cache[spec] = d3.time.format(spec);
        return cache[spec](date);
    };
}

// Node-only export for the verification script (ignored in the browser).
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { dateTickSpecifier: dateTickSpecifier };
}
