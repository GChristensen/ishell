import {settings} from "../settings.js";

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
    name: "clear-browser-cache",
    uuid: "8C996B34-8557-4A68-BDD2-0F1E91146D42",
    description: `Clears the browser cache.`,
    icon: "/ui/icons/broom.svg",
    async execute() {
        await browser.browsingData.removeCache({});
        cmdAPI.notify(`Successfully cleared browser cache.`);
    }
});

namespace.createCommand({
    name: "clear-site-cookies",
    uuid: "39E722D2-9ACB-4F56-82E7-E1BD58C0DC34",
    description: `Clears cookies and local storage of the currently opened site.`,
    icon: "/ui/icons/broom.svg",
    async execute() {
        const url = cmdAPI.getLocation();

        if (url) {
            const removalOptions = {};
            const tab = cmdAPI.activeTab;

            if (settings.platform.firefox)
                removalOptions.hostnames = this.getURLHosts(url);
            else
                removalOptions.origins = this.getURLHosts(url, true);

            if (tab.cookieStoreId)
                removalOptions.cookieStoreId = tab.cookieStoreId;

            await browser.browsingData.removeCookies(removalOptions);
            await browser.browsingData.removeLocalStorage(removalOptions);
            cmdAPI.notify(`Successfully cleared cookies for ${new URL(url).host}`);
        }
        else
            cmdAPI.notify("Can not access the current site cookies.");
    },
    getURLHosts(url, origin) {
        const result = [];
        const parsedURL = new URL(url);

        if (origin)
            result.push(parsedURL.origin);
        else
            result.push(parsedURL.hostname);

        if (parsedURL.host.startsWith("www.")) {
            const bareHost = parsedURL.host.replace(/^www\./i, "");
            const bareHostName = parsedURL.hostname.replace(/^www\./i, "");

            if (origin)
                result.push(parsedURL.protocol + bareHost);
            else
                result.push(bareHostName);
        }

        return result;
    }
});

if (settings.platform.firefox)
    namespace.createCommand({
        name: "search",
        uuid: "185E207C-7C41-42F7-ACDD-F15AF5889738",
        arguments: [
            {role: "object",     nountype: noun_arb_text, label: "text"},
            {role: "instrument", nountype: noun_type_search, label: "engine"}, // with
            {role: "alias",      nountype: ["quoted"], label: "option"}, // as
        ],
        description: "Search for the entered text or selection with the given search engine.",
        help: `<div class="syntax"><h1 id="syntax">Syntax</h1>
                 <p><strong>search</strong> [<em>text</em>] [<strong>with</strong> <em>engine</em>] [<strong>as</strong> <em>option</em>]</p>
                 <h1 id="arguments">Arguments</h1>
                 <ul>
                   <li><em>text</em> - arbitrary text to search for. Selection is used if omitted.</li>
                   <li><em>engine</em> - name of the search engine.</li>
                   <li><em>option</em> - Search options. Can be:
                     <ul>
                        <li><em>quoted</em> - wrap the <em>text</em> with quotes.</li> 
                     </ul>
                   </li>
                 </ul>
                 <h1 id="examples">Examples</h1>
                 <ul>
                   <li><strong>search</strong> <strong>with</strong> <em>duck</em> <strong>as</strong> <em>q</em></li>
                 </ul>
               </div>`,
        icon: "/ui/icons/search.png",

        async preview(pblock, args, storage) {
            if (args.object?.text || args.instrument?.data?.name) {
                this.applyOptions(args);

                const engine = await this.getSearchEngine(args);
                const description = `Search <b>${args.object?.text || ""}</b> with <b>${engine.name}</b>`;

                pblock.text(description);
            }
            else
                this.previewDefault(pblock);
        },

        async execute(args, storage) {
            if (args.object?.text || args.instrument?.data) {
                const engine = await this.getSearchEngine(args);
                browser.search.search({query: args.object?.text, engine: engine.name});
            }
        },

        applyOptions(args) {
            if (args.object?.text && args.alias?.text === "quoted") {
                args.object.text = `"${args.object.text}"`;
            }
        },

        async getSearchEngine(args) {
            let engine = args.instrument?.data;

            if (!engine) {
                const engines = await browser.search.get();
                engine = engines.find(e => e.isDefault);
            }

            return engine;
        }
    });
