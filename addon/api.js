import {injectModules} from "./utils.js";
import {settings} from "./settings.js";

await settings.load();

await injectModules([
    "./api/utils.js",
    "./api/contextutils.js",
    "./parser/nounutils.js",
    "./parser/suggestion_memory.js",
    "./parser/parser.js",
    "./api/nountypes.js",
    "./api/cmdutils.js",
    "./api/preprocessor.js",
    "./api/cmdapi.js",
    "./lib/math_parser.js",
    "./lib/marked.js",
    "./lib/browser-polyfill.js"
]);

chrome.i18n.getAcceptLanguages(ll => CmdUtils.acceptLanguages = ll);