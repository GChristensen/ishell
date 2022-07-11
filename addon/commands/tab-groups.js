export const _namespace = {name: CMD_NS.BROWSER, annotated: true};

const DEFAULT_TAB_GROUP = "default";
const ALL_GROUPS_SPECIFIER = "all";

let CONTAINERS = [];
const noun_type_container = {};

if (browser.contextualIdentities) {
    try {
        CONTAINERS = await browser.contextualIdentities.query({})
        CONTAINERS.forEach(c => noun_type_container[c.name.toLowerCase()] = c.cookieStoreId);
    } catch (e) {
        console.error(e);
    }
}

/**
    @label name
    @nountype
 */
export function noun_type_tab_group(text, html, _, selectionIndices) {
    if (text) {
        const matcher = new RegExp(text, "i");
        const matches = {};

        const suggs = Object.values(this._cmd.deref().tabGroups)
            .filter(i => {
                matches[i.name] = matcher.exec(i.name);
                return i.name && matches[i.name];
            })
            .map(i => cmdAPI.makeSugg(i.name, i.name, null,
                matches[i.name].input? cmdAPI.matchScore(matches[i.name]): .0001,
                selectionIndices
            ));

        const textSugg = cmdAPI.makeSugg(text, html, null, suggs.length ? .001 : 1, selectionIndices);
        if (textSugg)
            suggs.push(textSugg);

        if (suggs.length > 0)
            return suggs;
    }

    return [];
}

/**
    Works best if persistent sessions are enabled in the browser settings.

    # Syntax
    **tab-group** [**all** | *name*] [**to** *operation*] [**in** *container*]

    # Arguments
    - *name* - the name of a tab group to create or to operate on. The current tab group is assumed if not specified.
        The keyword **all** designates all existing tab groups except **default**.
    - *operation* - the operation to perform on a tab group. *switch* is performed the if argument is not specified.
        - *switch* - switch to the tab group with the given name. The tab group will be created if not exists.
        - *close* - close all tabs in the tab group.
        - *delete* - delete the specified tab group.
        - *window* - open all tabs of the tab group in a new window.
        - *move* - move the selected tabs to the tab group.
    - *container* - the account container to use in the tab group.

    # Examples
    - **tab-group** *cats*
    - **tgr** *books* **in** *shopping*
    - **tgr** *books* **to** *delete*
    - **tgr** **all** **to** *close*

    @command tab-group, tgr
    @markdown
    @delay 1000
    @icon /ui/icons/tab-groups.svg
    @description Essential tab group manager.
    @uuid CC6A1FD6-5959-423F-8D77-1C6EF630B0A1
 */
export class TabGroup {
    #tabGroups = {[DEFAULT_TAB_GROUP]: {name: DEFAULT_TAB_GROUP}};
    #recentTabGroup;
    #listenersInstalled;

    constructor(args) {
        noun_type_tab_group._cmd = new WeakRef(this);

        args[OBJECT] = {nountype: noun_type_tab_group, label: "name"}; // object
        //args[FOR]    = {nountype: noun_arb_text, label: "text"}; // subject
        args[TO]     = {nountype: ["switch", "close", "delete", "window", "move"], label: "action"}; // goal
        //args[FROM]   = {nountype: noun_arb_text, label: "text"}; // source
        //args[NEAR]   = {nountype: noun_arb_text, label: "text"}; // location
        //args[AT]     = {nountype: noun_arb_text, label: "text"}; // time
        //args[WITH]   = {nountype: noun_arb_text, label: "text"}; // instrument
        args[IN]     = {nountype: noun_type_container, label: "container"}; // format
        //args[OF]     = {nountype: noun_arb_text, label: "text"}; // modifier
        //args[AS]     = {nountype: noun_arb_text, label: "text"}; // alias
        //args[BY]     = {nountype: noun_arb_text, label: "text"}; // cause
        //args[ON]     = {nountype: noun_arb_text, label: "text"}; // dependency
    }

    get tabGroups() {
        return this.#tabGroups;
    }

    async load(storage) {
        this.#loadState(storage);

        if (Object.keys(this.#tabGroups).length > 1)
            this.#installListeners();
    }

    #installListeners() {
        if (!this.#listenersInstalled) {
            browser.windows.onCreated.addListener(this.#onWindowCreated.bind(this));
            browser.tabs.onCreated.addListener(this.#onTabCreated.bind(this));
            browser.tabs.onAttached.addListener(this.#onTabAttached.bind(this));

            browser.webRequest.onBeforeRequest.addListener(this.#onBeforeTabCreated.bind(this), {
                    urls: ['<all_urls>'],
                    types: [browser.webRequest.ResourceType.MAIN_FRAME],
                },
                [browser.webRequest.OnBeforeRequestOptions.BLOCKING]
            );
        }
    }

    async #onWindowCreated(browserWindow) {
        if (this.#recentTabGroup)
            await this.#setWindowTabGroup(browserWindow, this.#recentTabGroup);
    }

    async #onTabCreated(tab) {
        return this.#addToActiveTabGroup(tab);
    }

    #onTabAttached(tabId, attachInfo) {
        return this.#addToActiveTabGroup({id: tabId});
    }

    #seenWebRequests = new Set();
    async #onBeforeTabCreated(request) {
        if (request.frameId !== 0 || request.tabId === -1 || this.#seenWebRequests.has(request.requestId))
            return {};

        this.#seenWebRequests.add(request.requestId);
        setTimeout(() => this.#seenWebRequests.delete(request.requestId), 2000);

        const tab = await browser.tabs.get(request.tabId);

        if (tab) {
            const windowTabGroup = await this.#getTabWindowTabGroup(tab);
            const tabGroup = this.#tabGroups[windowTabGroup];

            if (windowTabGroup !== DEFAULT_TAB_GROUP && tabGroup.container) {
                const cookieStoreId = tabGroup.container.cookieStoreId;
                if (request.cookieStoreId !== cookieStoreId) {
                    browser.tabs.remove(tab.id);
                    browser.tabs.create({url: request.url, cookieStoreId});
                    return {cancel: true};
                }
            }
        }

        return {};
    }

    async preview({OBJECT: {text: name}, TO: {text: action}, IN}, display, storage) {
        if (name && !action) {
            if (this.#tabGroups[name])
                await this.#listGroupTabs(display, name);
            else
                display.text(this.#describeCreate(name, IN?.text));
        }
        else if (!name && !action) {
            await this.#listGroups(display);
        }
        else if (action) {
            this.#describeAction(display, name, action);
        }
    }

    #isTabGroupExists(name) {
        name = name.toLowerCase();
        const tabGroups = Object.values(this.#tabGroups);
        return !!tabGroups.find(tg => tg.name.toLowerCase() === name)
    }

    #createTabGroup(name) {
        if (!(name in this.#tabGroups)) {
            if (name === ALL_GROUPS_SPECIFIER)
                throw new Error("Can not create group with this name: " + name);

            this.#tabGroups[name] = {name};
        }
    }

    #assignTabGroupContainer(name, container) {
        if (container) {
            container = container.toLowerCase()
            const cookieStoreId = noun_type_container[container];
            if (cookieStoreId)
                this.#tabGroups[name].container = {
                    name: container,
                    cookieStoreId
                };
        }
    }

    #removeTabGroup(name) {
        delete this.#tabGroups[name];
    }

    async #getWindowTabGroup(window) {
        const windowTabGroup = browser.sessions.getWindowValue(window.id, 'tabGroup');
        return windowTabGroup || DEFAULT_TAB_GROUP;
    }

    async #setWindowTabGroup(window, name) {
        return browser.sessions.setWindowValue(window.id, 'tabGroup', name);
    }

    async #getTabWindowTabGroup(tab) {
        const tabWindow = await browser.windows.get(tab.windowId);
        return this.#getWindowTabGroup(tabWindow);
    }

    async #getCurrentWindowTabGroup() {
        const currentWindow = await browser.windows.getCurrent();
        return this.#getWindowTabGroup(currentWindow);
    }

    async #setCurrentWindowTabGroup(name) {
        const currentWindow = await browser.windows.getCurrent();
        return this.#setWindowTabGroup(currentWindow, name);
    }

    async #addToActiveTabGroup(tab) {
        const windowTabGroup = await this.#getTabWindowTabGroup(tab);
        if (windowTabGroup !== DEFAULT_TAB_GROUP)
            await browser.sessions.setTabValue(tab.id, 'tabGroup', windowTabGroup);
    }

    async #addToTabGroup(tab, tabGroup) {
        await browser.sessions.setTabValue(tab.id, 'tabGroup', tabGroup);
    }

    async #getTabGroup(tab) {
        let tabGroup = await browser.sessions.getTabValue(tab.id, 'tabGroup');
        return tabGroup || DEFAULT_TAB_GROUP;
    }

    async #switchToTabGroup(name, activeTab) {
        let windowTabGroup = await this.#getCurrentWindowTabGroup();

        if (windowTabGroup !== name) {
            this.#installListeners();
            await this.#setCurrentWindowTabGroup(name);
            this.#recentTabGroup = name;

            const tabs = await browser.tabs.query({ currentWindow: true });

            const [tabsToHide, tabsToShow] = await this.#separateTabs(tabs, name);

            if (tabsToShow.length) {
                if (activeTab) {
                    await browser.tabs.update(activeTab.id, {active: true});
                }
                else {
                    tabsToShow.sort((a, b) => b.lastAccessed - a.lastAccessed);
                    await browser.tabs.update(tabsToShow[0].id, {active: true});
                }
            }
            else
                await browser.tabs.create({active: true});

            await browser.tabs.hide(tabsToHide.map(t => t.id));
            await browser.tabs.show(tabsToShow.map(t => t.id));
        }
        else if (activeTab) {
            await browser.tabs.update(activeTab.id, {active: true});
        }
    }

    async #separateTabs(tabs, name) {
        const tabsToHide = [];
        const tabsToShow = [];

        await Promise.all(tabs.map(async tab => {
            try {
                const tabGroup = await this.#getTabGroup(tab);

                if (tabGroup !== name)
                    tabsToHide.push(tab);
                else
                    tabsToShow.push(tab);
            } catch (e) {
                console.error(e);
            }
        }));

        return [tabsToHide, tabsToShow];
    }

    async #getGroupTabs(name, currentWindow = true) {
        name = name || DEFAULT_TAB_GROUP;
        const params = {};

        if (currentWindow)
            params.currentWindow = true;

        const tabs = await browser.tabs.query(params);

        const result = [];
        for (const tab of tabs) {
            const tabGroup = await this.#getTabGroup(tab);
            if (tabGroup === name)
                result.push(tab);
        }

        return result;
    }

    async #listGroupTabs(display, name) {
        const tabs = await this.#getGroupTabs(name);

        const cfg = {
            text: t => t.title,
            subtext: t => t.url,
            icon: t => t.favIconUrl || "/ui/icons/globe.svg",
            iconSize: 16,
            action: t => {
                this.#switchToTabGroup(name, t);
                cmdAPI.closeCommandLine();
            }
        };

        const headingStyle = "width: calc(100% - 5px); border-bottom: 1px solid var(--shell-font-color);";
        const heading = `<div style="${headingStyle}">Tabs of the <b>${name}</b> tab group</div>`

        const list = display.objectList(heading, tabs, cfg);
        $(list).find("img.opl-icon").on("error", e => e.target.src = "/ui/icons/globe.svg");
    }

    async #listGroups(display) {
        const windowTabGroup = await this.#getCurrentWindowTabGroup();
        const groupTabs = {};

        let groups = Object.values(this.#tabGroups);
        groups = this.#sortTabGroups(groups);

        let hasContainers = false;
        for (const group of groups) {
            if (group.container)
                hasContainers = true;

            groupTabs[group.name] = {
                windowTabs: await this.#getGroupTabs(group.name),
                allTabs: await this.#getGroupTabs(group.name, false)
            };
        }

        const cfg = {
            text: tg => this.#formatTabGroup(tg.name, groupTabs[tg.name], tg.name === windowTabGroup),
            icon: tg => "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw== ", // transparent 1px gif
            iconStyle: tg => this.#getTabGroupContainerStyle(tg),
            iconSize: 16,
            action: tg => {
                this.#switchToTabGroup(tg.name);
                cmdAPI.closeCommandLine();
            }
        };

        if (!hasContainers)
            delete cfg.icon;

        const headingStyle = "width: calc(100% - 5px); border-bottom: 1px solid var(--shell-font-color);";
        const heading = `<div style="${headingStyle}">Tab groups</div>`

        display.objectList(heading, groups, cfg);
    }

    #sortTabGroups(groups) {
        const defaultGroupIdx = groups.findIndex(g => g.name === DEFAULT_TAB_GROUP);
        const defaultGroup = groups[defaultGroupIdx];
        groups.splice(defaultGroupIdx, 1);
        groups.sort((a, b) =>
            a.name.localeCompare(b.name, undefined, {sensitivity: 'base'}))
        return [defaultGroup, ...groups];
    }

    #getTabGroupContainerStyle(tabGroup) {
        let container;
        let iconUrl = "resource://usercontext-content/circle.svg";
        let iconColor = "gray";

        if (tabGroup.container) {
            container = CONTAINERS.find(c => c.cookieStoreId === tabGroup.container.cookieStoreId);
            iconUrl = container.iconUrl;
            iconColor = container.colorCode;
        }

        return `mask-image: url('${iconUrl}'); mask-size: 16px 16px; `
             + `mask-repeat: no-repeat; mask-position: center; background-color: ${iconColor};`
    }

    #formatTabGroup(name, tabs, active) {
        let tabCount;
        const dualCount = tabs.windowTabs.length !== tabs.allTabs.length
        if (dualCount)
            tabCount = `(${tabs.windowTabs.length}/${tabs.allTabs.length})`;
        else
            tabCount = `(${tabs.allTabs.length})`;

        const countTitle = dualCount? "window/total": "total";

        const color = active? "#FF52DF": "#0F0";
        name = `<span style="color: ${color}">${name}</span>`;
        name = name + ` <span style="color: var(--opl-text-color)" title="${countTitle}">${tabCount}</span>`
        return name;
    }

    #describeCreate(name, container) {
        if (container)
            container = ` in the <b>${container}</b> container`;
        return `Create the <b>${name}</b> tab group${container}.`;
    }

    #describeAction(display, name, action) {
        let html = "";

        switch (action) {
            case "close":
               html = this.#describeClose(name);
               break;
            case "delete":
                html = this.#describeDelete(name);
                break;
            case "window":
                html = this.#describeWindow(name);
                break;
            case "move":
                html = this.#describeMove(name);
                break;
        }

        display.text(html);
    }

    #describeClose(name) {
        if (name) {
            if (name === ALL_GROUPS_SPECIFIER)
                return `Close all tabs in all tab groups.`;
            else
                return `Close all tabs in the <b>${name}</b> tab group.`;
        }
        else
            return `Close all tabs in the current tab group.`;
    }

    #describeDelete(name) {
        if (name) {
            if (name === ALL_GROUPS_SPECIFIER)
                return `Delete all tab groups except <b>default</b>.`;
            else
                return `Delete the <b>${name}</b> tab group and close all its tabs.`;
        }
        else
            return `Delete the current tab group and close all its tabs.`;
    }

    #describeWindow(name) {
        if (name)
            return `Move all tabs from the <b>${name}</b> tab group to a new window.`;
        else
            return `Move all tabs from the current tab group to a new window.`;
    }

    #describeMove(name) {
        if (name)
            return `Move selected tabs to the <b>${name}</b> tab group.`;
        else
            return `Specify a tab group name to move to.`;
    }

    async #performAction(name, action) {
        switch (action) {
            case "switch":
                await this.#switchToTabGroup(name)
                break;
            case "close":
                await this.#closeTabGroup(name);
                break;
            case "delete":
                await this.#deleteTabGroup(name);
                break;
            case "window":
                await this.#tabGroupInNewWindow(name);
                break;
            case "move":
                await this.#moveSelectedTabsToGroup(name);
                break;
        }
    }

    async #closeTabGroup(name) {
        const currentWindowTabGroup = await this.#getCurrentWindowTabGroup();

        let tabs;
        if (name) {
            if (name === ALL_GROUPS_SPECIFIER)
                tabs = await browser.tabs.query({});
            else
                tabs = await this.#getGroupTabs(name, false);
        }
        else
            tabs = await this.#getGroupTabs(currentWindowTabGroup, false);

        if (currentWindowTabGroup === name || ALL_GROUPS_SPECIFIER === name)
            await browser.tabs.create({active: true});

        await browser.tabs.remove(tabs.map(t => t.id));
    }

    async #deleteTabGroup(name) {
        const currentWindowTabGroup = await this.#getCurrentWindowTabGroup();
        name = name || currentWindowTabGroup;

        if (name !== DEFAULT_TAB_GROUP) {
            if (name === ALL_GROUPS_SPECIFIER) {
                let groups = Object.values(this.#tabGroups);
                groups = groups.filter(g => g.name !== DEFAULT_TAB_GROUP);

                await this.#switchToTabGroup(DEFAULT_TAB_GROUP);

                for (const group of groups) {
                    this.#removeTabGroup(group.name);
                    await this.#closeTabGroup(group.name);
                }
            }
            else {
                this.#removeTabGroup(name);

                if (name === currentWindowTabGroup)
                    await this.#switchToTabGroup(DEFAULT_TAB_GROUP);

                await this.#closeTabGroup(name);
            }
        }
    }

    async #tabGroupInNewWindow(name) {
        const currentWindowTabGroup = await this.#getCurrentWindowTabGroup();
        name = name || currentWindowTabGroup;

        const currentWindow = await browser.windows.getCurrent();
        const tabs = await this.#getGroupTabs(name, false);

        if (tabs.length) {
            const newWindow = await browser.windows.create({});
            await browser.sessions.setWindowValue(newWindow.id, 'tabGroup', name);

            const windowTabs = await browser.tabs.query({windowId: newWindow.id});
            if (name === currentWindowTabGroup)
                browser.tabs.create({windowId: currentWindow.id});

            await browser.tabs.move(tabs.map(t => t.id), {windowId: newWindow.id, index: -1});
            await browser.tabs.remove(windowTabs.map(t => t.id));
        }
    }

    async #moveSelectedTabsToGroup(name) {
        const windowTabs = await browser.tabs.query({currentWindow: true});
        const selectedTabs = await browser.tabs.query({highlighted: true, currentWindow: true});
        const currentWindowTabGroup = await this.#getCurrentWindowTabGroup();

        if (name !== currentWindowTabGroup) {
            for (const tab of selectedTabs)
                await this.#addToTabGroup(tab, name);

            if (windowTabs.length === selectedTabs.length)
                browser.tabs.create({});

            browser.tabs.hide(selectedTabs.map(t => t.id));
        }
    }

    #saveState(storage) {
        const state = {
            tabGroups: this.#tabGroups,
            recentTabGroup: this.#recentTabGroup
        };

        storage.state(state);
    }

    #loadState(storage) {
        const state = storage.state();

        if (state) {
            this.#tabGroups = state.tabGroups;
            this.#recentTabGroup = state.recentTabGroup;
        }
    }

    async execute({OBJECT: {text: name}, TO: {text: action}, IN}, storage) {
        if (name && !action) {
            if (!this.#isTabGroupExists(name))
                this.#createTabGroup(name);

            this.#assignTabGroupContainer(name, IN?.text);
            await this.#switchToTabGroup(name);
            this.#saveState(storage);
        }
        else if (action) {
            await this.#performAction(name, action);
            this.#saveState(storage);
        }
    }

}
