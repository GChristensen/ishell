import {NS_MORE_COMMANDS} from "./common.js";
import {CmdManager} from "../../cmdmanager.js";
import {settings} from "../../settings.js";
import {loadLegacyModules} from "../../utils.js";

await loadLegacyModules([
    "./commands/more/nyaa.js",
    "./commands/more/kpop.js",
    "./commands/more/javlib.js",
    "./commands/more/dark-flow.js"
]);

if (settings.enable_more_commands()) {
    for (let cmd of CmdManager.commands)
        if (cmd._builtin && cmd._namespace === NS_MORE_COMMANDS)
            cmd._hidden = false;
}
else
    CmdManager.commands = CmdManager.commands.filter(cmd => !(cmd._builtin && cmd._namespace === NS_MORE_COMMANDS));
