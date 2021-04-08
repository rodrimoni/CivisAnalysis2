function loadProject (jsonTree) {
    // Clean Workspace if TL has children
    var node = tree.getNode("panel-1-1", tree.traverseBF); //get timeline node
    if (node.children.length > 0)
        removeChildren(node);

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
    traverseBFJsonTree(jsonTree[0], readChart)
}

function traverseBFJsonTree (root, callback) {
    var queue = new Queue();
    queue.enqueue(root);

    var currentTree = queue.dequeue();
    while(currentTree){
        for (var i = 0, length = currentTree.nodes.length; i < length; i++) {
            queue.enqueue(currentTree.nodes[i]);
        }
        callback(currentTree);
        currentTree = queue.dequeue();
    }
};

function readChart(node) 
{
    let chart = node.chart;
    if (chart.typeChart === SCATTER_PLOT)
    {
        chart.args.filteredData = [new Date(chart.args.filteredData[0]), new Date(chart.args.filteredData[1])];
        setUpScatterPlotData(chart.args.filteredData, chart.args.dimensionalReductionTechnique, chart.typeChart);
    }
}