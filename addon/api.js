import {injectModules} from "./utils.js";
import {settings} from "./settings.js";

await settings.load();

await injectModules([
    "./api/utils.js",
    "./api/contextutils.js",
    "./parser/nounutils.js",
    "./parser/nountypes.js",
    "./parser/suggestion_memory.js",
    "./parser/parser.js",
    "./api/cmdutils.js",
    "./api/preprocessor.js",
    "./api/cmdapi.js"
]);