// Preprocessor used to support new object-oriented command syntax

OBJECT = "object";
FOR = "subject";
TO = "goal";
FROM = "source";
NEAR = "location";
AT = "time";
WITH = "instrument";
IN = "format";
OF = "modifier";
AS = "alias";
BY = "cause";
ON = "dependency"

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


class CommandPreprocessor {
    constructor(context) {
        this._context = context;
    }

    camelToKebab(name) {
        let result = name.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
        if (result.startsWith("-"))
            return result.substr(1);
        return result;
    }

    extractFullDefinition(script, object) {
        let literalChar = c => c === "\"" || c === "\'" || c === "\`";
        
        let body = script.substr(object.index + object.all.length - 1);

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

        return script.substring(object.index, object.index + object.all.length + ctr);
    }

    extractAnnotatedClasses(script) {
        const rxClassCommand = /\/\*\*(.*?)\*\/\s*^\s*class\s+(\w+).*?{/gsm
        const matches = [...script.matchAll(rxClassCommand)];

        return matches.map(m => ({name: m[2], comment: m[1], all: m[0], index: m.index}));
    }

    extractAnnotatedFunctions(script) {
        const rxFun = /\/\*\*(.*?)\*\/\s*^\s*function\s*(\w+)(.*?){/gsm
        const matches = [...script.matchAll(rxFun)];

        return matches.map(m => ({name: m[2], comment: m[1], args: m[3], all: m[0], index: m.index}));
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
            help: comment.replaceAll(/@\w+.*?(?:\r?\n|$)/g, "").trim() || undefined,
            require: require,
            requirePopup: requirePopup,
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

    static assignCommandPreview() {
        return function (pblock, args, storage) {
            for (let role of PREPROCESSOR_PREPOSITION_MAP.keys())
                if (args[role])
                    args[PREPROCESSOR_PREPOSITION_MAP.get(role)] = args[role]

            this.__oo_preview(args, pblock, storage);
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
                ? ("[" + this.generateProperty(properties.command) + "]")
                : ("[" + this.generateProperty(properties.name) + "]")

        if (properties.name)
            block += `    ${prefix}names = ${command_name};\n`;
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
        if (properties.require)
            block += `    ${prefix}require = ${JSON.stringify(properties.require)};\n`;
        if (properties.requirePopup)
            block += `    ${prefix}requirePopup = ${JSON.stringify(properties.requirePopup)};\n`;
        
        return block;
    }
    
    generateCommandSetupBlock(object) {
        let block = `\n{
    let args = {};
    let command = new ${object.name}(args);
    command.arguments = CommandPreprocessor.assignCommandArguments(args);
    
    command.__oo_preview = command.preview;
    command.preview = CommandPreprocessor.assignCommandPreview();\n\n`

        block += this.generateCommandPropertyBlock(object.properties, "command.");
        block += `\n    cmdAPI.createCommand(command);\n}\n`;

        return block;
    }

    generateCommand(script, object) {
        return script.replace(object.fullDefinition, object.fullDefinition + this.generateCommandSetupBlock(object));
    }

    generateMetaClass(script, object) {
        let metaName = `__metaclass_${object.name}`;
        let nameRx = new RegExp(`/\\*\\*.*?\\*/\\s*(^\\s*class\\s+)${object.name}(.*?{)`, "sm");
        let metaDefinition = object.fullDefinition.replace(nameRx, `\$1${metaName}\$2`);
        let metaGenerator = `\n\nclass ${object.name} extends ${metaName} {
    
    constructor(name) {
        let args = {};
        super(args);
        this.arguments = CommandPreprocessor.assignCommandArguments(args);
        this.__oo_preview = this.preview;
        this.preview = CommandPreprocessor.assignCommandPreview(); 
        
        if (name && Array.isArray(name) && name.length)
            this.names = name;
        else if (name) {
            this.name = name;
            this.names = undefined;
        }
        else {
            if (!this.name && this.names && this.names.length)
                this.name = this.names[0];
            this.names = undefined; 
        }
    }\n\n`

        metaGenerator += this.generateCommandPropertyBlock(object.properties);
        metaGenerator += `\n}`

        metaDefinition += metaGenerator;

        return script.replace(object.fullDefinition, metaDefinition);
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
    suggest: function ${object.args.trim()} {
    ${object.fullDefinition.replace(object.all, "")}
};`

        return definition;
    }

    preprocessNounTypes(script) {
        const functionMatches = this.extractAnnotatedFunctions(script);

        for (let object of functionMatches) {
            let properties = this.extractNounTypeProperties(object.comment);

            if (!properties.nountype) {
                object.skip = true;
                continue;
            }

            object.fullDefinition = this.extractFullDefinition(script, object);
            object.nounType = this.generateNounType(object, properties);
        }

        for (let object of functionMatches)
            if (!object.skip)
                script = script.replace(object.fullDefinition, object.nounType);

        return script;
    }

    preprocessCommands(script) {
        const classMatches = this.extractAnnotatedClasses(script);

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

        for (let object of classMatches)
            if (!object.skip) {
                script = this.preprocessCommand(script, object);
                //console.log(script);
            }

        return script;
    }

    run(script, syntax) {
        script = this.preprocessNounTypes(script);
        script = this.preprocessCommands(script);

        return script;
    }
}

CommandPreprocessor.CONTEXT_BUILTIN = 0;
CommandPreprocessor.CONTEXT_CUSTOM = 1;
