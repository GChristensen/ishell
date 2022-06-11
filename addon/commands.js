import "./api.js";
import {loadModules} from "./utils.js";
import {cmdManager} from "./cmdmanager.js";
import {helperApp} from "./helper_app.js";

await loadModules([
    "./commands/more/more.js",
    "./commands/builtin.js",
    "./commands/mail.js",
    "./commands/translate.js",
    "./commands/search.js",
    "./commands/feedsub.js",
    "./commands/resurrect.js",
    "./commands/scrapyard.js"
]);

const canLoadScripts = !_MANIFEST_V3 || _MANIFEST_V3 && await helperApp.probe();

if (canLoadScripts) {
    await cmdManager.loadBuiltinScripts();
    await cmdManager.loadCustomScripts();
}

await cmdManager.prepareCommands();