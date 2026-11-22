/**
 * Vote Distance
 *
 * Dissimilaridade entre deputados usada pelo MDS e pelo grafo de similaridade.
 * Fonte única da regra: usada pelo navegador (data-processor.js) e pelo
 * gerador de precalc do MDS, para que um mesmo período dê a mesma projeção
 * venha ele do precalc ou de um cálculo na hora.
 *
 * A regra, para cada par de deputados (m, n):
 *   A[m,n] = % das votações do período em que os dois têm o mesmo valor na
 *            matriz deputado x votação (1 Sim, -1 Não, 0 demais/ausente)
 *   D[m,m] = 0
 *   D[m,n] = 100 - A[m,n]
 *
 * Correção: a versão anterior atribuía D = 0 quando o par não tinha nenhum
 * valor igual, ou seja, tratava como idênticos dois deputados que nunca
 * coincidiram. Sem coincidência a distância é a máxima, 100.
 */

/**
 * @param {number[][]} matrixDeputiesPerRollCall - N x M (deputados x votações)
 * @returns {number[][]} matriz N x N de distâncias em [0, 100]
 */
function calcVoteDistanceMatrix(matrixDeputiesPerRollCall) {
    var numberOfDeputies = matrixDeputiesPerRollCall.length;
    if (numberOfDeputies === 0) return [];
    var numberOfRollCalls = matrixDeputiesPerRollCall[0].length;

    var matches = [];
    for (var i = 0; i < numberOfDeputies; i++) {
        matches.push(new Array(numberOfDeputies).fill(0));
    }

    for (var d = 0; d < numberOfDeputies; d++) {
        var rowD = matrixDeputiesPerRollCall[d];
        for (var other = d + 1; other < numberOfDeputies; other++) {
            var rowO = matrixDeputiesPerRollCall[other];
            var count = 0;
            for (var r = 0; r < numberOfRollCalls; r++) {
                if (rowD[r] === rowO[r]) count++;
            }
            matches[d][other] = count;
            matches[other][d] = count;
        }
    }

    var distances = [];
    for (var i = 0; i < numberOfDeputies; i++) {
        var row = new Array(numberOfDeputies);
        for (var j = 0; j < numberOfDeputies; j++) {
            row[j] = (i === j || numberOfRollCalls === 0)
                ? 0
                : 100 - (matches[i][j] * 100) / numberOfRollCalls;
        }
        distances.push(row);
    }
    return distances;
}

// Node-only export for the precalc generators and verification scripts
// (ignored in the browser).
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calcVoteDistanceMatrix: calcVoteDistanceMatrix };
}
