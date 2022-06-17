// Preprocessor used to provide new object-oriented command syntax

export const OBJECT = "object";
export const FOR = "subject";
export const TO = "goal";
export const FROM = "source";
export const NEAR = "location";
export const AT = "time";
export const WITH = "instrument";
export const IN = "format";
export const OF = "modifier";
export const AS = "alias";
export const BY = "cause";
export const ON = "dependency"

let PREPROCESSOR_PREPOSITION_MAP = new Map([
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


export class CommandPreprocessor {
    static CONTEXT_BUILTIN = 0;
    static CONTEXT_CUSTOM = 1;

    constructor(context) {
        this._context = context;
    }

    camelToKebab(name) {
        let result = name.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
        if (result.startsWith("-"))
            return result.substring(1);
        return result;
    }

    extractFullDefinition(script, object) {
        let literalChar = c => c === "\"" || c === "\'" || c === "\`";
        
        let body = script.substring(object.index + object.fullDeclaration.length - 1);

        // transform most common regex forms to string literals
        body = body.replace(/\/(.+?)\/([a-z.]+)/g, '"$1"$2');
        body = body.replace(/\((\s*)\/(.+?)\/([^\/)]*)\)/g, '($1"$2"$3)');

        let limit = body.length - 1;
        let stack = 0;
        let ctr = 0;

        let inLiteral = false;
        let inComment = null;

        let c2;

        for (let c of body) {
            if (ctr < limit)
                c2 = body[ctr + 1];

            if (!inLiteral && !inComment && c === "{")
                stack += 1;

            if (!inLiteral && !inComment && c === "}")
                stack -= 1;

            if (!inLiteral && !inComment) {
                if (c === "/") {
                    if (c2 === "*")
                        inComment = "*";
                    else if (c2 === "/")
                        inComment = "/";
                    else
                        inComment = null;
                }
            }

            if (inComment) {
                if (c === "\n" && inComment === "/")
                    inComment = null;
                else if (c === "*" && c2 === "/" && inComment === "*")
                    inComment = null;
            }

            if (!inComment && !inLiteral && literalChar(c)) {
                inLiteral = true;
                ctr += 1;
                continue;
            }

            if (!inComment && inLiteral && literalChar(c)) {
                inLiteral = false;
                ctr += 1;
                continue;
            }

            if (stack === 0)
                break;

            ctr += 1;
        }

        return script.substring(object.index, object.index + object.fullDeclaration.length + ctr);
    }

    extractAnnotatedEntities(script, type) {
        // the regex only allows to extract the last annotated definition in the script
        const rx = /\/\*\*(?!.*\/\*\*)(.*?)\*\/\s*^\s*(?:export\s*)?(async\s*)?(class|function)\s*(\w+)(.*?)?{/gsm
        const matches = [];

        let match;
        do {
            match = rx.exec(script);
            if (match) {
                matches.push(match);
                script = script.substring(0, match.index);
                rx.lastIndex = 0;
            }
        } while (match);

        const entities = matches.map(m => ({
            fullDeclaration: m[0],
            comment: m[1],
            async: m[2],
            type: m[3],
            name: m[4],
            args: m[5],
            index: m.index
        }));

        return entities.filter(e => e.type === type);
    }

    processMarkdown(text) {
        let spaces;
        let unindentRx = /^[ ]{0}/m;
        let syntax = false;
        let lines = text.split(/\r?\n/);

        for (let i = 0; i < lines.length; ++i) {
            let trimmed = lines[i].trim();

            if (trimmed && spaces === undefined) {
                spaces = lines[i].indexOf(trimmed);
                if (spaces > 0)
                    unindentRx = new RegExp(`^[ ]{0,${spaces}}`);
            }

            lines[i] = lines[i].replace(unindentRx, "");

            // markdown comment: [//]: # (comment text)
            if (/\[\/\/]: # \(.*?\)$/.exec(lines[i]))
                lines[i] = "";

            // wrap into div with the "syntax" class if markdown headings are used
            if (lines[i].match(/^\s*#/))
                syntax = true;
        }

        text = lines.join("\n");
        if (syntax)
            return`<div class="syntax">${marked(text)}</div>`;
        else
            return marked(text);
    }

    extractCommandProperties(comment) {
        let command = comment.match(/@command(.*?)(?:\r?\n|$)/i);
        let delay = comment.match(/@delay (\d+)/i);
        let preview = comment.match(/@preview (.*?)(?:\r?\n|$)/i);
        let license = comment.match(/@license (.*?)(?:\r?\n|$)/i);
        let author = comment.match(/@author (.*?)(?:\r?\n|$)/i);
        let icon = comment.match(/@icon (.*?)(?:\r?\n|$)/i);
        let homepage = comment.match(/@homepage (.*?)(?:\r?\n|$)/i);
        let description = comment.match(/@description (.*?)(?:\r?\n|$)/i);
        let uuid = comment.match(/@uuid (.*?)(?:\r?\n|$)/i);
        let namespace = comment.match(/@namespace (.*?)(?:\r?\n|$)/i);
        let hidden = comment.match(/@hidden/i);
        let metaclass = comment.match(/@metaclass/i);
        let markdown = comment.match(/@markdown/i);
        let dbgprint = comment.match(/@dbgprint/i);

        let require;
        let requirePopup;

        let require_matches = [...comment.matchAll(/@require (.+?)(?:\r?\n|$)/ig)];
        if (require_matches.length) {
            require = [];
            for (let m of require_matches) {
                require.push(m[1].trim());
            }
        }

        require_matches = [...comment.matchAll(/@requirePopup (.+?)(?:\r?\n|$)/ig)];
        if (require_matches.length) {
            requirePopup = [];
            for (let m of require_matches) {
                requirePopup.push(m[1].trim());
            }
        }

        let command_name = command ? command?.[1]?.trim() || true: false;

        if (typeof command_name === "string")
            if (command_name.indexOf(" ") > 0 || command_name.indexOf(",") > 0) {
                command_name = command_name.replaceAll(",", " ");
                command_name = command_name.replaceAll(/\s+/g, " ");
                command_name = command_name.split(" ");
            }

        let help_content = comment.replaceAll(/@\w+.*?(?:\r?\n|$)/g, "");

        if (markdown)
            help_content = this.processMarkdown(help_content);
        else
            help_content = help_content.trim();

        return {
            command: command_name,
            delay: delay && delay[1] ? parseInt(delay[1]) : undefined,
            preview: preview?.[1]?.trim(),
            license: license?.[1]?.trim(),
            author: author?.[1]?.trim(),
            icon: icon?.[1]?.trim(),
            homepage: homepage?.[1]?.trim(),
            description: description?.[1]?.trim(),
            uuid: uuid?.[1]?.trim(),
            namespace: this._context === CommandPreprocessor.CONTEXT_BUILTIN? namespace?.[1]?.trim(): undefined,
            hidden: !!hidden,
            metaclass: !!metaclass,
            help: help_content,
            require: require,
            requirePopup: requirePopup,
            dbgprint: !!dbgprint
        }
    }

    extractNounTypeProperties(comment) {
        let nountype = comment.match(/@nountype/i);
        let label = comment.match(/@label (.*?)(?:\r?\n|$)/i);

        return {
            nountype: !!nountype,
            label: label?.[1]?.trim()
        };
    }

    static assignCommandArguments(args) {
        let _arguments = [];

        for (let a in args) {
            args[a].role = a;
            _arguments.push(args[a]);
        }
        
        return _arguments;
    }

    static transformCommandArguments(args) {
        for (let role of PREPROCESSOR_PREPOSITION_MAP.keys())
            if (args[role])
                args[PREPROCESSOR_PREPOSITION_MAP.get(role)] = args[role];
    }

    static assignCommandHandlers(command) {
        if (command.preview && typeof command.preview === "function") {
            command.__oo_preview = command.preview;

            command.preview = function (pblock, args, storage) {
                CommandPreprocessor.transformCommandArguments(args);
                this.__oo_preview(args, pblock, storage);
            }
        }

        if (command.execute) {
            command.__oo_execute = command.execute;

            command.execute = function (args, storage) {
                CommandPreprocessor.transformCommandArguments(args);
                this.__oo_execute(args, storage);
            }
        }
    }

    generateProperty(property) {
        return property ? ("\`" + property.replaceAll(/`/g, "\\`") + "\`") : "undefined";
    }

    generateCommandPropertyBlock(properties, prefix = "") {
        let block = "";
        let command_name;

        if (Array.isArray(properties.command))
            command_name = JSON.stringify(properties.command)
        else
            command_name = typeof properties.command === "string"
                ? this.generateProperty(properties.command)
                : this.generateProperty(properties.name);

        if (command_name.startsWith("["))
            block += `    ${prefix}names = ${command_name};\n`;
        else
            block += `    ${prefix}name = ${command_name};\n`;
        if (properties.delay)
            block += `    ${prefix}previewDelay = ${properties.delay || "undefined"};\n`;
        if (properties.preview)
            block += `    ${prefix}preview = ${this.generateProperty(properties.preview)};\n`;
        if (properties.license)
            block += `    ${prefix}license = ${this.generateProperty(properties.license)};\n`;
        if (properties.author)
            block += `    ${prefix}author = ${this.generateProperty(properties.author)};\n`;
        if (properties.icon)
            block += `    ${prefix}icon = ${this.generateProperty(properties.icon)};\n`;
        if (properties.homepage)
            block += `    ${prefix}homepage = ${this.generateProperty(properties.homepage)};\n`;
        if (properties.description)
            block += `    ${prefix}description = ${this.generateProperty(properties.description)};\n`;
        if (properties.help)
            block += `    ${prefix}help = ${this.generateProperty(properties.help)};\n`;
        if (properties.uuid)
            block += `    ${prefix}uuid = ${this.generateProperty(properties.uuid)};\n`;
        if (properties.namespace)
            block += `    ${prefix}_namespace = ${this.generateProperty(properties.namespace)};\n`;
        if (properties.hidden)
            block += `    ${prefix}_hidden = true;\n`;
        // if (properties.require)
        //     block += `    ${prefix}require = ${JSON.stringify(properties.require)};\n`;
        // if (properties.requirePopup)
        //     block += `    ${prefix}requirePopup = ${JSON.stringify(properties.requirePopup)};\n`;
        
        return block;
    }

    static assignCommandProperties(object, properties) {
        object._hidden = properties.hidden || object._hidden;
        delete properties.hidden;

        object._namespace = properties.namespace || object._namespace;
        delete properties.namespace;

        object.preview = properties.preview || object.preview;
        delete properties.preview;

        if (Array.isArray(properties.command))
            object.names = properties.command;
        else
            object.name = typeof properties.command === "string"
                ? properties.command
                : properties.name;

        delete properties.command;

        Object.assign(object, properties);
    }
    
    generateCommandSetupBlock(object) {
        let block = `\n{
    const args = {};
    const command = new ${object.name}(args);
    command.arguments = CommandPreprocessor.assignCommandArguments(args);
    
    CommandPreprocessor.assignCommandHandlers(command);\n\n`

        block += this.generateCommandPropertyBlock(object.properties, "command.");
        block += `\n    cmdAPI.createCommand(command);\n}\n`;

        return block;
    }

    static instantiateCommand(classDef, classMeta) {
        classDef._annotations = {};
        CommandPreprocessor.assignCommandProperties(classDef._annotations, classMeta.properties);

        const args = {};
        const command = new classDef(args);

        command.arguments = CommandPreprocessor.assignCommandArguments(args);
        CommandPreprocessor.assignCommandProperties(command, classMeta.properties);
        CommandPreprocessor.assignCommandHandlers(command);

        return command;
    }

    generateCommand(script, object) {
        return script.replace(object.fullDefinition, object.fullDefinition + this.generateCommandSetupBlock(object));
    }

    generateMetaClass(script, object) {
        let metaName = `__metaclass_${object.name}`;
        let nameRx = new RegExp(`/\\*\\*.*?\\*/\\s*(^\\s*class\\s+)${object.name}(.*?{)`, "sm");
        let metaDefinition = object.fullDefinition.replace(nameRx, `\$1${metaName}\$2`);
        let metaGenerator = `\n\nclass ${object.name} extends ${metaName} {
    constructor() {
        let args = {};
        super(args);
        this.arguments = CommandPreprocessor.assignCommandArguments(args);
        CommandPreprocessor.assignCommandHandlers(this); 
        
        ${this.generateCommandPropertyBlock(object.properties, "this.")}        
        
        if (this.metaconstructor)
            return this.metaconstructor.apply(this, arguments);
    }
}`

        return script.replace(object.fullDefinition, metaDefinition + metaGenerator);
    }

    preprocessCommand(script, object) {
        if (object.properties.metaclass)
            return this.generateMetaClass(script, object);
        else
            return this.generateCommand(script, object);
    }

    generateNounType(object, properties) {
        let definition = `var ${object.name} = {`

        if (properties.label)
            definition += `\n    label: ${this.generateProperty(properties.label)},`

        definition += `
    suggest: ${object.async_ || ""} function ${object.args.trim()} {
    ${object.fullDefinition.replace(object.fullDeclaration, "")}
};`

        return definition;
    }

    static instantiateNounType(fun, funMeta) {
        fun.label = funMeta.label;
        fun.suggest = (...args) => fun(...args);
    }

    extractFunctions(script) {
        const functionMatches = this.extractAnnotatedEntities(script, "function");

        for (let object of functionMatches) {
            let properties = this.extractNounTypeProperties(object.comment);

            if (!properties.nountype) {
                object.skip = true;
                continue;
            }

            object.fullDefinition = this.extractFullDefinition(script, object);
            object.nounType = this.generateNounType(object, properties);
        }

        return functionMatches;
    }

    preprocessNounTypes(script) {
        const functionMatches = this.extractFunctions(script);

        for (let object of functionMatches)
            if (!object.skip)
                script = script.replace(object.fullDefinition, object.nounType);

        return script;
    }

    extractClasses(script) {
        const classMatches = this.extractAnnotatedEntities(script, "class");

        for (let object of classMatches) {
            let properties = {name: this.camelToKebab(object.name)}

            if (object.comment)
                Object.assign(properties, this.extractCommandProperties(object.comment));

            if (!properties.command) {
                object.skip = true;
                continue;
            }

            object.fullDefinition = this.extractFullDefinition(script, object);
            object.properties = properties;
        }

        return classMatches;
    }

    preprocessCommands(script) {
        const classMatches = this.extractClasses(script);

        for (let object of classMatches)
            if (!object.skip) {
                script = this.preprocessCommand(script, object);
                if (object.properties.dbgprint)
                    console.log(script);
            }

        return script;
    }

    transform(text) {
        text = this.preprocessNounTypes(text);
        text = this.preprocessCommands(text);

        return text;
    }

    async load(file) {
        const module = await import(`..${file.path}`);

        const functions = this.extractFunctions(file.content);

        for (const funMeta of functions) {
            if (!funMeta.skip) {
                const fun = Object.entries(module).find(e => e[0] === funMeta.name)?.[1];
                if (fun)
                    CommandPreprocessor.instantiateNounType(fun, funMeta);
            }
        }

        const classes = this.extractClasses(file.content);

        for (const classMeta of classes) {
            if (!classMeta.skip) {
                const classDef = Object.entries(module).find(e => e[0] === classMeta.name)?.[1];
                if (classDef) {
                    const command = CommandPreprocessor.instantiateCommand(classDef, classMeta);
                    cmdAPI.createCommand(command);
                }
            }
        }

        if (module._init)
            await module._init();
    }
}
