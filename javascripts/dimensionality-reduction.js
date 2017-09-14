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

    if(transposeToSVD){matrixDepXRollCall = numeric.transpose(matrixDepXRollCall)};

    //Uncaught numeric.svd() Need more rows than columns  numeric.transpose()
    if(transposeToSVD){
        // 2D reduction on Deputies
        var data_deputies = svdDep.V.map(function(row) { return numeric.mul(row, eigenValues).splice(0, 2);})
        // 2D reduction on Votings
        var data_voting   = svdDep.U.map(function(row) { return numeric.mul(row, eigenValues).splice(0, 2);})
    } else {
        // 2D reduction on Deputies
        var data_deputies = svdDep.U.map(function(row) { return numeric.mul(row, eigenValues).splice(0, 2);})
        // 2D reduction on Votings
        var data_voting   = svdDep.V.map(function(row) { return numeric.mul(row, eigenValues).splice(0, 2);})
    }

    console.log("CALC SVD- FINISHED!! => PLOT")
    // ----------------------------------------------------------------------------------------------------------------
    var result = {deputies: data_deputies, voting: data_voting};
    endCalcCallback(result);
}