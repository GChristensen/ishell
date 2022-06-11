import {contextMenuManager} from "./ishell.js";

if (_MANIFEST_V3)
    await import("./mv3_persistent.js");

contextMenuManager.loadMenu();

CmdUtils.deblog("iShell v" + CmdUtils.VERSION + " background script loaded");