chrome.runtime.onInstalled.addListener(async details => {
    const settingsModule = await import("./settings.js");
    const settings = settingsModule.settings;
    await settings.load();

    if (details.reason === "install") {
        settings.install_date(Date.now());
        settings.install_version(browser.runtime.getManifest().version);
    }
    else if (details.reason === "update") {
        //settings.pending_announcement({href: "/ui/options/about.html", text: "What's new in v0.5"});
    }
});