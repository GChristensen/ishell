let backgroundPage = await browser.runtime.getBackgroundPage();

window._BACKGROUND_API = {};

window.Utils = window._BACKGROUND_API.Utils = backgroundPage.Utils;
window.ContextUtils = window._BACKGROUND_API.ContextUtils = backgroundPage.ContextUtils;
window.CmdUtils = window._BACKGROUND_API.CmdUtils = backgroundPage.CmdUtils;
window.NounUtils = window._BACKGROUND_API.NounUtils = backgroundPage.NounUtils;
window.cmdAPI = window._BACKGROUND_API.cmdAPI = backgroundPage.cmdAPI;
