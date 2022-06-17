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
    await import("./commands/_load.js");

    const cmdmanager = await import("./cmdmanager.js");
    cmdManager = cmdmanager.cmdManager;

    const contextmenu = await import("./ui/contextmenu.js");
    contextMenuManager = contextmenu.contextMenuManager;

    const helperapp = await import("./helper_app.js");
    helperApp = helperapp.helperApp;
}

async function loadBackgroundAPI() {
    await import("./api/background.js");

    cmdManager = _BACKGROUND_API.cmdAPI.__cmdManager;
    contextMenuManager = _BACKGROUND_API.cmdAPI.__contextMenuManager;
    helperApp = _BACKGROUND_API.cmdAPI.__helperApp;
}