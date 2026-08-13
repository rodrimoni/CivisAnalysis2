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
         * The selection rule shared by every subject view.
         * Cmd/Ctrl held -> toggle membership (subjects stack).
         * Plain click   -> that subject alone, or clear when it was the only one.
         * An empty result means "nothing selected", which shows everything.
         * @param {Array<string>} current
         * @param {string} theme
         * @param {boolean} additive
         * @returns {Array<string>} the new selection (a new array)
         */
        toggleIn: function (current, theme, additive) {
            var next = (current || []).slice();
            var at = next.indexOf(theme);
            if (additive) {
                if (at > -1) next.splice(at, 1);
                else next.push(theme);
                return next;
            }
            if (at > -1 && next.length === 1) return [];
            return [theme];
        },

        /**
         * Transient highlight while hovering. Pass null to clear the preview.
         */
        preview: function (childPanelID, theme) {
            var c = mapChart(childPanelID);
            if (c) c.setSubjectPreview(theme);
        },

        /**
         * Sticky highlight over a SET of subjects. An empty list means "no
         * focus", which shows everything.
         * @param {string} childPanelID
         * @param {Array<string>} themes
         */
        setLock: function (childPanelID, themes) {
            var c = mapChart(childPanelID);
            if (c) c.setSubjectLock(themes, childPanelID);
        },

        /**
         * The themes locked BY THIS CHILD. Lets a child render its own locked
         * marks without claiming a lock another panel owns.
         * @returns {Array<string>}
         */
        lockedThemes: function (childPanelID) {
            var c = mapChart(childPanelID);
            if (!c) return [];
            var lock = c.getSubjectLock();
            return (lock && lock.ownerPanelID === childPanelID) ? lock.themes.slice() : [];
        }
    };
})();
