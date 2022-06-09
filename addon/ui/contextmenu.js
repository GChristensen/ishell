import {settings} from "../settings.js";
import {cmdManager} from "../cmdmanager.js";

class ContextMenuManager {
    _context_menu_commands = [];

    loadMenu() {
        settings.get("context_menu_commands").then(commands => {
            if (commands)
                this._context_menu_commands = commands;
            this.createContextMenu();
        });
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
            icon: cmdDef.icon,
            label: label,
            command: command
        });

        await settings.set("context_menu_commands", this._context_menu_commands);
        this.createContextMenu();
    };

    static async contextMenuListener(info) {
        switch(info.menuItemId) {
            case "shell-settings":
                chrome.tabs.create({"url": "ui/options/options.html"});
                break;
            default:
                let contextMenuCmd = contextMenuManager.getContextMenuCommand(info.menuItemId);

                // open popup, if command "execute" flag is unchecked
                if (contextMenuCmd && contextMenuCmd.execute) {
                    await CmdUtils.updateActiveTab();

                    if (info.linkUrl) {
                        CmdUtils.selectedText = info.linkUrl;
                        CmdUtils.selectedHtml = "<a class='__ishellLinkSelection' src='"
                            + info.linkUrl + "'>" + info.linkText + "</a>";
                    }

                    contextMenuManager.executeContextMenuItem(info.menuItemId, contextMenuCmd);
                }
                else if (contextMenuCmd) {
                    this.selectedContextMenuCommand = info.menuItemId;

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

        menuInfo.icons = {"32": "/ui/icons/settings.svg"};

        chrome.contextMenus.create(menuInfo);

        if (!chrome.contextMenus.onClicked.hasListener(ContextMenuManager.contextMenuListener))
            chrome.contextMenus.onClicked.addListener(ContextMenuManager.contextMenuListener);
    }

    executeContextMenuItem(command, contextMenuCmd) {
        let commandDef = cmdManager.getCommandByUUID(contextMenuCmd.uuid);

        let parser = cmdManager.makeParser();
        let query = parser.newQuery(command, null, settings.max_suggestions(), true);

        let executed = false;

        query.onResults = () => { // onResults can run several times, depending on suggestions with callbacks
            if (executed)
                return;

            executed = true;

            let sent = query.suggestionList
            && query.suggestionList.length > 0? query.suggestionList[0]: null;

            if (sent && sent.getCommand().uuid.toLowerCase() === commandDef.uuid.toLowerCase()) {

                this.callExecute(sent).then(() => {
                    CmdUtils._internalClearSelection();
                });

                if (settings.remember_context_menu_commands())
                    cmdManager.commandHistoryPush(contextMenuCmd.command);

                parser.strengthenMemory(sent);
            }
            else
                CmdUtils.deblog("Context menu command/parser result mismatch")
        };

        query.run();
    }
}

export const contextMenuManager = new ContextMenuManager();