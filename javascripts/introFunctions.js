function startIntro(){
    var intro = introJs();
    var englishSteps = [
        {
            intro: "<span class ='trn'>Hi! <br> Welcome to CivisAnalysis 2.0! <br> Let's take a tour :)</span>"
        },
        {
            intro: "CivisAnalysis 2.0 is a web-based application where you can open multiple and coordinated panels for exploring how federal deputies and parties vote in the Brazilian Chamber of Deputies' sessions." +
            "<img src='images/tutorial/civis2.gif' width='700' height='360'>"
        },
        {
            element: "#panel-1-1",
            intro: "Each panel shows a <strong>different visualization</strong>. Panels can be minimized, closed, moved, or resized. To restore a minimized panel, just <strong>double click</strong> on its item with the left mouse button. "
        },
        {
            intro: "<strong>Panel behavior:</strong> <img src='images/tutorial/panel-behavior.gif' width='700' height='360'>"
        },
        {
            element: ".timeline",
            intro: "<strong>Timeline</strong>: the main visualization of CivisAnalysis 2.0 shows an overview of the voting behavior of parties over time. Each colored rectangular mark represents a party. "+
            "Its height represents its size (number of deputies). You can <strong>hover</strong> over the mark to get more information."
        },
        {
            intro: "Select a period of time by clicking on it. You can then adjust your selection by clicking and dragging on the handles. Right-clicking on a selection will launch a menu that will give you access to different visualizations." +
            "<img src='images/tutorial/timeline-menu.gif' width='580' height='260'>"
        }
    ];

    var portugueseSteps = [
        {
            intro: "<span class ='trn'>Olá! <br> Seja bem-vindo ao CivisAnalysis 2.0! <br> Vamos fazer um tour pela aplicação :)</span>"
        },
        {
            intro: "CivisAnalysis 2.0 é uma aplicação web que permite que você explore como os deputados e partidos votam na Câmara dos Deputados brasileira através de múltiplos painéis coordenados." +
            "<img src='images/tutorial/civis2.gif' width='700' height='360'>"
        },
        {
            element: "#panel-1-1",
            intro: "Cada painel mostra uma <strong>visualização diferente</strong>. Painéis podem ser minimizados, fechados, arrastados e redimensionados. Para restaurar um painel minimizado, "+
            "basta dar um <strong>duplo clique</strong> com o botão esquerdo do mouse sobre seu ícone."
        },
        {
            intro: "<strong>Comportamento de um painel:</strong> <img src='images/tutorial/panel-behavior.gif' width='700' height='360'>"
        },
        {
            element: ".timeline",
            intro: "<strong>Linha do tempo:</strong> a principal visualização do CivisAnalysis 2.0 mostra uma visão geral do comportamento dos partidos através de seus votos ao longo do tempo. " +
            "Cada traço representa um partido com uma cor específica e a altura do traço representa o seu tamanho (número de deputados). "+
            "Você pode posicionar o mouse <strong>sobre</strong> os traços para obter mais informações."
        },
        {
            intro: "Você pode selecionar um período de tempo clicando nele e ajustando a seleção com os demarcadores de início e fim. Clique com o botão direito do mouse sobre a seleção para abrir um menu que dará acesso às outras visualizações. "
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
            intro:'A <strong>political spectrum of deputies</strong> is generated from your chosen time period. CivisAnalysis 2.0 loads the deputies and the roll call data and generates a chart that depicts the <strong>similarity</strong> of deputy voting behavior.'
        },
        {
            element:  "#"+ panelID + " .scatter-plot .deputiesNodesDots",
            intro: "Each circle represents a deputy."
        },
        {
            element: "#"+ panelID + " .scatter-plot .legend",
            intro: "The color of each deputy indicates his or her <strong>party</strong>. The legend shows the colors used to represent each party."
        },
        {
            intro: "Select a deputy or hoverto get more information. Hold <strong>CTRL</strong> to select multiple deputies or <strong>SHIFT</strong> for brushing. Select or hover over a party to highlight its deputies." +
            "<img src='images/tutorial/scatter-plot-general.gif' width='1200' height='650'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-scatterplot',
            intro: "Click on this icon to access another menu."
        },
        {
            intro: "Find deputies by typing in their names. You can then select them by clicking on their names. You can also group deputies based on proximity, using the slider to set the number of groups." +
            "<img src='images/tutorial/scatter-plot-extra-menu.gif' width='1200' height='650'>"
        },
        {
            intro: "You can generate more than one <strong>spectrum of deputies</strong>, and all the views will be <strong>coordinated</strong>, as you can see in the image below:" +
            "<img src='images/tutorial/scatter-plot-interaction.gif' width='1200' height='650'>"
        },
        {
            intro: "<strong>Right click</strong> on a deputy or group to access more visualizations. " +
            "<br><strong>Tip:</strong> You will get a better result if you select a small set of deputies to create a <strong>Time Line Crop.</strong>" +
            "<img src='images/tutorial/scatter-plot-generating-vis.gif' width='1200' height='650'>"
        }
    ];

    var portugueseSteps = 
    [
        {
            element: "#"+ panelID + " .scatter-plot",
            intro:"Um <strong>espectro político de deputados</strong> é gerado a partir de um período de tempo selecionado. CivisAnalysis 2.0 carrega os dados referentes aos deputados " + 
            "e às votações ocorridas nesse intervalo de tempo e gera o gráfico de pontos que representa a <strong>similaridade</strong> do comportamento dos deputados com base em seus votos."
        },
        {
            element:  "#"+ panelID + " .scatter-plot .deputiesNodesDots",
            intro: "Cada círculo representa um deputado."
        },
        {
            element: "#"+ panelID + " .scatter-plot .legend",
            intro: "A cor de cada deputado indica seu <strong>partido</strong>. A legenda mostra a cor usada para representar cada partido."
        },
        {
            intro: "Você pode selecionar um deputado ou posicionar o mouse sobre ele para obter mais informações. " +
            "Você pode segurar a tecla <strong>CTRL</strong> para selecionar múltiplos deputados ou a tecla <strong>SHIFT</strong> para selecionar à mão livre. " +
            "Você também pode selecionar um partido ou posicionar o mouse sobre ele para destacar os deputados que o integram" +
            "<img src='images/tutorial/scatter-plot-general.gif' width='1200' height='650'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-scatterplot',
            intro: "Clique nesse ícone para acessar um outro menu."
        },
        {
            intro: "Digite o nome de algum deputado para encontrá-lo. Clique nos nomes dos deputados e selecioná-lo. " +
            "Além disso, você pode gerar grupos baseados em proximidade,  usando o slider para definir o número de grupos." +
            "<img src='images/tutorial/scatter-plot-extra-menu.gif' width='1200' height='650'>"
        },
        {
            intro: "Você pode gerar mais de um <strong>espectro de deputados</strong> e todas as visualizações serão <strong>coordenadas</strong>, como mostra a figura abaixo: " +
            "<img src='images/tutorial/scatter-plot-interaction.gif' width='1200' height='650'>"
        },
        {
            intro: "Clique com o <strong>botão direito</strong> do mouse em um deputado ou grupo para acessar mais visualizações. " +
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
            intro: "This visualization shows how seats are distributed among deputies and parties. "
        },
        {
            intro: "Click to select a deputy or hover for more information. Hold the <strong>CTRL</strong> key while clicking to select multiple deputies. " +
            "<img src='images/tutorial/chamber-infographic.gif' width='1200' height='650'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-chamberInfographic',
            intro: "Click on this icon to access another menu that will let you search deputies by typing in their names. "
        },
        {
            intro: "<strong>Right-click</strong> on a deputy to access more visualizations. " +
            "<br><strong>Tip:</strong> You will get a better result if you select a small set of deputies to create a <strong>Time Line Crop.</strong>" +
            "<img src='images/tutorial/chamber-infographic-generating-vis.gif' width='1200' height='650'>"
        }
    ];

    var portugueseSteps = [
        {
            element: "#"+ panelID + " .chamber-infographic",
            intro: "Essa visualização mostra a distribuição de assentos entre deputados e partidos. "
        },
        {
            intro: "Clique em um deputado para selecioná-lo ou posicione o mouse sobre ele para acessar mais informações. Segure a tecla <strong>CTRL</strong> ao clicar para selecionar múltiplos deputados. " +
            "<img src='images/tutorial/chamber-infographic.gif' width='1200' height='650'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-chamberInfographic',
            intro: "Clique neste ícone para acessar outro menu que permite a busca deputados por nome."
        },
        {
            intro: "Clique com o <strong>botão direito</strong> do mouse em um deputado para acessar mais visualizações. " +
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
            intro: "In this visualization, deputies are connected by lines based on the similarity of their votes. "
        },
        {
            element: "#"+ panelID + " .slider-horizontal",
            intro: "You can select the <strong>degree of similarity</strong> required to connect deputies using this slider."
        },
        {
            element:  "#"+ panelID + " .similarity-force .node",
            intro: "Each circle represents a deputy and each color represents a party."
        },
        {
            intro: "Click to select a deputy or hover to get more information. Hold the <strong>CTRL</strong> key while clicking to select multiple deputies." +
            "<img src='images/tutorial/deputies-similarity-force.gif' width='1200' height='650'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-similarity-force',
            intro: "Click on this icon to access another meny that will let you search for deputies by name."
        },
        {
            intro: "<strong>Right-click</strong> on a deputy to access more visualizations." +
            "<br><strong>Tip:</strong> You will get a better result if you select a small set of deputies to create a <strong>Time Line Crop.</strong>" +
            "<img src='images/tutorial/deputies-similarity-force-generating-vis.gif' width='1200' height='650'>"
        }
    ];

    var portugueseSteps = [
        {
            element: ".similarity-force",
            intro: "Nesta visualização, deputados são conectados por linhas de acordo com a similaridade de seus votos."
        },
        {
            element: "#"+ panelID + " .slider-horizontal",
            intro: "Selecione o <strong>grau de similaridade</strong> necessário para conectar deputados usando esse slider."
        },
        {
            element:  "#"+ panelID + " .similarity-force .node",
            intro: "Cada círculo representa um deputado e a cor representa seu respectivo partido."
        },
        {
            intro: "Clique em um deputado para selecioná-lo ou posicione o mouse sobre ele para obter mais informações. Segure a tecla <strong>CTRL</strong> ao clicar para selecionar múltiplos deputados." +
            "<img src='images/tutorial/deputies-similarity-force.gif' width='1200' height='650'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-similarity-force',
            intro: "Clique neste ícone para acessar um outro menu que permite buscar deputados por nome."
        },
        {
            intro: "Clique com o <strong>botão direito</strong> do mouse em um deputado para acessar mais visualizações. " +
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
            " motions were voted during a given time period. This view can be " +
            "generated from <strong>Spectrum of Deputies, Chamber Infographic and Deputies Similarity Graph.</strong>"
        },
        {
            element:  "#"+ panelID + " .rollcalls-heatmap",
            intro: "Each <strong>cell</strong> represents a roll call. The <strong>X-axis</strong> represents the number of roll calls and the <strong>Y-axis</strong>, the months."
        },
        {
            intro: "Roll calls are selected by clicking and hovering over them displays a tooltip containing more information and a pie chart of the proportion of <strong>YES</strong> and <strong>NO</strong> votes." +
            "<img src='images/tutorial/roll-calls-heatmap-general.gif' width='1200' height='650'>"
        },
        {
            element: "#"+ panelID + ' .btn-settings-rollCallsHeatmap',
            intro: "Click on this icon to access another menu that will let you search roll calls by name or filter them by type or date."
        },
        {
            intro: "By default, the cell colors show the voting ratio of the deputies chosen in the parent visualization. Choosing different deputies in that visualization will change how cells are colored. " +
            "When only one deputy is selected, the roll calls cells are colored according to the Vote-To-Color map." + "<br><br>" +
            " <strong>Vote-to-Color map:</strong> <em> 'Yes', 'No', 'Obstruction', 'Abstention', 'Chamber President', 'absence'</em> are respectively mapped to <em>blue, red, green, purple, yellow, gray.</em>" +
            "<img src='images/tutorial/roll-calls-heatmap-interaction.gif' width='1200' height='650'>"
        }
    ];

    var portugueseSteps = [
        {
            element: "#"+ panelID + " .rollcalls-heatmap",
            intro: "Aqui você pode inspecionar as <strong>votações</strong> e ter uma noção de quantas " +
            "propostas foram votadas durante um certo período de tempo. Essa visualização pode ser " +
            "gerada a partir do <strong>Espectro de Deputados, Infográfico da Câmara e Grafo de Similaridade dos Deputados.</strong>"
        },
        {
            element:  "#"+ panelID + " .rollcalls-heatmap",
            intro: "Cada </strong>célula</strong> representa uma votação. O <strong>eixo X</strong> representa o número de votações e o <strong>eixo Y</strong> os meses."
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
            intro: "Por padrão, as cores indicam a proporção dos votos dos deputados selecionados na visualização de origem. As visualizações são coordenadas, "+ 
            "ou seja, mudar a seleção na visualização de origem irá alterar a cor das células nessa visualização. Quando apenas um deputado é selecionado, " +
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
            intro: "This visualization shows an <strong>excerpt</strong> of the main timeline. Deputies can be added to this timeline and their behavior (i.e., their paths) is shown as <strong>simple lines</strong> instead of rectangular shapes."
        },
        {
            intro: "Hover over the lines to obtain more information about the deputies and parties."+
                "<img src='images/tutorial/crop-timeline.gif' width='1200' height='650'>"
        }
    ];

    var portugueseSteps =  [
        {
            element: "#"+ panelID + " .timeline-crop",
            intro: "Esta visualização apresenta um parte específica da linha do tempo principal. Ela mostra os partidos no espectro e é dividida em intervalos de um ano. "+
            "Deputados podem ser adicionados a esta linha de tempo e seu comportamento é representado por <strong>linhas simples</strong> ao invés de formas retangulares."
        },
        {
            intro: "Posicione o mouse sobre as linhas para obter mais informações sobre os deputados e partidos." +
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