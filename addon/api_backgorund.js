let backgroundPage = await browser.runtime.getBackgroundPage();

window.Utils = backgroundPage.Utils;
window.CmdUtils = backgroundPage.CmdUtils;
window.NounUtils = backgroundPage.NounUtils;
window.DBStorage = backgroundPage.DBStorage;
window.cmdAPI = backgroundPage.cmdAPI;
