let PREPOSITION_MAP = new Map([
    [OBJECT, "OBJECT"],
    [FOR, "FOR"],
    [TO, "TO"],
    [FROM, "FROM"],
    [NEAR, "NEAR"],
    [AT, "AT"],
    [WITH, "WITH"],
    [IN, "IN"],
    [OF, "OF"],
    [AS, "AS"],
    [BY, "BY"],
    [ON, "ON"]
]);

class CommandManager {
    constructor() {
        this._commands = [];
        this._disabled_commands = [];
        this._context_menu_commands = [];

        shellSettings.get("context_menu_commands").then(commands => {
           if (commands)
               this._context_menu_commands = commands;
           this.createContextMenu();
        });
    }

    addCommand(command) {
        this._commands.push(command)
    }

    get commands() {
        return this._commands;
    }

    set commands(commands) {
        this._commands = commands;
    }

    get contextMenuCommands() {
        return this._context_menu_commands;
    }

    getCommandByUUID(uuid) {
        return this._commands.find(c => c.uuid.toUpperCase() === uuid.toUpperCase());
    };

    async commandHistoryPush(input) {
        if (input) {
            input = input.trim();

            let history = await shellSettings.get("command_history");

            if (!history)
                history = [];

                ADD_ITEM: {
                    if (history.length && history[0].toLowerCase() === input.toLowerCase())
                        break ADD_ITEM;

                    history = [input, ...history];

                    if (history.length > shellSettings.max_history_items())
                        history.splice(history.length - 1, 1);

                    shellSettings.set("command_history", history);
                }
        }
    }

    async commandHistory() {
        return shellSettings.get("command_history");
    }

    enableCommand(cmd) {
        if (cmd.name in this._disabled_commands) {
            delete this._disabled_commands[cmd.name];
            shellSettings.load(() => {
                shellSettings.disabled_commands(this._disabled_commands);
            });
        }
    };

    disableCommand(cmd) {
        if (!(cmd.name in this._disabled_commands)) {
            this._disabled_commands[cmd.name] = true;
            shellSettings.load(() => {
                shellSettings.disabled_commands(this._disabled_commands);
            });
        }
    };

    makeParser() {
        return NLParser.makeParserForLanguage("en", this._commands, ContextUtils,
                new SuggestionMemory("main_parser"));
    };

    // adds storage bin obtained from the command uuid as the last argument of the called function
    async callPersistent(cmd, obj, f) {
        let args = arguments;
        let new_args = Array.prototype.slice.call(args, 3);

        const bin = await Utils.makeBin(cmd.uuid);
        new_args.push(bin);

        try {
            await f.apply(obj, new_args);
        } catch (e) {
            console.error(e.toString() + "\n" + e.stack);
        }
    }

    initCommand(cmd, f, obj) {
        if (obj)
            return this.callPersistent(cmd, cmd, f, obj)
        else
            return this.callPersistent(cmd, cmd, f)
    }

    callPreview(sentence, preview_element) {
        return this.callPersistent(sentence.getCommand(), sentence, sentence.preview, preview_element);
    }

    callExecute(sentence) {
        return this.callPersistent(sentence.getCommand(), sentence, sentence.execute)
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

        await shellSettings.set("context_menu_commands", this._context_menu_commands);
        this.createContextMenu();
    };

    createContextMenu() {
        chrome.contextMenus.removeAll();

        let contexts = ["selection", "link", "page", "editable"];

        for (let c of this._context_menu_commands) {
            let menuInfo = {
                id: c.command,
                title: c.label,
                contexts: contexts
            };

            let commandDef = this.getCommandByUUID(c.uuid);

            menuInfo.icons = {"16": commandDef && commandDef.icon? commandDef.icon: "/res/icons/logo.svg"};

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

        menuInfo.icons = {"32": "/res/icons/settings.svg"};

        chrome.contextMenus.create(menuInfo);

        if (!this.contextMenuListener) {
            this.contextMenuListener = function(info, tab) {
                switch(info.menuItemId) {
                    case "shell-settings":
                        chrome.tabs.create({"url": "res/options.html"});
                        break;
                    default:
                        if (info.selectionText) { // TODO: add html selection
                            CmdUtils.selectedText = info.selectionText;
                            CmdUtils.selectedHtml = info.selectionText;
                        }
                        if (info.linkUrl) {
                            CmdUtils.selectedText = info.linkUrl;
                            CmdUtils.selectedHtml = "<a class='__ishellLinkSelection' src='"
                                + info.linkUrl + "'>" + info.linkText + "</a>";
                        }

                        let contextMenuCmdData = CmdManager.getContextMenuCommand(info.menuItemId);
                        if (contextMenuCmdData
                            && !CmdManager.executeContextMenuItem(info.menuItemId, contextMenuCmdData)) {
                            CmdManager.selectedContextMenuCommand = info.menuItemId;
                            chrome.browserAction.openPopup();
                        }
                }
            }
            chrome.contextMenus.onClicked.addListener(this.contextMenuListener);
        }
    }

    executeContextMenuItem(command, contextMenuCmdData) {
        let commandDef = this.getCommandByUUID(contextMenuCmdData.uuid);

        if (!commandDef.preview || typeof commandDef.preview !== "function"
            || contextMenuCmdData.execute) {
            let parser = this.makeParser();
            let query = parser.newQuery(command, null, shellSettings.max_suggestions(), true);

            query.onResults = () => {
                let sent = query.suggestionList
                && query.suggestionList.length > 0? query.suggestionList[0]: null;
                if (sent && sent.getCommand().uuid.toLowerCase() === commandDef.uuid.toLowerCase()) {

                    this.callExecute(sent).then(() => {
                        CmdUtils._internalClearSelection();
                    });

                    if (shellSettings.remember_context_menu_commands())
                        this.commandHistoryPush(contextMenuCmdData.command);

                    //if (CmdUtils.DEBUG)
                    parser.strengthenMemory(sent);
                }
                else
                    CmdUtils.deblog("Context menu command/parser result mismatch")
            };

            query.run();
            return true;
        }

        return false;
    }

    addObjectCommand(command, args) {
        if (args) {
            command.arguments = [];

            for (let a in args) {
                args[a].role = a;
                command.arguments.push(args[a]);
            }
        }

        command.__oo_preview = command.preview;

        command.preview = function(pblock, args, storage) {
            for (let role of PREPOSITION_MAP.keys())
                if (args[role])
                    args[PREPOSITION_MAP.get(role)] = args[role]

            this.__oo_preview(args, pblock, storage);
        }

        CmdUtils.CreateCommand(command);
    }

    unloadCustomScripts(namespace) {
        if (namespace)
            this._commands = this._commands.filter(c => c._namespace !== namespace);
        else
            this._commands = this._commands.filter(c => !!c._builtin);
    }

    async loadCustomScripts(namespace) {
        this.unloadCustomScripts(namespace);

        // load custom scripts
        let customscripts = await DBStorage.fetchCustomScripts(namespace);

        if (namespace)
            customscripts = [customscripts];

        for (let record of customscripts) {
            try {
                if (record.script) {
                    let script = CmdPreprocessor.run(record.script);
                    eval(script);

                    for (let cmd of this._commands.filter(c => !c._builtin && !c._namespace))
                        cmd._namespace = record.namespace;
                }
            } catch (e) {
                console.error("custom scripts evaluation failed", e);
            }
        }
    }
}

CmdManager = new CommandManager();
