/*
 * Subject Linking
 * Connects the derived subject views (histogram, bubble, trends) back to the
 * Map of Roll Calls they were spawned from: focusing a subject highlights that
 * subject's roll calls on the map. Children only ever call into this module —
 * they hold no reference to the map and no knowledge of its internals.
 */
var subjectLinking = (function () {

    // Walk up the panel tree from a child until we reach its ancestor map.
    function findMapNode(childPanelID) {
        if (!childPanelID || typeof state === 'undefined') return null;
        var tree = state.getTree();
        if (!tree) return null;

        var node = tree.getNode(childPanelID, tree.traverseBF);
        while (node) {
            if (node.typeChart === ROLLCALLS_HEATMAP || node.typeChart === STATIC_ROLLCALLS_HEATMAP) {
                return node;
            }
            node = node.parent;
        }
        return null;
    }

    function mapChart(childPanelID) {
        var node = findMapNode(childPanelID);
        return (node && node.chart && typeof node.chart.setSubjectPreview === 'function')
            ? node.chart
            : null;
    }

    return {
        /**
         * Transient highlight while hovering. Pass null to clear the preview.
         */
        preview: function (childPanelID, theme) {
            var c = mapChart(childPanelID);
            if (c) c.setSubjectPreview(theme);
        },

        /**
         * Sticky highlight. Clicking the already-locked subject releases it.
         * @returns {string|null} the newly locked theme, or null if released
         */
        toggleLock: function (childPanelID, theme) {
            var c = mapChart(childPanelID);
            return c ? c.toggleSubjectLock(theme, childPanelID) : null;
        },

        /**
         * The theme locked BY THIS CHILD, or null. Lets a child render its own
         * locked mark without claiming a lock another panel owns.
         */
        lockedTheme: function (childPanelID) {
            var c = mapChart(childPanelID);
            if (!c) return null;
            var lock = c.getSubjectLock();
            return (lock && lock.ownerPanelID === childPanelID) ? lock.theme : null;
        }
    };
})();
