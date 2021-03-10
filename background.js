CmdUtils.deblog("iShell v" + CmdUtils.VERSION + " background script says hello");

shellSettings.load(settings => {
    CmdUtils.DEBUG = !!settings.debug_mode();
    CmdManager.commands = CmdManager.commands.filter(cmd => CmdUtils.DEBUG || !cmd._hidden);

    CmdManager.loadCustomScripts(() => {
        let disabledCommands = settings.disabled_commands();

        if (disabledCommands)
            for (let cmd of CmdManager.commands) {
                if (cmd.name in disabledCommands)
                    cmd.disabled = true;
            }

        for (cmd of CmdManager.commands) {
            try {
                if (cmd.load) {
                    CmdManager.initCommand(cmd, cmd.load);
                }
            }
            catch (e) {
                console.log(e.message);
            }
        }
    });

    if (!settings.dynamic_settings())
        settings.dynamic_settings({
            lingvo_api_key: "NGNmNTVlNzUtNzg2MS00ZWE1LWIzNWItNjNlMTAyZTM5YmRlOmM3NTg3MDY2Y2MyMDQxY2E4NTQ0MDZhOTQyYTcxMTk2",
            bing_translator_api_v3_key: "",
            youtube_search_api_key: "",
            google_cse_api_key: "",
            google_cse_api_id: ""
        });
});

chrome.i18n.getAcceptLanguages(ll => CmdUtils.acceptLanguages = ll);

// setup selection event sink
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (CmdUtils.DEBUG) {
        //console.log("got message: ", request.message, request.data, request.event );
        //CmdUtils.notify(request.data, request.message+" / "+request.event );
    }
    switch (request.message) {
        case 'selection':
            CmdUtils.selectedText = request.data.text || "";
            CmdUtils.selectedHtml = request.data.html || "";
            break;

        default:
            sendResponse({data: 'Invalid arguments'});
            break;
    }
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    //if (CmdUtils.DEBUG) if (tab) console.log("onUpdated", tab.url);
    CmdUtils.updateActiveTab();
});

chrome.tabs.onActivated.addListener(function (actInfo) {
    //if (CmdUtils.DEBUG) console.log("onActivated", actInfo);
    CmdUtils.updateActiveTab();
});

chrome.tabs.onHighlighted.addListener(function (higInfo) {
    //if (CmdUtils.DEBUG) console.log("onHighlighted", higInfo);
    CmdUtils.updateActiveTab();
});