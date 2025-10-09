/*
 * Constants and Configuration
 * Central location for all system constants
 */

/* Initial values of panel Height and Width */
const INITIAL_HEIGHT = 450;
const INITIAL_WIDTH = 550;

/* Max values of panel Height and Width */
const MAX_HEIGHT = 1080;
const MAX_WIDTH = 1920;

/* Constant values of icon Height and Width */
const ICON_HEIGHT = 24;
const ICON_WIDTH = 24;

/* Constant to define the sidebar size */
const SIDEBAR_OFFSET = 400;

/* Chart Type Constants */
const TIME_LINE = 0;
const SCATTER_PLOT = 1;
const BAR_CHART = 2;
const FORCE_LAYOUT = 3;
const TIME_LINE_CROP = 4;
const CHAMBER_INFOGRAPHIC = 5;
const ROLLCALLS_HEATMAP = 6;
const DEPUTIES_SIMILARITY_FORCE = 7;
const STATIC_ROLLCALLS_HEATMAP = 8;
const THEMES_BUBBLE_CHART = 9;
const SMALL_MULTIPLES_CHART = 10;
const PARTY_METRICS = 11;

/* Bar Chart Types */
const PARTIES_BAR_CHART = 1;
const THEMES_BAR_CHART = 2;

/* Transfer function of Plots */
const typeChartToString = [
    "Timeline",
    "Spectrum of Deputies",
    "Bar Chart",
    "Force Layout",
    "Cropped Timeline",
    "Chamber Infographic",
    "Map of Roll Calls",
    "Similarity Force",
    "Map of Roll Calls",
    "Subjects",
    "Small Multiples",
    "Party Metrics"
];

/* Dimensional Reduction Techniques */
const PCA = 1;
const MDS = 2;
const TSNE = 3;

/* Language Constants */
const ENGLISH = 0;
const PORTUGUESE = 1;

/* Window Type Constants */
const PANEL = 0;
const MINIMIZED_ICON = 1;

