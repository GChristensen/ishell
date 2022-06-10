import {cmdManager} from "./cmdmanager.js";
import {contextMenuManager} from "./ui/contextmenu.js";
import "./commands.js";

let helperAppPresents;

if (_MANIFEST_V3) {
    import("./mv3_persistent.js");

    const helperApp = (await import("./helper_app.js")).helperApp;
    helperAppPresents = await helperApp.probe();

    browser.runtime.onMessage.addListener(async message => {
        switch (message.type) {
            case "CHECK_HELPER_APP_AVAILABLE":
                return helperAppPresents;
        }
    })
}

const canLoadScripts = !_MANIFEST_V3 || _MANIFEST_V3 && helperAppPresents;

if (canLoadScripts) {
    await cmdManager.loadBuiltinScripts();
    await cmdManager.loadCustomScripts();
}

await cmdManager.prepareCommands();

contextMenuManager.loadMenu();

chrome.i18n.getAcceptLanguages(ll => CmdUtils.acceptLanguages = ll);

CmdUtils.deblog("iShell v" + CmdUtils.VERSION + " background script loaded");