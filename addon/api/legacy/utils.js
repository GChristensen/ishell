// Sealed for backwards compatibility. Use ES6 module system to add new utility functions.

import {settings} from "../../settings.js";
import {repository} from "../../storage.js";

export var Utils = {};

const TO_STRING = Object.prototype.toString;

Utils.log = (...args) => console.log(...args);

Utils.setTimeout = function() {setTimeout.apply(window, arguments)};
Utils.isArray = Array.isArray;

Utils.reportWarning = function(aMessage, stackFrameNumber) {
    console.warn(aMessage);
};

// https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
Utils.FNV_OFFSET_32 = 0x811c9dc5;

Utils.hashFnv32a = function (input) {
    var hval = Utils.FNV_OFFSET_32;

    // Strips unicode bits, only the lower 8 bits of the values are used
    for (var i = 0; i < input.length; i++) {
        hval = hval ^ (input.charCodeAt(i) & 0xFF);
        hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
    }

    return hval >>> 0;
};

Utils.hash = function(s) {
    return Utils.hashFnv32a(s);
};

Utils.parseHtml = function (htmlText, callback) {
    var doc = document.implementation.createHTMLDocument("")
        , doc_elt = doc.documentElement
        , first_elt;

    doc_elt.innerHTML = htmlText;
    first_elt = doc_elt.firstElementChild;

    if (doc_elt.childElementCount === 1
        && first_elt.localName.toLowerCase() === "html") {
        doc.replaceChild(first_elt, doc_elt);
    }

    if (callback)
        callback(doc);

    return doc;
};

// === {{{ Utils.extend(target, object1, [objectN ...]) }}} ===
// Extends {{{target}}} by copying properties from the rest of arguments.
// Deals with getters/setters properly. Returns {{{target}}}.

Utils.extend = function(target) {
    for (let i = 1, l = arguments.length; i < l; ++i) {
        let obj = arguments[i];
        for (let key of Object.keys(obj)) {
            let g, s;
            (g = Object.getOwnPropertyDescriptor(obj, key).get) && Object.defineProperty(target, key, {get: g});
            (s = Object.getOwnPropertyDescriptor(obj, key).set) && Object.defineProperty(target, key, {set: s});
            g || s || (target[key] = obj[key]);
        }
    }
    return target;
};

// === {{{ Utils.paramsToString(params, prefix = "?") }}} ===
// Takes the given object containing keys and values into a query string
// suitable for inclusion in an HTTP GET or POST request.
//
// {{{params}}} is the object of key-value pairs.
//
// {{{prefix}}} is an optional string prepended to the result,
// which defaults to {{{"?"}}}.
Utils.paramsToString = function paramsToString(params, prefix) {
    var stringPairs = [];

    function addPair(key, value) {
        // explicitly ignoring values that are functions/null/undefined
        if (typeof value !== "function" && value != null)
            stringPairs.push(
                encodeURIComponent(key) + "=" + encodeURIComponent(value));
    }
    for (var key in params)
        if (Utils.isArray(params[key]))
            params[key].forEach(function p2s_each(item) {
                addPair(key, item)
            });
        else
            addPair(key, params[key]);
    return (prefix == null ? "?" : prefix) + stringPairs.join("&");
};

// === {{{ Utils.urlToParams(urlString) }}} ===
// Given a {{{urlString}}}, returns an object containing keys and values
// retrieved from its query-part.
Utils.urlToParams = function urlToParams(url) {
    var params = {},
        dict = {
            __proto__: null
        };
    for (let param of (/^(?:[^?]*\?)?([^#]*)/).exec(url)[1].split("&")) {
        let [key, val] = /[^=]*(?==?(.*))/.exec(param);
        val = val.replace(/\+/g, " ");
        try {
            key = decodeURIComponent(key)
        } catch (e) {};
        try {
            val = decodeURIComponent(val)
        } catch (e) {};
        params[key] = key in dict ? [].concat(params[key], val) : val;
        dict[key] = 1;
    }
    return params;
};

// === {{{ Utils.sort(array, key, descending = false) }}} ===
// Sorts an {{{array}}} without implicit string conversion and returns it,
// optionally performing Schwartzian Transformation
// by specified {{{key}}}. e.g.:
// {{{
// [42, 16, 7].sort() //=> [16, 42, 7]
// sort([42, 16, 7])  //=> [7, 16, 42]
// sort(["abc", "d", "ef"], "length") //=> ["d", "ef", "abc"]
// sort([1, 2, 3], x => -x)   //=> [3, 2, 1]
// }}}
//
// {{{array}}} is the target array.
//
// {{{key}}} is an optional string specifying the key property
// or a function that maps each of {{{array}}}'s item to a sort key.
//
// Sorts descending if {{{descending}}}.

Utils.sort = function(array, key, descending) {
    array.forEach(
        function transform(v, i, a) { a[i] = {key: this(v), val: v} },
        typeof key == "function" ? key : key != null ? x => x[key] : x => x);
    // Because our Monkey uses Merge Sort, "swap the values if plus" works.
    array.sort(descending
        ? (a, b) => b.key - a.key
        : (a, b) => a.key - b.key )
    array.forEach(function mrofsnart(v, i, a) { a[i] = v.val });
    return array;
};

Utils.sortBy = Utils.sort;

// === {{{ Utils.escapeHtml(string) }}} ===
// Returns a version of the {{{string}}} safe for insertion into HTML.
// Useful when you just want to concatenate a bunch of strings into
// an HTML fragment and ensure that everything's escaped properly.

Utils.escapeHtml = function(s) {
    return String(s).replace(Utils.escapeHtml.re, Utils.escapeHtml.fn)
};
Utils.escapeHtml.re = /[&<>\"\']/g;
Utils.escapeHtml.fn = function escapeHtml_sub($) {
    switch ($) {
        case "&": return "&amp;";
        case "<": return "&lt;";
        case ">": return "&gt;";
        case '"': return "&quot;";
        case "'": return "&#39;";
    }
};

// === {{{ Utils.keys(object) }}} ===
// Returns an array of all own, enumerable property names of {{{object}}}.

Utils.keys = function(obj) { return Object.keys(Object(obj)) }

// === {{{ Utils.isEmpty(value) }}} ===
// Returns whether or not the {{{value}}} has no own properties.

Utils.isEmpty = function(val) { return !Utils.keys(val).length }

// === {{{ Utils.classOf(value) }}} ===
// Returns the internal {{{[[Class]]}}} property of the {{{value}}}.
// See [[http://bit.ly/CkhjS#instanceof-considered-harmful]].

Utils.classOf = function(val) { return TO_STRING.call(val).slice(8, -1) }

// == {{{ Utils.regexp(pattern, flags) }}} ==
// Creates a regexp just like {{{RegExp}}}, except that it:
// * falls back to a quoted version of {{{pattern}}} if the compile fails
// * returns the {{{pattern}}} as is if it's already a regexp
//
// {{{
// RegExp("[")          // SyntaxError("unterminated character class")
// RegExp(/:/, "y")     // TypeError("can't supply flags when ...")
// regexp("[")          // /\[/
// regexp(/:/, "y")     // /:/
// }}}
// Also contains regexp related functions.

Utils.regexp = function(pattern, flags) {
    if (Utils.classOf(pattern) === "RegExp") return pattern;
    try {
        return RegExp(pattern, flags);
    } catch (e) {
        if (e instanceof SyntaxError)
            return RegExp(Utils.regexp.quote(pattern), flags);
    }
};

// === {{{ Utils.regexp.quote(string) }}} ===
// Returns the {{{string}}} with all regexp meta characters in it backslashed.

Utils.regexp.quote = function re_quote(string) {
    return String(string).replace(/[.?*+^$|()\{\[\\]/g, "\\$&");
};

// === {{{ Utils.regexp.Trie(strings, asPrefixes) }}} ===
// Creates a {{{RegexpTrie}}} object that builds an efficient regexp
// matching a specific set of {{{strings}}}.
// This is a JS port of
// [[http://search.cpan.org/~dankogai/Regexp-Trie-0.02/lib/Regexp/Trie.pm]]
// with a few additions.
//
// {{{strings}}} is an optional array of strings to {{{add()}}}
// (or {{{addPrefixes()}}} if {{{asPrefixes}}} evaluates to {{{true}}})
// on initialization.

Utils.regexp.Trie = function RegexpTrie(strings, asPrefixes) {
    var me = {$: {__proto__: null}, __proto__: RegexpTrie.prototype};
    if (strings) {
        let add = asPrefixes ? "addPrefixes" : "add";
        for (let str of strings) me[add](str);
    }
    return me;
};
Utils.extend(Utils.regexp.Trie.prototype, {
        // ** {{{ RegexpTrie#add(string) }}} **\\
        // Adds {{{string}}} to the Trie and returns self.
        add: function RegexpTrie_add(string) {
            var ref = this.$;
            for (let char of string)
            ref = ref[char] || (ref[char] = {__proto__: null});
            ref[""] = 1; // {"": 1} as terminator
            return this;
        },
        // ** {{{ RegexpTrie#addPrefixes(string) }}} **\\
        // Adds every prefix of {{{string}}} to the Trie and returns self. i.e.:
        // {{{
        // RegexpTrie().addPrefixes("ab") == RegexpTrie().add("a").add("ab")
        // }}}
        addPrefixes: function RegexpTrie_addPrefixes(string) {
            var ref = this.$;
            for (let char of string)
            ref = ref[char] || (ref[char] = {"": 1, __proto__: null});
            return this;
        },
        // ** {{{ RegexpTrie#toString() }}} **\\
        // Returns a string representation of the Trie.
        toString: function RegexpTrie_toString() { return this._regexp(this.$) },
    // ** {{{ RegexpTrie#toRegExp(flag) }}} **\\
    // Returns a regexp representation of the Trie with {{{flag}}}.
    toRegExp: function RegexpTrie_toRegExp(flag) { return RegExp(this, flag) },
    _regexp: function RegexpTrie__regexp($) {
    LEAF_CHECK: if ("" in $) {
        for (let k in $) if (k) break LEAF_CHECK;
        return "";
    }
    var {quote} = Utils.regexp, alt = [], cc = [], q;
    for (let char in $) {
        if ($[char] !== 1) {
            let recurse = RegexpTrie__regexp($[char]);
            (recurse ? alt : cc).push(quote(char) + recurse);
        }
        else q = 1;
    }
    var cconly = !alt.length;
    if (cc.length) alt.push(1 in cc ?  "[" + cc.join("") + "]" : cc[0]);
    var result = 1 in alt ? "(?:" + alt.join("|") + ")" : alt[0];
    if (q) result = cconly ? result + "?" : "(?:" + result + ")?";
    return result || "";
},
});

// === {{{ Utils.seq(lead_or_count, end, step = 1) }}} ===
// Creates an iterator of simple number sequence.
// {{{
// [i for (i in seq(1, 3))]     // [1, 2, 3]
// [i for (i in seq(3))]        // [0, 1, 2]
// [i for (i in seq(4, 2, -1))] // [4, 3, 2]
// seq(-7).slice(2, -2)         // [4, 3, 2]
// }}}

Utils.seq = Sequence;
function Sequence(lead, end, step) {
    if (end == null && lead)
        [lead, end, step] = lead < 0 ? [~lead, 0, -1] : [0, ~-lead];
    return new Proxy({
        __proto__: Sequence.prototype,
        lead: +lead, end: +end, step: +step || 1,
    }, Sequence.handler);
}
Sequence.prototype[Symbol.iterator] = function* seq_iter() {
    var {lead: i, end, step} = this;
    if (step < 0)
        for (; i >= end; i += step) yield i;
    else
        for (; i <= end; i += step) yield i;
};
Sequence.handler = {
    * enumerate(target) { yield* target },
};
Utils.extend(Sequence.prototype, {
    get length() { return (this.end - this.lead) / this.step + 1 | 0 },
    toJSON() { return [...this] },
    toString: function seq_toString() { return (
        "[object Sequence(" + this.lead + "," + this.end + "," + this.step + ")]"
    ) },
});

// === {{{ Utils.powerSet(set) }}} ===
// Creates a [[http://en.wikipedia.org/wiki/Power_set|power set]] of
// an array like {{{set}}}. e.g.:
// {{{
// powerSet([0,1,2]) // [[], [0], [1], [0,1], [2], [0,2], [1,2], [0,1,2]]
// powerSet("ab")    // [[], ["a"], ["b"], ["a","b"]]
// }}}

Utils.powerSet = function(arrayLike) {
    var ps = [[]];
    for (let i = 0, l = arrayLike.length; i < l; ++i) {
        let next = [arrayLike[i]];
        for (let j = 0, ll = ps.length; j < ll; ++j)
            ps.push(ps[j].concat(next));
    }
    return ps;
};

// == Bin ==
// A simple interface to access the feed's persistent JSON storage.
// {{{
// Bin.myKey("some value"); // set a value for a key
// let val = Bin.myKey();   // get the value for the key
// let ok = "myKey" in Bin; // check the key existence
// for (let key in Bin) ... // iterate over keys
// Bin.myKey(null);         // delete the key
// }}}
var BinHandler = {
    // === {{{ Bin.***() }}} ===
    // {{{Bin}}} allows arbitrary keys
    // to be called as methods for getting/setting/deleting their values.
    // Returns the value stored for the key.
    get(target, key) {
        if (key === "then") // guard against automatic promise evaluation
            return undefined;

        return (val) => {
            let bin = target.__bin__;
            if (val === void 0) return bin[key];
            if (val === null) {
                var old = bin[key];
                delete bin[key]
            }
            else bin[key] = val;
            repository.setCommandStorage(target.__uuid__, bin);
            return key in bin ? bin[key] : old
        }
    },
    has(target, key) {
        return key in target.__bin__;
    },
    * enumerate(target) {
        for (let key in target.__bin__) yield key;
    },
};

Utils.createBin = Utils.makeBin = async function(uuid, callback) {
    const bin = await repository.getCommandStorage(uuid);

    const proxy = new Proxy({
        __proto__ : null,
        __uuid__  : uuid,
        __bin__   : bin || {}
    }, BinHandler);

    if (callback)
        callback(proxy);

    return proxy;
};

///////////////////////////////////////////////////////////////////////////////

Utils.easterListener = async function(input) {
    if (input.trim().toLowerCase() === "enable more commands") {
        await settings.enable_more_commands(true);
        chrome.runtime.reload();
        return true;
    }
    else if (input.trim().toLowerCase() === "disable more commands") {
        await settings.enable_more_commands(false);
        chrome.runtime.reload();
        return true;
    }

    return false;
};