const ISHELL_SETTINGS_KEY = "shell_settings";
const INSTALL_SETTINGS_KEY = "install-settings";

browser.runtime.onInstalled.addListener(async details => {
    if (details.reason === "install") {
        await writeInstallVersion();
    }
    else if (details.reason === "update") {
        const iShellSettings = (await browser.storage.local.get(ISHELL_SETTINGS_KEY))?.[ISHELL_SETTINGS_KEY] || {};
        await setAnnouncement(iShellSettings);
    }
});

function writeInstallVersion() {
    return browser.storage.local.set({[INSTALL_SETTINGS_KEY]: {
            install_date: Date.now(),
            install_version: _ADDON_VERSION
        }});
}

async function setAnnouncement(iShellSettings) {
    if (/^\d+\.\d+$/.test(_ADDON_VERSION)) {
        iShellSettings["pending_announcement"] = {href: "/ui/options/about.html", text: `What's new in v${_ADDON_VERSION}`};
        return browser.storage.local.set({[ISHELL_SETTINGS_KEY]: iShellSettings});
    }
}