let backgroundPage = await browser.runtime.getBackgroundPage();

window.Utils = backgroundPage.Utils;
window.ContextUtils = backgroundPage.ContextUtils;
window.CmdUtils = backgroundPage.CmdUtils;
window.NounUtils = backgroundPage.NounUtils;
window.cmdAPI = backgroundPage.cmdAPI;
