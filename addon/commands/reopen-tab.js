import {settings} from "../settings.js";

export const namespace = new AnnotatedCommandNamespace(CommandNamespace.TABS);

const CLOSED_TABS_KEY = "closed-tabs"; // maintained by /closed_tabs.js in the background
const DEFAULT_ICON = "/ui/icons/globe.svg";

/**
    # Syntax
    **reopen-tab** [*filter*] [**by** *amount*]

    # Arguments
    - *filter* - arbitrary text, filters closed tabs by title or URL if specified.
    - *amount* - number, specifies the maximum amount of listed items.

    # Examples
    - **reopen-tab** *news* **by** *10*

    Click a list item to reopen the tab. Press Enter to reopen the most recently closed tab that matches the filter.

    @command
    @markdown
    @author g/christensen
    @delay 500
    @icon /ui/icons/tab_create.png
    @description Lists recently closed tabs and reopens the selected one.
    @uuid FD95E4CC-F471-4597-A520-18A125A7E08F
*/
export class ReopenTab {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "title or url"}; // object
        args[BY]     = {nountype: noun_type_number, label: "amount"}; // cause
    }

    async preview({OBJECT, BY}, display, storage) {
        const closedTabs = await this.#getClosedTabs(OBJECT?.text, BY?.data);

        if (closedTabs.length === 0)
            display.text("No recently closed tabs.");
        else {
            const list = display.objectList(closedTabs, {
                text: t => Utils.escapeHtml(t.title || t.url),
                subtext: t => t.title? Utils.escapeHtml(t.url): null,
                icon: t => Utils.escapeHtml(t.favIconUrl || DEFAULT_ICON),
                iconSize: 16,
                action: async (t, e) => {
                    await this.#reopen(t);
                    $(e?.target).closest("li").remove();
                }
            });
            $(list).find("img.opl-icon").on("error", e => e.target.src = DEFAULT_ICON);
        }
    }

    async execute({OBJECT, BY}, storage) {
        const [closedTab] = await this.#getClosedTabs(OBJECT?.text, 1);

        if (closedTab)
            await this.#reopen(closedTab, true);
    }

    async #getClosedTabs(filter, maxResults) {
        maxResults = maxResults || settings.max_history_items() || 50;

        const loggedTabs = (await browser.storage.local.get(CLOSED_TABS_KEY))?.[CLOSED_TABS_KEY] || [];
        let closedTabs = [...await this.#getSessionTabs(), ...loggedTabs]
            .filter(t => t.url && !/^(about|chrome|edge):(newtab|blank|home)/i.test(t.url));

        // prefer session entries, which are restored with their navigation history
        closedTabs.sort((a, b) => b.closedAt - a.closedAt || !!b.sessionId - !!a.sessionId);

        // skip duplicates and tabs whose URL is currently open
        const openTabs = await browser.tabs.query({});
        const urls = new Set(openTabs.map(t => t.url));
        closedTabs = closedTabs.filter(t => !urls.has(t.url) && urls.add(t.url));

        if (filter) {
            filter = filter.toLowerCase();
            closedTabs = closedTabs.filter(t => t.url.toLowerCase().includes(filter)
                                                || t.title?.toLowerCase().includes(filter));
        }

        return closedTabs.slice(0, maxResults);
    }

    async #getSessionTabs() {
        let sessions = [];

        try {
            sessions = await browser.sessions.getRecentlyClosed();
        }
        catch (e) {
            console.error(e);
        }

        const tabs = [];
        for (const session of sessions) {
            // Chrome reports the time in seconds, Firefox in milliseconds
            const closedAt = session.lastModified < 1e12? session.lastModified * 1000: session.lastModified;

            if (session.tab)
                tabs.push({...this.#sessionTab(session.tab), closedAt, sessionId: session.tab.sessionId});
            else if (session.window?.tabs)
                tabs.push(...session.window.tabs.map(t => ({...this.#sessionTab(t), closedAt})));
        }

        return tabs;
    }

    #sessionTab(tab) {
        return {url: tab.url, title: tab.title, favIconUrl: tab.favIconUrl};
    }

    async #reopen(closedTab, active = ContextUtils.arrowSelection) {
        let restored = false;

        if (closedTab.sessionId)
            try {
                await browser.sessions.restore(closedTab.sessionId);
                restored = true;
            }
            catch (e) {
                console.error(e);
            }

        if (!restored)
            await browser.tabs.create({url: closedTab.url, active});

        await this.#forget(closedTab.url);
    }

    async #forget(url) {
        const loggedTabs = (await browser.storage.local.get(CLOSED_TABS_KEY))?.[CLOSED_TABS_KEY] || [];
        await browser.storage.local.set({[CLOSED_TABS_KEY]: loggedTabs.filter(t => t.url !== url)});
    }
}
