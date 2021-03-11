shellSettings.load(settings => {
    if (settings.enable_more_commands()) {
        for (let cmd of CmdManager.commands)
            if (cmd._builtin && cmd._namespace === NS_MORE_COMMANDS)
                cmd._hidden = false;
    }
    else
        CmdManager.commands = CmdManager.commands.filter(cmd => !(cmd._builtin && cmd._namespace === NS_MORE_COMMANDS));
});