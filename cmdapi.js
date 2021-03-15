cmdAPI = {
    get settings() {
        return shellSettings.dynamic_settings();
    },

    get activeTab() {
        return CmdUtils.getActiveTab();
    },
};

{
    let delegate = (object, method) => {
        return function () {
            return method.apply(object, arguments);
        }
    }

    cmdAPI.makeSugg = delegate(CmdUtils, CmdUtils.makeSugg);
    cmdAPI.matchScore = delegate(CmdUtils, CmdUtils.matchScore);
    cmdAPI.grepSuggs = delegate(CmdUtils, CmdUtils.grepSuggs);
    cmdAPI.createCommand = delegate(CmdManager, CmdManager.createCommand);
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
            let response = await fetch(resource, init);

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
}

