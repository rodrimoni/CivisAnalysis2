function calcSVD(matrixDepXRollCall,endCalcCallback){
    // -----------------------------------------------------------------------------------------------------------------
    // CALC the Singular Value Decomposition (SVD) ---------------------------------------------------------------------
    console.log("calc SVD",matrixDepXRollCall)

    //!! Uncaught numeric.svd() Need more rows than columns
    //  if(rows < columns)->
    var transposeToSVD = (matrixDepXRollCall.length < matrixDepXRollCall[0].length);

    if(transposeToSVD){
        //TRANSPOSE the table to fit the rowsXcolumns numeric.svd() requirement !!
        matrixDepXRollCall = numeric.transpose(matrixDepXRollCall)
    }

    console.log(matrixDepXRollCall);

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