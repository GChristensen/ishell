CmdUtils.deblog("iShell v" + CmdUtils.VERSION + " background script says hello");

shellSettings.load(async settings => {
    CmdUtils.DEBUG = settings.debug_mode();

    await CmdManager.loadBuiltinScripts();
    await CmdManager.loadCustomScripts();

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
});

chrome.i18n.getAcceptLanguages(ll => CmdUtils.acceptLanguages = ll);
