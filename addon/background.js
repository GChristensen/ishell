CmdUtils.deblog("iShell v" + CmdUtils.VERSION + " background script loaded");

if (_MANIFEST_V3)
    import("./mv3_persistent.js");

shellSettings.load(async settings => {
    CmdUtils.DEBUG = settings.debug_mode();

    const helperAppPresents = _MANIFEST_V3? await helperApp.probe(): null;
    const canLoadScripts = !_MANIFEST_V3 || _MANIFEST_V3 && helperAppPresents;

    if (canLoadScripts) {
        await CmdManager.loadBuiltinScripts();
        await CmdManager.loadCustomScripts();
    }

    CmdManager.commands = CmdManager.commands.filter(cmd => CmdUtils.DEBUG || !cmd._hidden);

    let disabledCommands = settings.disabled_commands();

    if (disabledCommands)
        for (let cmd of CmdManager.commands) {
            if (cmd.name in disabledCommands)
                cmd.disabled = true;
        }

    for (let cmd of CmdManager.commands) {
        try {
            if (cmd.load)
                await CmdManager.initCommand(cmd, cmd.load);
        }
        catch (e) {
            console.log(e, e.stack);
        }
    }

    if (_MANIFEST_V3)
        browser.runtime.onMessage.addListener(async message => {
            switch (message.type) {
                case "CHECK_HELPER_APP_AVAILABLE":
                    return helperAppPresents;
            }
        })
});

chrome.i18n.getAcceptLanguages(ll => CmdUtils.acceptLanguages = ll);
