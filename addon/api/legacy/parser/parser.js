export const NLParser = {};

var PLUGINS = [];
var FLAG_DEFAULT = 1;

NLParser.ParserRegistry = {
    "en": {
        "name": "English",
        "anaphora": [
            "this",
            "that",
            "it",
            "selection",
            "him",
            "her",
            "them"
        ],
        "roles": {
            "goal": "to",
            "source": "from",
            "location": "near",
            "time": "at",
            "instrument": "with",
            "format": "in",
            "dependency": "on",
            "modifier": "of",
            "alias": "as",
            "subject": "for",
            "cause": "by"
        }
    },
    "pt": {
        "name": "Português",
        "anaphora": [
            "isto",
            "isso",
            "aquilo"
        ],
        "roles": {
            "goal": "a",
            "source": "de",
            "location": "em",
            "time": "Г s",
            "instrument": "com",
            "format": "em",
            "modifier": "de",
            "alias": "como"
        }
    },
    "fr": {
        "name": "Français",
        "anaphora": [
            "this"
        ],
        "roles": {
            "goal": "au",
            "source": "de",
            "modifier": "de",
            "location": "sur",
            "time": "a",
            "instrument": "avec",
            "alias": "comme",
            "format": "en"
        }
    },
    "ja": {
        "name": "日本語",
        "anaphora": [
            "гЃ“г‚Њ",
            "гЃќг‚Њ",
            "гЃ‚г‚Њ"
        ],
        "roles": {
            "goal": "гЃё",
            "source": "гЃ‹г‚‰",
            "time": "гЃ«",
            "location": "гЃ«гЃ¦",
            "instrument": "гЃЁ",
            "alias": "гЃЁгЃ—гЃ¦",
            "modifier": "гЃ®",
            "format": "гЃ§"
        }
    },
    "es": {
        "name": "Español",
        "anaphora": [
            "esto",
            "eso",
            "la selecciпїЅn",
            "пїЅl",
            "ella",
            "ellos",
            "ellas"
        ],
        "roles": {
            "goal": "hasta",
            "source": "desde",
            "location": "en",
            "time": "a",
            "instrument": "con",
            "format": "en",
            "alias": "como",
            "modifier": "de"
        }
    },
    "tr": {
        "name": "Türkçe",
        "anaphora": [
            "bu",
            "bu",
            "seпїЅim",
            "o",
            "o",
            "onlar",
            "onlar"
        ],
        "roles": {
            "goal": "kime",
            "source": "den",
            "location": "daki",
            "time": "de",
            "instrument": "dan",
            "format": "olarak",
            "alias": "como",
            "modifier": "de"
        }
    },
    "nl": {
        "name": "Nederlands",
        "anaphora": [
            "dit",
            "dat",
            "het",
            "de",
            "selectie",
            "hij",
            "zij"
        ],
        "roles": {
            "goal": "naar",
            "source": "van",
            "location": "nabij",
            "time": "om",
            "instrument": "met",
            "format": "in",
            "modifier": "van",
            "alias": "als"
        }
    },
    "$": {
        "name": "$",
        "anaphora": [
            "$"
        ],
        "roles": {
            "goal": ">",
            "source": "<",
            "location": "@",
            "time": ":",
            "instrument": "+",
            "alias": "=",
            "format": "%",
            "modifier": "*"
        }
    }
};

var {push} = Array.prototype;

function shallowCopy(dic) {
    var dup = {__proto__: null};
    for (var key in dic) dup[key] = dic[key];
    return dup;
}

function recursiveParse(unusedWords, filledArgs, objYet, prepDict) {
    var len = unusedWords.length;
    if (!len) return [filledArgs]; // no more words; return what we have

    var completions = [];
    for (var prepYet in prepDict) break;
    if (prepYet) for (let i = 0, z = objYet ? len : 1; i < z; ++i) {
        let word = unusedWords[i];
        for (let name in prepDict) if (prepDict[name].indexOf(word) === 0) {
            // found a preposition
            let objNext = objYet && !i;  // next only if we're at leftmost
            // +1 loop to allow a preposition at last if we're at rightmost
            for (let j = i + 2, z = len + (i + 1 === len); j <= z; ++j) {
                let prepNext = shallowCopy(prepDict);
                delete prepNext[name];
                let filled = shallowCopy(filledArgs);
                if (i) filled.object = unusedWords.slice(0, i);
                filled[name] = unusedWords.slice(i + 1, j);
                push.apply(completions, recursiveParse(unusedWords.slice(j), filled,
                    objNext, prepNext));
            }
            break;
        }
    }
    if (objYet) {
        let filled = shallowCopy(filledArgs);
        filled.object = unusedWords;
        completions.push(filled);
    }
    return completions;
}

function parseSentence(inputString, verbList, makePPS) {
    // Returns a list of PartiallyParsedSentences.
    var parsings = [];
    var words = inputString.match(/\S+/g);
    if (!words) return parsings;

    var verbOnly = words.length === 1;
    var inputs = (verbOnly
        ? [[words[0], null, 1]]
        : [[words[0], words.slice(1), 1], [words.pop(), words, .1]]);
    for (let verb of verbList) if ((verbOnly || verb.argCount) &&
        !verb.disabled)
        VERB: for (let input of inputs) {
            let matchScore = verb.match(input[0]);
            if (!matchScore) continue;

            let [, inputArgs, weight] = input;
            matchScore *= weight;
            if (!inputArgs) {
                parsings.push(makePPS(verb, {__proto__: null}, matchScore));
                break VERB;
            }

            let preps = {__proto__: null}; // {source: "to", goal: "from", ...}
            let {args} = verb;
            for (let arg in args) preps[arg] = args[arg].preposition;
            delete preps.object;
            let hasObj = "object" in args;
            let argStringsList =
                recursiveParse(inputArgs, {__proto__: null}, hasObj, preps);
            for (let argStrings of argStringsList)
                parsings.push(makePPS(verb, argStrings, matchScore));
            if (!argStringsList.length && !hasObj)
            // manual interpolations for required prepositions
                for (let arg in args) {
                    let argStr = {__proto__: null};
                    argStr[arg] = inputArgs;
                    parsings.push(makePPS(verb, argStr, matchScore));
                }
            break VERB;
        }
    return parsings;
}

var EnParser = {
    parseSentence: parseSentence,
};

NLParser.makeParserForLanguage =
    async function makeParserForLanguage(languageCode, verbList, contextUtils = ContextUtils, suggestionMemory = new SuggestionMemory()) {
        let plugin = PLUGINS[languageCode]
        if (!plugin) {
            plugin = PLUGINS[languageCode] = {parseSentence: EnParser.parseSentence}
            let parser = NLParser.ParserRegistry[languageCode]
            if (!parser)
                parser = NLParser.ParserRegistry['en']
            plugin.roleMap = parser.roles
            plugin.PRONOUNS = parser.anaphora
            plugin.pronouns = parser.anaphora.map(a =>
                RegExp(a.replace(/\W/g, "\\$&").replace(/^\b|\b$/g, "\\b"), "i"))
        }
        const parser = new Parser(verbList, plugin, contextUtils, suggestionMemory);
        await parser.initialize();
        return parser;
    };

// ParserQuery: An object that wraps a request to the parser for suggestions
// based on a given query string.  Multiple ParserQueries may be in action at
// a single time; each is independent.  A ParserQuery can execute
// asynchronously, producing a suggestion list that changes over time as the
// results of network calls come in.
function ParserQuery(parser, queryString, context, maxSuggestions) {
    this._parser = parser;
    this._suggestionList = [];
    this._queryString = queryString;
    this._context = context;
    this._parsingsList = [];
    this._pendingCallbacks = [];

    this.maxSuggestions = maxSuggestions;
    this.nounCache = {"": {text: "", html: "", data: null, summary: ""}};
    this.requests = [];
    // Client code should set a function to onResults!
    this.onResults = Boolean;
}

ParserQuery.prototype = {
    cancel: function PQ_cancel() {
        for (let req of this.requests)
            if (req && typeof req.abort === "function")
                req.abort();
        this.onResults = Boolean;
        this._parsingsList = null;
    },

    // Read-only properties:
    get finished() {
        for (let req of this.requests)
            if ((req.readyState || 4) !== 4) return false;
        return true;
    },
    get hasResults() {
        return !!this._suggestionList.length
    },
    get suggestionList() {
        return this._suggestionList
    },

    // The handler that makes this a listener for partiallyParsedSentences.
    onNewParseGenerated: async function PQ_onNewParseGenerated(triggerResults = true) {
        await this._refreshSuggestionList();

        if (triggerResults) {
            await Promise.all(this._pendingCallbacks);
            this.onResults();
        }
    },

    run: async function PQ_run() {
        await this.onNewParseGenerated();
        return this;
    },

    addPartiallyParsedSentences:
        function PQ_addPartiallyParsedSentences(ppss) {
            push.apply(this._parsingsList, ppss);
        },

    _refreshSuggestionList: async function PQ__refreshSuggestionList() {
        // get completions from parsings -- the completions may have changed
        // since the parsing list was first generated.
        var suggs = this._suggestionList = [];
        for (let parsing of this._parsingsList) {
            let newSuggs = parsing.getParsedSentences();
            push.apply(suggs, newSuggs);
        }

        // Sort and take the top maxSuggestions number of suggestions
        await this._sortSuggestionList();
        suggs.splice(this.maxSuggestions);
    },

    _sortSuggestionList: async function PQ__sortSuggestionList() {
        // Each suggestion in the suggestion list should already have a matchScore
        // assigned by Verb.match().
        // Give them also a frequencyScore based on the suggestionMemory:
        var {_parser} = this;
        var {pow} = Math;
        for (let sugg of this._suggestionList) {
            let freq = await _parser.getSuggestionMemoryScore(
                sugg.fromNounFirstSuggestion ? "" : sugg._verb.input,
                sugg._verb.cmd.id);
            sugg.frequencyMatchScore = pow(.1, 1 / (freq + 1));
        }
        Utils.sort(this._suggestionList, "score", true);
    },
};

function Parser(verbList, languagePlugin, contextUtils, suggestionMemory) {
    this._languagePlugin = languagePlugin;
    this._ContextUtils = contextUtils;
    this._suggestionMemory = suggestionMemory;
    this.setCommandList(verbList);
}

Parser.prototype = {
    initialize: async function() {
        return this._sortGenericVerbCache();
    },

    _nounFirstSuggestions:
        function P__nounFirstSuggestions(selObj, maxSuggestions, query) {
            var ok = v => !v.disabled
            var verbs =
                this._rankedVerbsThatUseGenericNouns.filter(ok).slice(0, maxSuggestions);
            push.apply(verbs, this._verbsThatUseSpecificNouns.filter(ok));
            var result = [];
            for (const v of verbs)
                result.push(new PartiallyParsedSentence(v, {__proto__: null}, selObj, 0, query));
            return result;
        },

    strengthenMemory: async function P_strengthenMemory(chosenSuggestion) {
        var verb = chosenSuggestion._verb;
        if (chosenSuggestion.hasFilledArgs) {
            await this._suggestionMemory.remember("", verb.cmd.id);
            verb.usesAnySpecificNounType() || await this._sortGenericVerbCache();
        }
        chosenSuggestion.fromNounFirstSuggestion ||
        await this._suggestionMemory.remember(verb.input, verb.cmd.id);
    },

    async getSuggestionMemoryScore(input, cmdId) {
        return await this._suggestionMemory.getScore(input, cmdId)
    },

    newQuery: function P_newQuery(input, context, maxSuggestions, lazy) {
        var query = new ParserQuery(this, input, context, maxSuggestions);
        var selObj = this._ContextUtils.getSelectionObject(context);
        var selected = !!(selObj.text || selObj.html);
        var plugin = this._languagePlugin;
        if (selected) {
            query.PRONOUNS = plugin.PRONOUNS;
            query.pronouns = plugin.pronouns;
        }
        if (!input && selected)
        // selection, no input, noun-first suggestion on selection
            var ppss = this._nounFirstSuggestions(selObj, maxSuggestions, query);
        else {
            // Language-specific full-sentence suggestions:
            ppss = plugin.parseSentence(
                input,
                this._verbList,
                function makePPS(verb, argStrings, matchScore) {
                    for (var x in verb.args)
                        // ensure all args in argStrings
                        // will be used for reconstructing the sentence
                        argStrings[x] = x in argStrings && argStrings[x].join(" ");
                    return new PartiallyParsedSentence(
                        verb, argStrings, selObj, matchScore, query);
                });

            // noun-first matches on input
            if (!ppss.length) {
                let selObj = {
                    text: input,
                    html: Utils.escapeHtml(input),
                    fake: true,
                };
                selected = !!input;
                ppss = this._nounFirstSuggestions(selObj, maxSuggestions, query);
            }
        }

        // partials is now a list of PartiallyParsedSentences; if there's a
        // selection, try using it for any missing arguments...
        if (selected)
            for (let pps of ppss)
                query.addPartiallyParsedSentences(
                    pps.getAlternateSelectionInterpolations());
        else
            query.addPartiallyParsedSentences(ppss);

        lazy || Utils.setTimeout(function P_nQ_delayedRun() {
            query.run()
        });
        return query;
    },

    setCommandList: function P_setCommandList(commandList) {
        var verbs = this._verbList = [];
        var specifics = this._verbsThatUseSpecificNouns = [];
        var generics = this._rankedVerbsThatUseGenericNouns = [];
        var {roleMap} = this._languagePlugin;
        for (let cmd of Object.values(commandList || {})) {
            let verb = new Verb(cmd, roleMap);
            verbs.push(verb);
            (verb.usesAnySpecificNounType() ? specifics : generics).push(verb);
        }
    },

    _sortGenericVerbCache: async function P__sortGenericVerbCache() {
        var suggMemory = this._suggestionMemory;
        if (!suggMemory) return;

        async function scoreVerb(verb) {
            let score = await suggMemory.getScore("", verb.cmd.id);
            verb.__initialScore = score;
            return score;
        }

        await Promise.all(this._rankedVerbsThatUseGenericNouns.map(async v => await scoreVerb(v)));

        Utils.sort(
            this._rankedVerbsThatUseGenericNouns,
            v => v.__initialScore,
            true);
    },
};

export function ParsedSentence(
    verb, args, verbMatchScore, selObj, argStrings, query) {
    this._verb = verb;
    this._argSuggs = args;
    this._argFlags = {__proto__: null};
    this._argStrings = argStrings;
    this._selObj = selObj;
    this._query = query;
    this.verbMatchScore = verbMatchScore;
    this.duplicateDefaultMatchScore = 1;
    // assigned later
    this.argMatchScore = 0;
    this.frequencyMatchScore = 0;
}

ParsedSentence.prototype = {
    get completionText() {
        // Returns plain text that we should set the input box to if user hits
        // the key to autocomplete to this sentence.
        var {matchedName: sentence, args} = this._verb;
        for (let x in (this.fromNounFirstSuggestion
            ? this._argSuggs
            : this._argStrings)) {
            let {text} = this._argSuggs[x] || 0;
            if (!text || this._argFlags[x] & FLAG_DEFAULT) continue;
            let preposition = " ";
            if (x === "object") {
                // Check for a valid text selection. We'll replace
                // the text with a pronoun for readability
                if (!this.fromNounFirstSuggestion && this._selObj.text === text)
                    text = this._query.PRONOUNS[0];
            }
            else preposition += args[x].preposition + " ";
            sentence += preposition + text;
        }
        return sentence + " ";
    },
    // text formatted sentence for display in popup menu
    get displayText() {
        var {matchedName: sentence, args} = this._verb;
        for (let x in (this.fromNounFirstSuggestion
            ? this._argSuggs
            : this._argStrings)) {
            let obj = x === "object";
            let {text} = this._argSuggs[x] || 0;
            if (text) sentence += (" " +
                (obj ? "" : args[x].preposition + " ") +
                (obj ? "[ " + text + " ]" : text));
        }
        return sentence;
    },
    // html formatted sentence for display in suggestion list
    get displayHtml() {
        var {escapeHtml} = Utils;
        var {matchedName, args} = this._verb;
        var html = '<span class="verb">' + matchedName + "</span> ";
        for (let x in (this.fromNounFirstSuggestion
            ? this._argSuggs
            : this._argStrings)) {
            let obj = x === "object";
            let prearg = (
                (obj || !args[x]? "" :
                    '<span class="delimiter">' +
                    escapeHtml(args[x].preposition) +
                    "</span> ") +
                '<span class="' + (obj ? "object" : "argument") + '">');
            let {summary} = this._argSuggs[x] || 0;
            html += (
                summary
                    ? prearg + summary + "</span> "
                    : (args[x]? ('<span class="needarg">' +
                    prearg + escapeHtml(args[x].label) +
                    "</span>"): "") +
                    "</span> ");
        }
        return html;
    },

    get icon() {
        return this._verb.cmd.icon
    },
    get previewUrl() {
        return this._verb.cmd.previewUrl
    },
    get previewDelay() {
        return this._verb.cmd.previewDelay
    },

    execute: function PS_execute(context) {
        return this._verb.execute(context, this._argSuggs);
    },

    preview: function PS_preview(previewBlock, context) {
        return this._verb.preview(context, previewBlock, this._argSuggs);
    },

    copy: function PS_copy() {
        var newPS = {__proto__: this};
        for (let key of ["_argSuggs", "_argFlags"]) {
            let dest = newPS[key] = {__proto__: null};
            let from = this[key];
            for (let x in from) dest[x] = from[x];
        }
        return newPS;
    },

    setArgumentSuggestion:
        function PS_setArgumentSuggestion(arg, sugg, isDefault) {
            this._argSuggs[arg] = sugg;
            this._argFlags[arg] |= isDefault && FLAG_DEFAULT;
        },

    getArgText: function PS_getArgText(arg) {
        return this._argSuggs[arg].text;
    },

    argumentIsFilled: function PS_argumentIsFilled(arg) {
        return arg in this._argSuggs;
    },

    get hasFilledArgs() {
        /* True if suggestion has at least one filled argument.
         False if verb has no arguments to fill, or if it has arguments but
         none of them are filled. */
        for (var x in this._argSuggs) return true;
        return false;
    },

    equalCommands: function PS_equalCommands(other) {
        if (!other || other && other._verb.id !== this._verb.id)
            return false;
        return true;
    },

    getCommand: function() {
        return this._verb.cmd;
    },

    equals: function PS_equals(other) {
        if (this._verb.cmd !== other._verb.cmd)
            return false;
        let argSuggs = this._argSuggs;
        for (let x in argSuggs)
            if (argSuggs[x].summary !== other._argSuggs[x].summary)
                return false;
        return true;
    },

    fillMissingArgsWithDefaults: function PS_fillMissingArgsWithDefaults() {
        let newSentences = [this.copy()];
        let gotArrayOfDefaults = false;
        let defaultsSoFar = {__proto__: null};
        let args = this._verb.args;
        for (let argName in args) {
            if (argName in this._argSuggs) continue;
            let missingArg = args[argName];
            let noun = missingArg.type;
            let {nounCache} = this._query;
            let defaultValue = missingArg.default || nounCache[noun.id];
            if (!defaultValue) {
                let val = noun.default;
                if (typeof val === "function") val = val.call(noun);
                defaultValue = nounCache[noun.id] =
                    val && val.length !== 0 ? val : nounCache[""];
            }

            let numDefaults = defaultValue.length;
            if (numDefaults === 1 || numDefaults > 1 && gotArrayOfDefaults) {
                // either this is a single-item array, or
                // we've already used an array of values for a previous modifier,
                // so just use first default for this modifier
                defaultValue = defaultValue[0];
                numDefaults = 0;
            }
            if (numDefaults) {
                let defaults = defaultValue;
                // first time we've seen multiple defaults,
                // so create an array of sentences
                gotArrayOfDefaults = true;
                for (let i = 0; i < numDefaults; i++) {
                    if (i) {
                        let newSen = this.copy();
                        for (let arg in defaultsSoFar)
                            newSen.setArgumentSuggestion(arg, defaultsSoFar[arg], true);
                        // reduce the match score so that multiple entries with the
                        // same verb are only shown if there are no other verbs
                        newSen.duplicateDefaultMatchScore =
                            this.duplicateDefaultMatchScore / (i + 1);
                        newSentences[i] = newSen;
                    }
                    newSentences[i].setArgumentSuggestion(argName, defaults[i], true);
                }
            }
            else {
                for (let sen of newSentences)
                    sen.setArgumentSuggestion(argName, defaultValue, true);
                defaultsSoFar[argName] = defaultValue;
            }
        }
        return newSentences;
    },

    get score() {
        if (!this.argMatchScore) {
            // argument match score starts at 1 and increased for each
            // argument where a specific nountype (i.e. non-arbitrary-text)
            // matches user input.
            let {_argFlags, _argSuggs} = this, ams = 1;
            for (let name in _argFlags)
                if (!(_argFlags[name] & FLAG_DEFAULT))
                    ams += _argSuggs[name].score || 1;
            this.argMatchScore = ams;
        }
        return (this.verbMatchScore + this.argMatchScore / 99)
            * this.duplicateDefaultMatchScore
            * this.frequencyMatchScore;
    }
};

function PartiallyParsedSentence(verb, argStrings, selObj, matchScore, query) {
    // This is a partially parsed sentence.
    // What that means is that we've decided what the verb is,
    // and we've assigned all the words of the input to one of the arguments.
    // What we haven't nailed down yet is the exact value to use for each
    // argument, because the nountype may produce multiple argument suggestions
    // from a single argument string.  So one of these partially parsed
    // sentences can produce several completely-parsed sentences, in which
    // final values for all arguments are specified.
    this._verb = verb;
    // ArgStrings is a dictionary, where the keys match the argument names in
    // the verb, and the values are each input that have
    // been assigned to that argument
    this._argStrings = argStrings;
    this._selObj = selObj;
    this._matchScore = matchScore;
    this._invalidArgs = {__proto__: null};
    this._validArgs = {__proto__: null};
    this._query = query;

    // Create fully parsed sentence with empty arguments:
    // If this command takes no arguments, this is all we need.
    // If it does take arguments, this initializes the parsedSentence
    // list so that the algorithm in addArgumentSuggestion will work
    // correctly.
    this._parsedSentences = [new ParsedSentence(
        verb, {__proto__: null}, matchScore, selObj, argStrings, query)];
    for (let argName in argStrings) {
        let text = argStrings[argName];
        // If argument is present, try the noun suggestions
        // based both on substituting pronoun...
        // (but not for noun-first)
        let gotSuggs = (text && matchScore &&
            this._suggestWithPronounSub(argName, text));
        // and on not substituting pronoun...
        let gotSuggsDirect = ((text || (text = verb.args[argName].input)) &&
            this._argSuggest(argName, text,
                Utils.escapeHtml(text), null));
        if (text && !gotSuggs && !gotSuggsDirect) {
            // One of the arguments is supplied by the user, but produces
            // no suggestions, meaning it's an invalid argument for this
            // command -- that makes the whole parsing invalid!!
            this._invalidArgs[argName] = true;
        }
        // Otherwise, this argument will simply be left blank.
        // (or filled in with default value later)
    }
}

PartiallyParsedSentence.prototype = {
    _argSuggest:
        function PPS__argSuggest(argName, text, html, selectionIndices) {
            // For the given argument of the verb, sends (text,html) to the nounType
            // gets back suggestions for the argument, and adds each suggestion.
            // Return true if at least one arg suggestion was added in this way.

            var noun = this._verb.args[argName].type;
            var {nounCache} = this._query;
            var key = text + "\n" + noun.id;
            var suggestions = nounCache[key];
            if (suggestions) {
                suggestions.callback.otherSentences.push([this, argName]);
                for (let i = 0, l = suggestions.length; i < l; ++i)
                    this.addArgumentSuggestion(argName, suggestions[i]);
            }
            else {
                let resolveCallback;

                // Callback function for asynchronously generated suggestions:
                const callback = suggs => {
                    var suggestions = this._handleSuggestions(argName, suggs);
                    if (!suggestions.length) {
                        resolveCallback && resolveCallback(false);
                        return;
                    }

                    for (let sugg of suggestions) {
                        sugg.score = sugg.score || 1;
                        for (let [pps, arg] of callback.otherSentences)
                            pps.addArgumentSuggestion(arg, sugg);
                    }

                    if (resolveCallback)
                        this._query.onNewParseGenerated(false).then(() => resolveCallback(true));
                    else
                        this._query.onNewParseGenerated();
                }

                const printError = e => console.error(
                    'Exception occured while getting suggestions for "'
                    + this._verb.name + '" with noun "' + (noun.name || noun.id) + '": ' + e.message, e);

                try {
                    suggestions = noun.suggest(text, html, callback, selectionIndices);
                } catch (e) {
                    printError(e);
                    return false;
                }

                const promise = suggestions instanceof Promise? suggestions: null;
                suggestions = promise? []: this._handleSuggestions(argName, suggestions);
                callback.otherSentences = [];
                suggestions.callback = callback;
                nounCache[key] = suggestions;

                if (promise) {
                    const callbackPromise = new Promise(resolve => resolveCallback = resolve);
                    this._query._pendingCallbacks.push(callbackPromise);
                    promise.then(suggs => callback(suggs))
                           .catch(printError);
                }
            }
            return suggestions.length > 0;
        },

    _suggestWithPronounSub: function PPS__suggestWithPronounSub(argName, words) {
        var {text, html} = this._selObj
        var gotAnySuggestions = false;
        var quoteDollars = x => x.replace(/\$/g, "$$$$")
        for (let regexp of this._query.pronouns || []) {
            let index = words.search(regexp);
            if (index < 0) continue;
            let selectionIndices = [index, index + text.length];
            let textArg = words.replace(regexp, quoteDollars(text));
            let htmlArg = words.replace(regexp, quoteDollars(html));
            if (this._argSuggest(argName, textArg, htmlArg, selectionIndices))
                gotAnySuggestions = true;
        }
        return gotAnySuggestions;
    },

    _handleSuggestions: function PPS__handleSuggestions(argName, suggs) {
        var filtered = [], {requests, maxSuggestions} = this._query;
        if (!Utils.isArray(suggs)) suggs = [suggs];
        for (let sugg of suggs) if (sugg) {
            if (sugg.summary >= "") filtered.push(sugg);
            else requests.push(sugg);
        }
        if (maxSuggestions) filtered.splice(maxSuggestions);
        for (let sugg of filtered) this.addArgumentSuggestion(argName, sugg);
        return filtered;
    },

    addArgumentSuggestion: function PPS_addArgumentSuggestion(arg, sugg) {
        // Adds the given sugg as a suggested value for the given arg.
        // Extends the parsedSentences list with every new combination that
        // is made possible by the new suggestion.
        var newSentences = [];
        this._validArgs[arg] = true;
        EACH_PS: for (let sen of this._parsedSentences) {
            if (sen.argumentIsFilled(arg)) {
                let newSen = sen.copy();
                newSen.setArgumentSuggestion(arg, sugg);
                for (let alreadyNewSen of newSentences)
                    if (alreadyNewSen.equals(newSen)) // duplicate suggestion
                        continue EACH_PS;
                newSentences.push(newSen);
            }
            else sen.setArgumentSuggestion(arg, sugg);
        }
        push.apply(this._parsedSentences, newSentences);
    },

    getParsedSentences: function PPS_getParsedSentences() {
        // For any parsed sentence that is missing any arguments, fill in those
        // arguments with the defaults before returning the list of sentences.
        // The reason we don't set the defaults directly on the object is cuz
        // an asynchronous call of addArgumentSuggestion could actually fill in
        // the missing argument after this.
        for (let argName in this._invalidArgs)
            if (!(argName in this._validArgs))
            // Return nothing if this parsing is invalid
            // due to bad user-supplied args
                return [];

        var parsedSentences = [];
        if (this.fromNounFirstSuggestion) {
            for (let sen of this._parsedSentences) if (sen.hasFilledArgs) {
                // When doing noun-first suggestion, we only want matches that put
                // the input or selection into an argument of the verb; therefore,
                // explicitly filter out suggestions that fill no arguments.
                for (let oneSen of sen.fillMissingArgsWithDefaults()) {
                    oneSen.fromNounFirstSuggestion = true;
                    parsedSentences.push(oneSen);
                }
            }
        }
        else
            for (let sen of this._parsedSentences)
                push.apply(parsedSentences,
                    sen.fillMissingArgsWithDefaults());

        return parsedSentences;
    },

    copy: function PPS_copy() {
        let newPPS = {__proto__: this};
        newPPS._parsedSentences = [];
        for (const ps of this._parsedSentences)
            newPPS._parsedSentences.push(ps.copy());
        for (let key of ["_invalidArgs", "_validArgs"]) {
            let dest = newPPS[key] = {__proto__: null};
            let from = this[key];
            for (let x in from) dest[x] = from[x];
        }
        return newPPS;
    },

    getAlternateSelectionInterpolations:
        function PPS_getAlternateSelectionInterpolations() {
            let alternates = [this], {args} = this._verb;
            // Returns a list of PartiallyParsedSentences with the selection
            // interpolated into missing arguments -- one for each argument where
            // the selection could go.
            // If the selection can't be used, returns a
            // list containing just this object.
            let unfilledArgs = Object.keys(args).filter(name =>
                !this._argStrings[name] && !args[name].type.noSelection);
            if (!unfilledArgs.length) return alternates;

            let {text, html, fake} = this._selObj;
            let indices = [0, fake ? 0 : text.length];
            for (let arg of unfilledArgs) {
                let newParsing = this.copy();
                if (newParsing._argSuggest(arg, text, html, indices))
                    alternates.push(newParsing);
            }
            return alternates;
        },

    get fromNounFirstSuggestion() {
        return !this._matchScore
    },
};

function Verb(cmd, roleMap) {
    // Picks up noun's label. "_name" is for backward compatiblity
    var pluckLabel = noun => noun.label || noun._name || "?";

    this.cmd = cmd;
    this.matchedName = cmd.names[0];
    this.input = "";
    this.newAPI = !("DOType" in cmd || "modifiers" in cmd);
    var args = this.args = {__proto__: null};
    // Use the presence or absence of the "arguments" dictionary
    // to decide whether this is a version 1 or version 2 command.
    if (this.newAPI) {
        // New-style API: command defines arguments array
        // if there are arguments, copy them over using
        // a (semi-arbitrary) choice of preposition
        for (let arg of cmd.arguments || []) {
            let {role, nountype} = arg;
            let obj = role === "object", prep = "";
            if (!obj) {
                prep = roleMap[role];
                if (!prep) {
                    Utils.reportWarning(
                        'Unknown role "' + role + '" in a iShell command ' + cmd.id
                    );
                    break;
                }
            }
            args[role] = {
                type: nountype,
                label: arg.label || pluckLabel(nountype),
                preposition: prep,
                "default": arg.default,
                input: arg.input,
            };
        }
    }
    else {
        // Old-style API for backwards compatibility:
        //   Command defines DOType/DOLabel and modifiers dictionary.
        // Convert this to argument dictionary.
        // cmd.DOType must be a NounType, if provided.
        if ("DOType" in cmd) {
            args.object = {
                type: cmd.DOType,
                label: cmd.DOLabel,
                preposition: "",
                "default": cmd.DODefault,
            };
        }
        // cmd.modifiers should be a dictionary
        // keys are prepositions
        // values are NounTypes.
        // example: {"from" : City, "to" : City, "on" : Day}
        if (!Utils.isEmpty(cmd.modifiers)) {
            let {modifiers, modifierDefaults} = cmd;
            for (let x in modifiers) {
                let type = modifiers[x];
                args[x] = {
                    type: type,
                    label: pluckLabel(type),
                    preposition: x,
                };
                if (modifierDefaults)
                    args[x].default = modifierDefaults[x];
            }
        }
    }
    this.argCount = Object.keys(args).length;
}

Verb.prototype = {
    get name() {
        return this.cmd.names[0]
    },
    get icon() {
        return this.cmd.icon
    },
    get disabled() {
        return this.cmd.disabled
    },

    execute: function V_execute(context, argumentValues) {
        return (
            this.newAPI
                // New-style commands (api 1.5) expect a single dictionary with all
                // arguments in it, and the object named 'object'.
                ? this.cmd.execute(argumentValues, context)
                // Old-style commands (api 1.0) expect the direct object to be passed
                // in separately.
                : this.cmd.execute(argumentValues.object, argumentValues));
    },

    preview: function V_preview(context, previewBlock, argumentValues) {
        // Same logic as the execute command -- see comment above.
        return (this.newAPI
            ? this.cmd.preview(previewBlock, argumentValues, context)
            : this.cmd.preview(previewBlock, argumentValues.object, argumentValues));
    },

    usesAnySpecificNounType: function V_usesAnySpecificNounType() {
        for (let role in this.args) if (!this.args[role].type.rankLast) return true;
        return false;
    },

    // Returns a matching score (1 ~ 0) which will be used for sorting.
    // input should be lowercased.
    match: function V_match(input) {
        var {names} = this.cmd;
        var inputLC = input.toLowerCase();
        for (let i = 0, l = names.length; i < l; ++i) {
            let score = hagureMetal(inputLC, names[i].toLowerCase());
            if (!score) continue;
            this.matchedName = names[i];
            this.input = input;
            // lower the score based on the name position
            return score * (l - i) / l;
        }
        return 0;
    }
};

// Represents how well an abbreviation matches the original
// as a float number 1 (perfect) to 0 (invalid).
// Inspired by <http://github.com/rmm5t/liquidmetal/tree/master>.
function hagureMetal(abbr, orig) {
    var len = orig.length;
    if (len < abbr.length) return 0;
    var sum = 0, score = 1, preIndex = -1;
    var {nonWord} = hagureMetal;
    var {pow} = Math;
    for (let c of abbr) {
        let index = orig.indexOf(c, preIndex + 1);
        if (index < 0) return 0;
        if (index !== preIndex + 1) score = pow((len - index) / len, 3);
        sum += (nonWord.test(orig[index - 1])
            ? pow(score, .3) // beginning of a word
            : score);
        preIndex = index;
    }
    return pow(sum / len, .3);
}

hagureMetal.nonWord = /^\W/;

