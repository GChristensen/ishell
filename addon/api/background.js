// It seems that the linter at AMO does not allow top-level await in assignments
await (async function() {
    let backgroundPage = await browser.runtime.getBackgroundPage();

    globalThis._BACKGROUND_API = backgroundPage._BACKGROUND_API;

    globalThis.Utils = globalThis._BACKGROUND_API.Utils = backgroundPage.Utils;
    globalThis.ContextUtils = globalThis._BACKGROUND_API.ContextUtils = backgroundPage.ContextUtils;
    globalThis.CmdUtils = globalThis._BACKGROUND_API.CmdUtils = backgroundPage.CmdUtils;
    globalThis.NounUtils = globalThis._BACKGROUND_API.NounUtils = backgroundPage.NounUtils;
    globalThis.cmdAPI = globalThis._BACKGROUND_API.cmdAPI = backgroundPage.cmdAPI;
})();


