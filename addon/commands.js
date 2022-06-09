import {loadModules} from "./utils.js";
import "./api.js";

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
