import {injectModules} from "../utils.js";
import {settings} from "../settings.js";

await settings.load();

await injectModules([
    "./lib/math_parser.js",
    "./lib/marked.js",
    "./lib/browser-polyfill.js",
    "./api/legacy/utils.js",
    "./api/legacy/contextutils.js",
    "./api/legacy/parser/nounutils.js",
    "./api/legacy/parser/suggestion_memory.js",
    "./api/legacy/parser/parser.js",
    "./api/legacy/cmdutils.js",
    "./api/preprocessor.js",
    "./api/nountypes.js",
    "./api/cmdapi.js"
]);