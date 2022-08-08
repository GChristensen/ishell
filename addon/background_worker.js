// invoked from the Chrome manifest
import "./global.js";
import "./mv3_persistent.js";
import "./mv3_scripts.js";
import {helperApp} from "./helper_app.js";

(async () => {
    try {
        await helperApp.getPort();
    }
    catch (e) {
        console.error(e);
    }
})();