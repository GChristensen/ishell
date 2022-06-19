import {injectModules} from "../utils.js";

await injectModules([
    "../lib/browser-polyfill.js",
    "../lib/math_parser.js",
    "../lib/marked.js",
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