/**
 * W-NOMINATE (Weighted NOMINAl Three-step Estimation) Algorithm
 *
 * Implementation based on:
 *   Poole, K.T. & Rosenthal, H. (1997). Congress: A Political-Economic History
 *   of Roll Call Voting. Oxford University Press.
 *
 *   Poole, K.T., Lewis, J., Lo, J. & Carroll, R. (2011). Scaling Roll Call Votes
 *   with wnominate in R. Journal of Statistical Software, 42(14), 1-21.
 *
 * Vote encoding used throughout this module:
 *   1  = Yea
 *   6  = Nay
 *   9  = Missing / Abstain / Not voting
 *
 * Dependencies: numeric.js (numeric-1.2.6.js) must be loaded/required before
 * this module. In Node.js it is available via `require(...)` assignment below.
 */
(function (root) {
    'use strict';

    // ------------------------------------------------------------------
    // Resolve numeric.js dependency (isomorphic)
    // ------------------------------------------------------------------
    var numeric;
    if (typeof module !== 'undefined' && module.exports) {
        // Node.js: numeric attaches itself to global when required
        numeric = global.numeric;
        if (!numeric) {
            throw new Error('w-nominate.js: numeric.js must be required before this module in Node.js');
        }
    } else {
        numeric = root.numeric;
        if (!numeric) {
            throw new Error('w-nominate.js: numeric.js must be loaded before this module in the browser');
        }
    }

    var EPS = 1e-12;

    // ==================================================================
    // 1. prepareData
    // ==================================================================
    /**
     * Filters lopsided votes and legislators with too few votes.
     *
     * @param {number[][]} voteMatrix  N x M matrix (encoding 1/6/9)
     * @param {number}     lop        Lopsidedness threshold (default 0.025)
     * @param {number}     minVotes   Minimum votes per legislator (default 20)
     * @returns {{ matrix: number[][], legIndices: number[], voteIndices: number[], N: number, M: number }}
     */
    function prepareData(voteMatrix, lop, minVotes) {
        lop      = (typeof lop      === 'undefined') ? 0.025 : lop;
        minVotes = (typeof minVotes === 'undefined') ? 20    : minVotes;

        var N0 = voteMatrix.length;
        var M0 = voteMatrix[0].length;

        // Work on a copy so we can mark entries as 9 iteratively
        // (same approach as R's wnominate: iteratively re-filter until stable)
        var tempVotes = [];
        for (var i = 0; i < N0; i++) {
            tempVotes.push(voteMatrix[i].slice());
        }

        function countMemberVotes(tv, i) {
            var c = 0;
            for (var j = 0; j < M0; j++) {
                if (tv[i][j] === 1 || tv[i][j] === 6) c++;
            }
            return c;
        }

        function calcMinorityShare(tv, j) {
            var yea = 0, nay = 0;
            for (var i = 0; i < N0; i++) {
                if (tv[i][j] === 1) yea++;
                else if (tv[i][j] === 6) nay++;
            }
            var total = yea + nay;
            return total === 0 ? 0 : Math.min(yea, nay) / total;
        }

        // Iterative filtering: mark low-vote members and lopsided votes as 9
        // Repeat until stable (same as R's while loop)
        var changed = true;
        while (changed) {
            changed = false;
            // Mark lopsided votes
            for (var j = 0; j < M0; j++) {
                if (calcMinorityShare(tempVotes, j) <= lop) {
                    for (var i = 0; i < N0; i++) {
                        if (tempVotes[i][j] !== 9) { tempVotes[i][j] = 9; changed = true; }
                    }
                }
            }
            // Mark low-vote legislators
            for (var i = 0; i < N0; i++) {
                if (countMemberVotes(tempVotes, i) < minVotes) {
                    for (var j = 0; j < M0; j++) {
                        if (tempVotes[i][j] !== 9) { tempVotes[i][j] = 9; changed = true; }
                    }
                }
            }
        }

        // Collect surviving legislators and votes
        var goodLegIndices = [];
        for (var i = 0; i < N0; i++) {
            if (countMemberVotes(tempVotes, i) >= minVotes) {
                goodLegIndices.push(i);
            }
        }

        var goodVoteIndices = [];
        for (var j = 0; j < M0; j++) {
            if (calcMinorityShare(tempVotes, j) > lop) {
                goodVoteIndices.push(j);
            }
        }

        // --- Build reduced matrix ---
        var matrix = [];
        for (var ii = 0; ii < goodLegIndices.length; ii++) {
            var row = [];
            for (var jj = 0; jj < goodVoteIndices.length; jj++) {
                row.push(tempVotes[goodLegIndices[ii]][goodVoteIndices[jj]]);
            }
            matrix.push(row);
        }

        return {
            matrix:     matrix,
            legIndices: goodLegIndices,
            voteIndices: goodVoteIndices,
            N: goodLegIndices.length,
            M: goodVoteIndices.length
        };
    }

    // ==================================================================
    // 2. initializeFromSVD
    // ==================================================================
    /**
     * Convert W-NOMINATE encoding to PCA encoding and run SVD.
     * Extracts top-d left singular vectors (weighted by singular values)
     * and normalizes to [-1, 1].
     *
     * @param {number[][]} matrix  N x M matrix (encoding 1/6/9)
     * @param {number}     dims   Number of dimensions (1 or 2)
     * @returns {number[][]}      N x dims array of initial positions
     */
    function initializeFromSVD(matrix, dims) {
        var N = matrix.length;
        var M = matrix[0].length;

        // R's wnominate initializes from eigendecomposition of the
        // double-centered agreement score matrix.
        // Optimized: build agreement matrix using vote vectors per legislator.

        // Step 1: For each legislator, build a compact representation of their votes
        // vote[i] = array of {j, v} where v = 1 (yea) or 6 (nay)
        var legVotes = new Array(N);
        for (var i = 0; i < N; i++) {
            legVotes[i] = new Int8Array(M); // 0=missing, 1=yea, -1=nay
            for (var j = 0; j < M; j++) {
                if (matrix[i][j] === 1) legVotes[i][j] = 1;
                else if (matrix[i][j] === 6) legVotes[i][j] = -1;
                // else stays 0
            }
        }

        // Step 2: Build agreement matrix using dot products of vote vectors
        // For each pair (i,k): agree = # same votes, count = # both voted
        // Same vote when both yea (1*1=1) or both nay (-1*-1=1); different when 1*-1=-1
        // agree[i][k] / count[i][k] = (count + sameMinusDiff) / (2 * count)
        //   where sameMinusDiff = sum(v_i * v_k) for j where both voted
        var A = new Array(N);
        for (var i = 0; i < N; i++) {
            A[i] = new Float64Array(N);
            A[i][i] = 1.0;
        }

        for (var i = 0; i < N; i++) {
            var vi = legVotes[i];
            for (var k = i + 1; k < N; k++) {
                var vk = legVotes[k];
                var count = 0, same = 0;
                for (var j = 0; j < M; j++) {
                    if (vi[j] !== 0 && vk[j] !== 0) {
                        count++;
                        if (vi[j] === vk[j]) same++;
                    }
                }
                var score = count > 0 ? same / count : 0.5;
                A[i][k] = score;
                A[k][i] = score;
            }
        }

        // Step 3: Double-center the agreement matrix
        var rowMeans = new Float64Array(N);
        var grandMean = 0;
        for (var i = 0; i < N; i++) {
            var sum = 0;
            for (var k = 0; k < N; k++) sum += A[i][k];
            rowMeans[i] = sum / N;
            grandMean += sum;
        }
        grandMean /= (N * N);

        // Convert to regular arrays for numeric.js SVD
        var Acentered = new Array(N);
        for (var i = 0; i < N; i++) {
            Acentered[i] = new Array(N);
            for (var k = 0; k < N; k++) {
                Acentered[i][k] = A[i][k] - rowMeans[i] - rowMeans[k] + grandMean;
            }
        }

        // Step 4: SVD of centered agreement matrix
        var svdResult = numeric.svd(Acentered);

        // Top-dims components: positions = U * sqrt(S)
        var positions = [];
        for (var i = 0; i < N; i++) {
            var pos = [];
            for (var d = 0; d < dims; d++) {
                pos.push(svdResult.U[i][d] * Math.sqrt(svdResult.S[d]));
            }
            positions.push(pos);
        }

        // Normalize so max norm is 1 (unit sphere)
        var maxNorm = 0;
        for (var i = 0; i < N; i++) {
            var norm2 = 0;
            for (var d = 0; d < dims; d++) norm2 += positions[i][d] * positions[i][d];
            if (Math.sqrt(norm2) > maxNorm) maxNorm = Math.sqrt(norm2);
        }
        if (maxNorm > EPS) {
            for (var i = 0; i < N; i++) {
                for (var d = 0; d < dims; d++) {
                    positions[i][d] /= maxNorm;
                }
            }
        }

        return positions;
    }

    // ==================================================================
    // 3. probYea
    // ==================================================================
    /**
     * Probability that legislator votes Yea on a given roll call.
     *
     * P(yea) = exp(-0.5 * beta * sum_d(w_d^2 * (x_d - zYea_d)^2))
     *        / [exp(...yea) + exp(...nay)]
     *
     * @param {number[]} x      Legislator's ideal point (dims)
     * @param {number[]} zYea   Yea outcome point (dims)
     * @param {number[]} zNay   Nay outcome point (dims)
     * @param {number}   beta   Utility decay parameter
     * @param {number[]} w      Dimension weights (dims)
     * @returns {number}        Probability in [0, 1]
     */
    function probYea(x, zYea, zNay, beta, w) {
        var dims = x.length;
        var utilYea = 0, utilNay = 0;
        for (var d = 0; d < dims; d++) {
            var wd2 = w[d] * w[d];
            var dyea = x[d] - zYea[d];
            var dnay = x[d] - zNay[d];
            utilYea += wd2 * dyea * dyea;
            utilNay += wd2 * dnay * dnay;
        }
        var eYea = Math.exp(-0.5 * beta * utilYea);
        var eNay = Math.exp(-0.5 * beta * utilNay);
        var denom = eYea + eNay;
        if (denom < EPS) return 0.5;
        return eYea / denom;
    }

    // ==================================================================
    // 4. computeLogLikelihood
    // ==================================================================
    /**
     * Computes log-likelihood and correct classification rate.
     *
     * @param {number[][]} matrix       N x M (encoding 1/6/9)
     * @param {number[][]} legislators  N x dims ideal points
     * @param {Array}      voteParams   M-array of {zYea, zNay}
     * @param {number}     beta
     * @param {number[]}   w
     * @returns {{ logLik: number, correctClass: number }}
     */
    function computeLogLikelihood(matrix, legislators, voteParams, beta, w) {
        var N = matrix.length;
        var M = matrix[0].length;
        var logLik = 0;
        var correct = 0;
        var total   = 0;

        for (var i = 0; i < N; i++) {
            for (var j = 0; j < M; j++) {
                var vote = matrix[i][j];
                if (vote !== 1 && vote !== 6) continue;

                var p = probYea(legislators[i], voteParams[j].zYea, voteParams[j].zNay, beta, w);
                // Clamp probability
                if (p < EPS)      p = EPS;
                if (p > 1 - EPS)  p = 1 - EPS;

                if (vote === 1) {
                    logLik += Math.log(p);
                    if (p >= 0.5) correct++;
                } else {
                    logLik += Math.log(1 - p);
                    if (p < 0.5) correct++;
                }
                total++;
            }
        }

        return {
            logLik:       logLik,
            correctClass: total > 0 ? (correct / total) * 100 : 0
        };
    }

    // ==================================================================
    // 5. estimateLegislators
    // ==================================================================
    /**
     * For each legislator, update ideal point using analytic gradient ascent.
     *
     * Gradient of log-likelihood w.r.t. x_id:
     *   dLL/dx_id = sum_j (y_ij - p_ij) * beta * w_d^2 * (zNay_jd - zYea_jd)
     *            * (x_id - midpoint) * correction_factor
     *
     * where y_ij = 1 if yea, 0 if nay, p_ij = P(yea), and we use the
     * simplified gradient: dLL/dx_id = sum_j (y_ij - p_ij) * beta * w_d^2
     *   * [(x_id - zNay_jd) - (x_id - zYea_jd)] * p_ij * (1 - p_ij) / p_actual
     *
     * Simplified: use the exact derivative of the logistic-like model.
     *
     * @param {number[][]} matrix
     * @param {number[][]} currentPositions  N x dims
     * @param {Array}      voteParams        M-array of {zYea, zNay}
     * @param {number}     beta
     * @param {number[]}   w
     * @param {number}     dims
     * @returns {number[][]} updated positions N x dims
     */
    /**
     * @param {Array} obsByLeg - Pre-computed: obsByLeg[i] = [{j, y}] for legislator i
     */
    function estimateLegislators(currentPositions, voteParams, beta, w, dims, obsByLeg) {
        var N = currentPositions.length;
        var newPositions = [];
        var STEPS = 8;
        var bw = new Array(dims);
        for (var d = 0; d < dims; d++) bw[d] = beta * w[d] * w[d];

        for (var i = 0; i < N; i++) {
            var obs = obsByLeg[i];
            var nObs = obs.length;
            if (nObs === 0) { newPositions.push(currentPositions[i].slice()); continue; }

            var x0 = currentPositions[i][0], x1 = currentPositions[i][1];
            var lr = 1.0 / (beta * nObs);

            for (var step = 0; step < STEPS; step++) {
                var g0 = 0, g1 = 0;

                for (var k = 0; k < nObs; k++) {
                    var ob = obs[k];
                    var vp = voteParams[ob.j];
                    // Inline probYea for 2D
                    var dy0 = x0 - vp.zYea[0], dy1 = x1 - vp.zYea[1];
                    var dn0 = x0 - vp.zNay[0], dn1 = x1 - vp.zNay[1];
                    var eY = Math.exp(-0.5 * (bw[0] * dy0 * dy0 + bw[1] * dy1 * dy1));
                    var eN = Math.exp(-0.5 * (bw[0] * dn0 * dn0 + bw[1] * dn1 * dn1));
                    var denom = eY + eN;
                    var p = denom < EPS ? 0.5 : eY / denom;
                    if (p < EPS) p = EPS;
                    if (p > 1 - EPS) p = 1 - EPS;
                    var residual = ob.y - p;
                    var diffY0 = vp.zYea[0] - vp.zNay[0];
                    var diffY1 = vp.zYea[1] - vp.zNay[1];
                    g0 += residual * bw[0] * diffY0;
                    g1 += residual * bw[1] * diffY1;
                }

                x0 += lr * g0;
                x1 += lr * g1;

                // Project onto unit sphere
                var norm2 = x0 * x0 + x1 * x1;
                if (norm2 > 1) {
                    var scale = 1 / Math.sqrt(norm2);
                    x0 *= scale;
                    x1 *= scale;
                }
            }

            newPositions.push([x0, x1]);
        }

        return newPositions;
    }

    // ==================================================================
    // 6. estimateVoteParams
    // ==================================================================
    /**
     * For each vote, update zYea and zNay using analytic gradient ascent.
     *
     * @param {number[][]} matrix
     * @param {number[][]} legislators     N x dims
     * @param {Array}      currentVoteParams  M-array of {zYea, zNay}
     * @param {number}     beta
     * @param {number[]}   w
     * @param {number}     dims
     * @returns {Array} updated voteParams M-array of {zYea, zNay}
     */
    /**
     * @param {Array} obsByVote - Pre-computed: obsByVote[j] = [{i, y}] for vote j
     */
    function estimateVoteParams(legislators, currentVoteParams, beta, w, dims, obsByVote) {
        var M = currentVoteParams.length;
        var newVoteParams = [];
        var STEPS = 8;
        var bw = new Array(dims);
        for (var d = 0; d < dims; d++) bw[d] = beta * w[d] * w[d];

        for (var j = 0; j < M; j++) {
            var obs = obsByVote[j];
            var nObs = obs.length;
            if (nObs === 0) {
                newVoteParams.push({ zYea: currentVoteParams[j].zYea.slice(), zNay: currentVoteParams[j].zNay.slice() });
                continue;
            }

            var zy0 = currentVoteParams[j].zYea[0], zy1 = currentVoteParams[j].zYea[1];
            var zn0 = currentVoteParams[j].zNay[0], zn1 = currentVoteParams[j].zNay[1];
            var lr = 1.0 / (beta * nObs);

            for (var step = 0; step < STEPS; step++) {
                var gy0 = 0, gy1 = 0, gn0 = 0, gn1 = 0;

                for (var k = 0; k < nObs; k++) {
                    var ob = obs[k];
                    var leg = legislators[ob.i];
                    // Inline probYea for 2D
                    var dy0 = leg[0] - zy0, dy1 = leg[1] - zy1;
                    var dn0 = leg[0] - zn0, dn1 = leg[1] - zn1;
                    var eY = Math.exp(-0.5 * (bw[0] * dy0 * dy0 + bw[1] * dy1 * dy1));
                    var eN = Math.exp(-0.5 * (bw[0] * dn0 * dn0 + bw[1] * dn1 * dn1));
                    var denom = eY + eN;
                    var p = denom < EPS ? 0.5 : eY / denom;
                    if (p < EPS) p = EPS;
                    if (p > 1 - EPS) p = 1 - EPS;
                    var residual = ob.y - p;

                    gy0 += residual * bw[0] * dy0;
                    gy1 += residual * bw[1] * dy1;
                    gn0 -= residual * bw[0] * dn0;
                    gn1 -= residual * bw[1] * dn1;
                }

                zy0 += lr * gy0;
                zy1 += lr * gy1;
                zn0 += lr * gn0;
                zn1 += lr * gn1;
            }

            newVoteParams.push({ zYea: [zy0, zy1], zNay: [zn0, zn1] });
        }

        return newVoteParams;
    }

    // ==================================================================
    // 7. initVoteParams
    // ==================================================================
    /**
     * Initialize vote parameters using mean positions of yea/nay voters.
     *
     * @param {number[][]} matrix       N x M (encoding 1/6/9)
     * @param {number[][]} legislators  N x dims
     * @param {number}     dims
     * @returns {Array} M-array of {zYea: [dims], zNay: [dims]}
     */
    function initVoteParams(matrix, legislators, dims) {
        var N = matrix.length;
        var M = matrix[0].length;
        var voteParams = [];

        for (var j = 0; j < M; j++) {
            var yeaSum = new Array(dims).fill(0);
            var naySum = new Array(dims).fill(0);
            var yeaCount = 0, nayCount = 0;

            for (var i = 0; i < N; i++) {
                var v = matrix[i][j];
                if (v === 1) {
                    for (var d = 0; d < dims; d++) yeaSum[d] += legislators[i][d];
                    yeaCount++;
                } else if (v === 6) {
                    for (var d = 0; d < dims; d++) naySum[d] += legislators[i][d];
                    nayCount++;
                }
            }

            var zYea = new Array(dims);
            var zNay = new Array(dims);
            for (var d = 0; d < dims; d++) {
                zYea[d] = yeaCount > 0 ? yeaSum[d] / yeaCount : 0;
                zNay[d] = nayCount > 0 ? naySum[d] / nayCount : 0;
            }

            // If zYea === zNay (no separation), add small perturbation
            var identical = true;
            for (var d = 0; d < dims; d++) {
                if (Math.abs(zYea[d] - zNay[d]) > EPS) { identical = false; break; }
            }
            if (identical) {
                zYea[0] = Math.min(zYea[0] + 0.1, 1);
                zNay[0] = Math.max(zNay[0] - 0.1, -1);
            }

            voteParams.push({ zYea: zYea, zNay: zNay });
        }

        return voteParams;
    }

    // ==================================================================
    // 8. normalizeCoordinates
    // ==================================================================
    /**
     * Normalize each dimension to [-1, 1] by dividing by max absolute value.
     *
     * @param {number[][]} legislators  N x dims (modified in place)
     * @param {number}     dims
     */
    function normalizeCoordinates(legislators, dims) {
        var N = legislators.length;
        // Normalize so that the maximum norm is 1 (unit sphere constraint)
        var maxNorm = 0;
        for (var i = 0; i < N; i++) {
            var norm2 = 0;
            for (var d = 0; d < dims; d++) norm2 += legislators[i][d] * legislators[i][d];
            var norm = Math.sqrt(norm2);
            if (norm > maxNorm) maxNorm = norm;
        }
        if (maxNorm > EPS) {
            for (var i = 0; i < N; i++) {
                for (var d = 0; d < dims; d++) {
                    legislators[i][d] /= maxNorm;
                }
            }
        }
    }

    // ==================================================================
    // 9. applyPolarity
    // ==================================================================
    /**
     * Flip dimension sign if the polarity legislator has a negative coordinate.
     * This ensures the reference legislator has a positive coordinate.
     *
     * @param {number[][]} legislators    N x dims (modified in place)
     * @param {number[]}   polarityIndices  Index of reference legislator per dimension
     * @param {number}     dims
     */
    function applyPolarity(legislators, polarityIndices, dims) {
        var N = legislators.length;
        for (var d = 0; d < dims; d++) {
            var refIdx = polarityIndices[d];
            if (typeof refIdx === 'undefined' || refIdx === null) continue;
            if (refIdx < 0 || refIdx >= N) continue;
            if (legislators[refIdx][d] < 0) {
                // Flip this dimension
                for (var i = 0; i < N; i++) {
                    legislators[i][d] = -legislators[i][d];
                }
            }
        }
    }

    // ==================================================================
    // 10. estimateBeta
    // ==================================================================
    /**
     * Estimate optimal beta using golden section search to maximize log-likelihood.
     * Matches the R wnominate approach of optimizing beta given fixed legislators
     * and vote parameters.
     *
     * @param {number[][]} matrix
     * @param {number[][]} legislators
     * @param {Array}      voteParams
     * @param {number}     currentBeta  Starting beta value
     * @param {number[]}   w
     * @returns {number}   Optimal beta
     */
    /**
     * Jointly estimate beta and dimension weights using 2D grid search.
     * This avoids the degeneracy of alternating beta/weight estimation
     * (where beta and weights can compensate each other).
     *
     * Parameterizes weights as w = [R*cos(theta), R*sin(theta)] where
     * R*beta is the effective scale and theta is the weight ratio.
     *
     * @returns {{ beta: number, w: number[] }}
     */
    function estimateBetaAndWeights(matrix, legislators, voteParams, currentBeta, currentW, dims) {
        if (dims === 1) {
            // 1D: just search beta
            var bestBeta = currentBeta, bestLL = -Infinity;
            for (var bi = 1; bi <= 40; bi++) {
                var ll = computeLogLikelihood(matrix, legislators, voteParams, bi, [1.0]).logLik;
                if (ll > bestLL) { bestLL = ll; bestBeta = bi; }
            }
            return { beta: bestBeta, w: [1.0] };
        }

        // 2D grid search over beta and theta (weight ratio angle)
        var bestLL = -Infinity;
        var bestBeta = currentBeta;
        var bestW = currentW.slice();

        // 2D grid search: beta in [2, 30], theta in (0, pi/2)
        // Weights normalized to unit vector (||w||=1, scale absorbed by beta)
        var betaSteps = 10;
        var thetaSteps = 10;
        var bestTheta = Math.atan2(currentW[1], currentW[0]);

        for (var bi = 0; bi <= betaSteps; bi++) {
            var testBeta = 2 + (28) * bi / betaSteps;
            for (var ti = 1; ti < thetaSteps; ti++) {
                var theta = (Math.PI / 2) * ti / thetaSteps;
                var wTest = [Math.cos(theta), Math.sin(theta)];
                var ll = computeLogLikelihood(matrix, legislators, voteParams, testBeta, wTest).logLik;
                if (ll > bestLL) {
                    bestLL = ll;
                    bestBeta = testBeta;
                    bestTheta = theta;
                }
            }
        }

        // Fine grid around best
        var bLo = Math.max(2, bestBeta - 2);
        var bHi = Math.min(30, bestBeta + 2);
        var tLo = Math.max(0.05, bestTheta - Math.PI / (2 * thetaSteps));
        var tHi = Math.min(Math.PI / 2 - 0.05, bestTheta + Math.PI / (2 * thetaSteps));

        for (var bi = 0; bi <= 10; bi++) {
            var testBeta = bLo + (bHi - bLo) * bi / 10;
            for (var ti = 0; ti <= 10; ti++) {
                var theta = tLo + (tHi - tLo) * ti / 10;
                var wTest = [Math.cos(theta), Math.sin(theta)];
                var ll = computeLogLikelihood(matrix, legislators, voteParams, testBeta, wTest).logLik;
                if (ll > bestLL) {
                    bestLL = ll;
                    bestBeta = testBeta;
                    bestTheta = theta;
                }
            }
        }

        bestW = [Math.cos(bestTheta), Math.sin(bestTheta)];
        return { beta: bestBeta, w: bestW };
    }

    // Keep separate functions for backward compat
    function estimateBeta(matrix, legislators, voteParams, currentBeta, w) {
        var result = estimateBetaAndWeights(matrix, legislators, voteParams, currentBeta, w, w.length);
        return result.beta;
    }

    function estimateWeights(matrix, legislators, voteParams, beta, currentW, dims) {
        var result = estimateBetaAndWeights(matrix, legislators, voteParams, beta, currentW, dims);
        return result.w;
    }

    // ==================================================================
    // 12. wNominate — MAIN FUNCTION
    // ==================================================================
    /**
     * Run the W-NOMINATE algorithm.
     *
     * @param {number[][]} voteMatrix  N x M matrix (encoding 1=Yea, 6=Nay, 9=Missing)
     * @param {Object}     options
     * @param {number}     [options.dims=2]         Number of dimensions
     * @param {number}     [options.beta=15]        Utility decay parameter
     * @param {number}     [options.maxIter=100]    Maximum EM iterations
     * @param {number}     [options.tol=0.001]      Convergence tolerance (log-lik change)
     * @param {number[]}   [options.w=[0.5,0.5]]    Dimension weights
     * @param {number}     [options.minVotes=20]    Minimum votes per legislator
     * @param {number}     [options.lop=0.025]      Lopsidedness threshold
     * @param {number[]|null} [options.polarity=null] Indices of polarity legislators (per dim)
     * @param {Function|null} [options.onProgress=null] Callback(iter, logLik, correctClass)
     *
     * @returns {{
     *   legislators: Array<{coord1D: number, coord2D: number}>,
     *   fits: {logLikelihood: number, correctClass: number},
     *   weights: number[],
     *   legIndices: number[]
     * }}
     */
    function wNominate(voteMatrix, options) {
        options = options || {};
        var dims     = options.dims     !== undefined ? options.dims     : 2;
        var beta     = options.beta     !== undefined ? options.beta     : 15;
        var maxIter  = options.maxIter  !== undefined ? options.maxIter  : 100;
        var tol      = options.tol      !== undefined ? options.tol      : 0.001;
        var w        = options.w        !== undefined ? options.w        : (dims === 1 ? [1.0] : [0.5, 0.5]);
        var minVotes = options.minVotes !== undefined ? options.minVotes : 20;
        var lop      = options.lop      !== undefined ? options.lop      : 0.025;
        var polarity = options.polarity !== undefined ? options.polarity : null;
        var onProgress = options.onProgress || null;
        var trials   = options.trials   !== undefined ? options.trials   : 3;

        // Ensure w has enough dimensions
        while (w.length < dims) w.push(0.5);
        w = w.slice(0, dims);

        // --- Step 1: Prepare data (iterative filtering like R) ---
        var prep = prepareData(voteMatrix, lop, minVotes);
        var matrix     = prep.matrix;
        var legIndices = prep.legIndices;
        var N          = prep.N;
        var M          = prep.M;

        if (N === 0 || M === 0) {
            throw new Error('wNominate: no legislators or votes remain after filtering');
        }

        // --- Step 2: Initialize from SVD ---
        var legislators = initializeFromSVD(matrix, dims);

        // --- Step 3: Pre-compute observation indices (avoids scanning matrix every step) ---
        var obsByLeg = new Array(N);
        var obsByVote = new Array(M);
        for (var i = 0; i < N; i++) obsByLeg[i] = [];
        for (var j = 0; j < M; j++) obsByVote[j] = [];

        for (var i = 0; i < N; i++) {
            for (var j = 0; j < M; j++) {
                var v = matrix[i][j];
                if (v === 1 || v === 6) {
                    var y = (v === 1) ? 1 : 0;
                    obsByLeg[i].push({ j: j, y: y });
                    obsByVote[j].push({ i: i, y: y });
                }
            }
        }

        // --- Step 4: Initialize vote parameters ---
        var voteParams = initVoteParams(matrix, legislators, dims);

        // --- Auto polarity: use top-2 legislators by vote count ---
        if (!polarity) {
            var voteCounts = [];
            for (var i = 0; i < N; i++) {
                voteCounts.push({ idx: i, count: obsByLeg[i].length });
            }
            voteCounts.sort(function (a, b) { return b.count - a.count; });
            polarity = [];
            for (var d = 0; d < dims; d++) {
                polarity.push(voteCounts[Math.min(d, voteCounts.length - 1)].idx);
            }
        }

        // --- Step 5: Trial-based estimation ---
        var fits = { logLikelihood: 0, correctClass: 0 };
        var totalIter = 0;

        for (var trial = 0; trial < trials; trial++) {
            var prevLogLik = -Infinity;
            var itersPerTrial = Math.ceil(maxIter / trials);

            // Re-initialize vote params from current legislators to reset spread
            voteParams = initVoteParams(matrix, legislators, dims);

            // Initial estimation round
            voteParams = estimateVoteParams(legislators, voteParams, beta, w, dims, obsByVote);
            legislators = estimateLegislators(legislators, voteParams, beta, w, dims, obsByLeg);

            // Joint beta + weights estimation
            var bwResult = estimateBetaAndWeights(matrix, legislators, voteParams, beta, w, dims);
            beta = bwResult.beta;
            w = bwResult.w;

            // Inner refinement loop
            for (var innerIter = 0; innerIter < itersPerTrial; innerIter++) {
                totalIter++;

                voteParams = estimateVoteParams(legislators, voteParams, beta, w, dims, obsByVote);
                legislators = estimateLegislators(legislators, voteParams, beta, w, dims, obsByLeg);

                var result = computeLogLikelihood(matrix, legislators, voteParams, beta, w);
                fits.logLikelihood = result.logLik;
                fits.correctClass  = result.correctClass;

                if (onProgress) {
                    onProgress(totalIter, result.logLik, result.correctClass);
                }

                var delta = Math.abs(result.logLik - prevLogLik);
                if (innerIter > 0 && delta < tol) {
                    break;
                }
                prevLogLik = result.logLik;
            }

            // Re-estimate beta+weights after inner loop converges
            var bwResult2 = estimateBetaAndWeights(matrix, legislators, voteParams, beta, w, dims);
            beta = bwResult2.beta;
            w = bwResult2.w;
        }

        // --- Step 5: Normalize coordinates ---
        normalizeCoordinates(legislators, dims);

        // --- Step 6: Apply polarity ---
        applyPolarity(legislators, polarity, dims);

        // --- Step 7: Build output ---
        var outputLegislators = legislators.map(function (pos) {
            return {
                coord1D: parseFloat((pos[0] !== undefined ? pos[0] : 0).toFixed(4)),
                coord2D: parseFloat((pos[1] !== undefined ? pos[1] : 0).toFixed(4))
            };
        });

        return {
            legislators: outputLegislators,
            fits:        fits,
            weights:     w,
            beta:        beta,
            legIndices:  legIndices
        };
    }

    // ==================================================================
    // Module export
    // ==================================================================
    var wNominateModule = {
        wNominate:              wNominate,
        _prepareData:           prepareData,
        _initializeFromSVD:     initializeFromSVD,
        _probYea:               probYea,
        _computeLogLikelihood:  computeLogLikelihood,
        _estimateLegislators:   estimateLegislators,
        _estimateVoteParams:    estimateVoteParams,
        _initVoteParams:        initVoteParams,
        _normalizeCoordinates:  normalizeCoordinates,
        _applyPolarity:         applyPolarity
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = wNominateModule;
    } else {
        root.wNominateModule = wNominateModule;
    }

})(typeof window !== 'undefined' ? window : this);
