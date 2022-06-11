import {settings} from "../settings.js";
import {helperApp} from "../helper_app.js";
import {CmdUtils} from "./cmdutils.js";
import {cmdManager} from "../cmdmanager.js";
import {contextMenuManager} from "../ui/contextmenu.js";

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

function delegate (object, method) {
    return function () {
        return method.apply(object, arguments);
    }
}

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


async function nativeEval(text) {
    const key = crypto.randomUUID();
    const pullURL = helperApp.url(`/pull_script/${key}`);

    var rejecter;
    var errorListener = error => {
        if (error.filename?.startsWith(pullURL)) {
            window.removeEventListener("error", errorListener);
            rejecter(error.error)
        }
    }

    text = `{\n${text}\n}`;
    await helperApp.post("/push_script", {text, key});

    const script = jQuery("<script>")
        .attr({crossorigin: "anonymous"})
        .prop({src: pullURL});

    window.addEventListener("error", errorListener);

    document.head.appendChild(script[0]);
    script.remove();

    return {error: new Promise((resolve, reject) => {
            rejecter = reject;

            setTimeout(() => {
                window.removeEventListener("error", errorListener);
                resolve(true);
            }, 1000);
        })};
}