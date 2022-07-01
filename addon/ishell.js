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

    await cmdManager.loadCommands();
}

async function loadBackgroundAPI() {
    await import("./api/background.js");

    cmdManager = globalThis._BACKGROUND_API.__cmdManager;
    contextMenuManager = globalThis._BACKGROUND_API.__contextMenuManager;
    helperApp = globalThis._BACKGROUND_API.__helperApp;
}