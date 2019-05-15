function startIntro(){
    var intro = introJs();
    intro.setOptions({
        steps: [
            {
                intro: "Hi <br> Welcome to CivisAnalysis2! <br> Let's take a tour :)"
            },
            {
                intro: "CivisAnalysis 2.0 is a web-based application where you can open multiple and coordinated panels for exploring data " +
                "concerning the votes of representatives in Brazil's lower legislative house (the Chamber of Deputies)." +
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
                intro: "<strong>Timeline</strong>: the main visualization of CivisAnalysis 2.0, showing an overview of the voting behavior of parties across the spectrum. " +
                "Each tick represents a party with a different color and its height represents its size. You can <strong>hover</strong> over the ticks to get more information.",
            },
            {
                intro: 'You can select any period of history by clicking or brushing periods or years and then <strong>right</strong> click on it to open a context menu and finally you can generate a new visualization.'
                +
                "<img src='images/tutorial/timeline-menu.gif' width='580' height='260'>"
            }
        ],
        showProgress: true,
        disableInteraction: true
        //width: 600
    });
    intro.start();
}

function startIntroScatterplot(panelID){
    var intro = introJs();
    $(".panel").not("#" + panelID).attr('style', 'z-index: 0');
    intro.setOptions({
        steps: [
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
                element:'.bootstrap-select ',
                intro: "You can filter deputies by state, you just have to select a set of states and then click on <strong> Apply Filter. </strong> <br> <strong>Note:</strong>This filter will be applied on the current selection of deputies."
            },
            {
                element:'#resetBtn',
                intro: "You can <strong>reset</strong> all your selections by clicking here."
            },
            {
                intro: "You can generate more than one <strong>Spectrum of deputies</strong> and all the views will be <strong>coordinated</strong> with each other, as you can see in the image below:" +
                "<img src='images/tutorial/scatter-plot-interaction.gif' width='1200' height='550'>"
            },
            {
                intro: "You can <strong>right click</strong> on a deputy to open a custom menu with options to generate new visualizations, besides that " +
                "you can <strong> right click</strong> on a cluster generated by K-means to open other context menu with other options for new visualizations." +
                "<br><strong>Tip:</strong> You will get a better result if you select a small set of deputies to create a time line crop." +
                "<img src='images/tutorial/scatter-plot-generating-vis.gif' width='1200' height='550'>"
            }
        ],
        showProgress: true,
        disableInteraction: true
    });
    intro.start();
}

function startIntroChamberInfographic(panelID)
{
    var intro = introJs();
    $(".panel").not("#" + panelID).attr('style', 'z-index: 0');
    intro.setOptions({
        steps: [
            {
                element: "#"+ panelID + " .chamber-infographic",
                intro: "Often used to depict the distribution of <strong>seats</strong> in legislatures, this visualization shows <strong>deputies</strong> and <strong>parties</strong> in a semi-circle. " +
                "Deputies are positioned according to their <strong>positions</strong> in the political spectrum and parties according to the average of their deputies, which " +
                "results in a party-based clustering of the representatives."
            },
            {
                intro: "Each <strong>circle</strong> represents a deputy and each part of donut chart represents a <strong>party</strong> and a proportion of deputies selected." +
                    "You can select a deputy or hover it to get more information. You can hold the <strong>CTRL</strong> key to select multiple deputies." +
                "<img src='images/tutorial/chamber-infographic.gif' width='1100' height='550'>"
            },
            {
                element: "#"+ panelID + ' .btn-settings-chamberInfographic',
                intro: "You can access an extra menu by clicking on this icon and search deputies by typing their names."
            },
            {
                element:'.bootstrap-select ',
                intro: "You can filter deputies by state, you just have to select a set of states and then click on <strong> Apply Filter. </strong> <br> <strong>Note:</strong>This filter will be applied on the current selection of deputies."
            },
            {
                element:'#resetBtn',
                intro: "You can <strong>reset</strong> all your selections by clicking here."
            },
            {
                intro: "You can <strong>right click</strong> on a deputy to open a custom menu with options to generate new visualizations." +
                "<br><strong>Tip:</strong> You will get a better result if you select a small set of deputies to create a time line crop." +
                "<img src='images/tutorial/chamber-infographic-generating-vis.gif' width='1100' height='550'>"
            }
        ],
        showProgress: true,
        disableInteraction: true
    });
    intro.start();
}

function startIntroDeputiesSimilarity(panelID)
{
    var intro = introJs();
    $(".panel").not("#" + panelID).attr('style', 'z-index: 0');
    intro.setOptions({
        steps: [
            {
                element: ".similarity-force",
                intro: "A disconnected graph that represents the similarity of deputies' votes using a force layout. Nodes are connected only when they reach a certain grade of similarity."
            },
            {
                element: "#"+ panelID + " .slider-horizontal",
                intro: "You can select the grade of similarity using this slider."
            },
            {
                element:  "#"+ panelID + " .similarity-force .node",
                intro: "Each circle represents a deputy and the color represents the respective party."
            },
            {
                intro: "You can select a deputy or hover it to get more information. You can hold the <strong>CTRL</strong> key to select multiple deputies" +
                "<img src='images/tutorial/deputies-similarity-force.gif' width='1000' height='560'>"
            },
            {
                element: "#"+ panelID + ' .btn-settings-similarity-force',
                intro: "You can access an extra menu by clicking on this icon and search deputies by typing their names."
            },
            {
                element:'.bootstrap-select ',
                intro: "You can filter deputies by state, you just have to select a set of states and then click on <strong> Apply Filter. </strong> <br> <strong>Note:</strong>This filter will be applied on the current selection of deputies."
            },
            {
                element:'#resetBtn',
                intro: "You can <strong>reset</strong> all your selections by clicking here."
            },
            {
                intro: "You can <strong>right click</strong> on a deputy to open a custom menu with options to generate new visualizations." +
                "<br><strong>Tip:</strong> You will get a better result if you select a small set of deputies to create a time line crop." +
                "<img src='images/tutorial/deputies-similarity-force-generating-vis.gif' width='1100' height='550'>"
            }
        ],
        showProgress: true,
        disableInteraction: true
    });
    intro.start();
}

function startIntroRollCallsHeatMap(panelID)
{
    var intro = introJs();
    $(".panel").not("#" + panelID).css('z-index', '0');
    intro.setOptions({
        steps: [
            {
                element: "#"+ panelID + " .rollcalls-heatmap",
                intro: "This visualization helps users <strong>inspect the roll calls</strong> and provides them with an idea of how many" +
                " motions were voted during a given time period. The data are shown as a horizontal histogram:a stack " +
                "of rectangular <strong>cells</strong> (each representing a <strong>roll call</strong>). This view can be " +
                "generated from <strong>Spectrum of Deputies, Chamber Infographic and Deputies Similarity Force Chart.</strong>"
            },
            {
                element:  "#"+ panelID + " .rollcalls-heatmap",
                intro: "The <strong>X-axis</strong> represents the number of roll calls and the <strong>Y-axis</strong> the months."
            },
            {
                intro: "Roll calls are selected by clicking and hovering displays a tooltip containing a pie chart of the proportion of <strong>YES</strong> and <strong>NO</strong> votes" +
                "<img src='images/tutorial/roll-calls-heatmap-general.gif' width='1100' height='560'>"
            },
            {
                element: "#"+ panelID + ' .btn-settings-rollCallsHeatmap',
                intro: "You can access an extra menu by clicking on this icon and search roll calls by name or filtering by type and date."
            },
            {
                element:'#resetBtn',
                intro: "You can <strong>reset</strong> all your selections by clicking here."
            },
            {
                intro: "The Roll Calls Heatmap Histogram is <strong>directly connected </strong> to its parent visualization. " +
                "The default cell colors represent the <strong> voting ratio</strong> of selected deputies in the parent visualization, " +
                 "Colors change dynamically according to the <strong>selected deputies</strong>, and when only one deputy is selected, " +
                "the roll calls cells are colored according to the Vote-To-Color map." + "<br><br>" +
                " <strong>Vote-to-Color map:</strong> <em> 'Yes', 'No', 'Obstruction', 'Abstention', 'Chamber President', 'absence'</em> are respectively mapped to <em>blue, red, green, purple, yellow, gray.</em>" +
                "<img src='images/tutorial/roll-calls-heatmap-interaction.gif' width='1100' height='550'>"
            }
        ],
        showProgress: true,
        disableInteraction: true
    });
    intro.start();
}

function startIntroTimelineCrop(panelID)
{
    var intro = introJs();
    $(".panel").not("#" + panelID).css('z-index', '0');
    intro.setOptions({
        steps: [
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
        ],
        showProgress: true,
        disableInteraction: true
    });
    intro.start();
}