cmdAPI = {
    get settings() {
        return shellSettings.dynamic_settings();
    },
};

{
    function _api_delegate(object, method) {
        return function () {
            return method.apply(object, arguments);
        }
    }

    cmdAPI.makeSugg = _api_delegate(CmdUtils, CmdUtils.makeSugg);
    cmdAPI.matchScore = _api_delegate(CmdUtils, CmdUtils.matchScore);
    cmdAPI.grepSuggs = _api_delegate(CmdUtils, CmdUtils.grepSuggs);
    cmdAPI.createCommand = _api_delegate(CmdUtils, CmdUtils.CreateCommand);
    cmdAPI.makeSearchCommand = _api_delegate(CmdUtils, CmdUtils.makeSearchCommand);
    cmdAPI.previewAjax = _api_delegate(CmdUtils, CmdUtils.previewAjax);
    cmdAPI.previewGet = _api_delegate(CmdUtils, CmdUtils.previewGet);
    cmdAPI.previewPost = _api_delegate(CmdUtils, CmdUtils.previewPost);
    cmdAPI.previewList = _api_delegate(CmdUtils, CmdUtils.previewList);
    cmdAPI.htmlPreviewList = _api_delegate(CmdUtils, CmdUtils.previewList);
    cmdAPI.objectPreviewList = _api_delegate(CmdUtils, CmdUtils.previewList2);
    cmdAPI.renderTemplate = _api_delegate(CmdUtils, CmdUtils.renderTemplate);
    cmdAPI.absUrl = _api_delegate(CmdUtils, CmdUtils.absUrl);
    cmdAPI.copyToClipboard = _api_delegate(CmdUtils, CmdUtils.copyToClipboard);
    cmdAPI.notify = _api_delegate(CmdUtils, CmdUtils.notify);
    cmdAPI.getLocation = _api_delegate(CmdUtils, CmdUtils.getLocation);
    cmdAPI.getSelection = _api_delegate(CmdUtils, CmdUtils.getSelection);
    cmdAPI.getHtmlSelection = _api_delegate(CmdUtils, CmdUtils.getHtmlSelection);
    cmdAPI.setSelection = _api_delegate(CmdUtils, CmdUtils.setSelection);
    cmdAPI.addTab = _api_delegate(CmdUtils, CmdUtils.addTab);
    cmdAPI.paramsToString = _api_delegate(Utils, Utils.paramsToString);
    cmdAPI.urlToParams = _api_delegate(Utils, Utils.urlToParams);
    cmdAPI.parseHtml = _api_delegate(Utils, Utils.parseHtml);
    cmdAPI.escapeHtml = _api_delegate(Utils, Utils.escapeHtml);
    cmdAPI.makeBin = _api_delegate(Utils, Utils.makeBin);
    cmdAPI.getActiveTab = _api_delegate(CmdUtils, CmdUtils.getActiveTab);
}
