shellSettings.load(settings => {
    if (settings.enable_more_commands()) {
        for (let cmd of CmdManager.commands)
            if (cmd.builtIn && cmd._namespace === NS_MORE_COMMANDS)
                cmd._hidden = false;
    }
    else
        CmdManager.commands = CmdManager.commands.filter(cmd => !(cmd.builtIn && cmd._namespace === NS_MORE_COMMANDS));
});