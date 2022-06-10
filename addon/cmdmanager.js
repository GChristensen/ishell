import {settings} from "./settings.js";
import {repository} from "./storage.js";

class CommandManager {
    constructor() {
        this._commands = [];
        this._disabled_commands = [];
    }

    createCommand(options) {
        if (Array.isArray(options.name)) {
            options.names = options.name;
            options.name = options.name[0];
        } else {
            options.name = options.name || options.names[0];
            options.names = options.names || [options.name];
        }

        if (!options.uuid) {
            if (options.homepage)
                options.uuid = options.homepage;
            else
                options.uuid = options.name;
        }

        options.id = options.uuid;

        if (this._commands.some(c => c.id === options.id))
            return null;

        if (options._namespace)
            options._builtin = true;

        let args = options.arguments || options.argument;
        if (!args)
            args = options.arguments = [];

        let nounId = 0;
        function toNounType(obj, key) {
            let val = obj[key];
            if (!val) return;
            let noun = obj[key] = NounUtils.NounType(val);
            if (!noun.id) noun.id = options.id + "#n" + nounId++;
        }

        ASSIGN_ARGUMENTS:
        {
            // handle simplified syntax
            if (typeof args.suggest === "function")
                // argument: noun
                args = [{role: "object", nountype: args}];
            else if (!Array.isArray(args)) {
                // arguments: {role: noun, ...}
                // arguments: {"role label": noun, ...}
                let a = [], re = /^[a-z]+(?=(?:[$_:\s]([^]+))?)/;
                for (let key in args) {
                    let [role, label] = re.exec(key) || [];
                    if (role) a.push({role: role, label: label, nountype: args[key]});
                }
                args = a;
            }
            for (let arg of args) toNounType(arg, "nountype");
            options.arguments = args;
        }

        let to = parseInt(options.timeout || options.previewDelay);
        if (to > 0) {
            if (typeof options.preview === 'function') {
                options.__preview = options.preview;
                options.preview = function(pblock) {
                    let args = arguments;
                    let callback = CmdUtils.previewCallback(pblock, options.__preview);
                    if (options.preview_timeout !== null)
                        clearTimeout(options.preview_timeout);
                    options.preview_timeout = setTimeout(function () {
                        callback.apply(options, args);
                    }, to);
                };
            }
        }

        options.previewDefault = CommandManager.previewDefault;

        this._commands.push(options);

        return options;
    }

    static previewDefault(pb) {
        var html = "";
        if ("previewHtml" in this) html = this.previewHtml;
        else {
            if ("description" in this)
                html += '<div class="description">' + this.description + '</div>';
            else if ("help" in this)
                html += '<p class="help">' + this.help + '</p>';
            if (!html) html = L(
                "Execute the %S command.",
                '<strong class="name">' + Utils.escapeHtml(this.name) + "</strong>");
            html = '<div class="default">' + html + '</div>';
        }
        return (pb || 0).innerHTML = html;
    };

    get commands() {
        return this._commands;
    }

    set commands(commands) {
        this._commands = commands;
    }

    getCommandByUUID(uuid) {
        return this._commands.find(c => c.uuid.toUpperCase() === uuid.toUpperCase());
    };

    async commandHistoryPush(input) {
        if (input) {
            input = input.trim();

            let history = await settings.get("command_history");

            if (!history)
                history = [];

                ADD_ITEM: {
                    if (history.length && history[0].toLowerCase() === input.toLowerCase())
                        break ADD_ITEM;

                    history = [input, ...history];

                    if (history.length > settings.max_history_items())
                        history.splice(history.length - 1, 1);

                    settings.set("command_history", history);
                }
        }
    }

    async commandHistory() {
        return settings.get("command_history");
    }

    enableCommand(cmd) {
        if (cmd.name in this._disabled_commands) {
            delete this._disabled_commands[cmd.name];
            settings.load().then(() => {
                settings.disabled_commands(this._disabled_commands);
            });
        }
    };

    disableCommand(cmd) {
        if (!(cmd.name in this._disabled_commands)) {
            this._disabled_commands[cmd.name] = true;
            settings.load().then(() => {
                settings.disabled_commands(this._disabled_commands);
            });
        }
    };

    makeParser() {
        return NLParser.makeParserForLanguage("en", this._commands);
    };

    // adds a storage bin obtained from the command uuid as the last argument of the called function
    async callPersistent(cmd, obj, f) {
        let args = arguments;
        let new_args = Array.prototype.slice.call(args, 3);

        const bin = await Utils.makeBin(cmd.uuid);
        new_args.push(bin);

        try {
            f.apply(obj, new_args);
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

    unloadCustomScripts(namespace) {
        if (namespace)
            this._commands = this._commands.filter(c => c._namespace !== namespace);
        else
            this._commands = this._commands.filter(c => !!c._builtin);
    }

    async _loadDynamicManifest() {
        let response = await fetch("/commands/dynamic.json");
        if (response.ok) {
            let json = await response.text();
            json = json.replaceAll(/\/\/.*?$/gm, "")
            return JSON.parse(json);
        }
    }

    async _loadDynamicFile(file) {
        if (file) {
            if (file.startsWith("/"))
                file = file.substr(1);

            let response = await fetch(`/commands/${file}`);
            if (response.ok)
                return await response.text();
        }
    }

    async loadBuiltinScripts() {
        try {
            let manifest = await this._loadDynamicManifest();
            let preprocessor = new CommandPreprocessor(CommandPreprocessor.CONTEXT_BUILTIN);

            for (let file of manifest.files) {
                if (file.path === "example.js")
                    continue;

                try {
                    let script = await this._loadDynamicFile(file.path);
                    if (script) {
                        script = preprocessor.run(script, file.syntax);
                        await CmdUtils.eval(script);
                    }
                } catch (e) {
                    console.error("builtin script evaluation failed", e);
                }
            }
        } catch (e) {
            console.error("builtin scripts load failed", e);
        }
    }

    async loadCustomScripts(namespace) {
        this.unloadCustomScripts(namespace);

        let preprocessor = new CommandPreprocessor(CommandPreprocessor.CONTEXT_CUSTOM);
        let customscripts = await repository.fetchUserScripts(namespace);

        if (namespace)
            customscripts = [customscripts];

        for (let record of customscripts) {
            try {
                if (record.script) {
                    let script = preprocessor.run(record.script);
                    await CmdUtils.eval(script);

                    for (let cmd of this._commands.filter(c => !c._builtin && !c._namespace))
                        cmd._namespace = record.namespace;
                }
            } catch (e) {
                console.error("custom script evaluation failed", e);
            }
        }
    }

    async prepareCommands() {
        this._commands = this._commands.filter(cmd => CmdUtils.DEBUG || !cmd._hidden);

        let disabledCommands = settings.disabled_commands();

        if (disabledCommands)
            for (const cmd of this._commands) {
                if (cmd.name in disabledCommands)
                    cmd.disabled = true;
            }

        return this.initializeCommands();
    }

    async initializeCommands() {
        for (const cmd of this._commands) {
            try {
                if (cmd.load)
                    await this.initCommand(cmd, cmd.load);
            }
            catch (e) {
                console.log(e, e.stack);
            }
        }
    }

    async initializeCommandsPopup(doc) {
        for (let cmd of this._commands) {
            try {
                if (cmd.init) {
                    await this.initCommand(cmd, cmd.init, doc);
                }
            }
            catch (e) {
                console.log(e.message);
            }
        }
    }
}

export const cmdManager = new CommandManager();
