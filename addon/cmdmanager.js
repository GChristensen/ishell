import {settings} from "./settings.js";
import {repository} from "./storage.js";
import {helperApp} from "./helper_app.js";

class CommandManager {
    ns = { // command namespaces
        ISHELL: "iShell",
        BROWSER: "Browser",
        UTILITY: "Utility",
        SEARCH: "Search",
        SYNDICATION: "Syndication",
        MAIL: "Mail",
        TRANSLATION: "Translation",
        SCRAPYARD: "Scrapyard",
        MORE: "More Commands"
    };

    _builtinModules = [
        "/commands/browser.js",
        "/commands/ishell.js",
        "/commands/search.js",
        "/commands/translate.js",
        "/commands/utility.js",

        "/commands/more/kpop.js",
        "/commands/more/javlib.js",
        "/commands/more/nyaa.js",
        "/commands/more/more.js",
        "/commands/feedsub.js",
        "/commands/history.js",
        "/commands/color-picker.js",
        "/commands/lingvo.js",
        "/commands/literature.js",
        "/commands/mail.js",
        "/commands/resurrect.js",
        "/commands/scrapyard.js",
        "/commands/unicode.js",
    ];
    
    constructor() {
        this._commands = [];
        this._disabledCommands = [];
    }

    makeParser() {
        return NLParser.makeParserForLanguage("en", this._commands);
    };

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

        options.previewDefault = CmdUtils.CreateCommand.previewDefault;

        this._commands.push(options);

        return options;
    }

    getCommandByUUID(uuid) {
        return this._commands.find(c => c.uuid.toUpperCase() === uuid.toUpperCase());
    };

    getCommandByName(name) {
        for (let c in this._commands)
            if (this._commands[c].name === name || this._commands[c].names.indexOf(name) > -1)
                return this._commands[c];
        return null;
    };
    
    removeCommand(command) {
        this._commands = this._commands.filter(cmd => cmd.id !== command.id);
    }

    get commands() {
        return this._commands;
    }

    set commands(commands) {
        this._commands = commands;
    }

    get builtinCommands() {
        return this._commands.filter(c => c._builtin)
    }

    get userCommands() {
        return this._commands.filter(c => !c._builtin)
    }

    enableCommand(cmd) {
        if (cmd.name in this._disabledCommands) {
            delete this._disabledCommands[cmd.name];
            settings.load().then(() => {
                settings.disabled_commands(this._disabledCommands);
            });
        }
    };

    disableCommand(cmd) {
        if (!(cmd.name in this._disabledCommands)) {
            this._disabledCommands[cmd.name] = true;
            settings.load().then(() => {
                settings.disabled_commands(this._disabledCommands);
            });
        }
    };

    // adds a storage bin obtained from the command uuid as the last argument of the called function
    async _callCommandHandler(cmd, obj, f) {
        let newArgs = Array.prototype.slice.call(arguments, 3);

        const bin = await Utils.makeBin(cmd.uuid);
        newArgs.push(bin);

        try {
            f.apply(obj, newArgs); // sic!
        } catch (e) {
            console.error(`iShell command: ${cmd.name}\n${e.toString()}\n${e.stack}`);
        }
    }

    callPreview(sentence, pblock) {
        return this._callCommandHandler(sentence.getCommand(), sentence, sentence.preview, pblock);
    }

    callExecute(sentence) {
        return this._callCommandHandler(sentence.getCommand(), sentence, sentence.execute)
    }

    _unloadUserCommands(namespace) {
        if (namespace)
            this._commands = this._commands.filter(c => c._namespace !== namespace);
        else
            this._commands = this._commands.filter(c => !!c._builtin);
    }

    async _loadBuiltinCommandModule(path) {
        const module = await import(path);

        if (module._namespace) {
            const name = typeof module._namespace === "string"
                ? module._namespace
                : module._namespace.name;
            const annotated = typeof module._namespace === "object" && module._namespace.annotated;

            if (annotated)
                await this._loadAnnotatedCommandModule(path);

            this.assignBuiltinNamespace(name);
        }
        else
            console.log("module '%s' has no namespace", path);
    }

    async _loadAnnotatedCommandModule(path) {
        const preprocessor = new CommandPreprocessor(CommandPreprocessor.CONTEXT_BUILTIN);
        await preprocessor.load(path);
    }

    assignBuiltinNamespace(name, commands) {
        commands = commands || this._commands.filter(c => !c._namespace);

        for (let cmd of commands) {
            cmd._namespace = name;
            cmd._builtin = true;
        }
    }

    async loadUserCommands(namespace) {
        this._unloadUserCommands(namespace);

        let preprocessor = new CommandPreprocessor(CommandPreprocessor.CONTEXT_USER);
        let userscripts = await repository.fetchUserScripts(namespace);

        if (namespace)
            userscripts = [userscripts];

        for (let record of userscripts) {
            try {
                if (record.script) {
                    let script = preprocessor.transform(record.script);
                    await cmdAPI.evaluate(script);

                    for (let cmd of this._commands.filter(c => !c._builtin && !c._namespace))
                        cmd._namespace = record.namespace;
                }
            } catch (e) {
                console.error("custom script evaluation failed", e);
            }
        }
    }

    async loadCommands() {
        for (const path of this._builtinModules)
            await this._loadBuiltinCommandModule(path);

        const canLoadUserScripts = !_MANIFEST_V3 || _MANIFEST_V3 && !_BACKGROUND_PAGE
            || _MANIFEST_V3 && _BACKGROUND_PAGE && await helperApp.probe();

        if (canLoadUserScripts)
            await cmdManager.loadUserCommands();

        await this._prepareCommands();
    }

    async _prepareCommands() {
        this._commands = this._commands.filter(cmd => !cmd._hidden || cmdAPI.DEBUG && cmd._debug);

        let disabledCommands = settings.disabled_commands();

        if (disabledCommands)
            for (const cmd of this._commands) {
                if (cmd.name in disabledCommands)
                    cmd.disabled = true;
            }

        return this._initializeCommands();
    }

    async _initializeCommands() {
        for (const cmd of this._commands) {
            try {
                if (cmd.load)
                    await this._callCommandHandler(cmd, cmd, cmd.load);
            }
            catch (e) {
                console.error(e, e.stack);
            }
        }
    }

    async initializeCommandsOnPopup(doc) {
        for (let cmd of this._commands) {
            try {
                if (cmd.init) {
                    await this._callCommandHandler(cmd, cmd, cmd.init, doc);
                }
            }
            catch (e) {
                console.error(e.message);
            }
        }
    }
}

export const cmdManager = new CommandManager();