/**
 * Vote Agreement
 *
 * Quanto dois grupos de deputados votaram a mesma coisa, medido sobre um
 * conjunto de votações.
 *
 * Diferente do Rice Index, que é a coesão interna de UM grupo, esta é uma medida
 * entre DOIS — por isso não mora em core/rice-index.js.
 *
 * A medida é a fração das duplas possíveis, formadas por um deputado de cada
 * grupo, em que os dois votaram igual. Contagem exata, não amostragem: as duplas
 * que concordam são as que votaram Sim junto mais as que votaram Não junto, e
 * essas se contam multiplicando, sem enumerar.
 *
 *     concordantes = Sim_A · Sim_B + Não_A · Não_B
 *     possíveis    = (Sim_A + Não_A) · (Sim_B + Não_B)
 *
 * Somando os dois numeradores e os dois denominadores ao longo das votações, o
 * resultado do conjunto fica ponderado pelo número de duplas — a votação com
 * mais deputados presentes pesa mais, e a frase "de todas as duplas possíveis,
 * X% votaram igual" continua exata para o conjunto, não só para cada votação.
 *
 * Só Sim e Não entram. Obstrução, abstenção e ausência ficam fora, como no resto
 * dos gráficos de coesão.
 */

/**
 * @param {Array} rcs - votações, cada uma com .votes [{deputyID, party, vote}]
 * @param {{parties: Array<string>, deputyIDs: Array<number>}} groupA
 * @param {{parties: Array<string>, deputyIDs: Array<number>}} groupB
 * @returns {{agreement: number|null, rollCallCount: number, totalPairs: number}}
 *          agreement é null quando não houve nenhuma dupla possível — nenhum dos
 *          dois grupos votou, ou nunca votaram na mesma votação. Zero significa
 *          oposição frontal e não pode ser usado para ausência.
 */
function calcGroupAgreementForRcs(rcs, groupA, groupB) {
    var partiesA = (groupA && groupA.parties) || [];
    var deputiesA = (groupA && groupA.deputyIDs) || [];
    var partiesB = (groupB && groupB.parties) || [];
    var deputiesB = (groupB && groupB.deputyIDs) || [];

    var agreeingPairs = 0;
    var totalPairs = 0;
    var rollCallCount = 0;

    if (!rcs || !rcs.length) return { agreement: null, rollCallCount: 0, totalPairs: 0 };

    rcs.forEach(function (rc) {
        if (!rc || !rc.votes) return;

        var yesA = 0, noA = 0, yesB = 0, noB = 0;

        rc.votes.forEach(function (v) {
            if (v.vote !== 'Sim' && v.vote !== 'Não') return;

            // Grupos que se sobrepõem contam o deputado dos dois lados, e ele
            // acaba pareado consigo mesmo. Isso é coerente — ele pertence aos
            // dois — e é a diferença em relação à união, que deduplicava.
            if (partiesA.indexOf(v.party) > -1 || deputiesA.indexOf(v.deputyID) > -1) {
                if (v.vote === 'Sim') yesA++; else noA++;
            }
            if (partiesB.indexOf(v.party) > -1 || deputiesB.indexOf(v.deputyID) > -1) {
                if (v.vote === 'Sim') yesB++; else noB++;
            }
        });

        var totalA = yesA + noA;
        var totalB = yesB + noB;
        if (totalA === 0 || totalB === 0) return;   // um dos dois não votou: sem duplas

        agreeingPairs += yesA * yesB + noA * noB;
        totalPairs += totalA * totalB;
        rollCallCount++;
    });

    return {
        agreement: totalPairs > 0 ? agreeingPairs / totalPairs : null,
        rollCallCount: rollCallCount,
        totalPairs: totalPairs
    };
}

// Node-only export for standalone verification scripts (ignored in the browser).
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calcGroupAgreementForRcs: calcGroupAgreementForRcs };
}
