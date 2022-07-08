import {settings} from "../settings.js";
import {helperApp} from "../helper_app.js";
import {cmdManager} from "../cmdmanager.js";
import {delegate} from "../utils.js";
import {executeScript, nativeEval} from "../utils_browser.js";

export const cmdAPI = {
    DEBUG: settings.debug_mode(),
    VERSION: chrome.runtime.getManifest().version,

    dbglog(...args) {
        if (cmdAPI.DEBUG) console.log(...args);
    },

    createCommand(options) {
        return cmdManager.createCommand(options);
    },

    objectPreviewList(block, items, fs, css) {
        return CmdUtils.previewList2(block, items, fs, css);
    },

    // EXPERIMENTAL: set to true if a user selected an item from the preview list with ctrl+arrows
    // useful in previewList/objectPreviewList click handlers
    get activateTab() {
        return ContextUtils.activateTab
    },

    get settings() {
        return settings.dynamic_settings();
    },

    get activeTab() {
        return ContextUtils.activeTab;
    },

    evaluate(javaScript) {
        return (_MANIFEST_V3? nativeEval: eval)(javaScript);
    },

    reduceTemplate (items, f) {
        return items?.reduce((acc, v, i, arr) => acc + f(v, i, arr), "");
    }
};

export const R = cmdAPI.reduceTemplate;

cmdAPI.previewFetch = async function(display, resource, init) {
    const REASON_TIMEOUT = "Timeout";
    const controller = new AbortController();

    init = init || {};

    let displayError;
    if (init._displayError) {
        delete init._displayError;
        displayError = true;
    }

    if (init._timeout) {
        delete init._timeout;
        setTimeout(() => controller.abort(REASON_TIMEOUT), init._timeout);
    }

    init.signal = controller.signal;

    function onPreviewChange() {
        display.removeEventListener("preview-change", onPreviewChange, false);
        controller.abort();
    }
    display.addEventListener("preview-change", onPreviewChange, false);

    function removePreviewListener() {
        display.removeEventListener("preview-change", onPreviewChange, false);
    }

    try {
        const response = await fetch(resource, init);

        return new Proxy(response, {
            get(target, key, receiver) {
                if (["arrayBuffer", "blob", "formData", "json", "text"].some(k => k === key)) {
                    return () => target[key]().finally(removePreviewListener);
                }

                if (key === "body")
                    return undefined;

                return target[key];
            }
        })
    } catch (e) {
        removePreviewListener();

        const aborted = this.fetchAborted(e);
        const timeout = controller.signal.reason === REASON_TIMEOUT;

        if (aborted && timeout) {
            const error = new Error("The request operation has timed out.")
            if (displayError)
                display.error(error.message);
            throw error;
        }
        else if (!aborted && displayError)
            display.error(e.message);

        throw e;
    }
};

cmdAPI.fetchAborted = function(error) {
    return error?.name === "AbortError";
};

cmdAPI.helperFetch = async function(pblock, path, init) {
    let _pblock = pblock, _path = path, _init = init;

    let preview = !!pblock;
    if (typeof pblock === "string") {
        _path = pblock;
        _init = path;
        preview = false;
    }

    if (!await helperApp.probe()) {
        const error = new Error();
        error.name = "IShellNoHelperApp";
        error.message = "Can not run iShell helper app."
        throw error;
    }

    const url = helperApp.url(_path);
    _init = helperApp.injectAuth(_init);

    if (preview)
        return this.previewFetch(_pblock, url, _init);
    else
        return fetch(url, _init);
}

cmdAPI.executeScript = async function(tabId, options) {
    if (typeof tabId === "object") {
        options = tabId;
        tabId = this.activeTab?.id;
    }

    if (options.jQuery) {
        delete options.jQuery;

        const hasJQuery = await executeScript(tabId,{func: () => !!window.$});

        if (!hasJQuery[0]?.result)
            await executeScript(tabId, {file: "/lib/jquery.js"});
    }

    return executeScript(tabId, options);
};

// add everything from Utils
for (const prop of Object.keys(Utils))
    if (!cmdAPI.hasOwnProperty(prop) && typeof Utils[prop] === "function")
        cmdAPI[prop] = delegate(Utils, Utils[prop]);

// add everything from CmdUtils
for (const prop of Object.keys(CmdUtils))
    if (!cmdAPI.hasOwnProperty(prop) && typeof CmdUtils[prop] === "function")
        cmdAPI[prop] = delegate(CmdUtils, CmdUtils[prop]);

// add missing properties back to CmdUtils
for (const prop of Object.keys(cmdAPI))
    if (!CmdUtils.hasOwnProperty(prop) && typeof cmdAPI[prop] === "function")
        CmdUtils[prop] = delegate(cmdAPI, cmdAPI[prop]);
