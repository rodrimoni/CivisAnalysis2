/*
 * General Utilities Module
 * General-purpose utility functions
 */

/**
 * Create multi-dimensional array
 * @param {number} length - Array length
 * @returns {Array} Multi-dimensional array
 */
function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while (i--) arr[length - 1 - i] = createArray.apply(this, args);
    }

    return arr;
}

/**
 * Flip keys and values in an object
 * @param {Object} trans - Object to flip
 * @returns {Object} Flipped object
 */
function array_flip(trans) {
    var key, tmp_ar = {};

    for (key in trans) {
        if (trans.hasOwnProperty(key)) {
            tmp_ar[trans[key]] = key;
        }
    }

    return tmp_ar;
}

/**
 * Merge two objects
 * @param {Object} obj1 - First object
 * @param {Object} obj2 - Second object
 * @returns {Object} Merged object
 */
function mergeObjects(obj1, obj2) {
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
}

/**
 * Get popover attributes for hover trigger
 * @param {string} htmlContent - Popover content
 * @param {string} placement - Placement position (default: 'bottom')
 * @returns {Object} Popover attributes
 */
function popoverAttr(htmlContent, placement) {
    return {
        cursor: 'pointer',
        href: "#",
        'data-container': 'body',
        'data-content': htmlContent,
        'data-html': true,
        rel: "popover",
        'data-placement': (placement) ? placement : 'bottom',
        'data-trigger': "hover",
        'data-viewport': 'body'
    }
}

/**
 * Get popover attributes for focus trigger
 * @param {Function|string} htmlContent - Popover content or function
 * @param {string} placement - Placement position (default: 'bottom')
 * @returns {Object} Popover attributes
 */
function popoverAttrFocus(htmlContent, placement) {
    return {
        cursor: 'pointer',
        href: "javascript:",
        'data-container': 'body',
        'data-content': htmlContent,
        'data-html': true,
        rel: "popover",
        'data-placement': (placement) ? placement : 'bottom',
        'data-trigger': "focus",
    }
}

/**
 * Initialize system
 */
function initSystem() {
    loadDeputies();
    loadDeputiesNodesByYear();
    loadRollCalls(function () {
        createNewChild(TIME_LINE, {});
    });
}

/**
 * Console.save functionality for downloading data
 */
(function (console) {
    console.save = function (data, filename) {
        if (!data) {
            console.error('Console.save: No data')
            return;
        }

        if (!filename) filename = 'console.json'

        if (typeof data === "object") {
            data = JSON.stringify(data, undefined, 4)
        }

        var blob = new Blob([data], { type: 'text/json' }),
            e = document.createEvent('MouseEvents'),
            a = document.createElement('a')

        a.download = filename
        a.href = window.URL.createObjectURL(blob)
        a.dataset.downloadurl = ['text/json', a.download, a.href].join(':')
        e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
        a.dispatchEvent(e)
    }
})(console)

