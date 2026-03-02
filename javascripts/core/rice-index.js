/**
 * Rice Index Calculation Module
 * Shared calculation functions for Rice Index cohesion metrics.
 * Used by party-rice-timeline.js and cohesion-comparison.js
 */

/* Rice Index Calculation Types */
const RICE_CALC_CLASSIC = 0;  // Only considers Yes/No
const RICE_CALC_BRAZIL = 1;   // Considers Yes/No/Obstruction

/**
 * Get the start of the month (first day) for a given date
 * @param {Date} date - Input date
 * @returns {Date} Start of the month
 */
function getMonthStart(date) {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Get the start of the year (January 1st) for a given date
 * @param {Date} date - Input date
 * @returns {Date} Start of the year
 */
function getYearStart(date) {
    const d = new Date(date);
    return new Date(d.getFullYear(), 0, 1);
}

/**
 * Calculate weighted Rice Index by month
 * @param {Array} rcs - Roll calls array
 * @param {string|Array} parties - Party name or array of party names
 * @param {number} deputiesCount - Total number of deputies in the party
 * @param {number} type - RICE_CALC_CLASSIC or RICE_CALC_BRAZIL
 * @param {Array} deputyIDs - Optional array of deputy IDs to filter by
 * @returns {Array} Array of monthly data with Rice Index and participation
 */
function calculateMonthlyRiceIndex(rcs, parties, deputiesCount, type, deputyIDs) {
    if (type === undefined) type = RICE_CALC_CLASSIC;
    var partiesArr = Array.isArray(parties) ? parties : [parties];
    if (!rcs || !rcs.length) return [];

    // Group roll calls by month
    const monthMap = new Map();

    rcs.forEach(function (rc) {
        if (!rc || !rc.votes || !rc.datetime) return;

        // Parse date and get month start (first day of month)
        const date = new Date(rc.datetime);
        const monthStart = getMonthStart(date);
        const monthKey = monthStart.toISOString();

        if (!monthMap.has(monthKey)) {
            monthMap.set(monthKey, {
                monthStart: monthStart,
                rollCalls: [],
                weightedSum: 0,
                totalVotes: 0
            });
        }

        // Calculate Rice Index for this roll call
        const partyVotes = deputyIDs && deputyIDs.length > 0
            ? rc.votes.filter(function (v) { return deputyIDs.indexOf(v.deputyID) > -1; })
            : rc.votes.filter(function (v) { return partiesArr.indexOf(v.party) > -1; });

        // Support Classic (Yes/No) and Brazil (Yes/No/Obstruction) methods
        var validVotes, yesCount, noCount;
        if (type === RICE_CALC_CLASSIC) {
            validVotes = partyVotes.filter(function (v) {
                return v.vote === 'Sim' || v.vote === 'Não';
            });
            yesCount = validVotes.filter(function (v) { return v.vote === 'Sim'; }).length;
            noCount = validVotes.filter(function (v) { return v.vote === 'Não'; }).length;
        } else {
            validVotes = partyVotes.filter(function (v) {
                return v.vote === 'Sim' || v.vote === 'Não' || v.vote === 'Obstrução';
            });
            yesCount = validVotes.filter(function (v) { return v.vote === 'Sim'; }).length;
            noCount = validVotes.filter(function (v) { return v.vote === 'Não' || v.vote === 'Obstrução'; }).length;
        }

        const total = yesCount + noCount;

        if (total > 0) {
            const rice = Math.abs(yesCount - noCount) / total;
            const monthData = monthMap.get(monthKey);
            monthData.weightedSum += rice * total;
            monthData.totalVotes += total;
            monthData.rollCalls.push({
                rc: rc,
                rice: rice,
                votes: total
            });
        }
    });

    // Convert map to array and calculate weighted mean for each month
    const monthlyData = [];
    monthMap.forEach(function (monthData) {
        if (monthData.totalVotes > 0) {
            // Calculate participation rate: actual votes / max possible votes
            const maxPossibleVotes = monthData.rollCalls.length * deputiesCount;
            const participationRate = maxPossibleVotes > 0
                ? monthData.totalVotes / maxPossibleVotes
                : 0;

            monthlyData.push({
                monthStart: monthData.monthStart,
                riceIndex: monthData.weightedSum / monthData.totalVotes,
                rollCallCount: monthData.rollCalls.length,
                totalVotes: monthData.totalVotes,
                participation: participationRate, // normalized [0,1]
                rollCalls: monthData.rollCalls // Individual roll calls for this month
            });
        }
    });

    // Sort by date
    monthlyData.sort(function (a, b) {
        return a.monthStart - b.monthStart;
    });

    return monthlyData;
}

/**
 * Calculate weighted Rice Index by year
 * Same logic as calculateMonthlyRiceIndex but grouped by year
 * @param {Array} rcs - Roll calls array
 * @param {string|Array} parties - Party name or array of party names
 * @param {number} deputiesCount - Total number of deputies in the party
 * @param {number} type - RICE_CALC_CLASSIC or RICE_CALC_BRAZIL
 * @param {Array} deputyIDs - Optional array of deputy IDs to filter by
 * @returns {Array} Array of yearly data with Rice Index and participation
 */
function calculateYearlyRiceIndex(rcs, parties, deputiesCount, type, deputyIDs) {
    var partiesArr = Array.isArray(parties) ? parties : [parties];
    if (type === undefined) type = RICE_CALC_CLASSIC;
    if (!rcs || !rcs.length) return [];

    const yearMap = new Map();

    rcs.forEach(function (rc) {
        if (!rc || !rc.votes || !rc.datetime) return;

        const date = new Date(rc.datetime);
        const yearStart = getYearStart(date);
        const yearKey = yearStart.toISOString();

        if (!yearMap.has(yearKey)) {
            yearMap.set(yearKey, {
                monthStart: yearStart, // keep field name for compatibility
                rollCalls: [],
                weightedSum: 0,
                totalVotes: 0
            });
        }

        const partyVotes = deputyIDs && deputyIDs.length > 0
            ? rc.votes.filter(function (v) { return deputyIDs.indexOf(v.deputyID) > -1; })
            : rc.votes.filter(function (v) { return partiesArr.indexOf(v.party) > -1; });

        var validVotes, yesCount, noCount;
        if (type === RICE_CALC_CLASSIC) {
            validVotes = partyVotes.filter(function (v) {
                return v.vote === 'Sim' || v.vote === 'Não';
            });
            yesCount = validVotes.filter(function (v) { return v.vote === 'Sim'; }).length;
            noCount = validVotes.filter(function (v) { return v.vote === 'Não'; }).length;
        } else {
            validVotes = partyVotes.filter(function (v) {
                return v.vote === 'Sim' || v.vote === 'Não' || v.vote === 'Obstrução';
            });
            yesCount = validVotes.filter(function (v) { return v.vote === 'Sim'; }).length;
            noCount = validVotes.filter(function (v) { return v.vote === 'Não' || v.vote === 'Obstrução'; }).length;
        }

        const total = yesCount + noCount;

        if (total > 0) {
            const rice = Math.abs(yesCount - noCount) / total;
            const yearData = yearMap.get(yearKey);
            yearData.weightedSum += rice * total;
            yearData.totalVotes += total;
            yearData.rollCalls.push({
                rc: rc,
                rice: rice,
                votes: total
            });
        }
    });

    const yearlyData = [];
    yearMap.forEach(function (yearData) {
        if (yearData.totalVotes > 0) {
            const maxPossibleVotes = yearData.rollCalls.length * deputiesCount;
            const participationRate = maxPossibleVotes > 0
                ? yearData.totalVotes / maxPossibleVotes
                : 0;

            yearlyData.push({
                monthStart: yearData.monthStart, // keep field name for compatibility
                riceIndex: yearData.weightedSum / yearData.totalVotes,
                rollCallCount: yearData.rollCalls.length,
                totalVotes: yearData.totalVotes,
                participation: participationRate,
                rollCalls: yearData.rollCalls
            });
        }
    });

    yearlyData.sort(function (a, b) {
        return a.monthStart - b.monthStart;
    });

    return yearlyData;
}
