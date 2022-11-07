import {settings} from "../settings.js";
import {helperApp} from "../helper_app.js";

export const namespace = new CommandNamespace(CommandNamespace.ISHELL);

namespace.createCommand({
    names: ["change-shell-settings", "change-shell-options"],
    uuid: "D6E7CBA7-920D-4F86-910E-63AB3C119906",
    icon: "/ui/icons/settings.svg",
    description: "Takes you to the iShell <a href='options.html' target=_blank>settings page</a>.",
    execute: function() {
        CmdUtils.addTab("ui/options/options.html");
    }
});

namespace.createCommand({
    names: ["edit-shell-settings"],
    uuid: "3A9CD64F-3D4D-4D90-BA5A-882615672396",
    icon: "/ui/icons/debug.png",
    _hidden: true,
    _debug: true,
    description: "Live-edit iShell options as text.",
    execute: function() {
        CmdUtils.addTab("ui/options/edit.html?shell-settings");
    }
});

namespace.createCommand({
    names: ["view-api-reference"],
    uuid: "3DB11207-1240-41F8-966C-CD77B58C6376",
    icon: "/ui/icons/debug.png",
    _hidden: true,
    _debug: true,
    description: "View iShell API reference.",
    execute: function() {
        CmdUtils.addTab("ui/options/API.html");
    }
});

namespace.createCommand({
    names: ["open-backend-log"],
    uuid: "60127069-D6C2-41FD-BB9F-C6A459C2DAE8",
    icon: "/ui/icons/debug.png",
    _hidden: true,
    _debug: true,
    description: "Open the log file of the native backend application.",
    execute: async function() {
        const helper = await helperApp.probe(true);

        if (helper)
            CmdUtils.addTab(helperApp.url("/backend_log"));
    }
});

namespace.createCommand({
    names: ["list-shell-commands", "command-list", "help"],
    uuid: "B8D3B9C2-D8DB-40F3-833F-639588A9EA8D",
    description: "Opens iShell command list page.",
    icon: "/ui/icons/list_table.png",
    preview: "Lists all available commands",
    execute: function() {CmdUtils.addTab("ui/options/commands.html")}
});

namespace.createCommand({
    names: ["edit-shell-commands", "hack-ishell"],
    uuid: "07E1ABDD-89BD-4666-8884-3E0B86611CE0",
    icon: "/ui/icons/plugin_edit.png",
    description: "Takes you to the iShell command <a href='edit.html' target=_blank>editor page</a>.",
    execute: function() {
        CmdUtils.addTab("ui/options/edit.html");
    }
});

namespace.createCommand({
    names: ["reload-shell"],
    uuid: "E9F2C758-FA25-46F1-90C4-02CB057A3269",
    description: "Reloads iShell extension.",
    icon: "/ui/icons/arrow_refresh.png",
    preview: "Reloads iShell extension.",
    execute: function() {
        chrome.runtime.reload();
    }
});

namespace.createCommand({
    names: ["debug-mode"],
    arguments: [{role: "object", nountype: ["on", "off"] , label: "state"}],
    uuid: "810CFA30-3A39-4123-B140-B69C50A2D008",
    description: "Toggles the debug mode.",
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

namespace.createCommand({
    names: ["debug-popup"],
    uuid: "6E788674-71FF-486E-AAD4-7D241670C0FC",
    description: "Debug the popup window in a separate tab.",
    _hidden: true,
    _debug: true,
    icon: "/ui/icons/debug.png",
    preview: "Debug the popup window in a separate tab.",
    execute: function() {CmdUtils.addTab("/ui/popup.html")}
});

// namespace.createCommand({
//     names: ["show-background-page"],
//     uuid: "42B341B1-5D12-4891-962E-4C2BF68DC7E8",
//     description: "Open extension generated background page.",
//     _hidden: true,
//     _debug: true,
//     icon: "/ui/icons/debug.png",
//     execute: function() {
//         chrome.runtime.getBackgroundPage(p => CmdUtils.addTab(p.location.href));
//     }
// });

namespace.createCommand({
    name: "add-setting",
    uuid: "C6D50448-A345-4FDC-8F4D-F724FAA2D7C2",
    icon: "/ui/icons/properties.png",
    description: "Adds a new dynamic setting.",
    arguments: [{role: "object",     nountype: noun_arb_text, label: "value"},
                {role: "alias",      nountype: noun_arb_text, label: "key"}, // as
    ],
    help: `<span class="syntax">Syntax</span>
            <ul class="syntax">
                <li><b>add-setting</b> <i>setting value</i> <b>as</b> <i>setting_key</i></li>
            </ul>`,
    previewDelay: 1000,
    preview: function(pblock, args, storage) {
        if (args.alias?.text && args.object?.text)
            pblock.text(`Inserts a new dynamic setting <code>${args.alias.text}</code> 
                                with the value: "${args.object.text}".`);
    },
    execute: async function(args, storage) {
        if (args.alias?.text) {
            await settings.load();
            let dynamic_settings = settings.dynamic_settings();
            dynamic_settings[args.alias.text] = args.object.text;
            await settings.dynamic_settings(dynamic_settings);
            browser.runtime.sendMessage({type: "ADDED_DYNAMIC_SETTING"});
        }
    }
});

namespace.createCommand({
    name: "install",
    uuid: "DD4AACBD-E042-4F69-81C8-AD4A698F39BC",
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