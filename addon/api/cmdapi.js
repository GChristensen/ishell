import {settings} from "../settings.js";
import {helperApp} from "../helper_app.js";
import {cmdManager} from "../cmdmanager.js";
import {contextMenuManager} from "../ui/contextmenu.js";
import {delegate} from "../utils.js";
import {nativeEval} from "../utils_browser.js";

export const cmdAPI = {
    // these classes are not part of the original Ubiquity API and are not exposed into the global namespace,
    // although it is nice to get them in the popup through the background page
    __cmdManager: cmdManager,
    __contextMenuManager: contextMenuManager,
    __helperApp: helperApp,

    get settings() {
        return settings.dynamic_settings();
    },

    get activeTab() {
        return CmdUtils.getActiveTab();
    },

    evaluate(javaScript) {
        if (_MANIFEST_V3)
            return nativeEval(javaScript);
        else
            return eval(javaScript);
    },

    reduceTemplate (items, f) {
        return items?.reduce((acc, v, i, arr) => acc + f(v, i, arr), "");
    },

    helperAppProbe(verbose) {
        return helperApp.probe(verbose)
    },

    getHelperAppURL(path) {
        return helperApp.url(path);
    },

    getHelperAppAuth() {
        return helperApp._injectAuth().Authorization;
    },
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


