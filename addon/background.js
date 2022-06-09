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

cmdManager.prepareCommands();

if (_MANIFEST_V3) {
    // until there is no storage.session API,
    // use an alarm as a flag to call initialization function only once
    const alarm = await browser.alarms.get("startup-flag-alarm");

    if (!alarm) {
        await cmdManager.initializeCommands();
        browser.alarms.create("startup-flag-alarm", {periodInMinutes: 525960}); // one year
    }

    browser.runtime.onMessage.addListener(async message => {
        switch (message.type) {
            case "CHECK_HELPER_APP_AVAILABLE":
                return helperAppPresents;
        }
    })
}
else {
    await cmdManager.initializeCommands();
}

contextMenuManager.loadMenu();

chrome.i18n.getAcceptLanguages(ll => CmdUtils.acceptLanguages = ll);

globalThis.getCmdManager = function() {
    return cmdManager;
}

CmdUtils.deblog("iShell v" + CmdUtils.VERSION + " background script loaded");