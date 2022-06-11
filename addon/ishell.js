export let cmdManager;
export let contextMenuManager;
export let helperApp;

if (_DEPLOY_FIREFOX) {
    if (location.href.endsWith("background.html")) {
        await import("./commands.js");

        const cmdmanager = await import("./cmdmanager.js");
        cmdManager = cmdmanager.cmdManager;

        const contextmenu = await import("./ui/contextmenu.js");
        contextMenuManager = contextmenu.contextMenuManager;

        const helperapp = await import("./helper_app.js");
        helperApp = helperapp.helperApp;
    }
    else {
        await import("./api_background.js");

        cmdManager = _BACKGROUND_API.cmdAPI.__cmdManager;
        contextMenuManager = _BACKGROUND_API.cmdAPI.__contextMenuManager;
        helperApp = _BACKGROUND_API.cmdAPI.__helperApp;
    }
}