async function initializeIShellAPI() {
    let backgroundPage = await browser.runtime.getBackgroundPage();

    window.Utils = backgroundPage.Utils;
    window.CmdUtils = backgroundPage.CmdUtils;
    window.CmdManager = backgroundPage.CmdManager;
    window.DBStorage = backgroundPage.DBStorage;
    window.cmdAPI = backgroundPage.cmdAPI;
}