import {cmdManager} from "../../cmdmanager.js";
import {settings} from "../../settings.js";

export const _namespace = CMD_NS.MORE;

if (settings.enable_more_commands()) {
    for (let cmd of cmdManager.commands)
        if (cmd._builtin && cmd._namespace === CMD_NS.MORE)
            cmd._hidden = false;
}