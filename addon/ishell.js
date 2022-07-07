export let cmdManager;
export let contextMenuManager;
export let helperApp;

if (_BACKGROUND_PAGE) {
    if (location.href.endsWith("background.html"))
        await loadIShell();
    else
        await loadBackgroundAPI();
}
else
    await loadIShell();

async function loadIShell() {
    await import("./api/global.js");

    const cmdmanager = await import("./cmdmanager.js");
    cmdManager = cmdmanager.cmdManager;

    const contextmenu = await import("./ui/contextmenu.js");
    contextMenuManager = contextmenu.contextMenuManager;

    const helperapp = await import("./helper_app.js");
    helperApp = helperapp.helperApp;
    await helperApp.configure();

    await cmdManager.loadCommands();
}

async function loadBackgroundAPI() {
    let backgroundPage = await browser.runtime.getBackgroundPage();

    globalThis._BACKGROUND_API = backgroundPage._BACKGROUND_API;

    globalThis.Utils = globalThis._BACKGROUND_API.Utils;
    globalThis.ContextUtils = globalThis._BACKGROUND_API.ContextUtils;
    globalThis.CmdUtils = globalThis._BACKGROUND_API.CmdUtils;
    globalThis.NounUtils = globalThis._BACKGROUND_API.NounUtils;
    globalThis.cmdAPI = globalThis._BACKGROUND_API.cmdAPI;

    cmdManager = globalThis._BACKGROUND_API.cmdManager;
    contextMenuManager = globalThis._BACKGROUND_API.contextMenuManager;
    helperApp = globalThis._BACKGROUND_API.helperApp;
}