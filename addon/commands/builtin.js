import {settings} from "../settings.js";
import {NAMESPACE_BROWSER, NAMESPACE_ISHELL, NAMESPACE_UTILITY} from "./_namespaces.js";
import {noun_type_tab} from "../api/nountypes.js";

CmdUtils.CreateCommand({
    names: ["change-shell-settings", "change-shell-options"],
    uuid: "D6E7CBA7-920D-4F86-910E-63AB3C119906",
    icon: "/ui/icons/settings.svg",

    _namespace: NAMESPACE_ISHELL, // do not set this field in custom commands
    description: "Takes you to the iShell <a href='options.html' target=_blank>settings page</a>.",
    execute: function() {
        CmdUtils.addTab("ui/options/options.html");
    }
});

CmdUtils.CreateCommand({
    names: ["edit-shell-settings", "edit-shell-options"],
    uuid: "3A9CD64F-3D4D-4D90-BA5A-882615672396",
    icon: "/ui/icons/debug.png",
    _hidden: true,
    _namespace: NAMESPACE_ISHELL,
    description: "Live-edit iShell options as text.",
    execute: function() {
        CmdUtils.addTab("ui/options/edit.html?shell-settings");
    }
});

CmdUtils.CreateCommand({
    names: ["view-api-reference"],
    uuid: "3DB11207-1240-41F8-966C-CD77B58C6376",
    icon: "/ui/icons/debug.png",
    _hidden: true,
    _namespace: NAMESPACE_ISHELL,
    description: "View iShell API reference.",
    execute: function() {
        CmdUtils.addTab("ui/options/API.html");
    }
});

CmdUtils.CreateCommand({
    names: ["list-shell-commands", "command-list", "help"],
    uuid: "B8D3B9C2-D8DB-40F3-833F-639588A9EA8D",
    description: "Opens iShell command list page.",
    icon: "/ui/icons/list_table.png",
    _namespace: NAMESPACE_ISHELL,
    preview: "Lists all available commands",
    execute: function() {CmdUtils.addTab("ui/options/commands.html")}
});

CmdUtils.CreateCommand({
    names: ["edit-shell-commands", "hack-ishell"],
    uuid: "07E1ABDD-89BD-4666-8884-3E0B86611CE0",
    icon: "/ui/icons/plugin_edit.png",
    _namespace: NAMESPACE_ISHELL,
    description: "Takes you to the iShell command <a href='edit.html' target=_blank>editor page</a>.",
    execute: function() {
        CmdUtils.addTab("ui/options/edit.html");
    }
});

CmdUtils.CreateCommand({
    names: ["reload-shell"],
    uuid: "E9F2C758-FA25-46F1-90C4-02CB057A3269",
    _namespace: NAMESPACE_ISHELL,
    description: "Reloads iShell extension.",
    icon: "/ui/icons/arrow_refresh.png",
    preview: "Reloads iShell extension.",
    execute: function() {
        chrome.runtime.reload();
    }
});

CmdUtils.CreateCommand({
    names: ["debug-mode"],
    arguments: [{role: "object", nountype: ["on", "off"] , label: "state"}],
    uuid: "810CFA30-3A39-4123-B140-B69C50A2D008",
    description: "Toggles the debug mode.",
    _namespace: NAMESPACE_ISHELL,
    icon: "/ui/icons/debug.png",
    //preview: "Debug the popup window in a separate tab.",
    execute: async function({OBJECT}) {
        if (OBJECT?.text)
            await settings.debug_mode(OBJECT.text === "on");
        else
            await settings.debug_mode(!settings.debug_mode());

        chrome.runtime.reload();
    }
});

CmdUtils.CreateCommand({
    names: ["debug-popup"],
    uuid: "6E788674-71FF-486E-AAD4-7D241670C0FC",
    description: "Debug the popup window in a separate tab.",
    _namespace: NAMESPACE_ISHELL,
    _hidden: true,
    icon: "/ui/icons/debug.png",
    preview: "Debug the popup window in a separate tab.",
    execute: function() {CmdUtils.addTab("/ui/popup.html")}
});

// CmdUtils.CreateCommand({
//     names: ["show-background-page"],
//     uuid: "42B341B1-5D12-4891-962E-4C2BF68DC7E8",
//     description: "Open extension generated background page.",
//     _namespace: NAMESPACE_ISHELL,
//     _hidden: true,
//     icon: "/ui/icons/debug.png",
//     execute: function() {
//         chrome.runtime.getBackgroundPage(p => CmdUtils.addTab(p.location.href));
//     }
// });

cmdAPI.createCommand({
    name: "add-setting",
    uuid: "C6D50448-A345-4FDC-8F4D-F724FAA2D7C2",
    icon: "/ui/icons/properties.png",
    _namespace: NAMESPACE_ISHELL,
    description: "Adds a new dynamic setting.",
    help: `<span class="syntax">Syntax</span>
            <ul class="syntax">
                <li><b>add-setting</b> <i>setting value</i> <b>as</b> <i>setting_key</i></li>
            </ul>`,
    previewDelay: 1000,
    preview: function(pblock, args, storage) {
        if (args.alias && args.alias.text && args.object && args.object.text)
            pblock.text(`Inserts a new dynamic setting <code>${args.alias.text}</code> 
                                with the value: "${args.object.text}".`);
    },
    execute: async function(args, storage) {
        if (args.alias?.text) {
            await settings.load();
            let dynamic_settings = settings.dynamic_settings();
            dynamic_settings[args.alias.text] = args.object.text;
            settings.dynamic_settings(dynamic_settings);
            browser.runtime.sendMessage({type: "ADDED_DYNAMIC_SETTING"});
        }
    }
});

cmdAPI.createCommand({
    name: "install",
    uuid: "DD4AACBD-E042-4F69-81C8-AD4A698F39BC",
    _namespace: NAMESPACE_ISHELL,
    icon: "/ui/icons/install.png",
    arguments: [{role: "object", nountype: noun_arb_text, label: "URL"}],
    description: "Installs a command from GitHub gist.",
    preview: function(display, args) {
        const url = this.getURL(args);
        display.text(`Install commands from <b>${url}</b>`);
    },
    execute: function(args) {
        const url = this.getURL(args);
        cmdAPI.addTab(`/ui/install.html?${encodeURIComponent(url)}`);
    },
    getURL(args) {
        return args.OBJECT?.text || cmdAPI.getLocation();
    }
});

CmdUtils.CreateCommand({
    name: "switch-to-tab",
    uuid: "24616A75-C995-439B-B6F4-F3ED72662C89",
    argument: [{role: "object", nountype: noun_type_tab, label: "tab title or URL"}],
    description: "Switches to the tab whose title or URL matches the input.",
    previewDelay: 100,
    _namespace: NAMESPACE_BROWSER,
    icon: "/ui/icons/tab_go.png",
    execute: function execute({object}) {
        if (object && object.data)
            chrome.tabs.update(object.data.id, {active: true});
    }
});

CmdUtils.CreateCommand({
    name: "close-tab",
    uuid: "26CCB2AC-053B-4C33-91AF-5C1C669901B5",
    argument: [{role: "object", nountype: noun_type_tab, label: "tab title or URL"}],
    description: "Closes the tab whose title or URL matches the input or the current tab if no tab matches.",
    previewDelay: 100,
    _namespace: NAMESPACE_BROWSER,
    icon: "/ui/icons/tab_delete.png",
    execute: function execute({object}) {
        if (!object || !object.data) {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs && tabs[0])
                    chrome.tabs.remove(tabs[0].id, function() { });
                else
                    console.error("closeTab failed because 'tabs' is not set");
            });
        }
        else
            chrome.tabs.remove(object.data.id);
    }
});

CmdUtils.CreateCommand({
    name: "close-all-tabs-with",
    uuid: "FA80916D-08ED-4E97-AF35-5BE34A9ECA00",
    argument: [{role: "object", nountype: noun_arb_text, label: "tab title or URL"}],
    description: "Closes all open tabs that have the given word in common.",
    previewDelay: 100,
    _namespace: NAMESPACE_BROWSER,
    icon: "/ui/icons/tab_delete.png",
    async execute({object: {text}}) {
        const tabs = await noun_type_tab._searchTabs(text);

        for(let tab of tabs)
            chrome.tabs.remove(tab.id);
    }
});

CmdUtils.CreateCommand({
    name: "print",
    uuid: "2909878D-DF99-4FD8-8DA6-FD2B5B7D0756",
    _namespace: NAMESPACE_BROWSER,
    description: "Print the current page.",
    icon: "/ui/icons/print.gif",
    preview: "Print the current page.",
    execute: function (directObj) {
        cmdAPI.executeScript({func: () => window.print()});
    }
});

CmdUtils.CreateCommand({
    name: "invert",
    uuid: "D962E2B8-8ECD-41F9-BC28-ED77594C6A75",
    _namespace: NAMESPACE_BROWSER,
    description: "Inverts all colors on current page. Based on <a target=_blank href=https://stackoverflow.com/questions/4766201/javascript-invert-color-on-all-elements-of-a-page>this</a>.",
    icon: "/ui/icons/invert.png",
    execute: async function execute(){
        cmdAPI.executeScript({file: "/scripts/content_invert.js", jQuery: true});
    },
});

CmdUtils.CreateCommand({
    names: ["base64decode","b64d","atob"],
    uuid: "E5C587CB-5733-463E-80DD-A6D4C085EE53",
    _namespace: NAMESPACE_UTILITY,
    description: "base64decode",
    icon: "/ui/icons/encoding.svg",
    author: {
        name: "rostok",
    },
    license: "GPL",
    arguments: [{role: "object", nountype: noun_arb_text, label: "text"}],
    execute: function execute({object: {text}}) {
        CmdUtils.setSelection(atob(text));
    },
    preview: function preview(pblock, {object: {text}}) {
        pblock.innerHTML = atob(text);
    },
});

CmdUtils.CreateCommand({
    names: ["base64encode","b64e", "btoa"],
    uuid: "A7337919-93A1-48AC-AE1F-B9C322B7169E",
    _namespace: NAMESPACE_UTILITY,
    description: "base64encode",
    icon: "/ui/icons/encoding.svg",
    author: {
        name: "rostok",
    },
    license: "GPL",
    arguments: [{role: "object", nountype: noun_arb_text, label: "text"}],
    execute: function execute({object: {text}}) {
        CmdUtils.setSelection(btoa(text));
    },
    preview: function preview(pblock, {object: {text}}) {
        pblock.innerHTML = btoa(text);
    },
});

CmdUtils.CreateCommand({
    names: ["urldecode"],
    uuid: "C042DDB6-FD05-4CD5-9356-1725C0533568",
    _namespace: NAMESPACE_UTILITY,
    description: "Decode an URL using decodeURIComponent",
    help:  `<span class="syntax">Syntax</span>
            <ul class="syntax">
                <li><b>urldecode</b> <i>URL</i> [<b>by</b> <i>amount</i>]</li>
            </ul>
            <span class="arguments">Arguments</span><br>
            <ul class="syntax">
                <li>- <i>amount</i> - number, number of times to apply decodeURIComponent to the URL.</li>
            </ul>`,
    icon: "/ui/icons/encoding.svg",
    arguments: [{role: "object", nountype: noun_arb_text, label: "text"},
                {role: "cause",  nountype: noun_type_number, label: "amount"}, // by
                ],
    _decode: function(url, n) {
        let s = url;
        for (let i = 0; i < n; ++i)
            s = decodeURIComponent(s);
        return s;
    },
    execute: function execute(args) {
        let n = args.cause && args.cause.text? parseInt(args.cause.text): 1;
        CmdUtils.setSelection(this._decode(args.object.text, n));
    },
    preview: function preview(pblock, args) {
        if (args.object?.text) {
            let n = args.cause?.text ? parseInt(args.cause.text) : 1;
            pblock.innerHTML = this._decode(args.object?.text, n);
        }
    },
});

CmdUtils.CreateCommand({
    names: ["urlencode"],
    uuid: "80F43371-F330-4685-A153-9A493B07A553",
    _namespace: NAMESPACE_UTILITY,
    description: "Encode an URL using encodeURIComponent",
    icon: "/ui/icons/encoding.svg",
    arguments: [{role: "object", nountype: noun_arb_text, label: "text"}],
    execute: function execute({object: {text}}) {
        CmdUtils.setSelection(encodeURIComponent(text));
    },
    preview: function preview(pblock, {object: {text}}) {
        if (text)
            pblock.innerHTML = encodeURIComponent(text);
    },
});

const noun_calc = {
    label: "expression",
    uuid: "F48E9D0A-06AA-499F-B724-7332529D1D8E",
    _parser: new MathParser(),
    suggest: function (txt, htm, cb, si) {
        if (!this._mathlike.test(txt)) return []
        try {
            var result = this._parser.evaluate(txt)
                , score = result === txt ? .3 : 1
        }
        catch (e) {
            result = e.message
            score  = .1
        }
        return [CmdUtils.makeSugg(txt, htm, result, score, si)];
    },
    _mathlike: /^[\w.+\-*\/^%(, )|]+$/,
};

CmdUtils.CreateCommand({
    name: "calculate",
    uuid: "53E7B63A-4084-449F-B142-9D62D82B9772",
    description:
        'Calculates using\
         <a href="http://silentmatt.com/javascript-expression-evaluator/">\
         JavaScript Expression Evaluator</a>.',
    help: "Try: <code>22/7, 3^4^5, sin(sqrt(log(PI)))</code>",
    icon: "/ui/icons/calculator.png",
    _namespace: NAMESPACE_UTILITY,
    author: "satyr",
    license: "Public domain",
    arguments: [{role: "object", nountype: noun_calc, label: "expression"}],
    preview: function (pb, {object: {data, score}}) {
        pb.text(data? (score < .3 ? "<em style='color: red'>" : "<strong>") + data: "");
    },
});


var bitly_api_user = "ubiquityopera";
var bitly_api_key = "R_59da9e09c96797371d258f102a690eab";
CmdUtils.CreateCommand({
    names: ["shorten-url", "bitly"],
    uuid: "6475BAAA-4547-4FF0-BCA7-EE4236F20386",
    _namespace: NAMESPACE_UTILITY,
    icon: "/ui/icons/bitly.png",
    description: "Shorten your URLs with the least possible keystrokes",
    homepage: "http://bit.ly",
    author: {
        name: "Cosimo Streppone",
        email: "cosimo@cpan.org"
    },
    license: "GPL",
    arguments: [{role: "object", nountype: noun_arb_text, label: "text"}],
    preview: async function (pblock, {object: {text}}) {
        this._short_url = undefined;
        let url = "http://api.bit.ly/shorten?version=2.0.1&longUrl={QUERY}&login=" + bitly_api_user
                + "&apiKey=" + bitly_api_key;

        var query = text;
        // Get the url from current open tab if none specified
        if (!query) query = CmdUtils.getLocation();
        if (!query) return;
        var urlString = url.replace("{QUERY}", query);

        // Get the url from current open tab if none specified
        var ajax = await CmdUtils.previewGet(pblock, urlString, ajax => {
            var err_code = ajax.errorCode;
            var err_msg = ajax.errorMessage;
            // Received an error from bit.ly API?
            if (err_code > 0 || err_msg) {
                pblock.innerHTML = '<br/><p style="font-size: 18px; color:orange">'
                    + 'Bit.ly API error ' + err_code + ': ' + err_msg + '</p>';
                return;
            }

            this._short_url = ajax.results[query].shortUrl;
            pblock.text(`Shortened <b>${query}</b> to: 
                                <span style="color: #45BCFF">${this._short_url}</span>. <br><br>
                                Press 'Enter' to copy the result to clipboard.<br>`);
        }, "json");
    },
    execute: async function ({object: {text}}) {
        CmdUtils.setClipboard(this._short_url);
    }
});

// CmdUtils.CreateCommand({
//     name: "isdown",
//     uuid: "48449987-B873-49F5-99B4-7F99662BCA99",
//     _namespace: NAMESPACE_UTILITY,
//     arguments: [{role: "object", nountype: noun_arb_text, label: "URL"}],
//     previewDelay: 1000,
//     icon: "/ui/icons/isdown.ico",
//     description: "Check if selected/typed URL is down.",
//     preview: function (pblock, {object: {text}}) {
//         if (!text)
//             text = CmdUtils.getLocation();
//
//         if (!text)
//             return;
//
//         pblock.text("Checking <b>" + text + "</b>");
//         var urlString = "https://isitdown.site/api/v3/" + encodeURIComponent(text);
//
//         CmdUtils.previewGet(pblock, urlString, (resp) => {
//
//             if (!resp) return;
//             if (resp.isitdown) {
//                 pblock.text('It\'s <b>not</b> just you. The site is <b>down!</b>');
//             } else {
//                 pblock.text('It\'s just you. The site is <b>up!</b>');
//             }
//         }, "json");
//     },
//     execute: async function ({object: {text}}) {
//         if (!text)
//             text = CmdUtils.getLocation();
//
//         if (!text)
//             return;
//
//         CmdUtils.addTab("http://downforeveryoneorjustme.com/" + encodeURIComponent(text));
//     }
// });