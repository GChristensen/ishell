import {camelCaseToSnakeCase} from "../utils.js";
import {settings} from "../settings.js";

export const namespace = new AnnotatedCommandNamespace(CommandNamespace.TABS);

const DEFAULT_TAB_GROUP = "default";
const ALL_GROUPS_SPECIFIER = "all";

/**
    @label name
    @nountype
 */
export async function noun_type_tab_group(text, html, _, selectionIndices) {
    if (text) {
        let suggs = [];

        try {
            suggs = await sendLTG.ltgGetTabGroups();
        }
        catch (e) {
            console.error(e);
        }

        suggs = suggs.map(tg => cmdAPI.makeSugg(tg.name, tg.name, tg, 1, selectionIndices));
        suggs = cmdAPI.grepSuggs(text, suggs);

        cmdAPI.addSugg(suggs, text, html, null, .001, selectionIndices);

        if (suggs.length > 0)
            return suggs;
    }

    return [];
}

/**
    # Syntax
    **tab-group** [**all** | *name*] [**to** *operation*] [**in** *container*] [**by** *action*] [**at** *name*] [**for** *filter*] [**of** *color key*]

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
    - *filter* - when applicable, filter tabs by this string in the tab URL or title.
    - *color key* - a digit (0-9) corresponding to the color mnemonic of the tab group.

    # Examples
    - **tab-group** *cats*
    - **tgr** *books* **in** *shopping* **of** *8*
    - **tgr** **to** *delete* *books*
    - **tgr** **to** *close* **all**
    - **tgr** **to** *move* **by** *switching* **at** *books* **for** *used*

    @command tab-group, tgr
    @markdown
    @delay 500
    @author g/christensen
    @icon /ui/icons/tab-groups.svg
    @description iShell command for the <a href="https://gchristensen.github.io/lightning-tab-groups/">Lightning Tab Groups</a> extension.
    @uuid CC6A1FD6-5959-423F-8D77-1C6EF630B0A1
 */
export class TabGroup {
    #containers = [];
    #tabGroups = {[DEFAULT_TAB_GROUP]: {name: DEFAULT_TAB_GROUP}};

    constructor(args) {
        noun_type_tab_group._cmd = new WeakRef(this);

        args[OBJECT] = {nountype: noun_type_tab_group, label: "name"}; // object
        args[FOR]    = {nountype: /[^ ]+/, label: "filter"}; // subject
        args[TO]     = {nountype: ["copy", "paste", "switch", "reload", "close", "delete", "window", "move",
                                   "move-tab"], label: "action"}; // goal
        //args[FROM]   = {nountype: noun_arb_text, label: "text"}; // source
        //args[NEAR]   = {nountype: noun_arb_text, label: "text"}; // location
        args[AT]     = {nountype: noun_type_tab_group, label: "name"}; // time
        //args[WITH]   = {nountype: noun_type_tab_group, label: "name"}; // instrument
        args[IN]     = {nountype: noun_type_container, label: "container"}; // format
        args[OF]     = {nountype: /\d/, label: "color"}; // modifier
        //args[AS]     = {nountype: noun_arb_text, label: "text"}; // alias
        args[BY]     = {nountype: ["switching"], label: "action"}; // cause
        //args[ON]     = {nountype: noun_arb_text, label: "text"}; // dependency
    }

    async load(storage) {
    }

    async preview(args, display, storage) {
        let {OBJECT: {text: name}, TO: {text: action}, BY: {text: action2}, IN, AT, FOR: {text: filter}} = args;
        let tabGroup = args.OBJECT?.data;

        if (name === ALL_GROUPS_SPECIFIER)
            tabGroup = {name: ALL_GROUPS_SPECIFIER, uuid: ALL_GROUPS_SPECIFIER};

        this.#containers = await this.#getContainers();

        name = this.#excludeSelection(args);
        filter = filter && filter === cmdAPI.getSelection()? "": filter;

        if (name && !action) {
            if (tabGroup)
                await this.#listTabGroupTabs(display, tabGroup, filter);
            else
                display.text(this.#describeCreate(name, IN?.text));
        }
        else if (!name && !action) {
            await this.#listTabGroups(display);
        }
        else if (action) {
            const params = {action, action2, name, filter, tabGroup};
            await this.#describeAction(display, params);
        }
    }

    #excludeSelection(args) {
        let text = args.AT?.text;

        if (!text || text && text === cmdAPI.getSelection())
            text = args.OBJECT?.text;

        if (text && text === cmdAPI.getSelection())
            return;

        return text;
    }

    async #getContainers() {
        let containers = [];

        try {
            containers = await browser.contextualIdentities.query({})
        } catch (e) {
            console.error(e);
        }

        return containers;
    }

    async #isTabGroupExist(name) {
        return sendLTG.ltgIsTabGroupExist({name});
    }

    async #createTabGroup(name, container, colorKey) {
        return sendLTG.ltgCreateTabGroup({name, container: container?.cookieStoreId, colorKey});
    }

    async #getCurrentWindowTabGroupName() {
        return sendLTG.ltgGetCurrentWindowTabGroupName();
    }

    async #switchToTabGroup(uuid, activeTab) {
        return sendLTG.ltgSwitchToTabGroup({uuid, activeTab});
    }

    async #listTabGroupTabs(display, tabGroup, filter) {
        const tabs = await sendLTG.ltgGetTabGroupTabs({uuid: tabGroup.uuid, filter});

        const cfg = {
            text: t => t.title,
            subtext: t => t.url,
            icon: t => t.favIconUrl || "/ui/icons/globe.svg",
            iconSize: 16,
            action: t => {
                this.#switchToTabGroup(tabGroup.uuid, t);
                cmdAPI.closeCommandLine();
            },
            buttonContent: "<div class='tab-close-button' title='Close tab'>&#x2A2F;</div>",
            buttonAction: async (t, e) => {
                await browser.tabs.remove(t.id);
                $(e.target).closest("li").remove();
            }
        };

        const listStyle = ".tab-close-button {margin-top: -3px;} .tab-close-button:hover {color: var(--opl-subtext-color);}"
        const headingStyle = "width: calc(100% - 5px); border-bottom: 1px solid var(--shell-font-color);";
        const heading = `<div style="${headingStyle}">Tabs of the <b>${tabGroup.name}</b> tab group</div>`

        const list = display.objectList(heading, tabs, cfg, listStyle);
        $(list).find("img.opl-icon").on("error", e => e.target.src = "/ui/icons/globe.svg");
    }

    async #listTabGroups(display) {
        const tabGroups = await sendLTG.ltgGetTabGroups();

        const cfg = {
            text: tg => this.#formatTabGroup(tg),
            icon: tg => this.#getTabGroupContainerIcon(tg),
            iconSize: 16,
            action: tg => {
                this.#switchToTabGroup(tg.uuid);
                cmdAPI.closeCommandLine();
            }
        };

        if (!tabGroups.some(tg => tg.container))
            delete cfg.icon;

        const headingStyle = "width: calc(100% - 5px); border-bottom: 1px solid var(--shell-font-color);";
        const heading = `<div style="${headingStyle}">Tab groups</div>`

        display.objectList(heading, tabGroups, cfg);
    }

    #getTabGroupContainerIcon(tabGroup) {
        let container;
        let iconUrl = "resource://usercontext-content/circle.svg";
        let iconColor = "gray";
        let iconStyle = "";

        if (tabGroup.container) {

            container = this.#containers.find(c => c.cookieStoreId === tabGroup.container.cookieStoreId);
            iconUrl = container.iconUrl;
            iconColor = container.colorCode;
            iconStyle = `mask-image: url('${iconUrl}'); mask-size: 16px 16px; `
                      + `mask-repeat: no-repeat; mask-position: center; background-color: ${iconColor};`
        }

        return $(`<div style="${iconStyle}"></div>`);
    }

    #formatTabGroup(tabGroup) {
        let tabCount;
        const dualCount = tabGroup.windowTabsCount !== tabGroup.allTabsCount;

        if (dualCount)
            tabCount = `(${tabGroup.allTabsCount}/${tabGroup.windowTabsCount})`;
        else
            tabCount = `(${tabGroup.allTabsCount})`;

        const countTitle = dualCount? "window/total": "total";

        const tabGroupColor = tabGroup.color || "#0F0";
        const color = tabGroup.active? "var(--shell-background-color)": tabGroupColor;
        const background = tabGroup.active? tabGroupColor: "transparent";
        const style = `color: ${color}; background-color: ${background}; display: inline-block; padding: 0 2px;`;
        let name = `<span class="tab-group-name" data-name="${tabGroup.name}" style="${style}">${tabGroup.name}</span>`;
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
                html = await this.#describeReload(params.name, params.filter);
                break;
            case "close":
                html = await this.#describeClose(params.name, params.filter);
                break;
            case "delete":
                html = await this.#describeDelete(params.name);
                break;
            case "window":
                html = await this.#describeWindow(params.name, params.filter);
                break;
            case "move":
            case "move-tab":
                html = this.#describeMove(params);
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
        return `Paste tab groups from clipboard.`;
    }

    async #describeReload(name, filter) {
        if (!name)
            name = await this.#getCurrentWindowTabGroupName();

        const tabs = filter? `tabs matching <b>${filter}</b>`: "all tabs";

        if (name === ALL_GROUPS_SPECIFIER)
            return `Reload ${tabs} in all tab groups.`;
        else
            return `Reload ${tabs} in the <b>${name}</b> tab group.`;
    }

    async #describeClose(name, filter) {
        if (!name)
            name = await this.#getCurrentWindowTabGroupName();

        const tabs = filter? `tabs matching <b>${filter}</b>`: "all tabs";

        if (name === ALL_GROUPS_SPECIFIER)
            return `Close ${tabs} in all tab groups.`;
        else
            return `Close ${tabs} in the <b>${name}</b> tab group.`;
    }

    async #describeDelete(name) {
        if (!name)
            name = await this.#getCurrentWindowTabGroupName();

        if (name === ALL_GROUPS_SPECIFIER)
            return `Delete all tab groups except <b>default</b>.`;
        else
            return `Delete the <b>${name}</b> tab group and close all its tabs.`;
    }

    async #describeWindow(name, filter) {
        if (!name)
            name = await this.#getCurrentWindowTabGroupName();

        const tabs = filter? `tabs matching <b>${filter}</b>`: "all tabs";

        return `Move ${tabs} from the <b>${name}</b> tab group to a new window.`;
    }

    #describeMove(params) {
        const all = params.action === "move";
        const filteredTabs = params.filter? `tabs matching <b>${params.filter}</b>`: "all/highlighted tabs";
        const tabs = all? filteredTabs: "the current tab";

        if (params.name)
            return `Move ${tabs} to the <b>${params.name}</b> tab group.`;
        else
            return `Move ${tabs} to the <b>default</b> tab group.`;
    }

    async #performAction(name, params) {
        switch (params.action) {
            case "copy":
                await this.#copyTabGroup(params.tabGroup?.uuid)
                break;
            case "paste":
                await this.#pasteTabGroup()
                break;
            case "switch":
                await this.#switchToTabGroup(params.tabGroup?.uuid)
                break;
            case "reload":
                await this.#reloadTabGroup(params.tabGroup?.uuid, params.filter);
                break;
            case "close":
                await this.#closeTabGroup(params.tabGroup?.uuid, params.filter);
                break;
            case "delete":
                await this.#deleteTabGroup(params.tabGroup?.uuid);
                break;
            case "window":
                await this.#tabGroupInNewWindow(params.tabGroup?.uuid, params.filter);
                break;
            case "move":
            case "move-tab":
                await this.#moveVisibleTabsToGroup(params);
                break;
        }
    }

    async #copyTabGroup(uuid) {
        return sendLTG.ltgCopyTabGroup({uuid});
    }

    async #pasteTabGroup() {
        return sendLTG.ltgPasteTabGroup();
    }

    async #reloadTabGroup(uuid, filter) {
        return sendLTG.ltgReloadTabGroup({uuid, filter});
    }

    async #closeTabGroup(uuid, filter) {
        return sendLTG.ltgCloseTabGroup({uuid, filter});
    }

    async #deleteTabGroup(uuid) {
        return sendLTG.ltgDeleteTabGroup({uuid});
    }

    async #tabGroupInNewWindow(uuid, filter) {
        return sendLTG.ltgTabGroupInNewWindow({uuid, filter});
    }

    async #moveVisibleTabsToGroup(params) {
        if (params.tabGroup)
            params.uuid = params.tabGroup.uuid;

        return sendLTG.ltgMoveVisibleTabsToGroup({params});
    }

    async execute(args, storage) {
        let {OBJECT: {text: name}, TO: {text: action}, BY: {text: action2}, IN, AT, OF, FOR: {text: filter}} = args;
        let tabGroup = args.OBJECT?.data;

        name = this.#excludeSelection(args);
        filter = filter && filter === cmdAPI.getSelection()? "": filter;

        if (name && name !== ALL_GROUPS_SPECIFIER) {
            if (!await this.#isTabGroupExist(name))
                tabGroup = await this.#createTabGroup(name, args.IN?.data, args.OF?.text);
        }
        else if (name === ALL_GROUPS_SPECIFIER)
            tabGroup = {name: ALL_GROUPS_SPECIFIER, uuid: ALL_GROUPS_SPECIFIER};

        action = action || "switch";

        const params = {action, action2, name, filter, tabGroup};
        await this.#performAction(name, params);
    }
}

namespace.onModuleCommandsLoaded = () => {
    checkForLTG();
};

const LIGHTNING_TAB_GROUPS_ID = getLTGId();

const sendLTG = new Proxy({}, {
    get(target, key, receiver) {
        const type = key;

        return val => {
            const payload = val || {};
            payload.type = camelCaseToSnakeCase(type);

            return browser.runtime.sendMessage(LIGHTNING_TAB_GROUPS_ID, payload);
        };
    }
});

function checkSender(sender) {
    if (LIGHTNING_TAB_GROUPS_ID !== sender.id)
        throw new Error();
}

async function isLTGPresents() {
    try {
        const response = await sendLTG.ltgGetVersion();
        return !!response;
    }
    catch (e) {
        return false;
    }
}

export async function checkForLTG(retry = 1) {
    //console.log(`Checking for LTG, retry ${retry}`);

    let ltgPresents = await isLTGPresents();

    if (ltgPresents) {
        await settings.ltg_presents(true);
    }
    else {
        if (retry < 10)
            setTimeout(() => checkForLTG(retry + 1), 1000);
        else
            await settings.ltg_presents(false);
    }
}

function getLTGId() {
    if (settings.platform.firefox)
        return browser.runtime.id?.includes("-we")
            ? "lightning-tab-groups-we@gchristensen.github.io"
            : "lightning-tab-groups@gchristensen.github.io";
}

