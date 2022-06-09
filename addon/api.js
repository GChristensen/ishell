import {injectLegacyModules} from "./utils.js";

await injectLegacyModules([
    "./api/utils.js",
    "./parser/nounutils.js",
    "./parser/nountypes.js",
    "./parser/contextutils.js",
    "./parser/suggestion_memory.js",
    "./parser/parser.js",
    "./api/cmdutils.js",
    "./api/preprocessor.js",
    "./api/cmdapi.js"
]);