import {contextMenuManager} from "./ishell.js";
import {settings} from "./settings.js";

if (_MANIFEST_V3)
    await import("./mv3_persistent.js");

contextMenuManager.loadMenu();

$(init);

function init() {
    showAnnouncementLink();

    cmdAPI.dbglog("iShell v" + cmdAPI.VERSION + " background script loaded");
}

function showAnnouncementLink() {
    if (settings.isAddonUpdated())
        settings.pending_announcement({href: "/ui/options/about.html", text: `What's new in v${cmdAPI.VERSION}`});
}