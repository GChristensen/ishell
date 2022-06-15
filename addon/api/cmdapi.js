import {settings} from "../settings.js";
import {helperApp} from "../helper_app.js";
import {cmdManager} from "../cmdmanager.js";
import {contextMenuManager} from "../ui/contextmenu.js";
import {delegate} from "../utils.js";
import {executeScript, nativeEval} from "../utils_browser.js";

export const cmdAPI = {
    DEBUG: settings.debug_mode(),
    VERSION: chrome.runtime.getManifest().version,

    // these classes are not part of the original Ubiquity API and are not exposed into the global namespace,
    // although it is nice to get them in the popup through the background page
    __cmdManager: cmdManager,
    __contextMenuManager: contextMenuManager,
    __helperApp: helperApp,

    dbglog(...args) {
        if (cmdAPI.DEBUG) console.log(...args);
    },

    createCommand(options) {
        return cmdManager.createCommand(options);
    },

    objectPreviewList(block, items, fs, css) {
        return CmdUtils.previewList2(block, items, fs, css);
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

cmdAPI.previewFetch = async function(pblock, resource, init) {
    const controller = new AbortController();

    init = init || {};
    init.signal = controller.signal;

    function onPreviewChange() {
        pblock.removeEventListener("preview-change", onPreviewChange, false);
        controller.abort();
    }
    pblock.addEventListener("preview-change", onPreviewChange, false);

    function removePreviewListener() {
        pblock.removeEventListener("preview-change", onPreviewChange, false);
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
    _init = helperApp._injectAuth(_init);

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

        const hasJQuery = await cmdAPI.executeScript(tabId,{func: () => !!window.$});

        if (!hasJQuery[0]?.result)
            await cmdAPI.executeScript(tabId, {file: "/lib/jquery.js"});
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
