# iShell Legacy Parser

This directory contains the legacy natural-language command parser inherited from
Mozilla Ubiquity ("Parser 1"). It turns free-form user input such as

```
translate this to spanish
email hello from john to jane
```

into ranked, executable command invocations with typed arguments.

Files:

| File | Responsibility |
|------|----------------|
| `parser.js` | The parser itself: sentence segmentation, verb matching, argument-role assignment, suggestion generation and ranking |
| `nounutils.js` | Construction of *noun types* (semantic argument types) and suggestion/scoring helpers |
| `suggestion_memory.js` | Persistent frequency memory used for adaptive ranking of suggestions |

---

## 1. The NLP theory behind the parser

The parser is not a statistical NLP system. It is a compact, deterministic
implementation of several classic linguistic ideas, tuned for the very narrow
domain of imperative commands typed into a command line.

### 1.1 Imperative sentences: verb + arguments

Every input is treated as an **imperative sentence**. Its skeleton is:

```
VERB [object] [preposition ARGUMENT]...
```

- The **verb** is a command name (`translate`, `email`, `search`).
- The **direct object** is the argument with no preposition (`hello` in
  "email *hello* to jane").
- Every other argument is introduced by a preposition.

Commands declare their argument structure up front (a *subcategorization
frame*, in linguistic terms), so the parser never has to guess how many
arguments a verb takes — it only has to decide which words fill which slot.

### 1.2 Case grammar: semantic roles marked by prepositions

The theoretical core is **case grammar** (Fillmore's *deep cases* / thematic
roles): each argument of a verb plays a semantic **role**, and in analytic
languages such as English these roles are signaled by prepositions.

The parser ships a fixed role inventory, mapped per language in
`NLParser.ParserRegistry` (`parser.js:6`):

| Role | English marker | Meaning |
|------------|-----|---------------------------------|
| `object` | *(none)* | direct object / theme |
| `goal` | to | destination, recipient |
| `source` | from | origin |
| `location` | near | place |
| `time` | at | point in time |
| `instrument`| with | means, tool |
| `format` | in | language, output format |
| `dependency`| on | dependency |
| `modifier` | of | attribute |
| `alias` | as | name, disguise |
| `subject` | for | topic, beneficiary |
| `cause` | by | agent, cause |

A command declares roles, not prepositions:

```javascript
arguments: [{role: "object", nountype: noun_arb_text, label: "text"},
            {role: "goal",   nountype: noun_type_lang, label: "language"}]
```

At parse time the role name is translated to the surface preposition of the
active language. This is what makes the grammar (partially) **localizable**:
the same command works in English ("translate this **to** spanish"), Spanish
("**hasta**"), Japanese (postposition "へ"), etc., by swapping the role→marker
table. There is also a `$` pseudo-language that uses symbolic markers
(`>`, `<`, `@`, …) instead of words.

### 1.3 Selectional restrictions: noun types

Each argument slot has a **noun type** (`nounutils.js`) — a semantic category
that decides whether a string is an acceptable filler for that slot, echoing
the linguistic notion of *selectional restrictions* (the arguments a verb
accepts are semantically constrained: you *email* a message, not a date).

A noun type is any object with a `suggest(text, html, callback,
selectionIndices)` method that returns zero or more **suggestions**. The
`NounType` constructor builds them from three simple sources:

- an **array of words** — closed word list; input is matched against it,
- an **object** — like an array, but each key carries a `data` payload,
- a **RegExp** — open class; input matching the pattern is accepted, with the
  match object as `data`.

Crucially, noun types do double duty as **validators and interpreters**: they
don't just accept or reject a string, they return scored suggestion objects
(`{text, html, data, summary, score}`) that may normalize, complete, or
enrich the raw input (possibly asynchronously, e.g. after a network call). A
noun type that accepts the empty string (`rankLast`) is considered "generic"
(arbitrary text), which affects ranking (§1.6).

### 1.4 Anaphora resolution against the page selection

The parser performs a tiny, pragmatic form of **anaphora resolution**. Each
language defines a pronoun list (`this`, `that`, `it`, `selection`, …). When
the user has text selected in the browser, the parser:

1. substitutes the current selection for pronouns found in argument strings
   ("translate **this** to spanish" → "translate *\<selection\>* to spanish"),
   and
2. when arguments are missing, tries interpolating the selection into each
   unfilled slot to produce alternative readings.

The discourse context is thus exactly one entity — the selection — which makes
"resolution" a simple substitution rather than a real coreference search.

### 1.5 Noun-first parsing

Beyond the verb-first pattern, the parser supports **noun-first suggestion**:
if the input matches no verb (or the input is empty but there is a selection),
the input/selection is treated as a bare noun phrase and the parser proposes
verbs that could take it as an argument ("john@example.com" → *email to
john@example.com*, *check calendar for …*). This mirrors how humans can
communicate intent with a noun fragment and let the hearer infer the predicate.

### 1.6 Ambiguity and ranking

Natural language is ambiguous even in this micro-grammar ("email hello to bob
from mary": is "to bob from mary" two roles, or is "to bob from mary" the
object?). The parser embraces this by generating **all** structurally valid
parses and ranking them with a composite score (`ParsedSentence.score`,
`parser.js:690`):

```
score = (verbMatchScore + argMatchScore / 99)
        × duplicateDefaultMatchScore
        × frequencyMatchScore
```

- **Verb match score** — how well the typed verb matches a command name,
  computed by `hagureMetal` (`parser.js:1066`), a fuzzy *abbreviation-matching*
  metric inspired by [LiquidMetal](https://github.com/rmm5t/liquidmetal)
  (itself in the Quicksilver tradition): matching at word beginnings scores
  higher, contiguous matches score higher, and gaps decay the score
  polynomially. This lets users type `tr es` for "translate … spanish".
  Matching a command's non-primary name, or matching the verb at the *end* of
  the sentence (allowed as a fallback with weight 0.1), lowers the score.
- **Argument match score** — +1 (or the suggestion's own score) per argument
  filled by actual user input rather than a default; specific noun types
  matching real input are rewarded. Its ÷99 weight makes it a tie-breaker
  among parses of the same verb, never able to outrank a better verb match.
- **Duplicate-default penalty** — when a missing argument has several default
  values, each extra variant's score is divided down so duplicates of the
  same verb don't crowd out other verbs.
- **Frequency score** — adaptive, learned component; see below.

### 1.7 Learned component: suggestion memory

The only "learning" in the system is a **frequency memory**
(`suggestion_memory.js`): every time the user executes a suggestion, the
association *input-prefix → command* is strengthened by 1 (simple Hebbian-style
reinforcement, persisted in extension storage). At ranking time the count is
converted to a multiplier

```
frequencyMatchScore = 0.1 ^ (1 / (frequency + 1))
```

which is 0.1 for a never-chosen command and asymptotically approaches 1.0 as
frequency grows — so the parser gradually personalizes toward each user's
habitual commands without ever changing the grammar. The same memory (keyed by
the empty input) ranks the verb list used for noun-first suggestions.

---

## 2. Architecture

### 2.1 Object model at a glance

```
NLParser.makeParserForLanguage(lang, verbList)
        │  looks up ParserRegistry[lang] → {roles, anaphora}
        ▼
     Parser ──────────────── SuggestionMemory (persistent frequencies)
        │ newQuery(input, context)
        ▼
   ParserQuery  ←──────────────── one per keystroke; cancellable, async
        │ plugin.parseSentence(input, verbs, makePPS)
        ▼
  [PartiallyParsedSentence]  ← verb chosen, words assigned to roles,
        │                      argument *values* not yet fixed
        │ nounType.suggest() per argument (sync or async)
        ▼
    [ParsedSentence]         ← every combination of concrete argument
        │                      suggestions + defaults; scored
        ▼
  ranked suggestion list → UI (display, preview, execute)
```

The pipeline deliberately splits parsing into two phases: a **syntactic**
phase that fixes the verb and the word→role assignment
(`PartiallyParsedSentence`), and a **semantic** phase that resolves each
argument string into concrete typed values via noun types
(`ParsedSentence`). Because noun types can be asynchronous, one partial parse
can keep spawning new full parses as network results arrive.

### 2.2 `Parser` — the session object

Created once per language via `NLParser.makeParserForLanguage`
(`parser.js:256`). Language support is a small **plugin** record: the
`parseSentence` algorithm (shared `EnParser` for all registry languages) plus
the language's role→preposition map and compiled pronoun regexps.

`setCommandList` wraps every command in a `Verb` and pre-sorts verbs into two
pools:

- verbs using at least one *specific* noun type — always eligible for
  noun-first suggestions;
- verbs using only *generic* (arbitrary-text) noun types — kept in a cache
  ranked by suggestion-memory frequency (`_sortGenericVerbCache`), so
  noun-first suggestions favor commands the user actually uses.

`strengthenMemory` is called when the user picks a suggestion, feeding the
adaptive ranking loop.

### 2.3 `Verb` — command adapter

`Verb` (`parser.js:942`) normalizes the two generations of command APIs into
one uniform argument dictionary `{role: {type, label, preposition, default,
input}}`:

- **new API**: the command declares `arguments: [{role, nountype, label}]`;
  the role is mapped to the language's preposition;
- **old API**: `DOType`/`DOLabel` becomes the `object` role and the
  `modifiers` dictionary (keyed literally by preposition) provides the rest.

`Verb.match(input)` fuzzy-matches the typed verb against each of the command's
`names` with `hagureMetal`, remembering which name matched (so the suggestion
displays the alias the user was aiming at) and discounting non-primary names.
`execute`/`preview` route to the command with the calling convention of its
API generation.

### 2.4 Sentence parsing — `parseSentence` + `recursiveParse`

`parseSentence` (`parser.js:208`) tokenizes on whitespace and tries two verb
positions:

1. **verb first** — `words[0]` is the verb, the rest are arguments
   (weight 1.0);
2. **verb last** — the final word is the verb, everything before it is
   arguments (weight 0.1) — supporting "google this **translate**"-style and
   SOV-language input at a ranking discount.

For each verb that matches, `recursiveParse` (`parser.js:176`) enumerates
**every** way to segment the remaining words into role slots:

- it scans for a word that begins one of the verb's prepositions;
- for each such preposition it tries *every possible extent* of the following
  argument phrase, marks words before the preposition (if any) as the direct
  object, removes the consumed role from the available set, and recurses on
  the remaining words;
- any prefix can also be the bare direct object if the verb takes one.

The result is an exhaustive list of `{role: [words]}` assignments — the
generate-and-rank strategy from §1.6. If nothing parses and the verb has no
object slot, the whole argument string is speculatively offered to each
required role in turn.

Each assignment is materialized as a `PartiallyParsedSentence` carrying the
verb match score.

#### Quoting: atomic multiword arguments

Although the segmenter enumerates multiword extents, the ranking effectively
prevents a preposition from capturing more than one word: the rival parse
that splits the tail off into `object` fills more arguments and always wins
on `argMatchScore`. Double quotes solve this at the generation level:

```
email "meeting at noon" to "jane smith"
```

The tokenizer (`tokenize` in `parser.js`) turns a `"..."` span into a single
**atomic token** — a boxed `String` carrying a `quoted` flag, with the quotes
stripped. An atomic token:

- is never matched against prepositions, so the rival split parses are simply
  never generated (this also shields words that collide with role markers,
  like "at" above, and the `$` language's symbolic markers);
- is never tried as the verb — a bare quoted input falls through to
  noun-first suggestion;
- suppresses pronoun substitution for its argument: `"this"` means the
  literal word, not the selection.

An **unclosed quote extends to the end of the input**, so suggestions stay
stable while the user is still typing the phrase. There is no escape syntax
for a literal `"` inside a quoted span; a mid-word quote (`5"`) stays
literal.

For round-tripping, `ParsedSentence.completionText` re-quotes an emitted
argument when it is a multiword prepositional argument or when any of its
words would re-parse as a role marker (embedded quotes are stripped in that
case), so tab-completing a suggestion reproduces the same reading.

### 2.5 `PartiallyParsedSentence` — semantic resolution

A PPS (`parser.js:707`) owns the verb, the word→role strings, the selection
object, and a growing list of `ParsedSentence`s. On construction it fires each
argument string at its noun type:

- once with **pronoun substitution** (selection interpolated for anaphora,
  §1.4), and once **verbatim**;
- results flow through `_argSuggest`, which consults the query-level
  **noun cache** (dedupes identical noun-type/text lookups across all parses
  in the query and fans results out to every sentence that subscribed) and
  handles both synchronous and Promise/callback-based noun types;
- `addArgumentSuggestion` extends the parsed-sentence list **combinatorially**:
  each new suggestion for a role either fills the empty slot or forks a copy
  of every sentence that already had that slot filled (deduplicated via
  `equals`).

If a user-supplied argument yields *no* suggestions from its noun type, the
role is marked invalid and — unless a later async suggestion rescues it — the
entire parsing is discarded (`getParsedSentences` returns `[]`): an argument
that violates its selectional restriction invalidates the reading.

`getParsedSentences` finalizes the sentences by filling unfilled slots from
defaults (`fillMissingArgsWithDefaults`) — argument defaults, then noun-type
defaults — possibly producing several variants when a default is
multi-valued, each with a decaying `duplicateDefaultMatchScore`. For
noun-first parses, sentences that use *none* of the input are filtered out.

`getAlternateSelectionInterpolations` clones the PPS once per unfilled slot
that accepts a selection, producing the alternative readings of §1.4.

### 2.6 `ParsedSentence` — the suggestion

A fully resolved candidate (`parser.js:488`): verb + concrete suggestion
object per argument. It renders itself for the UI (`completionText` for the
input box, `displayText` / `displayHtml` for the suggestion popup, with the
selection-derived part highlighted) and delegates `preview`/`execute` to the
verb. Its lazy `score` getter combines the four ranking factors of §1.6.

### 2.7 `ParserQuery` — async orchestration

One `ParserQuery` (`parser.js:279`) exists per input string (typically per
keystroke). It is the rendezvous point for asynchrony:

- holds the PPS list, the shared **noun cache**, the pending noun-type
  requests, and the `onResults` callback the UI sets;
- `run()` / `onNewParseGenerated()` re-flatten all PPSs into parsed sentences,
  score them (fetching frequency scores from `SuggestionMemory`), sort, trim
  to `maxSuggestions`, and notify the UI — again each time an async noun type
  delivers late suggestions, so the visible list refines over time;
- `cancel()` aborts outstanding network requests and detaches the callback
  when the user keeps typing.

### 2.8 `SuggestionMemory` — persistence

A thin async façade over the extension's storage repository keyed by input
string, holding `{commandId: count}` maps. `remember` increments,
`getScore` reads; the parser translates counts into the frequency multiplier
described in §1.7.

---

## 3. Worked example

Input: `email hello to jane` with command
`email {object: message, goal: contact}`.

1. `parseSentence`: `email` fuzzy-matches the *email* verb (score ≈ 1).
   Remaining words: `hello to jane`.
2. `recursiveParse` enumerates segmentations, among them
   `{object: [hello], goal: [jane]}` (via the `to` preposition) and
   `{object: [hello, to, jane]}` (everything as object).
3. Each becomes a `PartiallyParsedSentence`; noun types resolve `hello`
   (arbitrary text, score 1) and `jane` (contact noun type, perhaps
   suggesting *Jane Doe \<jane@…\>* with a high match score, possibly
   asynchronously).
4. Every combination becomes a `ParsedSentence`; the reading that fills both
   roles with specific matches outscores the object-only reading via
   `argMatchScore`; `frequencyMatchScore` boosts it further if the user
   emails often.
5. `ParserQuery` sorts, trims, and hands the list to the suggestion popup;
   choosing it calls `strengthenMemory`, nudging future rankings.
