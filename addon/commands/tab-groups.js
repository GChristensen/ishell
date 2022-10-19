import {cmdManager} from "../cmdmanager.js";

export const namespace = new CommandNamespace(CommandNamespace.BROWSER, true);

const DEFAULT_TAB_GROUP = "default";
const ALL_GROUPS_SPECIFIER = "all";
const TAB_GROUP_EXPORT_FIELD = "ishell-tab-group";

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
        let suggs = Object.keys(this._cmd.deref().tabGroups);
        suggs = suggs.map(name => cmdAPI.makeSugg(name, name, null, 1, selectionIndices));
        suggs = cmdAPI.grepSuggs(text, suggs);

        cmdAPI.addSugg(suggs, text, html, null, .001, selectionIndices);

        if (suggs.length > 0)
            return suggs;
    }

    return [];
}

/**
    Works best if persistent sessions are enabled in the browser settings.

    # Syntax
    **tab-group** [**all** | *name*] [**to** *operation*] [**in** *container*] [**by** *action*] [**at** *name*]

    # Arguments
    - *name* - the name of a tab group to create or to operate on. May also be specified in the **at** argument (it has precedence).
        The current tab group is assumed if not specified. The keyword **all** designates all existing tab groups.
    - *operation* - the operation to perform on a tab group.
        - *switch* - switch to the tab group with the given name. The tab group will be created if not exists.
         Performed if the **to** argument is not specified.
        - *copy* and *paste* - copy or paste the tab group to/from the clipboard.
        - *reload* - reload all tabs in the tab group.
        - *close* - close all tabs in the tab group.
        - *delete* - delete the specified tab group.
        - *window* - open all tabs of the tab group in a new window.
        - *move* - move all/highlighted tabs from the current window to the specified tab group.
        - *move-tab* - move the active tab to the specified tab group.
    - *action* - an additional operation to perform.
        - *switching* - switch to the specified tab group. May be used with the *move* and *move-tab* operations.
    - *container* - the identity container to use in the tab group.

    # Examples
    - **tab-group** *cats*
    - **tgr** *books* **in** *shopping*
    - **tgr** **to** *delete* *books*
    - **tgr** **all** **to** *close*
    - **tgr** **to** *move* **by** *switching* **at** *books*

    @command tab-group, tgr
    @markdown
    @delay 500
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
        args[TO]     = {nountype: ["copy", "paste", "switch", "reload", "close", "delete", "window", "move",
                                   "move-tab"], label: "action"}; // goal
        //args[FROM]   = {nountype: noun_arb_text, label: "text"}; // source
        //args[NEAR]   = {nountype: noun_arb_text, label: "text"}; // location
        args[AT]     = {nountype: noun_type_tab_group, label: "name"}; // time
        //args[WITH]   = {nountype: noun_type_tab_group, label: "name"}; // instrument
        args[IN]     = {nountype: noun_type_container, label: "container"}; // format
        //args[OF]     = {nountype: noun_arb_text, label: "text"}; // modifier
        //args[AS]     = {nountype: noun_arb_text, label: "text"}; // alias
        args[BY]     = {nountype: ["switching"], label: "action"}; // cause
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
            await this.#setWindowTabGroupName(browserWindow, this.#recentTabGroup);
    }

    async #onTabCreated(tab) {
        const name = await this.#getTabGroupName(tab, true);
        if (!name)
            await this.#addToActiveTabGroup(tab);
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
            const windowTabGroup = await this.#getTabWindowTabGroupName(tab);
            const tabGroup = this.#tabGroups[windowTabGroup];

            if (windowTabGroup !== DEFAULT_TAB_GROUP && tabGroup.container) {
                const cookieStoreId = tabGroup.container.cookieStoreId;
                if (request.cookieStoreId !== cookieStoreId) {
                    await browser.tabs.create({url: request.url, cookieStoreId});
                    browser.tabs.remove(tab.id);
                    return {cancel: true};
                }
            }
        }

        return {};
    }

    async preview(args, display, storage) {
        let {OBJECT: {text: name}, TO: {text: action}, BY: {text: action2}, IN, AT} = args;

        name = this.#excludeSelection(AT?.text || name);

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
            const params = {action, action2, name};
            await this.#describeAction(display, params);
        }
    }

    #excludeSelection(text, notify) {
        if (text && text === cmdAPI.getSelection()) {
            if (notify)
                cmdAPI.notifyError("tab-group: specify tab group name in the 'at' argument when selection presents.");

            throw new Error("tab-group: the page has selection");
        }

        return text;
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

    async #getWindowTabGroupName(window) {
        const windowTabGroup = await browser.sessions.getWindowValue(window.id, 'tabGroup');
        return windowTabGroup || DEFAULT_TAB_GROUP;
    }

    async #setWindowTabGroupName(window, name) {
        return browser.sessions.setWindowValue(window.id, 'tabGroup', name);
    }

    async #getTabWindowTabGroupName(tab) {
        const tabWindow = await browser.windows.get(tab.windowId);
        return this.#getWindowTabGroupName(tabWindow);
    }

    async #getCurrentWindowTabGroupName() {
        const currentWindow = await browser.windows.getCurrent();
        return this.#getWindowTabGroupName(currentWindow);
    }

    async #setCurrentWindowTabGroupName(name) {
        const currentWindow = await browser.windows.getCurrent();
        return this.#setWindowTabGroupName(currentWindow, name);
    }

    async #addToActiveTabGroup(tab) {
        const windowTabGroup = await this.#getTabWindowTabGroupName(tab);
        if (windowTabGroup !== DEFAULT_TAB_GROUP)
            await browser.sessions.setTabValue(tab.id, 'tabGroup', windowTabGroup);
    }

    async #addToTabGroup(tab, tabGroup) {
        await browser.sessions.setTabValue(tab.id, 'tabGroup', tabGroup);
    }

    async #getTabGroupName(tab, raw) {
        let tabGroup = await browser.sessions.getTabValue(tab.id, 'tabGroup');
        if (raw)
            return tabGroup;
        else
            return tabGroup || DEFAULT_TAB_GROUP;
    }

    async #switchToTabGroup(name, activeTab) {
        let windowTabGroup = await this.#getCurrentWindowTabGroupName();
        name = name || DEFAULT_TAB_GROUP;

        if (windowTabGroup !== name) {
            this.#installListeners();
            await this.#setCurrentWindowTabGroupName(name);
            this.#recentTabGroup = name;

            const tabs = await browser.tabs.query({ currentWindow: true });

            const [tabsToHide, tabsToShow] = await this.#separateTabs(tabs, name);

            if (tabsToShow.length) {
                if (activeTab)
                    await browser.tabs.update(activeTab.id, {active: true});
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
                const tabGroup = await this.#getTabGroupName(tab);

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
            const tabGroup = await this.#getTabGroupName(tab);
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
        const windowTabGroup = await this.#getCurrentWindowTabGroupName();
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
            icon: tg => this.#getTabGroupContainerIcon(tg),
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
        groups.sort(cmdAPI.localeCompare("name"))
        return [defaultGroup, ...groups];
    }

    #getTabGroupContainerIcon(tabGroup) {
        let container;
        let iconUrl = "resource://usercontext-content/circle.svg";
        let iconColor = "gray";
        let iconStyle = "";

        if (tabGroup.container) {
            container = CONTAINERS.find(c => c.cookieStoreId === tabGroup.container.cookieStoreId);
            iconUrl = container.iconUrl;
            iconColor = container.colorCode;
            iconStyle = `mask-image: url('${iconUrl}'); mask-size: 16px 16px; `
                      + `mask-repeat: no-repeat; mask-position: center; background-color: ${iconColor};`
        }

        return $(`<div style="${iconStyle}"></div>`);
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

    async #describeAction(display, params) {
        let html = "";

        switch (params.action) {
            case "copy":
                html = await this.#describeCopy(params.name);
                break;
            case "paste":
                html = await this.#describePaste();
                break;
            case "reload":
                html = await this.#describeReload(params.name);
                break;
            case "close":
                html = await this.#describeClose(params.name);
                break;
            case "delete":
                html = await this.#describeDelete(params.name);
                break;
            case "window":
                html = await this.#describeWindow(params.name);
                break;
            case "move":
            case "move-tab":
                html = this.#describeMove(params.name, params.action === "move");
                break;
        }

        display.text(html);
    }

    async #describeCopy(name) {
        if (!name)
            name = await this.#getCurrentWindowTabGroupName();

        if (name === ALL_GROUPS_SPECIFIER)
            return `Copy all tab groups to the clipboard.`;
        else
            return `Copy the <b>${name}</b> tab group to the clipboard.`;
    }

    async #describePaste() {
        const inputObject = await this.#parseClipboardContent();

        if (inputObject?.command === TAB_GROUP_EXPORT_FIELD)
            return `Paste the <b>${inputObject.tabGroup.name}</b> tab group from clipboard.`;
        else if (Array.isArray(inputObject))
            return `Paste multiple tab groups from clipboard.`;
        else
            return `The clipboard does not contain valid content.`
    }

    async #describeReload(name) {
        if (!name)
            name = await this.#getCurrentWindowTabGroupName();

        if (name === ALL_GROUPS_SPECIFIER)
            return `Reload all tabs in all tab groups.`;
        else
            return `Reload all tabs in the <b>${name}</b> tab group.`;
    }

    async #describeClose(name) {
        if (!name)
            name = await this.#getCurrentWindowTabGroupName();

        if (name === ALL_GROUPS_SPECIFIER)
            return `Close all tabs in all tab groups.`;
        else
            return `Close all tabs in the <b>${name}</b> tab group.`;
    }

    async #describeDelete(name) {
        if (!name)
            name = await this.#getCurrentWindowTabGroupName();

        if (name === ALL_GROUPS_SPECIFIER)
            return `Delete all tab groups except <b>default</b>.`;
        else
            return `Delete the <b>${name}</b> tab group and close all its tabs.`;
    }

    async #describeWindow(name) {
        if (!name)
            name = await this.#getCurrentWindowTabGroupName();

        return `Move all tabs from the <b>${name}</b> tab group to a new window.`;
    }

    #describeMove(name, all) {
        const tabs = all? "all/highlighted tabs": "the current tab";

        if (name)
            return `Move ${tabs} to the <b>${name}</b> tab group.`;
        else
            return `Move ${tabs} to the <b>default</b> tab group.`;
    }

    async #performAction(name, params) {
        switch (params.action) {
            case "copy":
                await this.#copyTabGroup(params.name)
                break;
            case "paste":
                await this.#pasteTabGroup(params.name)
                break;
            case "switch":
                await this.#switchToTabGroup(params.name)
                break;
            case "reload":
                await this.#reloadTabGroup(params.name);
                break;
            case "close":
                await this.#closeTabGroup(params.name);
                break;
            case "delete":
                await this.#deleteTabGroup(params.name);
                break;
            case "window":
                await this.#tabGroupInNewWindow(params.name);
                break;
            case "move":
            case "move-tab":
                await this.#moveVisibleTabsToGroup(params.name, params.action === "move-tab", params.action2);
                break;
        }
    }

    async #copyTabGroup(name) {
        const currentWindowTabGroup = await this.#getCurrentWindowTabGroupName();
        name = name || currentWindowTabGroup;

        let outputObject;
        if (name === ALL_GROUPS_SPECIFIER) {
            outputObject = [];
            for (const name in this.#tabGroups) {
                const group = await this.#exportTabGroup(name);
                outputObject.push(group);
            }
        }
        else if (this.#isTabGroupExists(name))
            outputObject = await this.#exportTabGroup(name);

        const output = JSON.stringify(outputObject, null, 2);
        await navigator.clipboard.writeText(output);
    }

    async #exportTabGroup(name) {
        const tabGroup = this.#tabGroups[name];
        const tabs = await this.#getGroupTabs(name, false);
        return {
            command: TAB_GROUP_EXPORT_FIELD,
            version: 1,
            tabGroup: tabGroup,
            tabs: tabs.map(t => t.url)
        };
    }

    async #parseClipboardContent(verbose) {
        const input = await navigator.clipboard.readText();
        let inputObject;

        try {
            inputObject = JSON.parse(input);
        } catch (e) {
            if (verbose)
                cmdAPI.notify(e.message);
        }

        return inputObject;
    }

    async #pasteTabGroup() {
        const inputObject = await this.#parseClipboardContent(true);

        if (Array.isArray(inputObject)) {
            for (const object of inputObject)
                if (object?.command === TAB_GROUP_EXPORT_FIELD)
                    await this.#importTabGroup(object);
        }
        else if (inputObject?.command === TAB_GROUP_EXPORT_FIELD)
            await this.#importTabGroup(inputObject);
    }

    async #importTabGroup(object) {
        const name = object.tabGroup.name;
        this.#tabGroups[name] = object.tabGroup;

        const comparator = cmdAPI.localeCompare("name");
        const container = CONTAINERS.find(c => !comparator(c, object.tabGroup.container));
        if (container)
            this.#tabGroups[name].container.cookieStoreId = container.cookieStoreId;
        else
            delete this.#tabGroups[name].container;

        const tabs = await this.#getGroupTabs(name, false);
        const tabsToCreate = object.tabs.filter(url => !tabs.some(t => t.url === url));
        const currentWindowTabGroup = await this.#getCurrentWindowTabGroupName();

        for (const url of tabsToCreate) {
            const tab = await browser.tabs.create({url, active: false});
            await this.#addToTabGroup(tab, name);
            if (currentWindowTabGroup !== name)
                browser.tabs.hide(tab.id);
        }
    }

    async #reloadTabGroup(name) {
        const currentWindowTabGroup = await this.#getCurrentWindowTabGroupName();
        name = name || currentWindowTabGroup;

        let tabs;
        if (name === ALL_GROUPS_SPECIFIER)
            tabs = await browser.tabs.query({});
        else
            tabs = await this.#getGroupTabs(name, false);

        for (const tab of tabs)
            await browser.tabs.update(tab.id, {url: tab.url});
    }

    async #closeTabGroup(name) {
        const currentWindowTabGroup = await this.#getCurrentWindowTabGroupName();
        name = name || currentWindowTabGroup;

        let tabs;
        if (name === ALL_GROUPS_SPECIFIER)
            tabs = await browser.tabs.query({});
        else
            tabs = await this.#getGroupTabs(name, false);

        if (currentWindowTabGroup === name || ALL_GROUPS_SPECIFIER === name)
            await browser.tabs.create({active: true});

        await browser.tabs.remove(tabs.map(t => t.id));
    }

    async #deleteTabGroup(name) {
        const currentWindowTabGroup = await this.#getCurrentWindowTabGroupName();
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
        const currentWindowTabGroup = await this.#getCurrentWindowTabGroupName();
        name = name || currentWindowTabGroup;

        const currentWindow = await browser.windows.getCurrent();

        let tabs
        if (name === ALL_GROUPS_SPECIFIER) {
            tabs = await browser.tabs.query({});
            name = DEFAULT_TAB_GROUP;
        }
        else
            tabs = await this.#getGroupTabs(name, false);

        if (tabs.length) {
            const newWindow = await browser.windows.create({});
            await this.#setWindowTabGroupName(newWindow, name);

            const windowTabs = await browser.tabs.query({windowId: newWindow.id});
            if (name === currentWindowTabGroup)
                browser.tabs.create({windowId: currentWindow.id});

            await browser.tabs.move(tabs.map(t => t.id), {windowId: newWindow.id, index: -1});
            await browser.tabs.remove(windowTabs.map(t => t.id));
        }
    }

    async #moveVisibleTabsToGroup(name, onlyCurrent, action) {
        const currentWindowTabGroup = await this.#getCurrentWindowTabGroupName();
        const switching = action === "switching";
        name = name || DEFAULT_TAB_GROUP;

        if (name !== currentWindowTabGroup) {
            const windowVisibleTabs = (await browser.tabs.query({currentWindow: true})).filter(t => !t.hidden);

            let tabsToMove = windowVisibleTabs;
            let tabToActivate;

            if (onlyCurrent)
                tabsToMove = await browser.tabs.query({active: true, currentWindow: true});
            else {
                const highlightedTabs = await browser.tabs.query({highlighted: true, currentWindow: true});

                if (highlightedTabs.length > 1)
                    tabsToMove = highlightedTabs;
            }

            if (windowVisibleTabs.length === tabsToMove.length && !switching)
                tabToActivate = await browser.tabs.create({});
            else if (!switching) {
                const notSelectedTabs = windowVisibleTabs.filter(t => !tabsToMove.some(st => st.id === t.id));
                notSelectedTabs.sort((a, b) => b.lastAccessed - a.lastAccessed);
                tabToActivate = notSelectedTabs[0];
            }

            for (const tab of tabsToMove)
                await this.#addToTabGroup(tab, name);

            if (switching) {
                this.#switchToTabGroup(name);
            }
            else {
                await browser.tabs.update(tabToActivate.id, {active: true});
                await browser.tabs.hide(tabsToMove.map(t => t.id));
            }
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

    async execute(args, storage) {
        let {OBJECT: {text: name}, TO: {text: action}, BY: {text: action2}, IN, AT} = args;

        name = this.#excludeSelection(AT?.text || name, true);

        if (name && name !== ALL_GROUPS_SPECIFIER) {
            if (!this.#isTabGroupExists(name))
                this.#createTabGroup(name);

            if (name !== DEFAULT_TAB_GROUP)
                this.#assignTabGroupContainer(name, IN?.text);
        }

        action = action || "switch";

        const params = {action, action2, name};
        await this.#performAction(name, params);
        this.#saveState(storage);
    }

}

namespace.onModuleCommandsLoaded = () => {
    if (!_BACKGROUND_PAGE) { // Chrome can't hide tabs
        const cmdDef = cmdAPI.getCommandAttributes(TabGroup);
        const tabGroupCommand = cmdManager.getCommandByUUID(cmdDef.uuid);
        cmdManager.removeCommand(tabGroupCommand)
    }
};