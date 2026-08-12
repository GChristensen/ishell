// End-to-end tests of the legacy parser (addon/api/legacy/parser/parser.js),
// focused on sentence segmentation and the quoting feature.
// The real parser module is driven with stubbed Utils / context / suggestion
// memory. Run with: just test-parser (or: node ./scripts/test_parser.mjs)

globalThis.Utils = {
    escapeHtml: s => String(s).replace(/[&<>"']/g, c =>
        ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c])),
    sort(list, key, descending) {
        const kf = typeof key === "function" ? key : x => x[key];
        list.sort((a, b) => descending ? kf(b) - kf(a) : kf(a) - kf(b));
        return list;
    },
    setTimeout: (f, t) => setTimeout(f, t),
    isArray: Array.isArray,
    isEmpty(o) { for (let k in o) return false; return true; },
    regexp: (s, f) => new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), f),
    reportWarning: console.warn,
};

const parserURL = new URL("../addon/api/legacy/parser/parser.js", import.meta.url);
const {NLParser} = await import(parserURL);

const mkNoun = (id, score, extra = {}) => ({
    id, label: id, noExternalCalls: true, ...extra,
    suggest(text) {
        text = String(text);
        if (!text) return [];
        return [{text, html: Utils.escapeHtml(text), data: null,
                 summary: Utils.escapeHtml(text), score}];
    },
});
const contact = mkNoun("contact", 1);
const arbText = mkNoun("text", 0.7, {rankLast: true});

let sel = "";
const contextUtils = {getSelectionObject: () => ({text: sel, html: Utils.escapeHtml(sel)})};
const memory = {getScore: async () => 0, remember: async () => {}};

// email: object + prepositional args ("to" goal, "at" time)
const emailParser = await NLParser.makeParserForLanguage("en", {
    email: {
        id: "email", names: ["email"],
        arguments: [
            {role: "object", nountype: arbText, label: "message"},
            {role: "goal", nountype: contact, label: "contact"},
            {role: "time", nountype: arbText, label: "time"},
        ],
        execute() {}, preview() {},
    },
}, contextUtils, memory);

// shout: object only (for verb-last tests)
const shoutParser = await NLParser.makeParserForLanguage("en", {
    shout: {
        id: "shout", names: ["shout"],
        arguments: [{role: "object", nountype: arbText, label: "message"}],
        execute() {}, preview() {},
    },
}, contextUtils, memory);

async function suggest(input, parser = emailParser) {
    const q = parser.newQuery(input, null, 20, true);
    await q.run();
    return q.suggestionList;
}
const argText = (s, role) => s.argumentIsFilled(role) ? String(s.getArgText(role)) : "";
const dump = list => list.slice(0, 5).map(s =>
    `    obj=[${argText(s, "object")}] goal=[${argText(s, "goal")}] time=[${argText(s, "time")}]` +
    ` completion=[${s.completionText}]`).join("\n");

let failures = 0;
function check(name, cond, list) {
    console.log((cond ? "PASS" : "FAIL") + "  " + name);
    if (!cond) { failures++; if (list) console.log(dump(list)); }
}

// Round-trip helper: the top suggestion for the completion text of `sugg`
// must resolve every argument to the same value.
async function roundTrips(sugg, parser = emailParser) {
    const again = (await suggest(sugg.completionText, parser))[0];
    return again &&
        ["object", "goal", "time"].every(r => argText(sugg, r) === argText(again, r));
}

// ---- Baseline (pre-quoting behavior preserved) ----

let s = await suggest("email hello world to jane");
check("baseline: object and goal filled",
    s.length && argText(s[0], "object") === "hello world" && argText(s[0], "goal") === "jane", s);

s = await suggest("email");
check("verb-only input suggests the command", s.length > 0, s);

s = await suggest("hello world shout", shoutParser);
check("verb-last parse",
    s.length && !s[0].fromNounFirstSuggestion && argText(s[0], "object") === "hello world", s);

// ---- Quoting v1: atomic tokens ----

s = await suggest('email to "jane smith"');
check("quoted goal gets full phrase",
    s.length && argText(s[0], "goal") === "jane smith", s);
check("no parse steals tail into object",
    s.every(x => argText(x, "object") !== "smith"), s);

s = await suggest('email "meeting at noon" to jane');
check("quoted object keeps 'at' literal",
    s.length && argText(s[0], "object") === "meeting at noon"
    && argText(s[0], "goal") === "jane" && !argText(s[0], "time"), s);

s = await suggest("email meeting at noon to jane");
check("(control) unquoted 'at' does open the time role",
    s.some(x => argText(x, "time")), s);

s = await suggest('email "meeting at');
check("unclosed quote: atomic object 'meeting at'",
    s.length && argText(s[0], "object") === "meeting at", s);

s = await suggest('email "" to jane');
check("empty quotes ignored",
    s.length && argText(s[0], "goal") === "jane" && !argText(s[0], "object"), s);

s = await suggest('hello world "shout"', shoutParser);
check("quoted last token not tried as verb",
    !s.length || s.every(x => x.fromNounFirstSuggestion), s);

for (const input of ['email to "jane smith"', 'email "meeting at noon" to jane']) {
    const first = (await suggest(input))[0];
    check(`round-trip of ${JSON.stringify(input)}`, first && await roundTrips(first),
        first && [first]);
}

// ---- Quoting v2: escaped quotes ("" = literal quote) ----

s = await suggest('email "she said ""hi""" to jane');
check("doubled quote inside span becomes literal quote",
    s.length && argText(s[0], "object") === 'she said "hi"'
    && argText(s[0], "goal") === "jane", s);
check("literal-quote round-trip", s.length && await roundTrips(s[0]), s);

s = await suggest('email "a""b" to jane');
check("escaped quote joins words: a\"b",
    s.length && argText(s[0], "object") === 'a"b', s);
check("a\"b round-trip", s.length && await roundTrips(s[0]), s);

s = await suggest('email """" to jane');
check("four quotes yield a single literal quote",
    s.length && argText(s[0], "object") === '"', s);
check("literal-quote-only round-trip", s.length && await roundTrips(s[0]), s);

s = await suggest('email 5" to jane');
check("mid-word quote stays literal",
    s.length && argText(s[0], "object") === '5"', s);
check("mid-word quote round-trip", s.length && await roundTrips(s[0]), s);

// ---- Quoting v2: selection round-trip and anaphora ----

sel = 'she said "hi"';
s = await suggest("email intro this outro to jane");
let subst = s.find(x => argText(x, "object") === 'intro she said "hi" outro');
check("pronoun substitution injects quoted selection", !!subst, s);
check("selection-with-quotes round-trip", subst && await roundTrips(subst), subst && [subst]);

s = await suggest("email this to jane");
subst = s.find(x => argText(x, "object") === sel);
check("selection-valued arg completes to pronoun",
    subst && subst.completionText.includes(" this "), s);

s = await suggest('email "this" to jane');
check("quoted 'this' stays literal (no anaphora)",
    s.length && s.every(x => argText(x, "object") !== sel)
    && argText(s[0], "object") === "this", s);
sel = "";

// ---- Quoting v2: noun-first path strips quoting syntax ----

s = await suggest('"jane smith"');
check("bare quoted phrase yields noun-first suggestions",
    s.length > 0 && s.every(x => x.fromNounFirstSuggestion), s);
check("noun-first argument text carries no quote characters",
    s.length > 0 && s.some(x => ["object", "goal", "time"].some(r => argText(x, r) === "jane smith"))
    && s.every(x => ["object", "goal", "time"].every(r => !argText(x, r).includes('"'))), s);

console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL PASS");
process.exit(failures ? 1 : 0);
