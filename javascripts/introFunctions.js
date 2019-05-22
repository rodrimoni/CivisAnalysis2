function startIntro(){
    var intro = introJs();
    var englishSteps = [
        {
            intro: "<span class ='trn'>Hi! <br> Welcome to CivisAnalysis 2.0! <br> Let's take a tour :)</span>"
        },
        {
            intro: "CivisAnalysis 2.0 is a web-based application where you can open multiple and coordinated panels for exploring data concerning the votes of representatives in Brazil's lower legislative house (the Chamber of Deputies)." +
            "<img src='images/tutorial/civis2.gif' width='700' height='360'>"
        },
        {
            element: "#panel-1-1",
            intro: "Each panel shows a <strong>different visualization</strong> and you can <strong>interact</strong> with it in several ways. <br> You can minimize, dismiss, drag and resize a panel. <br> To restore a minimized window, you just need to <strong>double click</strong> on it."
        },
        {
            intro: "<strong>Panel behavior:</strong> <img src='images/tutorial/panel-behavior.gif' width='700' height='360'>"
        },
        {
            element: ".timeline",
            intro: "<strong>Timeline</strong>: the main visualization of CivisAnalysis 2.0, showing an overview of the voting behavior of parties across the spectrum." + 
            "Each tick represents a party with repsective color and its height represents its size (number of deputies). You can <strong>hover</strong> over the ticks to get more information.",
        },
        {
            intro: 'You can select a period of time by first clicking or brushing and then <strong>right-clicking</strong> to open a menu that will give you access to the visualizations.'
            +
            "<img src='images/tutorial/timeline-menu.gif' width='580' height='260'>"
        }
    ];

    var portugueseSteps = [
        {
            intro: "<span class ='trn'>Olá! <br> Seja bem-vindo ao CivisAnalysis 2.0! <br> Vamos fazer um tour pela aplicação :)</span>"
        },
        {
            intro: "CivisAnalysis 2.0 é uma aplicação desenvolvida para web onde você pode abrir múltiplos painéis coordenados, que permitem " +
            "a exploração dos dados relativos aos votos dos deputados na Câmara dos Deputados do Brasil." +
            "<img src='images/tutorial/civis2.gif' width='700' height='360'>"
        },
        {
            element: "#panel-1-1",
            intro: "Cada painel mostra uma <strong>visualização diferente</strong> e você pode <strong>interagir</strong> de diversas formas com cada uma. <br>" +
            "Você pode minimizar, fechar, arrastar e redimensionar cada painel. <br> Para restaurar uma janela minimizada, você apenas precisa dar um <strong>clique duplo</strong> com o botão esquerdo do mouse sobre ela."
        },
        {
            intro: "<strong>Comportamento de um painel:</strong> <img src='images/tutorial/panel-behavior.gif' width='700' height='360'>"
        },
        {
            element: ".timeline",
            intro: "<strong>Linha do tempo</strong>: a principal visualização do CivisAnalysis 2.0, ela mostra uma visão geral do comportamento dos partidos através de seus votos ao longo do espectro." + 
            "Cada traço representa um partido com sua respectiva cor e sua altura representa o seu tamanho (número de deputados). Você pode deixar o mouse <strong>sobre</strong> os traços para obter mais informações.",
        },
        {
            intro: 'Você pode selecionar um período de tempo clicando ou usando os demarcadores de início e fim para depois com o <strong>clique do botão direito do mouse</strong> abrir um menu que te dará acesso às outras visualizações. '
            +
            "<img src='images/tutorial/timeline-menu.gif' width='580' height='260'>"
        }
    ];

    var localizedSteps = language === PORTUGUESE ? portugueseSteps : englishSteps;

    intro.setOptions({
        steps: localizedSteps,
        showProgress: true,
        disableInteraction: true
        //width: 600
    });

    intro.start();
}

function startIntroScatterplot(panelID){
    var intro = introJs();
    $(".panel").not("#" + panelID).css('z-index', '0');
    
    var englishSteps = [
        {
            element: "#"+ panelID + " .scatter-plot",
            intro:'A <strong>political spectrum of deputies</strong> is generated from a time period selected by users. The application loads the <strong>deputies</strong> and the <strong>roll call </strong> ' +
            'data relative to this date range and applies a <strong>dimensionality reduction (DR)</strong> method to obtain the scatterplot that represents the <strong>similarity</strong> of <strong>voting behavior</strong>' +
            ' between deputies.'
        },
        {
            element:  "#"+ panelID + " .scatter-plot .deputiesNodesDots",
            intro: "Each circle represents a deputy."
        },
        {
            element: "#"+ panelID + " .scatter-plot .legend",
            intro: "The color of each deputy represents a <strong>party</strong>, the legend help us to identify them."
        },
        {
            intro: "You can select a deputy or hover it to get more information. You can hold the <strong>CTRL</strong> key to select multiple deputies or hold the <strong>SHIFT</strong> key for brush. Also, you can select or hover a party and the corresponding deputies will be highlighted. " +
            "<img src='images/tutorial/scatter-plot-general.gif' width='1000' height='560'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-scatterplot',
            intro: "You can access an extra menu by clicking on this icon."
        },
        {
            intro: "You can type a deputy's name and select it and you can apply the algorithm <strong>K-means</strong> to generate some clusters based on proximity, the slider defines the number of clusters (K)." +
            "<img src='images/tutorial/scatter-plot-extra-menu.gif' width='1000' height='550'>"
        },
        {
            intro: "You can generate more than one <strong>Spectrum of deputies</strong> and all the views will be <strong>coordinated</strong> with each other, as you can see in the image below:" +
            "<img src='images/tutorial/scatter-plot-interaction.gif' width='1200' height='550'>"
        },
        {
            intro: "You can <strong>right click</strong> on a deputy to access more visualizations, besides that " +
            "you can <strong> right click</strong> on a cluster generated by K-means to access others visualizations." +
            "<br><strong>Tip:</strong> You will get a better result if you select a small set of deputies to create a <strong>Time Line Crop.</strong>" +
            "<img src='images/tutorial/scatter-plot-generating-vis.gif' width='1200' height='550'>"
        }
    ];

    var portugueseSteps = 
    [
        {
            element: "#"+ panelID + " .scatter-plot",
            intro:"Um <strong>espectro político de deputados</strong> é gerado a partir de um período de tempo selecionado pelos usuários. A aplicação carrega " +
            "os dados referentes aos <strong>deputados</strong> e as <strong>votações</strong> pertencentes a esse intervalo de tempo e aplica uma técnica " + 
            "de <strong>redução de dimensionalidade (RD)</strong> para obter o gráfico de dispersão que representa a <strong>similaridade</strong> do <strong>comportamento</strong> " +
            "dos deputados através de seus votos."
        },
        {
            element:  "#"+ panelID + " .scatter-plot .deputiesNodesDots",
            intro: "Cada círculo representa um deputado."
        },
        {
            element: "#"+ panelID + " .scatter-plot .legend",
            intro: "A cor de cada deputado representa um <strong>partido</strong>, a legenda nos ajuda a identicá-lo."
        },
        {
            intro: "Você pode selecionar um deputado ou deixar o mouse sobre ele para obter mais informações. Você pode segurar a tecla <strong>CTRL</strong> para " + 
            "selecionar múltiplos deputados ou segurar a tecla <strong>SHIFT</strong> para selecionar à mão livre. Você também pode selecionar ou deixar o mouse sobre "+ 
            "um partido para destacar os deputados integrantes daquele partido. " +
            "<img src='images/tutorial/scatter-plot-general.gif' width='1000' height='560'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-scatterplot',
            intro: "Você pode acessar um menu extra clicando neste ícone"
        },
        {
            intro: "Você pode digitar o nome de algum deputado e selecioná-lo. Além disso, você pode aplicar o algoritmo <strong>K-Médias</strong> para gerar " + 
            "alguns grupos baseados em proximidade, o <em>slider</em> define o número de clusters (K)." +
            "<img src='images/tutorial/scatter-plot-extra-menu.gif' width='1000' height='550'>"
        },
        {
            intro: "Você pode gerar mais de um <strong>Espectro de deputados</strong> e todas as visualizações serão <strong>coordenadas</strong> umas com as outras. "+
            "Você poderá acompanhar melhor na figura abaixo:" +
            "<img src='images/tutorial/scatter-plot-interaction.gif' width='1200' height='550'>"
        },
        {
            intro: "Você pode clicar com o <strong>botão direito do mouse</strong> em um deputado para acessar mais visualizações, além disso " +
            "você pode clicar com o<strong> botão direito do mouse</strong> em um grupo gerado pelo K-Médias para acessar outras visualizações." +
            "<br><strong>Dica:</strong> Você terá um melhor resultado se selecionar um pequeno grupo de deputados para criar a <strong> Linha do Tempo Detalhada</strong>." +
            "<img src='images/tutorial/scatter-plot-generating-vis.gif' width='1200' height='550'>"
        }
    ]

    var localizedSteps = language === PORTUGUESE ? portugueseSteps : englishSteps;

    intro.setOptions({
        steps: localizedSteps,
        showProgress: true,
        disableInteraction: true
    });

    commonSteps(intro);
    intro.start();
}

function startIntroChamberInfographic(panelID)
{
    var intro = introJs();
    $(".panel").not("#" + panelID).css('z-index', '0');
    
    var englishSteps = [
        {
            element: "#"+ panelID + " .chamber-infographic",
            intro: "Often used to depict the distribution of <strong>seats</strong> in legislatures, this visualization shows <strong>deputies</strong> and <strong>parties</strong> in a semi-circle. " +
            "Deputies are positioned according to their <strong>positions</strong> in the political spectrum and parties according to the average of their deputies, which " +
            "results in a party-based clustering of the representatives."
        },
        {
            intro: "Each <strong>circle</strong> represents a deputy and each part of donut chart represents a <strong>party</strong> and the proportion of selected deputies." +
                "You can select a deputy or hover it to get more information. You can hold the <strong>CTRL</strong> key to select multiple deputies." +
            "<img src='images/tutorial/chamber-infographic.gif' width='1100' height='550'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-chamberInfographic',
            intro: "You can access an extra menu by clicking on this icon and search deputies by typing their names."
        },
        {
            intro: "You can <strong>right click</strong> on a deputy to access more visualizations." +
            "<br><strong>Tip:</strong> You will get a better result if you select a small set of deputies to create a <strong>Time Line Crop.</strong>" +
            "<img src='images/tutorial/chamber-infographic-generating-vis.gif' width='1100' height='550'>"
        }
    ];

    var portugueseSteps = [
        {
            element: "#"+ panelID + " .chamber-infographic",
            intro: "Frequentemente utilizada para representar a distribuição de <strong>assentos</strong> em legislaturas, essa visualização mostra <strong>deputados</strong> e <strong>partidos</strong> em um semicírculo. " +
            "Deputados estão posicionados de acordo com suas <strong>posições</strong> no espectro político e os partidos de acordo com a média de seus deputados, que resulta " +
            "em um agrupamento de representantes baseado em partidos."
        },
        {
            intro: "Cada <strong>círculo</strong> representa um deputado e cada parte do gráfico de <em>donut</em> representa um <strong>partido</strong> e a proporção dos deputados selecionados." +
                "Você pode selecionar um deputado ou deixar o mouse sobre ele para acessar mais informações. Você pode segurar a tecla <strong>CTRL</strong> para selecionar múltiplos deputados." +
            "<img src='images/tutorial/chamber-infographic.gif' width='1100' height='550'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-chamberInfographic',
            intro: "Você pode acessar um menu extra clicando neste ícone e buscar deputados por seus nomes."
        },
        {
            intro: "Você pode clicar com o <strong>botão direito do mouse</strong> em um deputado para acessar mais visualizações. " +
            "<br><strong>Dica:</strong> Você terá um melhor resultado se selecionar um pequeno grupo de deputados para criar a <strong> Linha do Tempo Detalhada</strong>." +
            "<img src='images/tutorial/chamber-infographic-generating-vis.gif' width='1100' height='550'>"
        }
    ];

    var localizedSteps = language === PORTUGUESE ? portugueseSteps : englishSteps;
    
    intro.setOptions({
        steps: localizedSteps,
        showProgress: true,
        disableInteraction: true
    });

    commonSteps(intro);
    intro.start();
}

function startIntroDeputiesSimilarity(panelID)
{
    var intro = introJs();
    $(".panel").not("#" + panelID).css('z-index', '0');
    
    var englishSteps = [
        {
            element: ".similarity-force",
            intro: "A disconnected graph that represents the similarity of deputies' votes using a force layout. Nodes are connected only when they reach a certain grade of similarity."
        },
        {
            element: "#"+ panelID + " .slider-horizontal",
            intro: "You can select the <strong>grade of similarity</strong> using this slider."
        },
        {
            element:  "#"+ panelID + " .similarity-force .node",
            intro: "Each circle represents a deputy and the color represents the respective party."
        },
        {
            intro: "You can select a deputy or hover it to get more information. You can hold the <strong>CTRL</strong> key to select multiple deputies" +
            "<img src='images/tutorial/deputies-similarity-force.gif' width='1000' height='500'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-similarity-force',
            intro: "You can access an extra menu by clicking on this icon and search deputies by typing their names."
        },
        {
            intro: "You can <strong>right click</strong> on a deputy to access more visualizations" +
            "<br><strong>Tip:</strong> You will get a better result if you select a small set of deputies to create a <strong>Time Line Crop.</strong>" +
            "<img src='images/tutorial/deputies-similarity-force-generating-vis.gif' width='1100' height='550'>"
        }
    ];

    var portugueseSteps = [
        {
            element: ".similarity-force",
            intro: "Um grafo desconectado que representa a similaridade dos votos dos deputados usando um <em>layout</em> de força. Os nodos são conectados apenas "+
             "quando atingem um certo grau de similaridade entre eles."
        },
        {
            element: "#"+ panelID + " .slider-horizontal",
            intro: "Você pode selecionar o <strong>grau de similaridade</strong> usando esse <em>slider</em>."
        },
        {
            element:  "#"+ panelID + " .similarity-force .node",
            intro: "Cada círculo representa um deputado e a cor representa seu respectivo partido."
        },
        {
            intro: "Você pode selecionar um deputado ou deixar o mouse sobre ele para obter mais informações. Você pode segurar a tecla <strong>CTRL</strong>" +
            "para selecionar múltiplos deputados" +
            "<img src='images/tutorial/deputies-similarity-force.gif' width='1000' height='500'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-similarity-force',
            intro: "Você pode acessar um menu extra clicando neste ícone e buscar deputados por seus nomes."
        },
        {
            intro: "Você pode clicar com o <strong>botão direito do mouse</strong> em um deputado para acessar mais visualizações. " +
            "<br><strong>Dica:</strong> Você terá um melhor resultado se selecionar um pequeno grupo de deputados para criar a <strong> Linha do Tempo Detalhada</strong>." +
            "<img src='images/tutorial/deputies-similarity-force-generating-vis.gif' width='1100' height='550'>"
        }
    ]

    var localizedSteps =  language === PORTUGUESE ? portugueseSteps : englishSteps;

    intro.setOptions({
        steps: localizedSteps,
        showProgress: true,
        disableInteraction: true
    });

    commonSteps(intro);
    intro.start();
}

function startIntroRollCallsHeatMap(panelID)
{
    var intro = introJs();
    $(".panel").not("#" + panelID).css('z-index', '0');
    
    var englishSteps = [
        {
            element: "#"+ panelID + " .rollcalls-heatmap",
            intro: "Here you can inspect the <strong>roll calls</strong> and get an idea of how many" +
            " motions were voted during a given time period. The data are shown as a <strong>horizontal histogram</strong>:a stack " +
            "of rectangular <strong>cells</strong> (each representing a <strong>roll call</strong>). This view can be " +
            "generated from <strong>Spectrum of Deputies, Chamber Infographic and Deputies Similarity Force Chart.</strong>"
        },
        {
            element:  "#"+ panelID + " .rollcalls-heatmap",
            intro: "The <strong>X-axis</strong> represents the number of roll calls and the <strong>Y-axis</strong> the months."
        },
        {
            intro: "Roll calls are selected by clicking and hovering displays a tooltip containing more info and a pie chart of the proportion of <strong>YES</strong> and <strong>NO</strong> votes" +
            "<img src='images/tutorial/roll-calls-heatmap-general.gif' width='1000' height='560'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-rollCallsHeatmap',
            intro: "You can access an extra menu by clicking on this icon and search roll calls by name or filtering by type and date."
        },
        {
            intro: "The Roll Calls Heatmap Histogram is <strong>directly connected </strong> to its parent visualization. " +
            "The default cell colors represent the <strong> voting ratio</strong> of selected deputies in the parent visualization, " +
             "Colors change dynamically according to the <strong>selected deputies</strong>, and when only one deputy is selected, " +
            "the roll calls cells are colored according to the Vote-To-Color map." + "<br><br>" +
            " <strong>Vote-to-Color map:</strong> <em> 'Yes', 'No', 'Obstruction', 'Abstention', 'Chamber President', 'absence'</em> are respectively mapped to <em>blue, red, green, purple, yellow, gray.</em>" +
            "<img src='images/tutorial/roll-calls-heatmap-interaction.gif' width='1100' height='550'>"
        }
    ];

    var portugueseSteps = [
        {
            element: "#"+ panelID + " .rollcalls-heatmap",
            intro: "Aqui você pode inspecionar as <strong>votações</strong> e ter uma noção de quantos" +
            " projetos foram votados durante um período de tempo. Os dados são mostrados como um <strong>histograma horizontal</strong>:uma pilha " +
            "de <strong>células</strong> retangulares (cada uma representando uma <strong>votação</strong>). Essa visualização pode ser " +
            "gerada a partir do <strong>Espectro de Deputados, Infográfico da Câmara e Grafo de similaridade dos deputados.</strong>"
        },
        {
            element:  "#"+ panelID + " .rollcalls-heatmap",
            intro: "O <strong>eixo X</strong> representa o número de votações e o <strong>eixo Y</strong> os meses."
        },
        {
            intro: "As votações são selecionadadas pelo clique do mouse e ao deixar o mouse sobre elas é mostrada uma <em>tooltip</em> que contém "+ 
            "mais informações e um gráfico de pizza que mostra a proporção dos votos <strong>SIM</strong> e <strong>NÃO</strong>" +
            "<img src='images/tutorial/roll-calls-heatmap-general.gif' width='1000' height='560'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-rollCallsHeatmap',
            intro: "Você pode acessar um menu extra clicando neste ícone e poderá buscar as votações por seu código identificador ou filtrar por tipo e data."
        },
        {
            intro: "O mapa de calor das votações é <strong>diretamente conectado</strong> com sua visualização pai. " +
            "As cores padrões das células representam a <strong>razão dos votos</strong> dos deputados que foram selecionados na visualização pai. " +
             "As cores mudam dinamicamente de acordo com a <strong>seleção de deputados</strong>. Quando apenas um deputado é selecionado, " +
            "as células são coloridas de acordo com o mapeamento <em>Voto-para-Cor</em>." + "<br><br>" +
            " <strong>Mapeamento Voto-para-Cor:</strong> <em> 'Sim', 'Não', 'Obstrução', 'Abstenção', 'Presidente da Câmara', 'Ausência de dados'</em> são "+ 
            "respectivamente mapeados para <em>azul, vermelho, verde, roxo, amarelo, cinza.</em>" +
            "<img src='images/tutorial/roll-calls-heatmap-interaction.gif' width='1100' height='550'>"
        }
    ];

    var localizedSteps =  language === PORTUGUESE ? portugueseSteps : englishSteps;

    intro.setOptions({
        steps: localizedSteps,
        showProgress: true,
        disableInteraction: true
    });
    intro.start();
}

function startIntroTimelineCrop(panelID)
{
    var intro = introJs();
    $(".panel").not("#" + panelID).css('z-index', '0');
    
    var englishSteps =  [
        {
            element: "#"+ panelID + " .timeline-crop",
            intro: "This visualization presents a <strong>timeframe snapshot</strong> of the main timeline." +
            "It displays the parties in the spectrum and divided into one-year intervals. This visualization's " +
            "<strong>new feature</strong> is the possibility of adding " +
            "deputies to the timeline. The deputies' behavior (<strong>their paths on the timeline</strong>) are " +
            "represented by <strong>simple lines</strong> instead of area elements."
        },
        {
            intro: "You can hover over the lines to obtain more information about the deputies and parties, besides that " +
                "you can dynamically add deputies from parent view on this cropped timeline." +
                "<img src='images/tutorial/crop-timeline.gif' width='1100' height='550'>"
        }
    ];

    var portugueseSteps =  [
        {
            element: "#"+ panelID + " .timeline-crop",
            intro: "Esta visualização apresenta um <strong>pedaço específico</strong> da linha do tempo principal." +
            "Ela mostra os partidos no espectro e é dividida em intervalos de um ano. O "  +
            "<strong>novo aspecto</strong> desta visualição é a possibilidade de adicionar " +
            "deputados diretamente na linha do tempo. O comportamento dos deputados (<strong>os caminhos na linha do tempo</strong>) são " +
            "representados por <strong>simples linhas</strong> ao invés de elementos de área."
        },
        {
            intro: "Você pode deixar o mouse sobre as linhas para obter mais informações sobre os deputados e partidos, além disso " +
                "você pode dinamicamente adicionar deputados a partir da visualização pai diretamente nessa linha do tempo detalhada." +
                "<img src='images/tutorial/crop-timeline.gif' width='1100' height='550'>"
        }
    ];

    var localizedSteps = language === PORTUGUESE ? portugueseSteps : englishSteps;

    intro.setOptions({
        steps:localizedSteps,
        showProgress: true,
        disableInteraction: true
    });
    intro.start();
}

function commonSteps(intro)
{
    if (firstScatterPlot && firstTimelineCrop && firstChamberInfographic && firstDeputiesSimilarity)
    {
        var englishSteps = [
            {
                element:'.bootstrap-select ',
                intro: "To filter deputies by state, select a set of states and click on <strong>Apply Filter.</strong> <br> <strong>Note:</strong>This filter will be applied on the current selection of deputies."
            },
            {
                element:'#resetBtn',
                intro: "You can <strong>reset</strong> all your selections by clicking here."
            }
        ];

        var portugueseSteps = [
            {
                element:'.bootstrap-select ',
                intro: "Para filtrar deputados por estado, basta selecionar um conjunto de estados e clicar em <strong>Aplicar filtro.</strong> <br>" +
                "<strong>Nota:</strong>Este filtro será aplicado sobre a seleção atual de deputados."
            },
            {
                element:'#resetBtn',
                intro: "Você pode <strong>resetar</strong> todas suas seleções clicando aqui."
            }
        ];
                
        var localizedSteps =  language === PORTUGUESE ? portugueseSteps : englishSteps;

        intro.addSteps(localizedSteps)
    }
}