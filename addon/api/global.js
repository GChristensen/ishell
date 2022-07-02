import {injectModules} from "../utils.js";
import {cmdManager} from "../cmdmanager.js";
import {contextMenuManager} from "../ui/contextmenu.js";
import {helperApp} from "../helper_app.js";

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

globalThis.CMD_NS = {...cmdManager.ns};

globalThis._BACKGROUND_API = {
    Utils,
    ContextUtils,
    CmdUtils,
    NounUtils,
    cmdAPI,
    cmdManager,
    contextMenuManager,
    helperApp
};
