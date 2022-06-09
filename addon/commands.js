import {settings} from "./settings.js";
import "./api.js";
import {loadLegacyModules} from "./utils.js";

await settings.load();

await loadLegacyModules([
    "./commands/more/more.js",
    "./commands/builtin.js",
    "./commands/mail.js",
    "./commands/translate.js",
    "./commands/search.js",
    "./commands/feedsub.js",
    "./commands/resurrect.js",
    "./commands/scrapyard.js"
]);
