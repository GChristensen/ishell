import {injectModules, merge} from "./utils.js";

if (!globalThis.browser)
    await injectModules(["./lib/browser-polyfill.js"]);

const BROWSER = globalThis.browser || globalThis.chrome;
const ISHELL_SETTINGS_KEY = "shell_settings";

class IShellSettings {
    constructor() {
        this._default = {
            max_history_items: 20,
            max_suggestions: 5,
            remember_context_menu_commands: false,
            template_syntax: "class",
            last_editor_namespace: "default",
            dynamic_settings: {
                lingvo_api_key: "NGNmNTVlNzUtNzg2MS00ZWE1LWIzNWItNjNlMTAyZTM5YmRlOmM3NTg3MDY2Y2MyMDQxY2E4NTQ0MDZhOTQyYTcxMTk2",
                bing_translator_api_v3_key: "",
                youtube_search_api_key: "",
                google_cse_api_key: "",
                google_cse_api_id: ""
            }
        };

        this._bin = {};
        this._key = ISHELL_SETTINGS_KEY;
    }

    async _loadPlatform() {
        if (!this._platform) {
            const platformInfo = await BROWSER.runtime.getPlatformInfo();
            this._platform = {[platformInfo.os]: true};
            if (navigator.userAgent.indexOf("Firefox") >= 0) {
                this._platform.firefox = true;
            }
        }
    }

    async _loadSettings() {
        const object = await BROWSER.storage.local.get(this._key);
        this._bin = merge(object?.[this._key] || {}, this._default);
        this._bin.dynamic_settings = merge(this._bin.dynamic_settings, this._default.dynamic_settings);
    }

    _load() {
        return this._loadPlatform().then(() => this._loadSettings());
    }

    async _save() {
        return BROWSER.storage.local.set({[this._key]: this._bin});
    }

    async _get(k) {
        const v = await BROWSER.storage.local.get(k);
        if (v)
            return v[k];
        return null;
    }

    async _set(k, v) { return BROWSER.storage.local.set({[k]: v}) }

    _setAddonUpdated() {
        localStorage.setItem("ishell-updated", "true");
    }

    _isAddonUpdated() {
        const updated = localStorage.getItem("ishell-updated") === "true";
        localStorage.setItem("ishell-updated", "false");
        return updated;
    }

    get(target, key, receiver) {
        if (key === "load")
            return v => this._load();
        else if (key === "default")
            return this._default;
        else if (key === "platform")
            return this._platform;
        else if (key === "get")
            return this._get;
        else if (key === "set")
            return this._set;
        else if (key === "setAddonUpdated")
            return this._setAddonUpdated;
        else if (key === "isAddonUpdated")
            return this._isAddonUpdated;

        return val => {
            let bin = this._bin;

            if (val === undefined)
                return bin[key];

            let deleted;
            if (val === null) {
                deleted = bin[key];
                delete bin[key]
            }
            else
                bin[key] = val;

            let result = key in bin? bin[key]: deleted;
            return this._save().then(() => result);
        }
    }

    has(target, key) {
        return key in this._bin;
    }

    * enumerate() {
        for (let key in this._bin) yield key;
    }
}

export const settings = new Proxy({}, new IShellSettings());

chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (changes[ISHELL_SETTINGS_KEY])
        settings.load();
});

await settings.load();

