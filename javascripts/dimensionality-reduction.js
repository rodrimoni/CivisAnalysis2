/*  The parameter 'matrixDepXRollCall' is a matrix N x M where N is the number of deputies and M is the number of roll calls, each cell represents one vote.
    Vote values are defined as follows: 1 for Yes, -1 for No, and 0 when the deputy was absent, obstructed, or there is no data.
    To obtain PCA-based spectrum, the SVD method is applied to matrix R (recorded votes), producing the following matrices:
    The matrix U is a 513 x N real unitary matrix, V is an N x N real unitary matrix, and S is a rectangular diagonal 
    matrix of singular values. To calculate the bidimensional deputies spectrum we multiply the two largest singular values found in S by the 
    left-singular vectors of U. 
*/
function calcSVD(matrixDepXRollCall,endCalcCallback){
    // -----------------------------------------------------------------------------------------------------------------
    // CALC the Singular Value Decomposition (SVD) ---------------------------------------------------------------------
    console.log("calc SVD",matrixDepXRollCall);

    //!! Uncaught numeric.svd() Need more rows than columns
    //  if(rows < columns)->
    var transposeToSVD = (matrixDepXRollCall.length < matrixDepXRollCall[0].length);

    if(transposeToSVD){
        //TRANSPOSE the table to fit the rowsXcolumns numeric.svd() requirement !!
        matrixDepXRollCall = numeric.transpose(matrixDepXRollCall)
    }

    var svdDep = numeric.svd(matrixDepXRollCall);
    var eigenValues = numeric.sqrt(svdDep.S);

    if(transposeToSVD){matrixDepXRollCall = numeric.transpose(matrixDepXRollCall)}

    //Uncaught numeric.svd() Need more rows than columns  numeric.transpose()
    if(transposeToSVD){
        // 2D reduction on Deputies
        var data_deputies = svdDep.V.map(function(row) { return numeric.mul(row, eigenValues).splice(0, 2);});
        // 2D reduction on Votings
        var data_voting   = svdDep.U.map(function(row) { return numeric.mul(row, eigenValues).splice(0, 2);})
    } else {
        // 2D reduction on Deputies
        var data_deputies = svdDep.U.map(function(row) { return numeric.mul(row, eigenValues).splice(0, 2);});
        // 2D reduction on Votings
        var data_voting   = svdDep.V.map(function(row) { return numeric.mul(row, eigenValues).splice(0, 2);})
    }

    console.log("CALC SVD- FINISHED!! => PLOT");
    // ----------------------------------------------------------------------------------------------------------------
    var result = {deputies: data_deputies, voting: data_voting};
    endCalcCallback(result);
}

/*  The parameter 'matrixDepXRollCall' is a matrix N x M where N is the number of deputies and M is the number of roll calls, each cell represents one vote.
    Vote values are defined as follows: 1 for Yes, -1 for No, and 0 when the deputy was absent, obstructed, or there is no data.
*/

function calcTSNE(matrixDepXRollCall,endCalcCallback){
    // -----------------------------------------------------------------------------------------------------------------
    //console.log(tsneOpt)
    console.log('START TSNE');
    var opt = {epsilon: 10, perplexity: 30, dim: 2, iterationSec :10};

    var T = new tsnejs.tSNE(opt); // create a tSNE instance
    T.initDataRaw(matrixDepXRollCall);

    var opt1 = {epsilon: 10, perplexity: 30, dim: 2, iterationSec :10};
    var X = new tsnejs.tSNE(opt1); // create a tSNE instance
    var matrixRollCallXDep = numeric.transpose(matrixDepXRollCall);
    X.initDataRaw(matrixRollCallXDep);

    var intervalT = setInterval(stepT, 5);
    function stepT() {
        var cost = T.step(); // do a few steps
        //console.log("iteration Y " + T.iter + ", cost: " + cost);
    }
    var intervalX = setInterval(stepX, 5);
    function stepX() {
        var cost = X.step(); // do a few steps
        //console.log("iteration X " + X.iter + ", cost: " + cost);
    }

    var result = {deputies: [], voting: []};

    setTimeout(function(){
        clearInterval(intervalT);
        result.deputies = T.getSolution();
    },opt.iterationSec*1000);

    setTimeout(function(){
        clearInterval(intervalX);
        result.voting = X.getSolution();
    },opt.iterationSec*1000);

    setTimeout(function () {
        endCalcCallback(result);
    },opt.iterationSec*1000+300);

    console.log("CALC TSNE- FINISHED!! => PLOT")
    // ----------------------------------------------------------------------------------------------------------------
    // return {deputies: data_deputies, voting: data_voting};
}

/*  MDS requires a dissimilarity matrix as input, so we have to apply a function to calculate the distance between representatives. 
    The result is a dissimilarity matrix D(N x N) where N = 513 deputies and the D[m,n] value represents the dissimilarity between the mth and the nth deputies.  
    We first count the number of matching votes between each pair of deputies, i.e., if the deputies' votes for a determined roll call are equal, we increase the number of matching votes for the pair. 
    Matching votes are saved in a matrix N x N, then we calculate the correspondent percentage of each match according to the total number of votes in the given period, which yields a matrix A (N x N), 
    where A[m,n] element is the percentage of matching votes between the mth and nth deputies. Finally, the "distance" between any two deputies is calculated according to:
    D[m,n] = 0,  if m = n,
    D[m,n] = 100 - A[m,n], otherwise.

    Classical MDS uses the fact that the coordinate matrix X can be derived by eigenvalue decomposition from B=XX'. And the matrix B can be computed from proximity matrix D by using double centering.
    Set up the squared proximity matrix  D^(2) = d[i,j]^2   
    Apply double centering: B=-1/2 using the centering matrix C= I - 1/N * Jn, where n is the number of objects, I is the n x n identity matrix, and Jn is an n x n matrix of all ones.
    Determine the m largest eigenvalues and corresponding eigenvectors  B (where m is the number of dimensions desired for the output, in our case m = 2).
    Now, X = Em*Am^2 , where Em is the matrix of m eigenvectors and Am is the diagonal matrix of m eigenvalues of B. 
    Source: (Wickelmaier, Florian. "An introduction to MDS." Sound Quality Research Unit, Aalborg University, Denmark (2003): 46)
*/
function calcMDS(matrixDistancesDepXDep,endCalcCallback){
    // -----------------------------------------------------------------------------------------------------------------
    // CALC the multidimensional dimensional scaling  (MDS) ------------------------------------------------------------
    console.log("calc MDS",matrixDistancesDepXDep);

    var dimensions = 2;

    // square distances
    var M = numeric.mul(-0.5, numeric.pow(matrixDistancesDepXDep, 2));

    // double centre the rows/columns
    function mean(A) { return numeric.div(numeric.add.apply(null, A), A.length); }
    var rowMeans = mean(M),
        colMeans = mean(numeric.transpose(M)),
        totalMean = mean(rowMeans);

    for (var i = 0; i < M.length; ++i) {
        for (var j =0; j < M[0].length; ++j) {
            M[i][j] += totalMean - rowMeans[i] - colMeans[j];
        }
    }

    // take the SVD of the double centred matrix, and return the
    // points from it
    var ret = numeric.svd(M),
        eigenValues = numeric.sqrt(ret.S);
    var data_deputies = ret.U.map(function(row) {
        return numeric.mul(row, eigenValues).splice(0, dimensions);
    });

    console.log(data_deputies);
    console.log(numeric.transpose(data_deputies));

    console.log("CALC MDS- FINISHED!! => PLOT");
    // ----------------------------------------------------------------------------------------------------------------
    var result = {deputies: data_deputies};
    endCalcCallback(result);
}