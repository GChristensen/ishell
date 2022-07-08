// invoked from the Chrome manifest
import "./mv3_persistent.js";
import "./mv3_scripts.js";
import {helperApp} from "./helper_app.js";

try {
    await helperApp.getPort();
}
catch (e) {
    console.error(e);
}
