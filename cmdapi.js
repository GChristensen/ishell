cmdAPI = {
    get settings() {
        return shellSettings.dynamic_settings();
    },
};

{
    function delegate(object, method) {
        return function () {
            return method.apply(object, arguments);
        }
    }

    cmdAPI.makeSugg = delegate(CmdUtils, CmdUtils.makeSugg);
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
    cmdAPI.getCommandLine = delegate(CmdUtils, CmdUtils.getCommandLine);
    cmdAPI.setCommandLine = delegate(CmdUtils, CmdUtils.setCommandLine);
}
