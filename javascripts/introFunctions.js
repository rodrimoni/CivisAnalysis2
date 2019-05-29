function startIntro(){
    var intro = introJs();
    var englishSteps = [
        {
            intro: "<span class ='trn'>Hi! <br> Welcome to CivisAnalysis 2.0! <br> Let's take a tour :)</span>"
        },
        {
            intro: "CivisAnalysis 2.0 is a web-based application where you can open multiple and coordinated panels for exploring how federal deputies and parties vote in the Chamber of Deputies' sessions." +
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
            intro: "<strong>Timeline</strong>: the main visualization of CivisAnalysis 2.0 shows an overview of the voting behavior of parties across time. Each rectangular mark represents a party distinguished " +
            "by a specific color. Its height represents its size (number of deputies). You can <strong>hover</strong> over the mark to get more information."
        },
        {
            intro: "You can select a period of time by first clicking (and dragging the mouse if you want longer periods) and then right-clicking to open a menu that will give you access to different visualizations." +
            "<img src='images/tutorial/timeline-menu.gif' width='580' height='260'>"
        }
    ];

    var portugueseSteps = [
        {
            intro: "<span class ='trn'>Olá! <br> Seja bem-vindo ao CivisAnalysis 2.0! <br> Vamos fazer um tour pela aplicação :)</span>"
        },
        {
            intro: "CivisAnalysis 2.0 é uma aplicação desenvolvida para web onde você pode criar múltiplos painéis coordenados, que permitem ver como os deputados e os partidos votam nas sessões da Câmara dos Deputados do Brasil." +
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
            intro: "<strong>Linha do tempo:</strong> a principal visualização do CivisAnalysis 2.0 mostra uma visão geral do comportamento dos partidos através de seus votos ao longo do tempo. " +
            "Cada traço representa um partido com uma cor específica e a altura do traço representa o seu tamanho (número de deputados). "+
            "Você pode deixar o mouse <strong>sobre</strong> os traços para obter mais informações."
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
            intro:'A <strong>political spectrum of deputies</strong> is generated from a time period selected by users. The application loads the deputies and the roll call data relative to this date range and applies a method to obtain a plot that represents the <strong>similarity</strong> of voting behavior between deputies.'
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
            intro: "You can select a deputy or hover it to get more information. You can hold the <strong>CTRL</strong> key to select multiple deputies or hold the <strong>SHIFT</strong> key for brushing. Also, you can select or hover a party and the corresponding deputies will be highlighted. " +
            "<img src='images/tutorial/scatter-plot-general.gif' width='1200' height='650'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-scatterplot',
            intro: "You can access an extra menu by clicking on this icon."
        },
        {
            intro: "You can type a deputy's name and select it and you can apply an algorithm (<strong>K-means</strong>) to group the deputies based on proximity: the slider defines the number of groups (K)." +
            "<img src='images/tutorial/scatter-plot-extra-menu.gif' width='1200' height='650'>"
        },
        {
            intro: "You can generate more than one <strong>spectrum of deputies</strong>, and all the views will be <strong>coordinated</strong> with each other, as you can see in the image below:" +
            "<img src='images/tutorial/scatter-plot-interaction.gif' width='1200' height='650'>"
        },
        {
            intro: "You can <strong>right click</strong> on a deputy to access more visualizations, and you can <strong>right click</strong> on a group to access other visualizations " +
            "<br><strong>Tip:</strong> You will get a better result if you select a small set of deputies to create a <strong>Time Line Crop.</strong>" +
            "<img src='images/tutorial/scatter-plot-generating-vis.gif' width='1200' height='650'>"
        }
    ];

    var portugueseSteps = 
    [
        {
            element: "#"+ panelID + " .scatter-plot",
            intro:"Um <strong>espectro político de deputados</strong> é gerado a partir de um período de tempo selecionado pelo usuário. A aplicação carrega os dados referentes aos deputados " + 
            "e às votações ocorridas nesse intervalo de tempo e aplica uma técnica para obter o gráfico de pontos que representa a <strong>similaridade</strong> do comportamento dos deputados com base em seus votos."
        },
        {
            element:  "#"+ panelID + " .scatter-plot .deputiesNodesDots",
            intro: "Cada círculo representa um deputado."
        },
        {
            element: "#"+ panelID + " .scatter-plot .legend",
            intro: "A cor de cada deputado representa um <strong>partido</strong>, a legenda nos ajuda a identificá-lo."
        },
        {
            intro: "Você pode selecionar um deputado ou deixar o mouse sobre ele para obter mais informações. Você pode segurar a tecla <strong>CTRL</strong> para " + 
            "selecionar múltiplos deputados ou segurar a tecla <strong>SHIFT</strong> para selecionar à mão livre. Você também pode selecionar ou deixar o mouse sobre "+ 
            "um partido para destacar os deputados integrantes daquele partido. " +
            "<img src='images/tutorial/scatter-plot-general.gif' width='1200' height='650'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-scatterplot',
            intro: "Você pode acessar um menu extra clicando neste ícone."
        },
        {
            intro: "Você pode digitar o nome de algum deputado e selecioná-lo. Além disso, você pode aplicar o algoritmo (<strong>K-Médias</strong>) para gerar " + 
            "alguns grupos baseados em proximidade, o <em>slider</em> define o número de grupos (K)." +
            "<img src='images/tutorial/scatter-plot-extra-menu.gif' width='1200' height='650'>"
        },
        {
            intro: "Você pode gerar mais de um <strong>espectro de deputados</strong> e todas as visualizações serão <strong>coordenadas</strong> umas com as outras. "+
            "Você poderá acompanhar melhor na figura abaixo:" +
            "<img src='images/tutorial/scatter-plot-interaction.gif' width='1200' height='650'>"
        },
        {
            intro: "Você pode clicar com o <strong>botão direito do mouse</strong> em um deputado para acessar mais visualizações, além disso " +
            "você pode clicar com o<strong> botão direito do mouse</strong> em um grupo gerado pelo K-Médias para acessar outras visualizações." +
            "<br><strong>Dica:</strong> Você terá um melhor resultado se selecionar um pequeno grupo de deputados para criar a <strong> Linha do Tempo com Deputados</strong>." +
            "<img src='images/tutorial/scatter-plot-generating-vis.gif' width='1200' height='650'>"
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
            intro: "Each <strong>circle</strong> represents a deputy and each part of the infographic represents a <strong>party</strong> and the proportion of selected deputies." +
                "You can select a deputy or hover it to get more information. You can hold the <strong>CTRL</strong> key to select multiple deputies." +
            "<img src='images/tutorial/chamber-infographic.gif' width='1200' height='650'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-chamberInfographic',
            intro: "You can access an extra menu by clicking on this icon and search deputies by typing their names."
        },
        {
            intro: "You can <strong>right click</strong> on a deputy to access more visualizations." +
            "<br><strong>Tip:</strong> You will get a better result if you select a small set of deputies to create a <strong>Time Line Crop.</strong>" +
            "<img src='images/tutorial/chamber-infographic-generating-vis.gif' width='1200' height='650'>"
        }
    ];

    var portugueseSteps = [
        {
            element: "#"+ panelID + " .chamber-infographic",
            intro: "Frequentemente utilizada para representar a distribuição de assentos em legislaturas, essa visualização mostra deputados e partidos em um semicírculo. Deputados estão posicionados de acordo com suas posições no espectro político e os partidos de acordo com a média de seus deputados, o que resulta em um agrupamento de deputados baseado em partidos."
        },
        {
            intro: "Cada círculo representa um deputado e cada parte do infográfico representa um partido e a proporção dos deputados eleitos. Você pode selecionar um deputado ou deixar o mouse sobre ele para acessar mais informações. Você pode segurar a tecla <strong>CTRL</strong> para selecionar múltiplos deputados." + 
            "<img src='images/tutorial/chamber-infographic.gif' width='1200' height='650'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-chamberInfographic',
            intro: "Você pode acessar um menu extra clicando neste ícone e buscar deputados por seus nomes."
        },
        {
            intro: "Você pode clicar com o <strong>botão direito do mouse</strong> em um deputado para acessar mais visualizações. " +
            "<br><strong>Dica:</strong> Você terá um melhor resultado se selecionar um pequeno grupo de deputados para criar a <strong> Linha do Tempo com Deputados</strong>." +
            "<img src='images/tutorial/chamber-infographic-generating-vis.gif' width='1200' height='650'>"
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
            intro: "The set of points (known as a graph) that represents how similar the deputies are depending on their votes. " +
            "Points are connected by lines only when they have a certain degree of similarity."
        },
        {
            element: "#"+ panelID + " .slider-horizontal",
            intro: "You can select the <strong>degree of similarity</strong> using this slider."
        },
        {
            element:  "#"+ panelID + " .similarity-force .node",
            intro: "Each circle represents a deputy and the color represents the respective party."
        },
        {
            intro: "You can select a deputy or hover it to get more information. You can hold the <strong>CTRL</strong> key to select multiple deputies." +
            "<img src='images/tutorial/deputies-similarity-force.gif' width='1200' height='650'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-similarity-force',
            intro: "You can access an extra menu by clicking on this icon and search deputies by typing their names."
        },
        {
            intro: "You can <strong>right click</strong> on a deputy to access more visualizations" +
            "<br><strong>Tip:</strong> You will get a better result if you select a small set of deputies to create a <strong>Time Line Crop.</strong>" +
            "<img src='images/tutorial/deputies-similarity-force-generating-vis.gif' width='1200' height='650'>"
        }
    ];

    var portugueseSteps = [
        {
            element: ".similarity-force",
            intro: " Um conjunto de pontos (conhecido como grafo) que representa a similaridade dos deputados em função de seus votos. "+
             "Os pontos são conectados apenas quando os deputados têm um certo grau de similaridade. "
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
            intro: "Você pode selecionar um deputado ou deixar o mouse sobre ele para obter mais informações. Você pode segurar a tecla <strong>CTRL</strong> " +
            "para selecionar múltiplos deputados" +
            "<img src='images/tutorial/deputies-similarity-force.gif' width='1200' height='650'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-similarity-force',
            intro: "Você pode acessar um menu extra clicando neste ícone e buscar deputados por seus nomes."
        },
        {
            intro: "Você pode clicar com o <strong>botão direito do mouse</strong> em um deputado para acessar mais visualizações. " +
            "<br><strong>Dica:</strong> Você terá um melhor resultado se selecionar um pequeno grupo de deputados para criar a <strong> Linha do Tempo com Deputados</strong>." +
            "<img src='images/tutorial/deputies-similarity-force-generating-vis.gif' width='1200' height='650'>"
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
            "generated from <strong>Spectrum of Deputies, Chamber Infographic and Deputies Similarity Graph.</strong>"
        },
        {
            element:  "#"+ panelID + " .rollcalls-heatmap",
            intro: "The <strong>X-axis</strong> represents the number of roll calls and the <strong>Y-axis</strong> the months."
        },
        {
            intro: "Roll calls are selected by clicking, and hovering on them displays a tooltip containing more info and a pie chart of the proportion of <strong>YES</strong> and <strong>NO</strong> votes" +
            "<img src='images/tutorial/roll-calls-heatmap-general.gif' width='1200' height='650'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-rollCallsHeatmap',
            intro: "You can access an extra menu by clicking on this icon and search roll calls by name or filtering by type and date."
        },
        {
            intro: "The Roll Calls Map is <strong>directly connected </strong> to its parent visualization. " +
            "The default cell colors represent the <strong> voting ratio</strong> of chosen deputies in the parent visualization. " +
             "Colors change dynamically according to the <strong>selected</strong>deputies, and when only one deputy is selected, " +
            "the roll calls cells are colored according to the Vote-To-Color map." + "<br><br>" +
            " <strong>Vote-to-Color map:</strong> <em> 'Yes', 'No', 'Obstruction', 'Abstention', 'Chamber President', 'absence'</em> are respectively mapped to <em>blue, red, green, purple, yellow, gray.</em>" +
            "<img src='images/tutorial/roll-calls-heatmap-interaction.gif' width='1200' height='650'>"
        }
    ];

    var portugueseSteps = [
        {
            element: "#"+ panelID + " .rollcalls-heatmap",
            intro: "Aqui você pode inspecionar as <strong>votações</strong> e ter uma noção de quantas" +
            " propostas foram votadas durante um certo período de tempo. Os dados são mostrados como um <strong>histograma horizontal</strong>:uma pilha " +
            "de <strong>células</strong> retangulares (cada uma representando uma <strong>votação</strong>). Essa visualização pode ser " +
            "gerada a partir do <strong>Espectro de Deputados, Infográfico da Câmara e Grafo de Similaridade dos Deputados.</strong>"
        },
        {
            element:  "#"+ panelID + " .rollcalls-heatmap",
            intro: "O <strong>eixo X</strong> representa o número de votações e o <strong>eixo Y</strong> os meses."
        },
        {
            intro: "As votações são selecionadas pelo clique do mouse e ao deixar o mouse sobre elas é mostrada uma <em>tooltip</em> que contém "+ 
            "mais informações e um gráfico de pizza que mostra a proporção dos votos <strong>SIM</strong> e <strong>NÃO</strong>" +
            "<img src='images/tutorial/roll-calls-heatmap-general.gif' width='1200' height='650'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-rollCallsHeatmap',
            intro: "Você pode acessar um menu extra clicando neste ícone e poderá buscar as votações por seu código identificador ou filtrar por tipo e data."
        },
        {
            intro: "O Mapa das Votações é <strong>diretamente conectado</strong> com sua visualização pai. " +
            "As cores padrões das células representam a <strong>razão dos votos</strong> dos deputados que foram selecionados na visualização pai. " +
             "As cores mudam dinamicamente de acordo com a <strong>seleção</strong> de deputados. Quando apenas um deputado é selecionado, " +
            "as células são coloridas de acordo com o mapeamento <em>Voto-para-Cor</em>." + "<br><br>" +
            " <strong>Mapeamento Voto-para-Cor:</strong> <em> 'Sim', 'Não', 'Obstrução', 'Abstenção', 'Presidente da Câmara', 'Ausência de dados'</em> são "+ 
            "respectivamente mapeados para <em>azul, vermelho, verde, roxo, amarelo, cinza.</em>" +
            "<img src='images/tutorial/roll-calls-heatmap-interaction.gif' width='1200' height='650'>"
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
            intro: "This visualization presents a <strong>timeframe</strong> from the main timeline. " +
            "It displays the parties in the spectrum and divided into one-year intervals. This visualization's " +
            "<strong>new feature</strong> is the possibility of adding " +
            "deputies to the timeline. The deputies' behavior are " +
            "represented by <strong>simple lines</strong> instead of area elements."
        },
        {
            intro: "You can hover over the lines to obtain more information about the deputies and parties. Besides that, " +
                "you can dynamically add deputies from the parent view on this new timeline." +
                "<img src='images/tutorial/crop-timeline.gif' width='1200' height='650'>"
        }
    ];

    var portugueseSteps =  [
        {
            element: "#"+ panelID + " .timeline-crop",
            intro: "Esta visualização apresenta uma <strong>parte específica</strong> da linha do tempo principal. " +
            "Ela mostra os partidos no espectro e é dividida em intervalos de um ano. A "  +
            "<strong>novidade</strong> desta visualização é a possibilidade de adicionar " +
            "deputados diretamente na linha do tempo. O comportamento dos deputados são " +
            "representados por <strong>simples linhas</strong> ao invés de elementos de área."
        },
        {
            intro: "Você pode deixar o mouse sobre as linhas para obter mais informações sobre os deputados e partidos. Além disso, " +
                "você pode dinamicamente adicionar deputados a partir da visualização pai diretamente nessa nova linha do tempo." +
                "<img src='images/tutorial/crop-timeline.gif' width='1200' height='650'>"
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
                intro: "To filter deputies by state, select a set of states and click on <strong>Apply Filter.</strong> <br> <strong>Note:</strong> this filter will be applied to the current selection of deputies."
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
                "<strong>Nota:</strong> este filtro será aplicado sobre a seleção atual de deputados."
            },
            {
                element:'#resetBtn',
                intro: "Você pode <strong>desfazer</strong> todas suas seleções clicando aqui."
            }
        ];
                
        var localizedSteps =  language === PORTUGUESE ? portugueseSteps : englishSteps;

        intro.addSteps(localizedSteps)
    }
}