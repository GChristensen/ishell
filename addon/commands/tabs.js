export const namespace = new CommandNamespace(CommandNamespace.TABS);

namespace.createCommand({
    name: "switch-to-tab",
    uuid: "24616A75-C995-439B-B6F4-F3ED72662C89",
    argument: [{role: "object", nountype: noun_type_tab, label: "tab title or URL"}],
    description: "Switches to the tab whose title or URL matches the input.",
    previewDelay: 100,
    icon: "/ui/icons/tab_go.png",
    execute: function execute({object}) {
        if (object && object.data)
            chrome.tabs.update(object.data.id, {active: true});
    }
});

namespace.createCommand({
    name: "close-tab",
    uuid: "26CCB2AC-053B-4C33-91AF-5C1C669901B5",
    argument: [{role: "object", nountype: noun_type_tab, label: "tab title or URL"}],
    description: "Closes the tab whose title or URL matches the input or the current tab if no tab matches.",
    previewDelay: 100,
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

namespace.createCommand({
    name: "close-all-tabs-with",
    uuid: "FA80916D-08ED-4E97-AF35-5BE34A9ECA00",
    argument: [{role: "object", nountype: noun_arb_text, label: "tab title or URL"}],
    description: "Closes all open tabs that have the given word in common.",
    previewDelay: 100,
    icon: "/ui/icons/tab_delete.png",
    async execute({object: {text}}) {
        const tabs = await noun_type_tab._searchTabs(text);

        for(let tab of tabs)
            chrome.tabs.remove(tab.id);
    }
});
