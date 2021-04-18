function loadProject (jsonTree) {
    // Clean Workspace if TL has children
    var node = tree.getNode("panel-1-1", tree.traverseBF); //get timeline node
    if (node.children.length > 0)
        removeChildren(node);

    $('#loading-project #msg-project').text("Loading Data from project");
    $('#loading-project').css('visibility', 'visible');
    $('#loading-project').css('opacity', 1);
    readJsonTree(jsonTree);
}

function saveProject(projectTree) {
    download(projectTree, 'CivisAnalysisProject.json', 'application/json');
}

function download(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([JSON.stringify(content, null, 2)], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

function readJsonTree(jsonTree) {
    traverseBFJsonTree(jsonTree[0])
}

function traverseBFJsonTree (root) {
    var queue = new Queue();
    queue.enqueue(root);

    var currentTree = queue.dequeue();
    (async function loop() {
        while(1){
            if (!currentTree)
            {
                await new Promise(resolve => setTimeout(resolve, 5000));
                $('#loading-project').css('opacity', 0);
                $('#loading-project').css('visibility', 'hidden');
                return;
            }
            for (var i = 0, length = currentTree.nodes.length; i < length; i++) {
                queue.enqueue(currentTree.nodes[i]);
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
            readChart(currentTree); 
            currentTree = queue.dequeue();
        }
    })();
};


function readChart(node)
{
    let chart = node.chart;
    if (chart.typeChart === SCATTER_PLOT || chart.typeChart === CHAMBER_INFOGRAPHIC || chart.typeChart === ROLLCALLS_HEATMAP || chart.typeChart === DEPUTIES_SIMILARITY_FORCE)
    {
        chart.args.filteredData = [new Date(chart.args.filteredData[0]), new Date(chart.args.filteredData[1])];
        setUpScatterPlotData(chart.args.filteredData, chart.args.dimensionalReductionTechnique, chart.typeChart);
    } 
}