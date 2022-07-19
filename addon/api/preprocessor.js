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

let ROLE_TO_PREPOSITION_ARG_MAP = new Map([
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

let PREPOSITION_TO_ROLE_ARG_MAP = new Map([
    ["OBJECT", OBJECT],
    ["FOR", FOR],
    ["TO", TO],
    ["FROM", FROM],
    ["NEAR", NEAR],
    ["AT", AT],
    ["WITH", WITH],
    ["IN", IN],
    ["OF", OF],
    ["AS", AS],
    ["BY", BY],
    ["ON", ON]
]);

export class CommandPreprocessor {
    static CONTEXT_BUILTIN = 0;
    static CONTEXT_USER = 1;

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
        let author = comment.match(/@author (.*)(?:\r?\n|$)/i);
        let icon = comment.match(/@icon (.*?)(?:\r?\n|$)/i);
        let homepage = comment.match(/@homepage (.*?)(?:\r?\n|$)/i);
        let description = comment.match(/@description (.*?)(?:\r?\n|$)/i);
        let uuid = comment.match(/@uuid (.*?)(?:\r?\n|$)/i);
        let hidden = comment.match(/@hidden/i);
        let metaclass = comment.match(/@metaclass/i);
        let markdown = comment.match(/@markdown/i);
        let dbgprint = comment.match(/@dbgprint/i);
        let search = comment.match(/@search/i);
        let url = search && comment.match(/@url (.*)(?:\r?\n|$)/i);
        let post = search && comment.match(/@post (.*)(?:\r?\n|$)/i);
        let defaultUrl = search && comment.match(/@default (.*)(?:\r?\n|$)/i);
        let parser = search && comment.match(/@parser (.*)(?:\r?\n|$)/i);
        let parserUrl = search && comment.match(/@parser.url (.*)(?:\r?\n|$)/i);
        let parserPost = search && comment.match(/@parser.post (.*)(?:\r?\n|$)/i);
        let container = search && comment.match(/@container (.*)(?:\r?\n|$)/i);
        let title = search && comment.match(/@title (.*)(?:\r?\n|$)/i);
        let href = search && comment.match(/@href (.*)(?:\r?\n|$)/i);
        let thumbnail = search && comment.match(/@thumbnail (.*)(?:\r?\n|$)/i);
        let body = search && comment.match(/@body (.*)(?:\r?\n|$)/i);
        let base = search && comment.match(/@base (.*)(?:\r?\n|$)/i);
        let results = search && comment.match(/@results (.*)(?:\r?\n|$)/i);
        let plain = search && comment.match(/@plain (.*)(?:\r?\n|$)/i);
        let display = search && comment.match(/@display (.*)(?:\r?\n|$)/i);

        let commandName = command ? command?.[1]?.trim() || true: false;

        if (typeof commandName === "string")
            if (commandName.indexOf(" ") > 0 || commandName.indexOf(",") > 0) {
                commandName = commandName.replaceAll(",", " ");
                commandName = commandName.replaceAll(/\s+/g, " ");
                commandName = commandName.split(" ");
            }

        let authors;
        if (author) {
            authors = author[1].split(",");
            authors = authors.map(a => this.parseAuthorProperty(a));
        }

        let help_content = comment.replaceAll(/@\w+.*?(?:\r?\n|$)/g, "");

        if (markdown)
            help_content = this.processMarkdown(help_content);
        else
            help_content = help_content.trim();

        if (plain) {
            plain = plain[1].split(",");
            plain = plain.map(s => s.trim());
        }

        return {
            command: commandName,
            delay: delay && delay[1] ? parseInt(delay[1]) : undefined,
            preview: preview?.[1]?.trim(),
            license: license?.[1]?.trim(),
            authors: authors,
            icon: icon?.[1]?.trim(),
            homepage: homepage?.[1]?.trim(),
            description: description?.[1]?.trim(),
            uuid: uuid?.[1]?.trim(),
            hidden: !!hidden,
            metaclass: !!metaclass,
            help: help_content,
            dbgprint: !!dbgprint,
            search: !!search,
            url: url?.[1]?.trim(),
            post: post?.[1]?.trim(),
            defaultUrl: defaultUrl?.[1]?.trim(),
            parser: parser?.[1]?.trim(),
            parserUrl: parserUrl?.[1]?.trim(),
            parserPost: parserPost?.[1]?.trim(),
            container: container?.[1]?.trim(),
            title: title?.[1]?.trim(),
            href: href?.[1]?.trim(),
            thumbnail: thumbnail?.[1]?.trim(),
            body: body?.[1]?.trim(),
            base: base?.[1]?.trim(),
            results: results?.[1]? parseInt(results?.[1]?.trim()): null,
            plain: plain,
            display: display?.[1]?.trim()
        }
    }

    parseAuthorProperty(author) {
        const email = author.match(/<([^>]+)>/);
        const name = author.match(/([^<]+)/)

        if (email)
            return {name: name[1].trim(), email: email[1]?.trim()};
        else
            return author?.trim();
    }

    extractNounTypeProperties(comment) {
        const nountype = comment.match(/@nountype/i);
        const label = comment.match(/@label (.*?)(?:\r?\n|$)/i);
        const dbgprint = comment.match(/@dbgprint/i);

        return {
            nountype: !!nountype,
            label: label?.[1]?.trim(),
            dbgprint: !!dbgprint
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

    static injectPrepositionBasedArguments(args) {
        for (let role of ROLE_TO_PREPOSITION_ARG_MAP.keys())
            if (args[role])
                args[ROLE_TO_PREPOSITION_ARG_MAP.get(role)] = args[role];
    }

    static assignRoleBasedArgumentValues(args) {
        for (let preposition of PREPOSITION_TO_ROLE_ARG_MAP.keys())
            if (args[preposition])
                args[PREPOSITION_TO_ROLE_ARG_MAP.get(preposition)] = args[preposition];
    }

    static assignCommandHandlers(command) {
        if (command.preview && typeof command.preview === "function") {
            command.__class_preview = command.preview;

            command.preview = function (pblock, args, storage) {
                CommandPreprocessor.injectPrepositionBasedArguments(args);
                return this.__class_preview(args, pblock, storage);
            }
        }

        if (command.execute) {
            command.__class_execute = command.execute;

            command.execute = function (args, storage) {
                CommandPreprocessor.injectPrepositionBasedArguments(args);
                return this.__class_execute(args, storage);
            }
        }

        if (command.beforeSearch) {
            command.__class_beforeSearch = command.beforeSearch;

            command.beforeSearch = function (args) {
                CommandPreprocessor.injectPrepositionBasedArguments(args);
                const transformedArgs = this.__class_beforeSearch(args);
                CommandPreprocessor.assignRoleBasedArgumentValues(transformedArgs);
                return transformedArgs;
            }
        }

        if (command.parseContainer && command.parser)
            command.parser.container = command.parseContainer;

        if (command.parseTitle && command.parser)
            command.parser.title = command.parseTitle;

        if (command.parseHref && command.parser)
            command.parser.href = command.parseHref;

        if (command.parseThumbnail && command.parser)
            command.parser.thumbnail = command.parseThumbnail;

        if (command.parseBody && command.parser)
            command.parser.body = command.parseBody;
    }

    generateProperty(property) {
        let result = "undefined";

        if (typeof property === "number")
            result = property + "";
        else if (typeof property === "string")
            result =  "\`" + property.replaceAll(/`/g, "\\`") + "\`";
        else if (typeof property === "object")
            result = JSON.stringify(property);

        return result;
    }

    static assignCommandProperties(object, properties) {
        properties = {...properties};

        object._hidden = properties.hidden || object._hidden;
        delete properties.hidden;

        object.preview = properties.preview || object.preview;
        delete properties.preview;

        object.previewDelay = properties.delay || object.previewDelay;
        delete properties.delay;

        if (Array.isArray(properties.command))
            object.names = properties.command;
        else
            object.name = typeof properties.command === "string"
                ? properties.command
                : properties.name;

        delete properties.command;
        
        if (properties.search) {
            delete properties.search;
            
            object.postData = properties.post || object.postData;
            delete properties.post;

            object.parser = {
                type: properties.parser,
                url: properties.parserUrl,
                postData: properties.parserPost,
                container: properties.container,
                title: properties.title,
                href: properties.href,
                thumbnail: properties.thumbnail,
                body: properties.body,
                baseUrl: properties.base,
                maxResults: properties.result,
                plain: properties.plain,
                display: properties.display
            };

            this.removeEmptyProperties(object.parser);
        }

        delete properties.parser;
        delete properties.parserUrl;
        delete properties.parserPost;
        delete properties.container;
        delete properties.title;
        delete properties.href;
        delete properties.thumbnail;
        delete properties.body;
        delete properties.base;
        delete properties.result;
        delete properties.plain;
        delete properties.display;

        this.removeEmptyProperties(properties);

        Object.assign(object, properties);

        this.removeEmptyProperties(object);
    }

    static removeEmptyProperties(object) {
        for (const k in object)
            if (object[k] === null || object[k] === undefined)
                delete object[k];
    }
    
    generateCommandSetupBlock(object) {
        const generatingFunc = object.properties.search
            ? "createSearchCommand"
            : "createCommand";

        let block = `\n{
    const attributes = ${JSON.stringify(object.properties, null, 6)};
    CommandPreprocessor.assignCommandAnnotations(${object.name}, attributes);
    
    const args = {};
    const command = new ${object.name}(args);

    if (Object.keys(args).length > 0)
        command.arguments = CommandPreprocessor.assignCommandArguments(args);
    CommandPreprocessor.assignCommandProperties(command, attributes);    
    CommandPreprocessor.assignCommandHandlers(command);
    
    cmdAPI.${generatingFunc}(command);\n}\n`;

        return block;
    }

    static assignCommandAnnotations(classDef, annotations) {
        classDef.__definition = {};
        CommandPreprocessor.assignCommandProperties(classDef.__definition, annotations);
    }

    static instantiateCommand(classDef, classMeta = {properties: {}}) {
        const args = {};
        const command = new classDef(args);

        if (Object.keys(args).length > 0)
            command.arguments = CommandPreprocessor.assignCommandArguments(args);
        CommandPreprocessor.assignCommandAnnotations(classDef, classMeta.properties);
        CommandPreprocessor.assignCommandProperties(command, classMeta.properties);
        CommandPreprocessor.assignCommandHandlers(command);

        return command;
    }

    generateCommand(script, object) {
        object.generatedCode = object.fullDefinition + this.generateCommandSetupBlock(object);
        return script.replace(object.fullDefinition, object.generatedCode);
    }

    generateMetaClass(script, object) {
        let metaName = `__metaclass_${object.name}`;
        let nameRx = new RegExp(`/\\*\\*.*?\\*/\\s*(^\\s*class\\s+)${object.name}(.*?{)`, "sm");
        let metaPropertiesName = `__metaclass_${object.name}_attributes`;
        let metaProperties = `\n${metaPropertiesName} = ${JSON.stringify(object.properties, null, 12)};\n`;
        let metaDefinition = object.fullDefinition.replace(nameRx, `\$1${metaName}\$2`) + metaProperties;
        let metaGenerator = `\n\nclass ${object.name} extends ${metaName} {
    constructor() {
        let args = {};
        super(args);
        if (Object.keys(args).length > 0)
            this.arguments = CommandPreprocessor.assignCommandArguments(args);

        CommandPreprocessor.assignCommandProperties(this, ${metaPropertiesName}); 
        CommandPreprocessor.assignCommandHandlers(this); 
        
        if (this.metaconstructor)
            return this.metaconstructor.apply(this, arguments);
    }
}
CommandPreprocessor.assignCommandAnnotations(${object.name}, ${metaPropertiesName});
`;

        object.generatedCode = metaDefinition + metaGenerator;
        return script.replace(object.fullDefinition, object.generatedCode);
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
    suggest: ${object.async || ""} function ${object.args.trim()} {
    ${object.fullDefinition.replace(object.fullDeclaration, "")}
};`

        return definition;
    }

    static instantiateNounType(fun, funMeta) {
        fun.label = funMeta.label;
        fun.suggest = function(...args) { return fun.apply(this, args); };
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
            object.generatedCode = this.generateNounType(object, properties);
            object.properties = properties;
        }

        return functionMatches;
    }

    preprocessNounTypes(script) {
        const functionMatches = this.extractFunctions(script);

        for (let object of functionMatches)
            if (!object.skip)
                script = script.replace(object.fullDefinition, object.generatedCode);

        return [script, functionMatches];
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
            if (!object.skip)
                script = this.preprocessCommand(script, object);

        return [script, classMatches];
    }

    transform(text) {
        const [nounTypeOutput, functionMatches] = this.preprocessNounTypes(text);
        const [output, classMatches] = this.preprocessCommands(nounTypeOutput);
        const objects = [...functionMatches, ...classMatches];

        for (const object of objects)
            if (object.properties.dbgprint)
                console.log(object.generatedCode);

        return output;
    }

    async load(path) {
        const module = await import(path);
        const content = await (await fetch(path)).text();

        this._instantiateNounTypes(module, content);
        this._instantiateCommands(module, content);

        return module;
    }

    _instantiateCommands(module, content) {
        const classes = this.extractClasses(content);

        for (const classMeta of classes) {
            if (!classMeta.skip) {
                const classDef = Object.entries(module).find(e => e[0] === classMeta.name)?.[1];
                if (classDef) {
                    const command = CommandPreprocessor.instantiateCommand(classDef, classMeta);
                    if (classMeta.properties.search)
                        module.namespace.createSearchCommand(command);
                    else
                        module.namespace.createCommand(command);
                }
            }
        }
    }

    _instantiateNounTypes(module, content) {
        const functions = this.extractFunctions(content);

        for (const funMeta of functions) {
            if (!funMeta.skip) {
                const fun = Object.entries(module).find(e => e[0] === funMeta.name)?.[1];
                if (fun)
                    CommandPreprocessor.instantiateNounType(fun, funMeta);
            }
        }
    }
}
