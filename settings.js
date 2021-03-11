let SettingsBinHandler = {
    get(target, key) {
        if (key === "load")
            return target.__load__;
        else if (key === "get")
            return target.__global_get__;
        else if (key === "set")
            return target.__global_set__;

        return (val, handler) => {
            let bin = target.__bin__;
            if (val === void 0) return bin[key];
            if (val === null) {
                var old = bin[key];
                delete bin[key]
            }
            else bin[key] = val;
            chrome.storage.local.set({[target.__key__]: bin}, () => handler? handler(): null);
            return key in bin ? bin[key] : old
        }
    },
    has(target, key) {
        return key in target.__bin__;
    },
    * enumerate(target) {
        for (let key in target.__bin__) yield key;
    },
};

const SETTING_KEY = "shell_settings";
const DEFAULT_SETTINGS = {
    max_history_items: 20,
    max_suggestions: 5,
    remember_context_menu_commands: false,
    dynamic_settings: {
        lingvo_api_key: "NGNmNTVlNzUtNzg2MS00ZWE1LWIzNWItNjNlMTAyZTM5YmRlOmM3NTg3MDY2Y2MyMDQxY2E4NTQ0MDZhOTQyYTcxMTk2",
        bing_translator_api_v3_key: "",
        youtube_search_api_key: "",
        google_cse_api_key: "",
        google_cse_api_id: ""
    }
};

shellSettings = new Proxy({
    __proto__ : null,
    __key__   : SETTING_KEY,
    __bin__   : DEFAULT_SETTINGS,
    __load__  : function(f) {
        chrome.storage.local.get(SETTING_KEY, object => {
            shellSettings.__bin__ = object[SETTING_KEY]? object[SETTING_KEY]: DEFAULT_SETTINGS;
            if (f) f(this);
        });
    },
    __global_get__ : async function(k) {
        const v = await browser.storage.local.get(k);
        if (v)
            return v[k];
        return null;
    },
    __global_set__ : async function(k, v) { return browser.storage.local.set({[k]: v}) }
}, SettingsBinHandler);

//shellSettings.load();

chrome.storage.onChanged.addListener(function (changes,areaName) {
    shellSettings.load();
});
