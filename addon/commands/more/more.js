import {cmdManager} from "../../cmdmanager.js";
import {settings} from "../../settings.js";

export const namespace = new CommandNamespace(CommandNamespace.MORE);

namespace.onBuiltinCommandsLoaded = () => {
    if (settings.enable_more_commands()) {
        for (let cmd of cmdManager.commands)
            if (cmd._builtin && cmd._namespace === CommandNamespace.MORE)
                cmd._hidden = false;
    }
};