# W-NOMINATE em JavaScript — Design Spec

**Data:** 2026-04-02
**Status:** Aprovado
**Objetivo:** Implementar o algoritmo W-NOMINATE em JavaScript puro, eliminando a dependência do R, com suporte a pré-cálculo (Node.js) e cálculo dinâmico no browser para períodos customizados.

---

## 1. Contexto

O CivisAnalysis2 é uma plataforma de visualização de dados legislativos brasileiros (1991-presente) que usa D3.js. Atualmente suporta 5 técnicas de redução dimensional para o scatter plot político: PCA, MDS, t-SNE, UMAP e W-NOMINATE.

PCA, MDS, t-SNE e UMAP rodam no browser. W-NOMINATE depende de pré-cálculo via R (`scripts/generate-w-nominate.R` + pacote `wnominate`), limitando-o a períodos fixos e criando dependência externa.

Existe também código legado de uma tentativa anterior de DW-NOMINATE em JS que deve ser removido.

## 2. Objetivos

1. **Eliminar dependência do R** — todo o pipeline roda com Node.js
2. **Pré-cálculo via Node.js** — gerar JSONs para períodos padrão (anos, legislaturas, presidentes) com mesmo esquema que PCA
3. **Cálculo dinâmico no browser** — quando o usuário seleciona um intervalo customizado no timeline, calcular W-NOMINATE ao vivo (1-15s aceitável)
4. **Fidelidade ao algoritmo original** — implementação fiel a Poole & Rosenthal (1997), validada contra o pacote R `wnominate`. Simplificações são permitidas se necessárias, desde que documentadas

## 3. Algoritmo W-NOMINATE — Core

### 3.1 Modelo Espacial

Cada legislador `i` tem um ideal point `x_i` em 2 dimensões. Cada votação `j` tem dois outcome points: `z_yea_j` e `z_nay_j`.

A probabilidade de voto yea é:

```
P(yea_ij) = exp(-beta * sum_d(w_d^2 * (x_id - z_yea_jd)^2))
           / [exp(-beta * sum_d(w_d^2 * (x_id - z_yea_jd)^2))
            + exp(-beta * sum_d(w_d^2 * (x_id - z_nay_jd)^2))]
```

Onde:
- `beta` = parâmetro signal-to-noise (default: 15)
- `w_d` = peso da dimensão `d`

### 3.2 Estimação (Alternating Maximum Likelihood)

1. **Inicialização**: SVD da matriz de votos como seed para ideal points (reaproveitando `computePCA` existente via `numeric.js`)
2. **Passo legisladores**: fixa parâmetros das votações, otimiza `x_i` para cada legislador via `numeric.uncmin`
3. **Passo votações**: fixa ideal points, otimiza `z_yea_j` e `z_nay_j` para cada votação via `numeric.uncmin`
4. **Convergência**: repete passos 2-3 até `deltaLogLikelihood < tol` ou `maxIter` atingido
5. **Pós-processamento**: normalização para [-1, 1], seleção de polaridade, `setGovernmentTo3rdQuadrant`

### 3.3 Parâmetros Default (alinhados com pacote R)

| Parâmetro | Valor | Descrição |
|-----------|-------|-----------|
| `dims` | 2 | Dimensões do espaço |
| `beta` | 15 | Signal-to-noise ratio |
| `maxIter` | 100 | Máximo de iterações |
| `tol` | 0.001 | Threshold de convergência (delta log-likelihood) |
| `w` | [0.5, 0.5] | Pesos iniciais das dimensões |
| `minVotes` | 20 | Mínimo de votos para incluir legislador |
| `lop` | 0.025 | Minority vote cutoff (exclui votações com <2.5% de um lado) |

### 3.4 Seleção de Polaridade

- **Automática por período**: os 2 deputados com mais votos no período (mesmo método do R script atual)
- A normalização pós-cálculo (`setGovernmentTo3rdQuadrant`) corrige eventuais flips de orientação entre períodos

### 3.5 Tamanho Típico das Matrizes

~513 deputados x 1000-3000 votações por período. Viável no browser com tempo estimado de 5-15s.

## 4. Arquitetura

### 4.1 Módulo Core

**Arquivo:** `javascripts/w-nominate.js`

Módulo isomórfico (browser + Node.js) usando o padrão de detecção `typeof module !== 'undefined'` (mesmo que `numeric.js`).

**API pública:**

```javascript
function wNominate(voteMatrix, options)
// voteMatrix: array 2D (N x M) — 1=yea, 6=nay, 9=missing
// options: { dims, beta, maxIter, tol, minVotes, lop, polarity, onProgress }
// onProgress: callback(iteration, logLikelihood) — para feedback visual
//
// Retorna: {
//   legislators: [{ coord1D, coord2D }],
//   fits: { logLikelihood, correctClass },
//   weights: [w1, w2]
// }
```

**Estrutura interna:**

```
wNominate(voteMatrix, options)
  prepareData(voteMatrix, lop, minVotes)       — filtra votações e legisladores
  initializeFromSVD(preparedData)               — seed via SVD (numeric.js)
  estimateLegislators(fixedVotes, params)        — otimiza x_i via numeric.uncmin
  estimateVoteParams(fixedLegislators, params)   — otimiza z_j via numeric.uncmin
  computeLogLikelihood(legislators, votes, params)
  normalizeCoordinates(legislators)              — normaliza para [-1, 1]
  applyPolarity(legislators, polarityIndices)    — orienta eixos
```

**Dependências:**
- `numeric.js` (já no projeto) para SVD e `uncmin`
- Se `numeric.uncmin` for insuficiente para convergência, permitir adição de `ml-matrix` como dependência leve

### 4.2 Script de Pré-cálculo

**Arquivo:** `scripts/generate-w-nominate.js` (substitui `generate-w-nominate.R`)

Segue o padrão de `generate-pca-precalc.js`:
- Mesma infraestrutura de data loading
- Itera sobre períodos (anos, legislaturas, presidentes)
- Chama `wNominate()` do módulo compartilhado
- Aplica `setGovernmentTo3rdQuadrant` + `computeAlignment`
- Output: `data/precalc/w-nominate/{type}.{id}.json` com schema `{ deputyNodes: [...] }`

Encoding da matriz: `1=yea, 6=nay, 9=missing` (formato W-NOMINATE, diferente do `1/-1/0` do PCA).

### 4.3 Integração no generate-all.js

Atualizar step 2 do pipeline para usar `node scripts/generate-w-nominate.js` em vez de `Rscript scripts/generate-w-nominate.R`. Manter flags `--skip-w-nominate` e `--only w-nominate`.

## 5. Integração Browser

### 5.1 Cálculo Dinâmico

No `data-loader.js`, atualizar `loadNodes`:
- Se período padrão e precalc existe: carrega JSON normalmente
- Se período customizado ou precalc não existe: calcula W-NOMINATE síncrono no main thread

```javascript
function loadNodes(type, selectedTime, callback, technique) {
    if (technique === 'W-NOMINATE') {
        d3.json('data/precalc/w-nominate/' + type + '.' + selectedTime + '.json', function(precalc) {
            if (precalc) {
                processPrecalcNodes(precalc, callback);
            } else {
                calculateWNominate(type, selectedTime, callback);
            }
        });
    }
    // ... PCA e demais como antes
}
```

`calculateWNominate`:
1. Coleta votos do período usando motions já carregadas em memória
2. Monta a matriz de votos
3. Chama `wNominate(matrix, options)` síncrono
4. Aplica `setGovernmentTo3rdQuadrant` + popula `currentDeputies`

### 5.2 Execução Síncrona

O cálculo roda síncrono no main thread, com spinner/texto de progresso. Mesmo padrão das outras técnicas dinâmicas (MDS, t-SNE, UMAP). Migração para Web Worker fica como melhoria futura se necessário.

### 5.3 Frontend — Menu e Técnicas

- Menu item `scatter-plot-w-nominate` já existe no `index.html` — manter
- No `event-handlers.js`: remover a restrição "apenas períodos padrão" do W-NOMINATE — passa a funcionar tanto com precalc quanto com cálculo dinâmico (novo bloco `else if (dimensionalReductionTechnique === "W-NOMINATE")` no fluxo dinâmico)
- Adicionar tradução PT-BR no `dict.js` para W-NOMINATE (e UMAP, que também falta)
- Texto de progresso bilíngue: "Calculando W-NOMINATE..." / "Generating W-NOMINATE..."

## 6. Validação

### 6.1 Ground Truth

O pacote R `wnominate` (Poole, Lewis, Rosenthal) é a fonte de verdade. O `generate-w-nominate.R` existente pode servir como script de validação pois usa o pacote diretamente.

### 6.2 Métricas de Comparação

Para um conjunto de 3-5 períodos representativos, comparar output JS vs output do pacote R:

| Métrica | Threshold |
|---------|-----------|
| Correlação de Pearson (dim1 e dim2) | > 0.95 |
| Correct classification rate | diferença < 2% |
| Correlação de rank (Kendall tau) | > 0.90 |

### 6.3 Documentação de Simplificações

Cada desvio do algoritmo original marcado no código:

```javascript
// SIMPLIFICATION: [descrição]
// Original (Poole & Rosenthal 1997): [o que o paper faz]
// Adaptação: [o que fizemos e por quê]
// Impacto: [como afeta o resultado]
```

### 6.4 Referências

- Poole, K.T. & Rosenthal, H. (1997). *Congress: A Political-Economic History of Roll Call Voting*
- Poole, K.T. (2005). *Spatial Models of Parliamentary Voting*
- Pacote R `wnominate` — código-fonte como referência de implementação

## 7. Limpeza Prévia

Antes de iniciar a implementação, remover todo código legado relacionado a tentativas anteriores de NOMINATE/DW-NOMINATE:

- Remover `scripts/generate-w-nominate.R`
- Limpar `data/precalc/w-nominate/` (será regenerado)
- Remover `data/precalc/dw-nominate/` se existir
- Remover referências ao DW-NOMINATE em event-handlers, data-loader, e outros arquivos
- Remover memória `project_dw_nominate.md`

## 8. Entregáveis

1. Limpeza de referências anteriores ao NOMINATE/DW-NOMINATE
2. `javascripts/w-nominate.js` — algoritmo core isomórfico (browser + Node.js)
3. `scripts/generate-w-nominate.js` — pré-cálculo Node.js (substitui o R)
4. Integração no `data-loader.js` — precalc + cálculo dinâmico
5. Integração no `event-handlers.js` — W-NOMINATE como técnica dinâmica (sem restrição de período)
6. Tradução no `dict.js` para W-NOMINATE e UMAP
7. Integração no `generate-all.js` (Node.js em vez de R)
8. Feedback visual (spinner de progresso)
9. Validação contra pacote R `wnominate`
10. Simplificações documentadas com `// SIMPLIFICATION:`

## 9. Fora de Escopo

- Mudanças no PCA existente
- Novos tipos de visualização
- Novas definições de períodos
- Web Worker (melhoria futura)
