import {helperApp} from "./helper_app.js";
import {cmdManager} from "./cmdmanager.js";
import {contextMenuManager} from "./ui/contextmenu.js";
import "./commands.js";

if (_MANIFEST_V3)
    import("./mv3_persistent.js");

const helperAppPresents = _MANIFEST_V3? await helperApp.probe(): null;
const canLoadScripts = !_MANIFEST_V3 || _MANIFEST_V3 && helperAppPresents;

if (canLoadScripts) {
    await cmdManager.loadBuiltinScripts();
    await cmdManager.loadCustomScripts();
}

await cmdManager.prepareCommands();

contextMenuManager.loadMenu();

chrome.i18n.getAcceptLanguages(ll => CmdUtils.acceptLanguages = ll);

if (_MANIFEST_V3) {
    browser.runtime.onMessage.addListener(async message => {
        switch (message.type) {
            case "CHECK_HELPER_APP_AVAILABLE":
                return helperAppPresents;
        }
    })
}

CmdUtils.deblog("iShell v" + CmdUtils.VERSION + " background script loaded");