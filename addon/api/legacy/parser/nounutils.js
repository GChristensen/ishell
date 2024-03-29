
// = NounUtils =
//
// A library of noun related utilities.
// {{{CmdUtils}}} inherits them all.

export const NounUtils = {};

// === {{{ NounUtils.NounType(label, expected, defaults) }}} ===
//
// Constructor of a noun type that accepts a specific set of inputs.
// See {{{NounType._from*}}} methods for details
// (but do not use them directly).
//
// {{{label}}} is an optional string specifying default label of the nountype.
//
// {{{expected}}} is the instance of {{{Array}}}, {{{Object}}} or {{{RegExp}}}.
// The array can optionally be a space-separeted string.
//
// {{{defaults}}} is an optional array or space-separated string
// of default inputs.

export const NounType = function (label, expected, defaults) {
    if (!(this instanceof NounType))
        return new NounType(label, expected, defaults);

    if (typeof label !== "string")
        [label, expected, defaults] = ["?", label, expected];

    if (typeof expected.suggest === "function") return expected;

    var maybe_qw = o => typeof o == "string" ? o.match(/\S+/g) || [] : o
    expected = maybe_qw(expected);
    defaults = maybe_qw(defaults);

    var maker = NounType["_from" + Utils.classOf(expected)];
    for (let [k, v] of Object.entries(maker(expected))) this[k] = v;
    this.suggest = maker.suggest;
    this.label = label;
    this.noExternalCalls = true;
    this.cacheTime = -1;


    if (this.id) {
        let s1 = expected instanceof RegExp? expected.toString(): JSON.stringify(expected);
        let s2 = defaults instanceof RegExp? defaults.toString(): JSON.stringify(defaults);

        this.id += Utils.hash(s1 + s2);

    }
    if (defaults) {
        // [[a], [b, c], ...] => [a].concat([b, c], ...) => [a, b, c, ...]
        this.default =
            Array.prototype.concat.apply(0, defaults.map(d => this.suggest(d)));
    }
};

NounUtils.NounType = NounType;

// ** {{{ NounUtils.NounType._fromArray(words) }}} **
//
// Creates a noun type that accepts a finite list of specific words
// as the only valid inputs. Those words will be suggested as {{{text}}}s.
//
// {{{words}}} is the array of words.

NounType._fromArray = words => ({
    id: "#na_",
    name: words.slice(0, 2) + (words.length > 2 ? ",..." : ""),
    _list: words.map(w => NounUtils.makeSugg(w)),
});

// ** {{{ NounUtils.NounType._fromObject(dict) }}} **
//
// Creates a noun type from the given key:value pairs, the key being
// the {{{text}}} attribute of its suggest and the value {{{data}}}.
//
// {{{dict}}} is the object of text:data pairs.

NounType._fromObject = function NT_Object(dict) {
    var list = Object.keys(dict).map(key => NounUtils.makeSugg(key, null, dict[key]));
    return {
        name: list.slice(0, 2).map(s => s.text) +
        (list.length > 2 ? ",..." : ""),
        _list: list,
    };
};

NounType._fromArray.suggest = NounType._fromObject.suggest =
    function NT_suggest(text) {
        return NounUtils.grepSuggs(text, this._list)
    }

// ** {{{ NounUtils.NounType._fromRegExp(regexp) }}} **
//
// Creates a noun type from the given regular expression object
// and returns it. The {{{data}}} attribute of the noun type is
// the {{{match}}} object resulting from the regular expression
// match.
//
// {{{regexp}}} is the RegExp object that checks inputs.

NounType._fromRegExp = regexp => ({
    id: "#nr_",
    name: regexp + "",
    rankLast: regexp.test(""),
    _regexp: RegExp(
        regexp.source,
        ["g"[regexp.global - 1]
            , "i"[regexp.ignoreCase - 1]
            , "m"[regexp.multiline - 1]
            , "y"[regexp.sticky - 1]
            , "u"[regexp.unicode - 1]
        ].join('')),
});
NounType._fromRegExp.suggest = function NT_RE_suggest(text, html, cb,
                                                      selectionIndices) {
    var match = text.match(this._regexp);
    if (!match) return [];
    // ToDo: how to score global match
    var score = "index" in match ? NounUtils.matchScore(match) : 1;
    return [NounUtils.makeSugg(text, html, match, score, selectionIndices)];
};

// === {{{ NounUtils.matchScore(match) }}} ===
//
// Calculates the score for use in suggestions from
// a result array ({{{match}}}) of {{{RegExp#exec}}}.

const SCORE_BASE = 0.3;
const SCORE_LENGTH = 0.25;
const SCORE_INDEX = 1 - SCORE_BASE - SCORE_LENGTH;

NounUtils.matchScore = function matchScore(match) {
    var inLen = match.input.length;
    return (SCORE_BASE +
        SCORE_LENGTH * Math.sqrt(match[0].length / inLen) +
        SCORE_INDEX * (1 - match.index / inLen));
}

// === {{{NounUtils.makeSugg(text, html, data, score, selectionIndices)}}} ===
//
// Creates a suggestion object, filling in {{{text}}} and {{{html}}} if missing
// and constructing {{{summary}}} from {{{text}}} and {{{selectionIndices}}}.
// At least one of {{{text}}}, {{{html}}} or {{{data}}} is required.
//
// {{{text}}} can be any string.
//
// {{{html}}} must be a valid HTML string.
//
// {{{data}}} can be any value.
//
// {{{score}}} is an optional float number representing
// the score of the suggestion. Defaults to {{{1.0}}}.
//
// {{{selectionIndices}}} is an optional array containing the start and end
// indices of selection within {{{text}}}.

NounUtils.makeSugg = function makeSugg(text, html, data, score, selectionIndices) {
    if (text == null && html == null && arguments.length < 3)
    // all inputs empty!  There is no suggestion to be made.
        return null;

    // Shift the argument if appropriate:
    if (typeof score === "object") {
        selectionIndices = score;
        score = null;
    }

    // Fill in missing fields however we can:
    if (text != null) text += "";
    if (html != null) html += "";
    if (!text && data != null)
        text = data.toString();
    if (!html && text >= "")
        html = Utils.escapeHtml(text);
    if (!text && html >= "")
        text = html.replace(/<[^>]*>/g, "");

    // Create a summary of the text:
    var snippetLength = 35;
    var summary = (text.length > snippetLength
        ? text.slice(0, snippetLength - 1) + "\u2026"
        : text);

    // If the input comes all or in part from a text selection,
    // we'll stick some html tags into the summary so that the part
    // that comes from the text selection can be visually marked in
    // the suggestion list.
    var [start, end] = selectionIndices || [];
    summary = (
        start < end
            ? (Utils.escapeHtml(summary.slice(0, start)) +
            "<span class='selection'>" +
            Utils.escapeHtml(summary.slice(start, end)) +
            "</span>" +
            Utils.escapeHtml(summary.slice(end)))
            : Utils.escapeHtml(summary));

    return {
        text: text, html: html, data: data,
        summary: summary, score: score || 1
    };
}

// === {{{ NounUtils.grepSuggs(input, suggs, key) }}} ===
//
// A helper function to grep a list of suggestion objects by user input.
// Returns an array of filtered suggetions, each of them assigned {{{score}}}
// calculated by {{{NounUtils.matchScore()}}}.
//
// {{{input}}} is a string that filters the list.
//
// {{{suggs}}} is an array or dictionary of suggestion objects.
//
// {{{key}}} is an optional string to specify the target property
// to match with. Defaults to {{{"text"}}}.

NounUtils.grepSuggs = function grepSuggs(input, suggs, key) {
    if (!input) return [];
    if (key == null)
        key = "text";

    var re = Utils.regexp(input, "i"), match;

    var result = [];
    for (let sugg of suggs) {
        if ((match = re.exec(sugg[key]))) {
            var new_sugg = Object.assign({}, sugg);
            new_sugg.score = NounUtils.matchScore(match);
            result.push(new_sugg);
        }
    }

    const byScoreDescending = (a, b) => b.score - a.score;

    return result.sort(byScoreDescending);
};



