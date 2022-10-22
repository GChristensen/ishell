export const namespace = new CommandNamespace(CommandNamespace.BROWSER);

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

namespace.createCommand({
    name: "print",
    uuid: "2909878D-DF99-4FD8-8DA6-FD2B5B7D0756",
    description: "Print the current page.",
    icon: "/ui/icons/print.gif",
    preview: "Print the current page.",
    execute: function (directObj) {
        cmdAPI.executeScript({func: () => window.print()});
    }
});

namespace.createCommand({
    name: "new-tab",
    uuid: "12A03E90-FA3B-49C7-BB4F-3301C616915E",
    argument: [{role: "object", nountype: noun_arb_text, label: "URL"},
               {role: "format", nountype: noun_type_container, label: "container"}],
    description: `Opens the given URL (possibly empty) or links in the selection in a new tab. 
                  Use the <b>in</b> argument to specify a Firefox identity container.`,
    icon: "/ui/icons/tab_create.png",
    async execute({object, format}) {
        const cookieStoreId = format?.data?.cookieStoreId;
        let urls = [];

        const html = object?.html || cmdAPI.getHtmlSelection();

        if (html) {
            if (html.startsWith("http"))
                urls = [html];
            else {
                const pageURL = cmdAPI.getLocation();
                const correctedHTML = cmdAPI.absUrl(html, pageURL);
                const matches = correctedHTML.matchAll(/<a[^>]+href=["']?([^"' ]*)/ig);

                for (const [_, url] of matches)
                    urls.push(url);
            }
        }

        if (urls.length)
            for (const url of urls)
                try {
                    const tabOptions = {url};

                    if (cookieStoreId)
                        tabOptions.cookieStoreId = cookieStoreId;

                    await browser.tabs.create(tabOptions);
                }
                catch (e) {
                    console.error(e);
                }
        else {
            const tabOptions = {};

            if (cookieStoreId)
                tabOptions.cookieStoreId = cookieStoreId;

            await browser.tabs.create(tabOptions);
        }
    }
});
