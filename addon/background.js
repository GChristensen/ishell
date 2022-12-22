import {contextMenuManager} from "./ishell.js";
import {receive, receiveExternal} from "./proxy.js";

if (_MANIFEST_V3)
    await import("./mv3_persistent.js");

receiveExternal.startListener(true);
receive.startListener(true);

contextMenuManager.loadMenu();

$(init);

function init() {
    cmdAPI.dbglog("iShell v" + cmdAPI.VERSION + " background script loaded");
}