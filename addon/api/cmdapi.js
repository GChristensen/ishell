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

    get settings() {
        return settings.dynamic_settings();
    },

    get activeTab() {
        return CmdUtils.getActiveTab();
    },

    evaluate(javaScript) {
        return (_MANIFEST_V3? nativeEval: eval)(javaScript);
    },

    reduceTemplate (items, f) {
        return items?.reduce((acc, v, i, arr) => acc + f(v, i, arr), "");
    }
};

export const R = cmdAPI.reduceTemplate;

cmdAPI.makeSugg = delegate(NounUtils, NounUtils.makeSugg);
cmdAPI.matchScore = delegate(NounUtils, NounUtils.matchScore);
cmdAPI.grepSuggs = delegate(NounUtils, NounUtils.grepSuggs);
cmdAPI.createCommand = delegate(CmdUtils, CmdUtils.CreateCommand);
cmdAPI.makeSearchCommand = delegate(CmdUtils, CmdUtils.makeSearchCommand);
cmdAPI.previewAjax = delegate(CmdUtils, CmdUtils.previewAjax);
cmdAPI.previewGet = delegate(CmdUtils, CmdUtils.previewGet);
cmdAPI.previewPost = delegate(CmdUtils, CmdUtils.previewPost);
cmdAPI.previewList = delegate(CmdUtils, CmdUtils.previewList);
cmdAPI.htmlPreviewList = delegate(CmdUtils, CmdUtils.previewList);
cmdAPI.objectPreviewList = delegate(CmdUtils, CmdUtils.previewList2);
cmdAPI.renderTemplate = delegate(CmdUtils, CmdUtils.renderTemplate);
cmdAPI.absUrl = delegate(CmdUtils, CmdUtils.absUrl);
cmdAPI.copyToClipboard = delegate(CmdUtils, CmdUtils.copyToClipboard);
cmdAPI.notify = delegate(CmdUtils, CmdUtils.notify);
cmdAPI.getLocation = delegate(CmdUtils, CmdUtils.getLocation);
cmdAPI.getSelection = delegate(CmdUtils, CmdUtils.getSelection);
cmdAPI.getHtmlSelection = delegate(CmdUtils, CmdUtils.getHtmlSelection);
cmdAPI.setSelection = delegate(CmdUtils, CmdUtils.setSelection);
cmdAPI.addTab = delegate(CmdUtils, CmdUtils.addTab);
cmdAPI.paramsToString = delegate(Utils, Utils.paramsToString);
cmdAPI.urlToParams = delegate(Utils, Utils.urlToParams);
cmdAPI.parseHtml = delegate(Utils, Utils.parseHtml);
cmdAPI.escapeHtml = delegate(Utils, Utils.escapeHtml);
cmdAPI.makeBin = delegate(Utils, Utils.makeBin);
cmdAPI.getActiveTab = delegate(CmdUtils, CmdUtils.getActiveTab);

// called when the popup is shown or a context menu command is selected
cmdAPI.__updateActiveTab = async function () {
    CmdUtils.activeTab = null;
    ContextUtils.clearSelection();

    try {
        let tabs = await browser.tabs.query({active: true, currentWindow: true})
        if (tabs.length) {
            let tab = tabs[0];
            if (tab.url.match('^blob://') || tab.url.match('^https?://') || tab.url.match('^file://')) {
                CmdUtils.activeTab = tab;
                await ContextUtils.getSelection(tab.id);
            }
        }
    }
    catch (e) {
        console.error(e);
    }
};

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

    if (!pblock?.__cmdAPIPBlock) {
        _path = pblock;
        _init = path;
    }

    if (!await helperApp.probe()) {
        const error = new Error();
        error.name = "IShellNoHelperApp";
        error.message = "Can not run iShell helper app."
        throw error;
    }

    const url = helperApp.url(path);
    _init = helperApp._injectAuth(init);

    if (pblock?.__cmdAPIPBlock)
        return this.previewFetch(_pblock, url, _init);
    else
        return fetch(url, _init);
}

cmdAPI.executeScript = async function(tabId, options) {
    if (typeof tabId === "object") {
        options = tabId;
        tabId = this.activeTab.id;
    }

    const cmdAPIInjected = await executeScript(tabId, {func: () => !!window.cmdAPI});

    if (!cmdAPIInjected[0].result)
        await injectCMDAPI(tabId);

    return executeScript(tabId, options);
};

cmdAPI.onMessage = function(messageId, handler) {
    const listener = (message, sender) => {
        if (message.__cmdAPIType !== messageId)
            return ;

        browser.runtime.onMessage.removeListener(listener);
        handler(message.payload, sender);
    };

    browser.runtime.onMessage.addListener(listener);
};

cmdAPI.sendMessage = function(tabId, messageId, payload) {
    let _tabId = tabId, _messageId = messageId, _payload = payload;

    if (arguments.length === 2) {
        _tabId = this.activeTab.id;
        _messageId = tabId;
        _payload = messageId;
    }

    if (_tabId)
        browser.tabs.sendMessage(_tabId, {__cmdAPIType: _messageId, payload: _payload});
    else
        browser.runtime.sendMessage({__cmdAPIType: _messageId, payload: _payload});
};

async function injectCMDAPI(tabId) {
    await executeScript(tabId, {func: injectOnMessage});
    await executeScript(tabId, {func: injectSendMessage});
}

function injectOnMessage() {
    if (window.cmdAPI?.onMessage)
        return;

    window.cmdAPI = window.cmdAPI || {};

    window.cmdAPI.onMessage = function(messageId, handler) {
        const listener = (message, sender) => {
            if (message.__cmdAPIType !== messageId)
                return ;

            browser.runtime.onMessage.removeListener(listener);
            handler(message.payload, sender);
        };

        browser.runtime.onMessage.addListener(listener);
    };
}

function injectSendMessage() {
    if (window.cmdAPI?.sendMessage)
        return;

    window.cmdAPI = window.cmdAPI || {};

    window.cmdAPI.sendMessage = function(messageId, payload) {
        browser.runtime.sendMessage({__cmdAPIType: messageId, payload: payload});
    };
}