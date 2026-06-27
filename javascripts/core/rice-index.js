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
 * Count the distinct deputies who cast a vote under any of the given parties
 * across the roll calls. Used as the participation denominator for party-based
 * Rice calculations so that different views (Party Rice Timeline and Cohesion
 * Comparison) agree by computing the "party size" from the same vote data.
 * @param {Array} rcs - Roll calls array
 * @param {string|Array} parties - Party name or array of party names
 * @returns {number} Number of distinct deputies seen voting for those parties
 */
function countPartyDeputies(rcs, parties) {
    var partiesArr = Array.isArray(parties) ? parties : [parties];
    var ids = {};
    if (rcs) {
        rcs.forEach(function (rc) {
            if (!rc || !rc.votes) return;
            rc.votes.forEach(function (v) {
                if (partiesArr.indexOf(v.party) > -1) ids[v.deputyID] = true;
            });
        });
    }
    return Object.keys(ids).length;
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

/**
 * Aggregate weighted Rice Index for an arbitrary group over a set of roll calls.
 * Unlike calculateMonthlyRiceIndex/calculateYearlyRiceIndex, this does NOT group
 * by time — it returns a single value for the whole `rcs` set. Used by the
 * Cohesion by Theme chart for per-theme cohesion of a group and of unions of
 * groups.
 *
 * Membership is a union predicate so reference ∪ comparison works:
 * a vote counts if its party is in group.parties OR its deputyID is in
 * group.deputyIDs (each vote counted at most once).
 *
 * The per-roll-call formula is IDENTICAL to calculateMonthlyRiceIndex
 * (|yes-no|/(yes+no), weighted by total votes) — keep them in sync.
 *
 * @param {Array} rcs - Roll calls array (each with .votes [{vote, party, deputyID}])
 * @param {{parties: Array<string>, deputyIDs: Array<number>}} group - Membership spec
 * @param {number} type - RICE_CALC_CLASSIC (default) or RICE_CALC_BRAZIL
 * @returns {{rice: number, rollCallCount: number, totalVotes: number}}
 */
function calcGroupRiceForRcs(rcs, group, type) {
    if (type === undefined) type = RICE_CALC_CLASSIC;
    var parties = (group && group.parties) || [];
    var deputyIDs = (group && group.deputyIDs) || [];

    var weightedSum = 0;
    var totalVotes = 0;
    var rollCallCount = 0;

    if (!rcs || !rcs.length) return { rice: 0, rollCallCount: 0, totalVotes: 0 };

    rcs.forEach(function (rc) {
        if (!rc || !rc.votes) return;

        var memberVotes = rc.votes.filter(function (v) {
            return parties.indexOf(v.party) > -1 || deputyIDs.indexOf(v.deputyID) > -1;
        });

        var yesCount, noCount;
        if (type === RICE_CALC_CLASSIC) {
            yesCount = memberVotes.filter(function (v) { return v.vote === 'Sim'; }).length;
            noCount = memberVotes.filter(function (v) { return v.vote === 'Não'; }).length;
        } else {
            yesCount = memberVotes.filter(function (v) { return v.vote === 'Sim'; }).length;
            noCount = memberVotes.filter(function (v) { return v.vote === 'Não' || v.vote === 'Obstrução'; }).length;
        }

        var total = yesCount + noCount;
        if (total > 0) {
            var rice = Math.abs(yesCount - noCount) / total;
            weightedSum += rice * total;
            totalVotes += total;
            rollCallCount++;
        }
    });

    return {
        rice: totalVotes > 0 ? weightedSum / totalVotes : 0,
        rollCallCount: rollCallCount,
        totalVotes: totalVotes
    };
}
