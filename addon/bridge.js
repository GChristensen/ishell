
// for use in nountypes.js loaded from editor
if (!window.CmdUtils) {
    window.CmdUtils = {NounType: () => ({_list: [], default: []})};
    window.NounUtils = {makeSugg: () => ({})};
}

async function initializeIShellAPI() {
    let backgroundPage = await browser.runtime.getBackgroundPage();

    window.Utils = backgroundPage.Utils;
    window.CmdUtils = backgroundPage.CmdUtils;
    window.NounUtils = backgroundPage.NounUtils;
    window.CmdManager = backgroundPage.CmdManager;
    window.DBStorage = backgroundPage.DBStorage;
    window.cmdAPI = backgroundPage.cmdAPI;
}