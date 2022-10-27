import {settings} from "../settings.js";
import {cmdManager} from "../cmdmanager.js";

class ContextMenuManager {
    _context_menu_commands = [];

    async loadMenu() {
        this._context_menu_commands = await settings.get("context_menu_commands") || [];
        this.createContextMenu();
    }

    get contextMenuCommands() {
        return this._context_menu_commands;
    }

    getContextMenuCommand(input) {
        if (!input)
            return null;
        return this._context_menu_commands.find(c => c.command.toLowerCase() === input.toLowerCase());
    };

    async addContextMenuCommand(cmdDef, label, command) {
        this._context_menu_commands.push({
            uuid: cmdDef.uuid,
            icon: cmdDef.icon || "/ui/icons/logo.svg",
            label: label,
            command: command
        });

        await settings.set("context_menu_commands", this._context_menu_commands);
        this.createContextMenu();
    };

    static contextMenuListener(info) {
        switch(info.menuItemId) {
            case "shell-settings":
                chrome.tabs.create({"url": "ui/options/options.html"});
                break;
            default:
                let contextMenuCmd = contextMenuManager.getContextMenuCommand(info.menuItemId);

                if (contextMenuCmd && contextMenuCmd.execute) {
                    ContextUtils.updateActiveTab().then(() => {

                        if (info.linkUrl) {
                            ContextUtils.selectedText = info.linkUrl;
                            ContextUtils.selectedHtml = "<a class='__ishellLinkSelection' src='"
                                + info.linkUrl + "'>" + info.linkText + "</a>";
                        }

                        contextMenuManager.executeContextMenuItem(info.menuItemId, contextMenuCmd);
                    });
                }
                else if (contextMenuCmd) { // open popup if the command "execute" flag is unchecked
                    contextMenuManager.selectedContextMenuCommand = info.menuItemId;

                    if (_MANIFEST_V3)
                        chrome.action.openPopup();
                    else
                        chrome.browserAction.openPopup();
                }
        }
    }

    createContextMenu() {
        chrome.contextMenus.removeAll();

        let contexts = ["selection", "link", "page", "editable"];

        for (let c of this._context_menu_commands) {
            let menuInfo = {
                id: c.command,
                title: c.label,
                contexts: contexts
            };

            let commandDef = cmdManager.getCommandByUUID(c.uuid);

            if (_BACKGROUND_PAGE)
                menuInfo.icons = {"16": commandDef && commandDef.icon? commandDef.icon: "/ui/icons/logo.svg"};

            chrome.contextMenus.create(menuInfo);
        }

        if (this._context_menu_commands.length > 0)
            chrome.contextMenus.create({
                id: "final-separator",
                type: "separator",
                contexts: contexts
            });

        let menuInfo = {
            id: "shell-settings",
            title: "iShell Settings",
            contexts: contexts
        };

        if (_BACKGROUND_PAGE)
            menuInfo.icons = {"32": "/ui/icons/settings.svg"};

        chrome.contextMenus.create(menuInfo);

        if (!chrome.contextMenus.onClicked.hasListener(ContextMenuManager.contextMenuListener))
            chrome.contextMenus.onClicked.addListener(ContextMenuManager.contextMenuListener);
    }

    async executeContextMenuItem(command, contextMenuCmd) {
        let commandDef = cmdManager.getCommandByUUID(contextMenuCmd.uuid);

        let parser = await cmdManager.makeParser();
        let query = parser.newQuery(command, null, settings.max_suggestions(), true);
        let executed = false;

        query.onResults = () => {
            if (executed)  // suggestion that use the callback argument may call onResults several times
                return;

            executed = true;

            let sentence = query.suggestionList && query.suggestionList.length > 0? query.suggestionList[0]: null;

            if (sentence && sentence.getCommand().uuid.toLowerCase() === commandDef.uuid.toLowerCase()) {

                cmdManager.callExecute(sentence).finally(() => {
                    ContextUtils.clearSelection();
                });

                if (settings.remember_context_menu_commands())
                    cmdManager.commandHistoryPush(contextMenuCmd.command);

                parser.strengthenMemory(sentence);
            }
            else
                cmdAPI.dbglog("Context menu command/parser result mismatch")
        };

        query.run();
    }
}

export const contextMenuManager = new ContextMenuManager();