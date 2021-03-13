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

class CommandPreprocessor {

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
        const rxClassCommand = /\/\*\*(.*?)\*\/\s*^\s*class\s*(\w+).*?{/gsm
        const matches = [...script.matchAll(rxClassCommand)];

        return matches.map(m => ({name: m[2], comment: m[1], all: m[0], index: m.index}));
    }

    extractAnnotatedFunctions(script) {
        const rxFun = /\/\*\*(.*?)\*\/\s*^\s*function\s*(\w+)(.*?){/gsm
        const matches = [...script.matchAll(rxFun)];

        return matches.map(m => ({name: m[2], comment: m[1], args: m[3], all: m[0], index: m.index}));
    }

    extractCommandProperties(comment) {
        let command = comment.match(/@command(.*?)(?:\n|$)/i);
        let delay = comment.match(/@delay (\d+)/i);
        let preview = comment.match(/@preview (.*?)(?:\n|$)/i);
        let license = comment.match(/@license (.*?)(?:\n|$)/i);
        let author = comment.match(/@author (.*?)(?:\n|$)/i);
        let icon = comment.match(/@icon (.*?)(?:\n|$)/i);
        let homepage = comment.match(/@homepage (.*?)(?:\n|$)/i);
        let description = comment.match(/@description (.*?)(?:\n|$)/i);
        let uuid = comment.match(/@uuid (.*?)(?:\n|$)/i);
        let help = comment.replaceAll(/@\w+.*?(?:\n|$)/g, "").trim();
        let require;

        let require_matches = [...comment.matchAll(/@require (.+?)(?:\n|$)/ig)];
        if (require_matches.length) {
            require = [];
            for (let m of require_matches) {
                require.push(m[1].trim());
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
            help: help || undefined,
            require: require
        }
    }

    extractNounTypeProperties(comment) {
        let nountype = comment.match(/@nountype/i);
        let label = comment.match(/@label (.*?)(?:\n|$)/i);

        return {
            nountype: !!nountype,
            label: label?.[1]?.trim()
        };
    }

    generateProperty(property) {
        return property ? ("\`" + property.replaceAll(/`/g, "\\`") + "\`") : "undefined";
    }

    generateCommandSetupBlock(object, properties) {
        let block = `\n{
    let args = {};
    let command = new ${object.name}(args);\n\n`
        let command_name;

        if (Array.isArray(properties.command))
            command_name = JSON.stringify(properties.command)
        else
            command_name = typeof properties.command === "string"
                ? ("[" + this.generateProperty(properties.command) + "]")
                : ("[" + this.generateProperty(properties.name) + "]")

        if (properties.name)
            block += `    command.names = ${command_name};\n`;
        if (properties.delay)
            block += `    command.previewDelay = ${properties.delay || "undefined"};\n`;
        if (properties.preview)
            block += `    command.preview = ${this.generateProperty(properties.preview)};\n`;
        if (properties.license)
            block += `    command.license = ${this.generateProperty(properties.license)};\n`;
        if (properties.author)
            block += `    command.author = ${this.generateProperty(properties.author)};\n`;
        if (properties.icon)
            block += `    command.icon = ${this.generateProperty(properties.icon)};\n`;
        if (properties.homepage)
            block += `    command.homepage = ${this.generateProperty(properties.homepage)};\n`;
        if (properties.description)
            block += `    command.description = ${this.generateProperty(properties.description)};\n`;
        if (properties.help)
            block += `    command.help = ${this.generateProperty(properties.help)};\n`;
        if (properties.uuid)
            block += `    command.uuid = ${this.generateProperty(properties.uuid)};\n`;
        if (properties.require)
            block += `    command.requirePopup = ${JSON.stringify(properties.require)};\n`;

        block += `\n    CmdManager.addObjectCommand(command, args);\n}\n`;

        return block;
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
            object.setupBlock = this.generateCommandSetupBlock(object, properties);
        }

        for (let object of classMatches)
            if (!object.skip)
                script = script.replace(object.fullDefinition, object.fullDefinition + object.setupBlock);

        return script;
    }

    run(script) {
        script = this.preprocessNounTypes(script);
        script = this.preprocessCommands(script);

        //console.log(script);

        return script;
    }
}

CmdPreprocessor = new CommandPreprocessor();