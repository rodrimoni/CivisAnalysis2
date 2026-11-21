/**
 * Party Alignment
 *
 * Quanto um deputado votou com a maioria do próprio partido, medido sobre um
 * conjunto de votações. Fonte única da regra: usada pelo navegador
 * (data-processor.js) e pelos geradores de precalc (PCA e W-NOMINATE), para
 * que um mesmo deputado tenha o mesmo alinhamento venha ele do precalc ou de
 * um intervalo calculado na hora.
 *
 * A regra, por votação:
 *   1. Só Sim e Não entram. Obstrução, abstenção, Art. 17 e ausência ficam
 *      fora — do lado do partido e do lado do deputado.
 *   2. A maioria do partido é Sim ou Não, contada entre os membros que votaram
 *      Sim/Não naquela votação, pelo partido em que estavam NA DATA da votação.
 *      Empate dentro do partido: a votação não entra para aquele partido.
 *   3. O deputado conta como alinhado se votou igual a essa maioria.
 *
 *     alinhamento = votações em que seguiu a maioria / votações que entraram
 *
 * Por que obstrução fica fora em vez de contar como Não: o Regimento Interno
 * da Câmara (art. 82, §6º) trata a obstrução legítima como ausência anunciada
 * pela liderança, e quem obstrui é excluído do quórum. É o critério de Assis &
 * Silva (2026, BPSR) e o mesmo de core/vote-agreement.js. Tratar obstrução
 * como desalinhamento — a regra antiga do precalc de PCA — fazia a oposição
 * que obstrui em bloco aparecer desalinhada do próprio partido (PT em 2018:
 * 34% na regra antiga, 96% nesta).
 */

/**
 * @param {number} numberOfDeputies - linhas do resultado
 * @param {Array<Array<{row: number, party: string, vote: string}>>} votesByRollCall
 *        votos registrados em cada votação; row é o índice do deputado no
 *        resultado, party o partido na data da votação, vote o texto do voto
 *        ('Sim', 'Não', 'Obstrução', ...)
 * @returns {Array<number|null>} alinhamento de 0 a 1 com duas casas, ou null
 *          para quem não teve nenhuma votação contável — ausência de dado não
 *          pode virar 0, que significaria votar sempre contra o partido.
 */
function calcPartyAlignment(numberOfDeputies, votesByRollCall) {
    var aligned = new Array(numberOfDeputies).fill(0);
    var counted = new Array(numberOfDeputies).fill(0);

    (votesByRollCall || []).forEach(function (votes) {
        if (!votes || !votes.length) return;

        var yesByParty = {}, noByParty = {};
        votes.forEach(function (v) {
            if (!v.party) return;
            if (v.vote === 'Sim') yesByParty[v.party] = (yesByParty[v.party] || 0) + 1;
            else if (v.vote === 'Não') noByParty[v.party] = (noByParty[v.party] || 0) + 1;
        });

        votes.forEach(function (v) {
            if (!v.party || (v.vote !== 'Sim' && v.vote !== 'Não')) return;
            if (v.row === null || v.row === undefined || v.row < 0 || v.row >= numberOfDeputies) return;

            var yes = yesByParty[v.party] || 0, no = noByParty[v.party] || 0;
            if (yes === no) return;

            var majority = yes > no ? 'Sim' : 'Não';
            counted[v.row]++;
            if (v.vote === majority) aligned[v.row]++;
        });
    });

    return counted.map(function (total, i) {
        return total > 0 ? parseFloat((aligned[i] / total).toFixed(2)) : null;
    });
}

// Node-only export for the precalc generators and verification scripts
// (ignored in the browser).
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calcPartyAlignment: calcPartyAlignment };
}
