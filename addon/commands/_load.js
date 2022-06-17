import "../api/global.js";
import {loadModules} from "../utils.js";
import {cmdManager} from "../cmdmanager.js";
import {helperApp} from "../helper_app.js";

await loadModules([
    "./commands/more/more.js",
    "./commands/builtin.js",
    "./commands/translate.js",
    "./commands/search.js",
    "./commands/feedsub.js"
]);

await cmdManager.loadBuiltinScripts();

const canLoadUserScripts = !_MANIFEST_V3 || _MANIFEST_V3 && await helperApp.probe();

if (canLoadUserScripts)
    await cmdManager.loadUserScripts();

await cmdManager.prepareCommands();