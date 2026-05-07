# W-NOMINATE em JavaScript — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the W-NOMINATE algorithm in pure JavaScript, replacing the R dependency, with Node.js precalculation and dynamic browser computation.

**Architecture:** Single isomorphic module (`javascripts/w-nominate.js`) used by both a Node.js precalc script and the browser. The browser calculates W-NOMINATE synchronously for custom periods, loads precalculated JSON for standard periods.

**Tech Stack:** JavaScript (ES5 browser-compatible), numeric.js (SVD + uncmin), D3.js v3 (data loading/visualization)

**Spec:** `docs/superpowers/specs/2026-04-02-w-nominate-js-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `scripts/generate-w-nominate.R` | Delete | Legacy R script |
| `data/precalc/w-nominate/*.json` | Delete all | Will be regenerated |
| `javascripts/w-nominate.js` | Create | Core W-NOMINATE algorithm (isomorphic) |
| `scripts/generate-w-nominate.js` | Create | Node.js precalc script |
| `scripts/generate-all.js` | Modify | Update step 2 from R to Node.js |
| `javascripts/events/event-handlers.js` | Modify | Enable W-NOMINATE dynamic calculation |
| `javascripts/data/data-loader.js` | Modify | Add dynamic W-NOMINATE fallback |
| `javascripts/dict.js` | Modify | Add W-NOMINATE and UMAP translations |
| `index.html` | Modify | Add w-nominate.js script tag |

---

### Task 1: Cleanup Legacy NOMINATE Code

**Files:**
- Delete: `scripts/generate-w-nominate.R`
- Delete: `data/precalc/w-nominate/*.json`
- Modify: `scripts/generate-all.js:75-79`

- [ ] **Step 1: Delete the R script**

```bash
rm scripts/generate-w-nominate.R
```

- [ ] **Step 2: Delete existing W-NOMINATE precalc files**

```bash
rm -rf data/precalc/w-nominate/*
```

- [ ] **Step 3: Update generate-all.js to comment out R step**

In `scripts/generate-all.js`, replace lines 75-79:

```javascript
// Step 2: W-NOMINATE precalc (uses R's official wnominate package)
if (only === 'w-nominate' || (!only && !skipWNominate)) {
    run('Step 2/5: W-NOMINATE Precalc (R)',
        `Rscript "${path.join(SCRIPTS_DIR, 'generate-w-nominate.R')}"`);
}
```

With:

```javascript
// Step 2: W-NOMINATE precalc (JavaScript implementation)
if (only === 'w-nominate' || (!only && !skipWNominate)) {
    run('Step 2/5: W-NOMINATE Precalc (JS)',
        `node "${path.join(SCRIPTS_DIR, 'generate-w-nominate.js')}"`);
}
```

Also update the header comment on line 10:

```javascript
// *   2. W-NOMINATE precalc → data/precalc/w-nominate/*.json  (JavaScript implementation)
```

- [ ] **Step 4: Remove memory file**

```bash
rm /Users/rodrimoni/.claude/projects/-Users-rodrimoni-Documents-CivisAnalysis-CivisAnalysis2/memory/project_dw_nominate.md
```

Update `MEMORY.md` to remove the reference to `project_dw_nominate.md`.

- [ ] **Step 5: Commit**

```bash
git add -A scripts/generate-w-nominate.R data/precalc/w-nominate/ scripts/generate-all.js
git commit -m "chore: remove legacy R-based W-NOMINATE and update pipeline for JS"
```

---

### Task 2: W-NOMINATE Core — Data Preparation

**Files:**
- Create: `javascripts/w-nominate.js`

This task creates the module skeleton and the `prepareData` function that filters the vote matrix (lopsided vote cutoff + minimum votes).

- [ ] **Step 1: Create the module skeleton with prepareData**

Create `javascripts/w-nominate.js`:

```javascript
/**
 * W-NOMINATE Algorithm Implementation
 *
 * Implements the W-NOMINATE spatial voting model (Poole & Rosenthal, 1997)
 * for estimating ideal points of legislators from roll call vote matrices.
 *
 * Isomorphic: works in browser (global) and Node.js (module.exports).
 * Depends on numeric.js for SVD and uncmin optimization.
 *
 * References:
 *   - Poole, K.T. & Rosenthal, H. (1997). Congress: A Political-Economic History of Roll Call Voting
 *   - Poole, K.T. (2005). Spatial Models of Parliamentary Voting
 *   - R package wnominate (Poole, Lewis, Rosenthal)
 *
 * Vote matrix encoding: 1=yea, 6=nay, 9=missing/not-in-legislature
 */
(function (root) {
    'use strict';

    var DEFAULT_OPTIONS = {
        dims: 2,
        beta: 15,
        maxIter: 100,
        tol: 0.001,
        w: [0.5, 0.5],
        minVotes: 20,
        lop: 0.025,
        polarity: null,  // auto: top 2 legislators by vote count
        onProgress: null  // callback(iteration, logLikelihood)
    };

    /**
     * Prepare vote matrix: filter lopsided votes and low-participation legislators.
     *
     * @param {number[][]} voteMatrix - N x M matrix (1=yea, 6=nay, 9=missing)
     * @param {number} lop - Lopsided vote cutoff (0-0.5). Votes where minority < lop are excluded.
     * @param {number} minVotes - Minimum yea+nay votes for a legislator to be included.
     * @returns {{ matrix: number[][], legIndices: number[], voteIndices: number[], N: number, M: number }}
     */
    function prepareData(voteMatrix, lop, minVotes) {
        var N = voteMatrix.length;
        var M = voteMatrix[0].length;

        // Step 1: Filter lopsided votes (columns)
        var validVotes = [];
        for (var j = 0; j < M; j++) {
            var yeas = 0, nays = 0;
            for (var i = 0; i < N; i++) {
                if (voteMatrix[i][j] === 1) yeas++;
                else if (voteMatrix[i][j] === 6) nays++;
            }
            var total = yeas + nays;
            if (total > 0) {
                var minority = Math.min(yeas, nays) / total;
                if (minority >= lop) {
                    validVotes.push(j);
                }
            }
        }

        // Step 2: Filter legislators with too few votes in remaining votes
        var validLegs = [];
        for (var i = 0; i < N; i++) {
            var count = 0;
            for (var vi = 0; vi < validVotes.length; vi++) {
                var v = voteMatrix[i][validVotes[vi]];
                if (v === 1 || v === 6) count++;
            }
            if (count >= minVotes) {
                validLegs.push(i);
            }
        }

        // Step 3: Build filtered matrix
        var filtered = [];
        for (var li = 0; li < validLegs.length; li++) {
            var row = [];
            for (var vi = 0; vi < validVotes.length; vi++) {
                row.push(voteMatrix[validLegs[li]][validVotes[vi]]);
            }
            filtered.push(row);
        }

        return {
            matrix: filtered,
            legIndices: validLegs,
            voteIndices: validVotes,
            N: validLegs.length,
            M: validVotes.length
        };
    }

    // Export
    var wNominateModule = {
        _prepareData: prepareData
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = wNominateModule;
    } else {
        root.wNominateModule = wNominateModule;
    }

})(typeof window !== 'undefined' ? window : this);
```

- [ ] **Step 2: Verify module loads in Node.js**

```bash
cd /Users/rodrimoni/Documents/CivisAnalysis/CivisAnalysis2
node -e "
var wn = require('./javascripts/w-nominate.js');
var result = wn._prepareData([
  [1,6,1,9], [6,1,6,1], [1,6,9,9], [1,1,6,6]
], 0.025, 1);
console.log('N:', result.N, 'M:', result.M);
console.log('legIndices:', result.legIndices);
console.log('voteIndices:', result.voteIndices);
"
```

Expected: N=4 (or 3 if leg 3 filtered), M depends on lopsidedness. No errors.

- [ ] **Step 3: Commit**

```bash
git add javascripts/w-nominate.js
git commit -m "feat(w-nominate): add module skeleton with prepareData filtering"
```

---

### Task 3: W-NOMINATE Core — SVD Initialization

**Files:**
- Modify: `javascripts/w-nominate.js`

Add the `initializeFromSVD` function that converts vote matrix to PCA-compatible format, runs SVD, and extracts initial ideal point estimates.

- [ ] **Step 1: Add initializeFromSVD function**

Add inside the IIFE in `javascripts/w-nominate.js`, after `prepareData`:

```javascript
    /**
     * Initialize legislator ideal points using SVD of the vote matrix.
     * Converts W-NOMINATE encoding (1/6/9) to PCA encoding (1/-1/0),
     * runs SVD via numeric.js, and extracts top-d components as initial positions.
     *
     * @param {number[][]} matrix - Filtered vote matrix (1=yea, 6=nay, 9=missing)
     * @param {number} dims - Number of dimensions (typically 2)
     * @returns {number[][]} N x dims array of initial ideal points, normalized to [-1, 1]
     */
    function initializeFromSVD(matrix, dims) {
        var N = matrix.length;
        var M = matrix[0].length;

        // Convert to PCA encoding: 1->1, 6->-1, 9->0
        var pcaMatrix = [];
        for (var i = 0; i < N; i++) {
            var row = [];
            for (var j = 0; j < M; j++) {
                if (matrix[i][j] === 1) row.push(1);
                else if (matrix[i][j] === 6) row.push(-1);
                else row.push(0);
            }
            pcaMatrix.push(row);
        }

        // SVD requires rows >= cols; transpose if needed (same as calcSVD in dimensionality-reduction.js)
        var transposed = (N < M);
        var svdInput = transposed ? numeric.transpose(pcaMatrix) : pcaMatrix;

        var svdResult = numeric.svd(svdInput);
        var eigenValues = numeric.sqrt(svdResult.S);

        var positions;
        if (transposed) {
            positions = svdResult.V.map(function (row) {
                return numeric.mul(row, eigenValues).splice(0, dims);
            });
        } else {
            positions = svdResult.U.map(function (row) {
                return numeric.mul(row, eigenValues).splice(0, dims);
            });
        }

        // Normalize to [-1, 1] per dimension
        for (var d = 0; d < dims; d++) {
            var maxAbs = 0;
            for (var i = 0; i < N; i++) {
                var absVal = Math.abs(positions[i][d]);
                if (absVal > maxAbs) maxAbs = absVal;
            }
            if (maxAbs > 0) {
                for (var i = 0; i < N; i++) {
                    positions[i][d] = positions[i][d] / maxAbs;
                }
            }
        }

        return positions;
    }
```

Update the export object:

```javascript
    var wNominateModule = {
        _prepareData: prepareData,
        _initializeFromSVD: initializeFromSVD
    };
```

- [ ] **Step 2: Verify SVD initialization works**

```bash
cd /Users/rodrimoni/Documents/CivisAnalysis/CivisAnalysis2
node -e "
require('./javascripts/external/numeric-1.2.6.js');
var wn = require('./javascripts/w-nominate.js');
// 6 legislators, 4 votes
var matrix = [
  [1,6,1,6],[6,1,6,1],[1,6,1,1],[6,1,6,6],[1,1,6,6],[6,6,1,1]
];
var pos = wn._initializeFromSVD(matrix, 2);
console.log('Positions:', pos.length, 'dims:', pos[0].length);
pos.forEach(function(p,i) { console.log('  leg', i, ':', p[0].toFixed(3), p[1].toFixed(3)); });
var maxAbs = Math.max.apply(null, pos.map(function(p) { return Math.max(Math.abs(p[0]), Math.abs(p[1])); }));
console.log('Max abs (should be <=1):', maxAbs.toFixed(3));
"
```

Expected: 6 positions with 2 dimensions each, all values in [-1, 1].

- [ ] **Step 3: Commit**

```bash
git add javascripts/w-nominate.js
git commit -m "feat(w-nominate): add SVD-based initialization for ideal points"
```

---

### Task 4: W-NOMINATE Core — Likelihood and Estimation

**Files:**
- Modify: `javascripts/w-nominate.js`

This is the heart of the algorithm. Add functions for: computing vote probability, log-likelihood, legislator estimation, and vote parameter estimation.

- [ ] **Step 1: Add probability and log-likelihood functions**

Add inside the IIFE in `javascripts/w-nominate.js`, after `initializeFromSVD`:

```javascript
    /**
     * Compute probability of yea vote for legislator i on vote j.
     * P(yea) = exp(-beta * sum_d(w_d^2 * (x_id - z_yea_jd)^2))
     *        / [exp(-beta * ...(yea)) + exp(-beta * ...(nay))]
     *
     * @param {number[]} x - Legislator ideal point [dim1, dim2]
     * @param {number[]} zYea - Yea outcome point [dim1, dim2]
     * @param {number[]} zNay - Nay outcome point [dim1, dim2]
     * @param {number} beta - Signal-to-noise parameter
     * @param {number[]} w - Dimension weights [w1, w2]
     * @returns {number} Probability in (0, 1)
     */
    function probYea(x, zYea, zNay, beta, w) {
        var utilYea = 0, utilNay = 0;
        for (var d = 0; d < x.length; d++) {
            var wd2 = w[d] * w[d];
            utilYea += wd2 * (x[d] - zYea[d]) * (x[d] - zYea[d]);
            utilNay += wd2 * (x[d] - zNay[d]) * (x[d] - zNay[d]);
        }
        var expYea = Math.exp(-0.5 * beta * utilYea);
        var expNay = Math.exp(-0.5 * beta * utilNay);
        var denom = expYea + expNay;
        if (denom === 0) return 0.5;
        return expYea / denom;
    }

    /**
     * Compute total log-likelihood and correct classification rate.
     *
     * @param {number[][]} matrix - Vote matrix (1=yea, 6=nay, 9=missing)
     * @param {number[][]} legislators - N x dims ideal points
     * @param {object[]} voteParams - M-length array of { zYea: [dims], zNay: [dims] }
     * @param {number} beta - Signal-to-noise parameter
     * @param {number[]} w - Dimension weights
     * @returns {{ logLik: number, correctClass: number }}
     */
    function computeLogLikelihood(matrix, legislators, voteParams, beta, w) {
        var N = matrix.length;
        var M = matrix[0].length;
        var logLik = 0;
        var correct = 0, total = 0;
        var EPS = 1e-12;

        for (var i = 0; i < N; i++) {
            for (var j = 0; j < M; j++) {
                var v = matrix[i][j];
                if (v !== 1 && v !== 6) continue;

                var p = probYea(legislators[i], voteParams[j].zYea, voteParams[j].zNay, beta, w);
                if (v === 1) {
                    logLik += Math.log(Math.max(p, EPS));
                    if (p > 0.5) correct++;
                } else {
                    logLik += Math.log(Math.max(1 - p, EPS));
                    if (p < 0.5) correct++;
                }
                total++;
            }
        }

        return {
            logLik: logLik,
            correctClass: total > 0 ? (correct / total) * 100 : 0
        };
    }
```

- [ ] **Step 2: Add legislator estimation (optimize x_i given fixed vote params)**

```javascript
    /**
     * Estimate ideal points for all legislators given fixed vote parameters.
     * Uses numeric.uncmin to maximize log-likelihood for each legislator independently.
     *
     * @param {number[][]} matrix - Vote matrix (1=yea, 6=nay, 9=missing)
     * @param {number[][]} currentPositions - Current legislator positions (N x dims)
     * @param {object[]} voteParams - Fixed vote parameters
     * @param {number} beta
     * @param {number[]} w
     * @param {number} dims
     * @returns {number[][]} Updated legislator positions (N x dims)
     */
    function estimateLegislators(matrix, currentPositions, voteParams, beta, w, dims) {
        var N = matrix.length;
        var M = matrix[0].length;
        var updated = [];
        var EPS = 1e-12;

        for (var i = 0; i < N; i++) {
            // Collect observed votes for this legislator
            var observed = [];
            for (var j = 0; j < M; j++) {
                if (matrix[i][j] === 1 || matrix[i][j] === 6) {
                    observed.push({ j: j, isYea: matrix[i][j] === 1 });
                }
            }

            if (observed.length === 0) {
                updated.push(currentPositions[i].slice());
                continue;
            }

            // Negative log-likelihood for this legislator (to minimize)
            var negLL = function (x) {
                // Constrain to [-1, 1] with penalty
                var penalty = 0;
                for (var d = 0; d < dims; d++) {
                    if (Math.abs(x[d]) > 1) {
                        penalty += 1000 * (Math.abs(x[d]) - 1) * (Math.abs(x[d]) - 1);
                    }
                }

                var ll = 0;
                for (var k = 0; k < observed.length; k++) {
                    var ob = observed[k];
                    var p = probYea(x, voteParams[ob.j].zYea, voteParams[ob.j].zNay, beta, w);
                    if (ob.isYea) {
                        ll += Math.log(Math.max(p, EPS));
                    } else {
                        ll += Math.log(Math.max(1 - p, EPS));
                    }
                }
                return -ll + penalty;
            };

            var result = numeric.uncmin(negLL, currentPositions[i].slice());
            var newPos = result.solution;

            // Clamp to [-1, 1]
            for (var d = 0; d < dims; d++) {
                newPos[d] = Math.max(-1, Math.min(1, newPos[d]));
            }

            updated.push(newPos);
        }

        return updated;
    }
```

- [ ] **Step 3: Add vote parameter estimation (optimize z_yea, z_nay given fixed legislators)**

```javascript
    /**
     * Estimate vote parameters for all votes given fixed legislator positions.
     * For each vote j, optimizes zYea and zNay to maximize log-likelihood.
     *
     * @param {number[][]} matrix - Vote matrix
     * @param {number[][]} legislators - Fixed legislator positions
     * @param {object[]} currentVoteParams - Current vote params
     * @param {number} beta
     * @param {number[]} w
     * @param {number} dims
     * @returns {object[]} Updated vote parameters
     */
    function estimateVoteParams(matrix, legislators, currentVoteParams, beta, w, dims) {
        var N = matrix.length;
        var M = matrix[0].length;
        var updated = [];
        var EPS = 1e-12;

        for (var j = 0; j < M; j++) {
            // Collect observed votes for this roll call
            var observed = [];
            for (var i = 0; i < N; i++) {
                if (matrix[i][j] === 1 || matrix[i][j] === 6) {
                    observed.push({ i: i, isYea: matrix[i][j] === 1 });
                }
            }

            if (observed.length === 0) {
                updated.push(currentVoteParams[j]);
                continue;
            }

            // Pack zYea and zNay into single vector for optimization: [zYea_d1, zYea_d2, zNay_d1, zNay_d2]
            var negLL = function (params) {
                var zYea = params.slice(0, dims);
                var zNay = params.slice(dims, 2 * dims);

                var ll = 0;
                for (var k = 0; k < observed.length; k++) {
                    var ob = observed[k];
                    var p = probYea(legislators[ob.i], zYea, zNay, beta, w);
                    if (ob.isYea) {
                        ll += Math.log(Math.max(p, EPS));
                    } else {
                        ll += Math.log(Math.max(1 - p, EPS));
                    }
                }
                return -ll;
            };

            var x0 = currentVoteParams[j].zYea.concat(currentVoteParams[j].zNay);
            var result = numeric.uncmin(negLL, x0);
            var sol = result.solution;

            updated.push({
                zYea: sol.slice(0, dims),
                zNay: sol.slice(dims, 2 * dims)
            });
        }

        return updated;
    }
```

- [ ] **Step 4: Update exports**

```javascript
    var wNominateModule = {
        _prepareData: prepareData,
        _initializeFromSVD: initializeFromSVD,
        _probYea: probYea,
        _computeLogLikelihood: computeLogLikelihood,
        _estimateLegislators: estimateLegislators,
        _estimateVoteParams: estimateVoteParams
    };
```

- [ ] **Step 5: Verify estimation functions load without errors**

```bash
cd /Users/rodrimoni/Documents/CivisAnalysis/CivisAnalysis2
node -e "
require('./javascripts/external/numeric-1.2.6.js');
var wn = require('./javascripts/w-nominate.js');
// Quick sanity check: probYea should return ~0.5 when equidistant
var p = wn._probYea([0, 0], [1, 0], [-1, 0], 15, [0.5, 0.5]);
console.log('probYea (equidistant):', p.toFixed(4), '(expected ~0.5)');
// Check closer to yea
var p2 = wn._probYea([0.8, 0], [1, 0], [-1, 0], 15, [0.5, 0.5]);
console.log('probYea (close to yea):', p2.toFixed(4), '(expected >0.5)');
"
```

Expected: First value ~0.5, second value > 0.5.

- [ ] **Step 6: Commit**

```bash
git add javascripts/w-nominate.js
git commit -m "feat(w-nominate): add likelihood computation, legislator and vote parameter estimation"
```

---

### Task 5: W-NOMINATE Core — Main Algorithm Loop

**Files:**
- Modify: `javascripts/w-nominate.js`

Add the main `wNominate()` function that orchestrates: prepare → init → iterate → normalize → polarity.

- [ ] **Step 1: Add initial vote parameter estimation from SVD positions**

Add inside the IIFE, after `estimateVoteParams`:

```javascript
    /**
     * Initialize vote parameters from legislator positions.
     * For each vote j, zYea = mean of yea-voters' positions, zNay = mean of nay-voters' positions.
     *
     * @param {number[][]} matrix - Vote matrix
     * @param {number[][]} legislators - Legislator positions (N x dims)
     * @param {number} dims
     * @returns {object[]} Initial vote parameters
     */
    function initVoteParams(matrix, legislators, dims) {
        var M = matrix[0].length;
        var N = matrix.length;
        var params = [];

        for (var j = 0; j < M; j++) {
            var zYea = new Array(dims);
            var zNay = new Array(dims);
            var yeaCount = 0, nayCount = 0;

            for (var d = 0; d < dims; d++) {
                zYea[d] = 0;
                zNay[d] = 0;
            }

            for (var i = 0; i < N; i++) {
                if (matrix[i][j] === 1) {
                    for (var d = 0; d < dims; d++) zYea[d] += legislators[i][d];
                    yeaCount++;
                } else if (matrix[i][j] === 6) {
                    for (var d = 0; d < dims; d++) zNay[d] += legislators[i][d];
                    nayCount++;
                }
            }

            for (var d = 0; d < dims; d++) {
                zYea[d] = yeaCount > 0 ? zYea[d] / yeaCount : 0;
                zNay[d] = nayCount > 0 ? zNay[d] / nayCount : 0;
            }

            params.push({ zYea: zYea, zNay: zNay });
        }

        return params;
    }
```

- [ ] **Step 2: Add normalizeCoordinates and applyPolarity**

```javascript
    /**
     * Normalize legislator coordinates to [-1, 1] range per dimension.
     *
     * @param {number[][]} legislators - N x dims positions
     * @param {number} dims
     * @returns {number[][]} Normalized positions
     */
    function normalizeCoordinates(legislators, dims) {
        var N = legislators.length;
        var result = [];

        for (var i = 0; i < N; i++) {
            result.push(legislators[i].slice());
        }

        for (var d = 0; d < dims; d++) {
            var maxAbs = 0;
            for (var i = 0; i < N; i++) {
                var absVal = Math.abs(result[i][d]);
                if (absVal > maxAbs) maxAbs = absVal;
            }
            if (maxAbs > 0) {
                for (var i = 0; i < N; i++) {
                    result[i][d] = result[i][d] / maxAbs;
                }
            }
        }

        return result;
    }

    /**
     * Apply polarity: ensure polarity legislators have positive coordinates.
     * Flips dimension signs if needed so that the polarity legislator has coord > 0.
     *
     * @param {number[][]} legislators - N x dims positions
     * @param {number[]} polarityIndices - One index per dimension
     * @param {number} dims
     * @returns {number[][]} Polarity-adjusted positions
     */
    function applyPolarity(legislators, polarityIndices, dims) {
        var N = legislators.length;
        var result = [];

        for (var i = 0; i < N; i++) {
            result.push(legislators[i].slice());
        }

        for (var d = 0; d < dims; d++) {
            if (d < polarityIndices.length && polarityIndices[d] < N) {
                if (result[polarityIndices[d]][d] < 0) {
                    // Flip this dimension
                    for (var i = 0; i < N; i++) {
                        result[i][d] = -result[i][d];
                    }
                }
            }
        }

        return result;
    }
```

- [ ] **Step 3: Add the main wNominate function**

```javascript
    /**
     * Run W-NOMINATE estimation.
     *
     * @param {number[][]} voteMatrix - N x M matrix (1=yea, 6=nay, 9=missing)
     * @param {object} [options] - Algorithm options (see DEFAULT_OPTIONS)
     * @returns {{
     *   legislators: { coord1D: number, coord2D: number }[],
     *   fits: { logLikelihood: number, correctClass: number },
     *   weights: number[],
     *   legIndices: number[]
     * }}
     */
    function wNominate(voteMatrix, options) {
        var opts = {};
        for (var key in DEFAULT_OPTIONS) {
            opts[key] = (options && options[key] !== undefined) ? options[key] : DEFAULT_OPTIONS[key];
        }

        var dims = opts.dims;
        var beta = opts.beta;
        var w = opts.w.slice();

        // 1. Prepare data
        var prep = prepareData(voteMatrix, opts.lop, opts.minVotes);
        if (prep.N < 2 || prep.M < 2) {
            return {
                legislators: [],
                fits: { logLikelihood: 0, correctClass: 0 },
                weights: w,
                legIndices: prep.legIndices
            };
        }

        // 2. Initialize from SVD
        var legislators = initializeFromSVD(prep.matrix, dims);

        // 3. Initialize vote parameters from legislator positions
        var voteParams = initVoteParams(prep.matrix, legislators, dims);

        // 4. Select polarity legislators
        var polarityIndices = opts.polarity;
        if (!polarityIndices) {
            // Auto: top 2 legislators by vote count in filtered matrix
            var voteCounts = [];
            for (var i = 0; i < prep.N; i++) {
                var count = 0;
                for (var j = 0; j < prep.M; j++) {
                    if (prep.matrix[i][j] === 1 || prep.matrix[i][j] === 6) count++;
                }
                voteCounts.push({ idx: i, count: count });
            }
            voteCounts.sort(function (a, b) { return b.count - a.count; });
            polarityIndices = [];
            for (var d = 0; d < dims && d < voteCounts.length; d++) {
                polarityIndices.push(voteCounts[d].idx);
            }
        }

        // 5. Alternating estimation loop
        var prevLogLik = -Infinity;

        for (var iter = 0; iter < opts.maxIter; iter++) {
            // Step A: Estimate legislators
            legislators = estimateLegislators(prep.matrix, legislators, voteParams, beta, w, dims);

            // Step B: Estimate vote parameters
            voteParams = estimateVoteParams(prep.matrix, legislators, voteParams, beta, w, dims);

            // Step C: Compute log-likelihood
            var fitResult = computeLogLikelihood(prep.matrix, legislators, voteParams, beta, w);
            var currentLogLik = fitResult.logLik;

            if (opts.onProgress) {
                opts.onProgress(iter + 1, currentLogLik, fitResult.correctClass);
            }

            // Step D: Check convergence
            var delta = Math.abs(currentLogLik - prevLogLik);
            if (delta < opts.tol && iter > 0) {
                break;
            }
            prevLogLik = currentLogLik;
        }

        // 6. Normalize and apply polarity
        legislators = normalizeCoordinates(legislators, dims);
        legislators = applyPolarity(legislators, polarityIndices, dims);

        // 7. Final fit
        var finalFit = computeLogLikelihood(prep.matrix, legislators, voteParams, beta, w);

        // 8. Build output
        var output = [];
        for (var i = 0; i < prep.N; i++) {
            output.push({
                coord1D: parseFloat(legislators[i][0].toFixed(4)),
                coord2D: dims > 1 ? parseFloat(legislators[i][1].toFixed(4)) : 0
            });
        }

        return {
            legislators: output,
            fits: {
                logLikelihood: finalFit.logLik,
                correctClass: parseFloat(finalFit.correctClass.toFixed(2))
            },
            weights: w,
            legIndices: prep.legIndices
        };
    }
```

- [ ] **Step 4: Update exports to expose wNominate as main function**

Replace the export block:

```javascript
    var wNominateModule = {
        wNominate: wNominate,
        _prepareData: prepareData,
        _initializeFromSVD: initializeFromSVD,
        _probYea: probYea,
        _computeLogLikelihood: computeLogLikelihood,
        _estimateLegislators: estimateLegislators,
        _estimateVoteParams: estimateVoteParams,
        _initVoteParams: initVoteParams,
        _normalizeCoordinates: normalizeCoordinates,
        _applyPolarity: applyPolarity
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = wNominateModule;
    } else {
        root.wNominateModule = wNominateModule;
    }
```

- [ ] **Step 5: End-to-end test with synthetic data**

```bash
cd /Users/rodrimoni/Documents/CivisAnalysis/CivisAnalysis2
node -e "
require('./javascripts/external/numeric-1.2.6.js');
var wn = require('./javascripts/w-nominate.js');

// Create synthetic vote matrix: 2 blocs of 10 legislators each, 20 votes
// Bloc A votes yea on votes 0-9, nay on votes 10-19
// Bloc B votes opposite
var N = 20, M = 20;
var matrix = [];
for (var i = 0; i < N; i++) {
    var row = [];
    for (var j = 0; j < M; j++) {
        if (i < 10) {
            row.push(j < 10 ? 1 : 6);  // Bloc A
        } else {
            row.push(j < 10 ? 6 : 1);  // Bloc B
        }
    }
    matrix.push(row);
}

console.log('Running W-NOMINATE on synthetic 20x20 matrix...');
var start = Date.now();
var result = wn.wNominate(matrix, { maxIter: 20, onProgress: function(iter, ll, cc) {
    console.log('  iter ' + iter + ': logLik=' + ll.toFixed(1) + ', correct=' + cc.toFixed(1) + '%');
}});
var elapsed = Date.now() - start;

console.log('Time:', elapsed + 'ms');
console.log('Correct classification:', result.fits.correctClass + '%');
console.log('Legislators:', result.legislators.length);
console.log('First 5:', result.legislators.slice(0, 5));
console.log('Last 5:', result.legislators.slice(-5));
"
```

Expected: Two clear blocs with opposite signs on dimension 1. Correct classification should be high (>90%). Should complete in under 5 seconds.

- [ ] **Step 6: Commit**

```bash
git add javascripts/w-nominate.js
git commit -m "feat(w-nominate): add main wNominate algorithm with alternating estimation loop"
```

---

### Task 6: Node.js Precalculation Script

**Files:**
- Create: `scripts/generate-w-nominate.js`

Follows the pattern of `scripts/generate-pca-precalc.js`. Loads data, iterates over periods, calls `wNominate()`, saves JSON.

- [ ] **Step 1: Create generate-w-nominate.js**

Create `scripts/generate-w-nominate.js`. This is a large file that follows the same structure as `generate-pca-precalc.js`. Key differences:
- Uses `wNominateModule.wNominate()` instead of `computePCA()`
- Vote matrix encoding: `1=yea, 6=nay, 9=missing` instead of `1/-1/0`
- Same period definitions, data loading, alignment, and `setGovTo3rdQuadrant`

```javascript
#!/usr/bin/env node
/**
 * W-NOMINATE Precalc Generator for CivisAnalysis2
 *
 * Generates W-NOMINATE precalculated scatter plot data for all standard periods.
 * Uses the JavaScript W-NOMINATE implementation (javascripts/w-nominate.js).
 *
 * Usage: node scripts/generate-w-nominate.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Load dependencies (same approach as generate-pca-precalc.js)
require(path.join(__dirname, '..', 'javascripts', 'external', 'numeric-1.2.6.js'));
const wNominateModule = require(path.join(__dirname, '..', 'javascripts', 'w-nominate.js'));

const BASE_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const OUTPUT_DIR = path.join(DATA_DIR, 'precalc', 'w-nominate');

const MAX_DEPUTIES = 513;

// ============================================================
// Period Definitions (same as generate-pca-precalc.js)
// ============================================================
const STARTING_YEAR = 1991;
const ENDING_YEAR = 2025;

const LEGISLATURES = [
    { name: '49th Legislature', regimeParty: 'PFL', period: [new Date(1991, 1, 1), new Date(1995, 0, 31)] },
    { name: '50th Legislature', regimeParty: 'PFL', period: [new Date(1995, 1, 1), new Date(1999, 0, 31)] },
    { name: '51th Legislature', regimeParty: 'PSDB', period: [new Date(1999, 1, 1), new Date(2003, 0, 31)] },
    { name: '52th Legislature', regimeParty: 'PT', period: [new Date(2003, 1, 1), new Date(2007, 0, 31)] },
    { name: '53th Legislature', regimeParty: 'PT', period: [new Date(2007, 1, 1), new Date(2011, 0, 31)] },
    { name: '54th Legislature', regimeParty: 'PT', period: [new Date(2011, 1, 1), new Date(2015, 0, 31)] },
    { name: '55th Legislature', regimeParty: 'PMDB', period: [new Date(2015, 1, 1), new Date(2019, 0, 31)] },
    { name: '56th Legislature', regimeParty: 'PL', period: [new Date(2019, 1, 1), new Date(2023, 0, 31)] },
    { name: '57th Legislature', regimeParty: 'PT', period: [new Date(2023, 1, 1), new Date(2026, 0, 31)] },
];

const PRESIDENTS = [
    { name: 'Collor (PRN)', period: [new Date(1991, 0, 1), new Date(1992, 11, 29)] },
    { name: 'Itamar (PMDB)', period: [new Date(1992, 11, 29), new Date(1995, 0, 1)] },
    { name: 'FHC (PSDB) 1st', period: [new Date(1995, 0, 1), new Date(1999, 0, 1)] },
    { name: 'FHC (PSDB) 2nd', period: [new Date(1999, 0, 1), new Date(2003, 0, 1)] },
    { name: 'Lula (PT) 1st', period: [new Date(2003, 0, 1), new Date(2007, 0, 1)] },
    { name: 'Lula (PT) 2nd', period: [new Date(2007, 0, 1), new Date(2011, 0, 1)] },
    { name: 'Dilma (PT) 1st', period: [new Date(2011, 0, 1), new Date(2015, 0, 1)] },
    { name: 'Dilma (PT)', period: [new Date(2015, 0, 1), new Date(2016, 4, 12)] },
    { name: 'Temer (PMDB)', period: [new Date(2016, 4, 13), new Date(2019, 0, 1)] },
    { name: 'Bolsonaro (PSL)', period: [new Date(2019, 0, 1), new Date(2023, 0, 1)] },
    { name: 'Lula (PT)', period: [new Date(2023, 0, 1), new Date(2026, 0, 1)] },
];

const PERIODS = { year: [], legislature: LEGISLATURES, president: PRESIDENTS };
for (var y = STARTING_YEAR; y <= ENDING_YEAR; y++) {
    PERIODS.year.push({ name: 'Year ' + y, period: [new Date(y, 0, 1), new Date(y + 1, 0, 1)] });
}

// ============================================================
// Helpers (same as generate-pca-precalc.js)
// ============================================================

function getGovernmentParty(endDate) {
    for (var i = 0; i < LEGISLATURES.length; i++) {
        var leg = LEGISLATURES[i];
        if (leg.period[0] < endDate && leg.period[1] >= endDate) return leg.regimeParty;
    }
    if (endDate <= LEGISLATURES[0].period[1]) return LEGISLATURES[0].regimeParty;
    return LEGISLATURES[LEGISLATURES.length - 1].regimeParty;
}

function setGovTo3rdQuadrant(deputyNodes, endDate) {
    var governmentParty = getGovernmentParty(endDate);
    if (!governmentParty) return;

    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (var i = 0; i < deputyNodes.length; i++) {
        var x = deputyNodes[i].scatterplot[0], y = deputyNodes[i].scatterplot[1];
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    var bisectorX = minX + (maxX - minX) / 2;
    var bisectorY = minY + (maxY - minY) / 2;

    var avgX = 0, avgY = 0, count = 0;
    for (var i = 0; i < deputyNodes.length; i++) {
        if (deputyNodes[i].party === governmentParty) {
            avgX += deputyNodes[i].scatterplot[0];
            avgY += deputyNodes[i].scatterplot[1];
            count++;
        }
    }
    if (count === 0) return;
    avgX /= count; avgY /= count;

    var scaleX = 1, scaleY = 1;
    if (avgX > bisectorX) scaleX = -1;
    if (avgY < bisectorY) scaleY = -1;

    for (var i = 0; i < deputyNodes.length; i++) {
        deputyNodes[i].scatterplot[0] *= scaleX;
        deputyNodes[i].scatterplot[1] *= scaleY;
    }
}

function computeAlignment(N, M, observedByDep, observedByRC, deputyPartyInRC) {
    var partyMaj = {};
    for (var j = 0; j < M; j++) {
        var pv = {};
        for (var e = 0; e < observedByRC[j].length; e++) {
            var ob = observedByRC[j][e];
            var party = deputyPartyInRC[ob.i + ',' + j];
            if (!party) continue;
            if (!pv[party]) pv[party] = { pos: 0, neg: 0 };
            if (ob.v === 1) pv[party].pos++; else pv[party].neg++;
        }
        var maj = {};
        var parties = Object.keys(pv);
        for (var p = 0; p < parties.length; p++) {
            maj[parties[p]] = pv[parties[p]].pos >= pv[parties[p]].neg ? 1 : -1;
        }
        partyMaj[j] = maj;
    }

    var alignments = {};
    for (var i = 0; i < N; i++) {
        var aligned = 0, total = 0;
        for (var e = 0; e < observedByDep[i].length; e++) {
            var ob = observedByDep[i][e];
            var party = deputyPartyInRC[i + ',' + ob.j];
            if (!party) continue;
            var maj = partyMaj[ob.j];
            if (maj && maj[party] !== undefined) {
                if (ob.v === maj[party]) aligned++;
                total++;
            }
        }
        alignments[i] = total > 0 ? parseFloat((aligned / total).toFixed(2)) : 0;
    }
    return alignments;
}

// ============================================================
// Data Loading (same as generate-pca-precalc.js)
// ============================================================
function loadAllData() {
    console.log('Loading data...');
    var deputies = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'deputies.json'), 'utf8'));
    console.log('  Deputies: ' + deputies.length);

    var arrayRollCalls = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'arrayRollCalls.json'), 'utf8'));
    console.log('  Roll calls: ' + arrayRollCalls.length);

    var motionGroups = {};
    arrayRollCalls.forEach(function (rc, idx) {
        var key = rc.type + rc.number + rc.year;
        if (!motionGroups[key]) motionGroups[key] = [];
        motionGroups[key].push({ idx: idx, rc: rc });
    });

    var motionsDir = path.join(DATA_DIR, 'motions.min');
    var votesByRollCall = new Array(arrayRollCalls.length).fill(null);
    var loaded = 0, failed = 0;

    var keys = Object.keys(motionGroups);
    for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        var entries = motionGroups[key];
        var filePath = path.join(motionsDir, key + '.json');
        if (!fs.existsSync(filePath)) { failed++; continue; }
        try {
            var motion = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (!motion.rollCalls) { failed++; continue; }
            for (var e = 0; e < entries.length; e++) {
                var entry = entries[e];
                for (var r = 0; r < motion.rollCalls.length; r++) {
                    var mrc = motion.rollCalls[r];
                    if (mrc.datetime === entry.rc.datetime && mrc.votes) {
                        votesByRollCall[entry.idx] = mrc.votes;
                        loaded++;
                        break;
                    }
                }
            }
        } catch (err) { failed++; }
    }

    console.log('  Loaded votes for ' + loaded + ' roll calls (' + failed + ' failed)');
    return { deputies: deputies, arrayRollCalls: arrayRollCalls, votesByRollCall: votesByRollCall };
}

// ============================================================
// MAIN
// ============================================================
function main() {
    console.log('=== W-NOMINATE Precalc Generator (JS) ===\n');

    var startTime = Date.now();
    var rawData = loadAllData();
    var deputies = rawData.deputies;
    var arrayRollCalls = rawData.arrayRollCalls;
    var votesByRollCall = rawData.votesByRollCall;
    var rcDatetimes = arrayRollCalls.map(function (rc) { return new Date(rc.datetime); });

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    var filesWritten = 0;
    var periodTypes = Object.keys(PERIODS);

    for (var pt = 0; pt < periodTypes.length; pt++) {
        var periodType = periodTypes[pt];
        var periods = PERIODS[periodType];
        console.log('\n-- ' + periodType.charAt(0).toUpperCase() + periodType.slice(1) + 's --');

        for (var pidx = 0; pidx < periods.length; pidx++) {
            var period = periods[pidx];
            var pStart = period.period[0], pEnd = period.period[1];

            // Find rollcalls in this period
            var periodRCs = [];
            for (var j = 0; j < arrayRollCalls.length; j++) {
                if (rcDatetimes[j] >= pStart && rcDatetimes[j] <= pEnd && votesByRollCall[j]) {
                    periodRCs.push(j);
                }
            }
            if (periodRCs.length < 5) {
                console.log('  ' + period.name + ': skipped (' + periodRCs.length + ' rollcalls)');
                continue;
            }

            // Collect deputies and their votes
            var deputyData = {};
            for (var ri = 0; ri < periodRCs.length; ri++) {
                var globalJ = periodRCs[ri];
                var votes = votesByRollCall[globalJ];
                for (var vi = 0; vi < votes.length; vi++) {
                    var v = votes[vi];
                    if (v.deputyID < 0 || v.deputyID >= deputies.length) continue;
                    var party = v.party;
                    if (party === 'Solidaried') party = 'SDD';
                    if (party === 'S.Part.') party = 'NoParty';

                    if (!deputyData[v.deputyID]) deputyData[v.deputyID] = { votes: [], numVotes: 0 };
                    deputyData[v.deputyID].votes.push({ localRC: ri, v: v.vote, party: party });
                    deputyData[v.deputyID].numVotes++;
                }
            }

            // Filter: top 513 deputies by vote count
            var depEntries = Object.keys(deputyData).map(function (id) {
                return { id: parseInt(id), numVotes: deputyData[id].numVotes };
            });
            depEntries.sort(function (a, b) { return b.numVotes - a.numVotes; });
            var selectedDeps = depEntries.slice(0, Math.min(MAX_DEPUTIES, depEntries.length));

            var depIDs = selectedDeps.map(function (d) { return d.id; });
            var depIdxMap = {};
            for (var i = 0; i < depIDs.length; i++) depIdxMap[depIDs[i]] = i;

            var N = depIDs.length;
            var M = periodRCs.length;

            if (N < 10) {
                console.log('  ' + period.name + ': skipped (N=' + N + ')');
                continue;
            }

            // Build W-NOMINATE vote matrix (1=yea, 6=nay, 9=missing)
            var wMatrix = [];
            var observedByDep = [], observedByRC = [];
            var deputyPartyInRC = {};
            for (var i = 0; i < N; i++) { wMatrix.push(new Array(M).fill(9)); observedByDep.push([]); }
            for (var j = 0; j < M; j++) observedByRC.push([]);

            for (var di = 0; di < depIDs.length; di++) {
                var depID = depIDs[di];
                var dv = deputyData[depID].votes;
                for (var vi = 0; vi < dv.length; vi++) {
                    var voteVal, alignmentVal;
                    if (dv[vi].v === 0) { voteVal = 1; alignmentVal = 1; }      // Sim -> yea
                    else if (dv[vi].v === 1) { voteVal = 6; alignmentVal = -1; } // Nao -> nay
                    else { voteVal = 9; alignmentVal = 0; }                       // missing

                    wMatrix[di][dv[vi].localRC] = voteVal;

                    if (alignmentVal !== 0) {
                        var entry = { i: di, j: dv[vi].localRC, v: alignmentVal };
                        observedByDep[di].push(entry);
                        observedByRC[dv[vi].localRC].push(entry);
                    }
                    deputyPartyInRC[di + ',' + dv[vi].localRC] = dv[vi].party;
                }
            }

            // Run W-NOMINATE
            console.log('  ' + period.name + ': N=' + N + ', M=' + M + ' ...');
            var wnStart = Date.now();
            var result = wNominateModule.wNominate(wMatrix, {
                maxIter: 100,
                onProgress: null
            });
            var wnElapsed = ((Date.now() - wnStart) / 1000).toFixed(1);

            if (result.legislators.length === 0) {
                console.log('    FAILED (no legislators returned)');
                continue;
            }

            console.log('    done in ' + wnElapsed + 's, correct=' + result.fits.correctClass + '%');

            // Get last party per deputy
            var deputyParties = {};
            for (var di = 0; di < depIDs.length; di++) {
                var depID = depIDs[di];
                var dv = deputyData[depID].votes;
                var lastParty = '', lastRC = -1;
                for (var vi = 0; vi < dv.length; vi++) {
                    if (dv[vi].localRC > lastRC) {
                        lastRC = dv[vi].localRC;
                        lastParty = dv[vi].party;
                    }
                }
                deputyParties[di] = lastParty;
            }

            // Compute alignment
            var alignments = computeAlignment(N, M, observedByDep, observedByRC, deputyPartyInRC);

            // Build output nodes — map from filtered indices back to original deputy IDs
            var deputyNodes = [];
            for (var fi = 0; fi < result.legislators.length; fi++) {
                // result.legIndices[fi] is the index in the wMatrix, which maps to depIDs
                var matrixIdx = result.legIndices[fi];
                var coord = result.legislators[fi];
                if (coord.coord1D === 0 && coord.coord2D === 0) continue; // dropped

                deputyNodes.push({
                    deputyID: depIDs[matrixIdx],
                    scatterplot: [coord.coord1D, coord.coord2D],
                    party: deputyParties[matrixIdx] || '',
                    alignment: alignments[matrixIdx] || 0
                });
            }

            // Apply setGovernmentTo3rdQuadrant
            setGovTo3rdQuadrant(deputyNodes, pEnd);

            // Save
            var id = periodType === 'year' ? STARTING_YEAR + pidx : pidx;
            var filename = periodType + '.' + id + '.json';
            fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify({ deputyNodes: deputyNodes }));
            filesWritten++;

            console.log('    -> ' + filename + ' (' + deputyNodes.length + ' deputies)');
        }
    }

    console.log('\nWritten ' + filesWritten + ' files to ' + OUTPUT_DIR);
    var elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('Done in ' + elapsed + 's');
}

main();
```

- [ ] **Step 2: Test with a single year**

```bash
cd /Users/rodrimoni/Documents/CivisAnalysis/CivisAnalysis2
mkdir -p data/precalc/w-nominate
node -e "
require('./javascripts/external/numeric-1.2.6.js');
var wn = require('./javascripts/w-nominate.js');
// Quick sanity: module loads OK
console.log('wNominate function:', typeof wn.wNominate);
" && echo "Module OK"
```

Then run for a single year to test (this will take a while):

```bash
node scripts/generate-w-nominate.js 2>&1 | head -30
```

Expected: Data loads, first period processes without errors, JSON files appear in `data/precalc/w-nominate/`.

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-w-nominate.js
git commit -m "feat(w-nominate): add Node.js precalculation script"
```

---

### Task 7: Browser Integration — Script Tag and Translations

**Files:**
- Modify: `index.html:164` (add script tag)
- Modify: `javascripts/dict.js` (add translations)

- [ ] **Step 1: Add w-nominate.js script tag to index.html**

In `index.html`, after line 164 (`dimensionality-reduction.js`), add:

```html
    <script src="javascripts/w-nominate.js"></script>
```

- [ ] **Step 2: Add W-NOMINATE and UMAP translations to dict.js**

In `javascripts/dict.js`, after the t-SNE translation entry (line 28-29), add:

```javascript
        "Create a Political Spectrum of Deputies - Technique: UMAP": {
            br: "Criar um Espectro Político de Deputados - Técnica: UMAP"
        },
        "Create a Political Spectrum of Deputies - Technique: W-NOMINATE": {
            br: "Criar um Espectro Político de Deputados - Técnica: W-NOMINATE"
        },
```

In the `initDict` function, after line 198 (`scatter-plot-tsne`), add:

```javascript
        $("#scatter-plot-umap").text(translator.get("Create a Political Spectrum of Deputies - Technique: UMAP"));
        $("#scatter-plot-w-nominate").text(translator.get("Create a Political Spectrum of Deputies - Technique: W-NOMINATE"));
```

- [ ] **Step 3: Commit**

```bash
git add index.html javascripts/dict.js
git commit -m "feat(w-nominate): add script tag and PT-BR translations for W-NOMINATE and UMAP"
```

---

### Task 8: Browser Integration — Dynamic W-NOMINATE Calculation

**Files:**
- Modify: `javascripts/events/event-handlers.js:135-144` (remove restriction)
- Modify: `javascripts/events/event-handlers.js:245-254` (add W-NOMINATE dynamic calc)

This task removes the "W-NOMINATE only for standard periods" restriction and adds the dynamic calculation path.

- [ ] **Step 1: Remove the W-NOMINATE restriction in setUpScatterPlotData**

In `javascripts/events/event-handlers.js`, replace the block at lines 135-144:

```javascript
        var hasPrecalc = dimensionalReductionTechnique === "PCA" || dimensionalReductionTechnique === "W-NOMINATE";
        if ((!dataRange.found && hasPrecalc) || !hasPrecalc) {
            if (dimensionalReductionTechnique === "W-NOMINATE") {
                var language = state.getLanguage();
                alert(language === ENGLISH
                    ? "W-NOMINATE is only available for standard periods (precalculated with R)."
                    : "W-NOMINATE disponível apenas para períodos padrão (pré-calculado com R).");
                $('#loading').css('visibility', 'hidden');
                return;
            }
```

With:

```javascript
        var hasPrecalc = dimensionalReductionTechnique === "PCA" || dimensionalReductionTechnique === "W-NOMINATE";
        if ((!dataRange.found && hasPrecalc) || !hasPrecalc) {
```

- [ ] **Step 2: Add W-NOMINATE dynamic calculation block**

In the same function, after the UMAP block (around line 254, after `calcUMAP(matrixDeputiesPerRollCall, calcCallback);`), add:

```javascript
                else if (dimensionalReductionTechnique === "W-NOMINATE") {
                    var text = language === ENGLISH ? "Generating Political Spectra by W-NOMINATE" : "Gerando Espectro Político por W-NOMINATE";
                    $('#loading #msg').text(text);
                    setTimeout(function () {
                        calcWNominate(matrixDeputiesPerRollCall, calcCallback);
                    }, 10);
                }
```

- [ ] **Step 3: Add calcWNominate function to dimensionality-reduction.js or event-handlers.js**

Add this function in `javascripts/dimensionality-reduction.js`, after the `calcUMAP` or `calcTSNE` function:

```javascript
/**
 * Calculate W-NOMINATE ideal points from vote matrix.
 * Converts PCA encoding (1/-1/0) to W-NOMINATE encoding (1/6/9),
 * runs the algorithm, and returns positions in the same format as calcSVD.
 *
 * @param {number[][]} matrixDepXRollCall - N x M matrix (1=yes, -1=no, 0=absent)
 * @param {Function} endCalcCallback - Callback receiving { deputies: number[][], voting: null }
 */
function calcWNominate(matrixDepXRollCall, endCalcCallback) {
    console.log("calc W-NOMINATE", matrixDepXRollCall.length, "x", matrixDepXRollCall[0].length);

    var N = matrixDepXRollCall.length;
    var M = matrixDepXRollCall[0].length;

    // Convert PCA encoding to W-NOMINATE encoding: 1->1, -1->6, 0->9
    var wMatrix = [];
    for (var i = 0; i < N; i++) {
        var row = [];
        for (var j = 0; j < M; j++) {
            if (matrixDepXRollCall[i][j] === 1) row.push(1);
            else if (matrixDepXRollCall[i][j] === -1) row.push(6);
            else row.push(9);
        }
        wMatrix.push(row);
    }

    var result = wNominateModule.wNominate(wMatrix, {
        maxIter: 100,
        onProgress: function (iter, logLik, correctClass) {
            var language = state.getLanguage();
            var text = language === ENGLISH
                ? "Generating W-NOMINATE... iteration " + iter
                : "Gerando W-NOMINATE... iteração " + iter;
            $('#loading #msg').text(text);
        }
    });

    console.log("W-NOMINATE FINISHED - correct: " + result.fits.correctClass + "%");

    // Map back: result.legIndices tells which rows in wMatrix were kept
    // We need to return positions for ALL N deputies (or the filtered subset)
    // The callback expects data_deputies[i] = [x, y] matching the original matrix rows
    var data_deputies = [];
    var legMap = {};
    for (var fi = 0; fi < result.legIndices.length; fi++) {
        legMap[result.legIndices[fi]] = fi;
    }

    for (var i = 0; i < N; i++) {
        if (legMap[i] !== undefined) {
            var leg = result.legislators[legMap[i]];
            data_deputies.push([leg.coord1D, leg.coord2D]);
        } else {
            data_deputies.push([0, 0]);
        }
    }

    endCalcCallback({ deputies: data_deputies, voting: null });
}
```

- [ ] **Step 4: Update the precalc loading to also use loadNodes fallback**

In `javascripts/data/data-loader.js`, update the `loadNodes` function (around line 52-80). The current code loads precalc JSON. We need to add a fallback for when precalc is not available. Replace the W-NOMINATE path in `loadNodes`:

The existing `loadNodes` already handles W-NOMINATE precalc loading correctly at lines 56-59. No changes needed here — when precalc exists it loads it, when it doesn't, `d3.json` returns null and the `event-handlers.js` flow handles the dynamic calculation path.

Actually, looking at the code flow more carefully: when `dataRange.found` is true and technique is W-NOMINATE, lines 289-291 call `loadNodes` directly. When `dataRange.found` is false (custom period), the code enters the dynamic calculation block which now includes W-NOMINATE. This is the correct behavior.

- [ ] **Step 5: Commit**

```bash
git add javascripts/events/event-handlers.js javascripts/dimensionality-reduction.js
git commit -m "feat(w-nominate): enable dynamic W-NOMINATE calculation in browser"
```

---

### Task 9: End-to-End Validation

**Files:**
- No new files; validation against R package output

- [ ] **Step 1: Generate precalc for a few test periods**

```bash
cd /Users/rodrimoni/Documents/CivisAnalysis/CivisAnalysis2
node scripts/generate-w-nominate.js
```

Verify files are created in `data/precalc/w-nominate/` and contain valid JSON with `deputyNodes` arrays.

- [ ] **Step 2: Spot-check output structure**

```bash
node -e "
var fs = require('fs');
var f = JSON.parse(fs.readFileSync('data/precalc/w-nominate/year.2020.json', 'utf8'));
console.log('Deputies:', f.deputyNodes.length);
console.log('Sample:', JSON.stringify(f.deputyNodes[0], null, 2));
var coords = f.deputyNodes.map(function(d) { return d.scatterplot; });
var x = coords.map(function(c) { return c[0]; });
var y = coords.map(function(c) { return c[1]; });
console.log('X range:', Math.min.apply(null, x).toFixed(3), 'to', Math.max.apply(null, x).toFixed(3));
console.log('Y range:', Math.min.apply(null, y).toFixed(3), 'to', Math.max.apply(null, y).toFixed(3));
"
```

Expected: Deputies array with ~400-513 entries, coordinates in approximately [-1, 1] range, each entry has deputyID, scatterplot, party, alignment.

- [ ] **Step 3: Compare with R output (if R is available)**

If the user has R with `wnominate` installed, run the validation:

```bash
Rscript scripts/generate-w-nominate.R
```

Then compare outputs:

```bash
node -e "
var fs = require('fs');
var jsData = JSON.parse(fs.readFileSync('data/precalc/w-nominate/year.2020.json', 'utf8'));
// Compare with R output if available
console.log('JS output: ' + jsData.deputyNodes.length + ' deputies');
console.log('Spot check first 5:');
jsData.deputyNodes.slice(0, 5).forEach(function(d) {
    console.log('  ID=' + d.deputyID + ' party=' + d.party + ' pos=[' + d.scatterplot.join(', ') + '] align=' + d.alignment);
});
"
```

- [ ] **Step 4: Test browser integration**

Open the application in a browser, select a time period from the timeline, right-click and choose "W-NOMINATE". Verify:
- Standard periods load from precalc
- The scatter plot renders correctly
- Custom (non-standard) periods calculate dynamically with progress text

- [ ] **Step 5: Commit all generated precalc data**

```bash
git add data/precalc/w-nominate/
git commit -m "data: add W-NOMINATE precalculated data for all standard periods"
```

---

### Task 10: Final Cleanup and Documentation

**Files:**
- Modify: `scripts/generate-all.js` (verify step 2 is correct)

- [ ] **Step 1: Verify generate-all.js pipeline works end-to-end**

```bash
node scripts/generate-all.js --only w-nominate
```

Expected: Runs the JS-based W-NOMINATE precalc, no errors about missing R or Rscript.

- [ ] **Step 2: Verify the complete pipeline**

```bash
node scripts/generate-all.js --skip-pca --skip-traces
```

Expected: Steps 2, 4, 5 run successfully.

- [ ] **Step 3: Add SIMPLIFICATION comments to w-nominate.js**

Review the implementation and add `// SIMPLIFICATION:` comments where the implementation deviates from the original Poole & Rosenthal paper. At minimum, document:

- The optimizer used (numeric.uncmin vs the original FORTRAN optimizer)
- Any differences in convergence criteria
- Whether weight estimation is implemented (w_d optimization) or fixed

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete W-NOMINATE JavaScript implementation

- Core algorithm in javascripts/w-nominate.js (isomorphic browser/Node.js)
- Node.js precalc script replacing R dependency
- Dynamic browser calculation for custom periods
- PT-BR translations for W-NOMINATE and UMAP
- Validated against synthetic data"
```
