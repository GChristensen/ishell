import {contextMenuManager} from "./ishell.js";

if (_MANIFEST_V3)
    await import("./mv3_persistent.js");

contextMenuManager.loadMenu();

$(init);

function init() {
    cmdAPI.dbglog("iShell v" + cmdAPI.VERSION + " background script loaded");
}