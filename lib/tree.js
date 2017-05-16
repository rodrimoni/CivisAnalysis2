function Node(data) {
    this.data     = data;
    this.parent   = null;
    this.children = [];
    this.id       = 1;
    this.depth    = 1;
}

function Tree(data) {
    this._root = new Node(data);
}

Tree.prototype.traverseDF = function(callback) {

    // this is a recurse and immediately-invoking function
    (function recurse(currentNode) {
        // step 2
        for (var i = 0, length = currentNode.children.length; i < length; i++) {
            // step 3
            recurse(currentNode.children[i]);
        }

        // step 4
        callback(currentNode);

        // step 1
    })(this._root);

};


var widthsArr = [];

Tree.prototype.traverseBF = function(callback) {
    var queue = new Queue();
    var width = 0;
    var currentDepth = 1;
    queue.enqueue(this._root);

    var currentTree = queue.dequeue();

    while(currentTree){
        //console.log(width);

        for (var i = 0, length = currentTree.children.length; i < length; i++) {
            queue.enqueue(currentTree.children[i]);
        }

        width = width + 1;
        //console.log(width);
        currentDepth = currentTree.depth;
        callback(currentTree);
        currentTree = queue.dequeue();

        if (currentTree === undefined)
        {
            widthsArr[currentDepth-1] = width;
            width = 0;
        }
        else
        {
            if (currentTree.depth !== currentDepth)
            {
                widthsArr[currentDepth-1] = width;
                width = 0;
            }
        }
    }
};

Tree.prototype.contains = function(callback, traversal) {
    traversal.call(this, callback);
};

Tree.prototype.getParent = function(data, traversal) {
    var parent = null,
        callback = function (node){
            if (node.data === data)
                parent = node.parent;
        };

    this.contains(callback, traversal);

    return parent;
};

Tree.prototype.add = function(data, toData, traversal) {
    var child = new Node(data),
        parent = null,
        width;
    var callback = function (node) {
        if (node.data === toData) {
            parent = node;
        }
    };

    this.contains(callback, traversal);
    width = widthsArr[parent.depth];
    //console.log(width);
    if (parent) {
        //child.id = parent.children.length + 1;
        child.id = width === undefined ? 1 : width + 1;
        child.depth = parent.depth + 1;
        parent.children.push(child);
        child.parent = parent;
        child.data += child.depth +"-" + child.id;
        return child;
    } else {
        throw new Error('Cannot add node to a non-existent parent.');
    }
};

Tree.prototype.remove = function(data, fromData, traversal) {
    var parent = null,
        childToRemove = null,
        index;

    var callback = function(node) {
        if (node.data === fromData) {
            parent = node;
        }
    };

    this.contains(callback, traversal);

    if (parent) {
        index = findIndex(parent.children, data);

        if (index === undefined) {
            throw new Error('Node to remove does not exist.');
        } else {
            childToRemove = parent.children.splice(index, 1);
        }
    } else {
        throw new Error('Parent does not exist.');
    }

    return childToRemove;
};

function findIndex(arr, data) {
    var index;

    for (var i = 0; i < arr.length; i++) {
        if (arr[i].data === data) {
            index = i;
        }
    }

    return index;
}

function Queue() {
    this._oldestIndex = 1;
    this._newestIndex = 1;
    this._storage = {};
}

Queue.prototype.size = function() {
    return this._newestIndex - this._oldestIndex;
};

Queue.prototype.enqueue = function(data) {
    this._storage[this._newestIndex] = data;
    this._newestIndex++;
};

Queue.prototype.dequeue = function() {
    var oldestIndex = this._oldestIndex,
        newestIndex = this._newestIndex,
        deletedData;

    if (oldestIndex !== newestIndex) {
        deletedData = this._storage[oldestIndex];
        delete this._storage[oldestIndex];
        this._oldestIndex++;

        return deletedData;
    }
};