import {MORE_COMMANDS} from "./common.js";
import {cmdManager} from "../../cmdmanager.js";
import {settings} from "../../settings.js";
import {loadModules} from "../../utils.js";

await loadModules([
    "./commands/more/nyaa.js",
    "./commands/more/kpop.js",
    "./commands/more/javlib.js",
    "./commands/more/dark-flow.js"
]);

if (settings.enable_more_commands()) {
    for (let cmd of cmdManager.commands)
        if (cmd._builtin && cmd._namespace === MORE_COMMANDS)
            cmd._hidden = false;
}
else
    cmdManager.commands = cmdManager.commands.filter(cmd => !(cmd._builtin && cmd._namespace === MORE_COMMANDS));
