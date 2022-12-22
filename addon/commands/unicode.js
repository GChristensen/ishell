export const namespace = new AnnotatedCommandNamespace(CommandNamespace.UTILITY);

/**
    Allows to copy the character or its code representations to the clipboard.

    # Syntax
    **unicode** *description* [**with** *match*]

    # Arguments
    - *description* - description of a character.
    - *match* - one of the following strings:
        - *words* - match full words.
        - *partial* - match words partially.

    # Examples
    **unicode** *cat* **with** *partial*

    @command
    @markdown
    @delay 1000
    @icon /ui/icons/unicode.png
    @description Search for Unicode characters.
    @uuid 84168BE0-7AED-4C7D-84E2-DE113EABDBAE
 */
export class Unicode {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "description"}; // object
        args[WITH]   = {nountype: ["words", "partial"], label: "match"}; // instrument
    }

    async preview({OBJECT: {text: query}, WITH: {text: match}}, display, storage) {
        if (query) {
            display.text("Searching for Unicode characters...");

            let results = await this.#fetchUnicode(display, query, match === "partial");

            if (results) {
                if (results.length)
                    this.#generateList(display, results);
                else
                    display.text("Not found.");
            }
            else
                display.error("HTTP request error.");
        }
        else
            this.previewDefault(display);
    }

    async #fetchUnicode(display, query, partial) {
        const requestURL = "https://unicode.org/Public/UNIDATA/UnicodeData.txt";
        const text = await display.fetchText(requestURL, {_displayError: "Network error."});

        if (text)
            return this.#parseResults(text, query, partial);
    }

    #parseResults(text, query, partial) {
        const db = this.#parseUnicodeDB(text);
        const words = this.#createIndex(query);
        const results = partial
            ? this.#partiallyMatchWords(words, db)
            : this.#prefixMatchWords(words, db);

        return results;
    }

    #parseUnicodeDB(unicodeDB) {
        const lines = unicodeDB.split("\n").filter(l => !!l);
        return lines.map(line => {
            const values = line.split(";");
            return [values[0], values[1].split(" "), values[1]];
        });
    }

    #createIndex(text) {
        let words = text.split(" ")
            .filter(s => !!s)
            .map(s => s.toUpperCase())

        return Array.from(new Set(words));
    }

    #partiallyMatchWords(words, db) {
        const matchingCharacters = [];

        db.forEach(row => {
            const foundWords = words.map(_ => false);

            for (let i = 0; i < row[1].length; ++i)
                for (let w = 0; w < words.length; ++w)
                    if (row[1][i].indexOf(words[w]) !== -1) {
                        foundWords[w] = true;
                        break;
                    }

            if (foundWords.every(w => w)) {
                const result = this.#makeResult(row);
                matchingCharacters.push(result);
            }
        });

        return matchingCharacters;
    }

    #prefixMatchWords(words, db) {
        const matchingCharacters = [];

        db.forEach(row => {
            const foundWords = words.map(_ => false);

            for (let i = 0; i < row[1].length; ++i)
                for (let w = 0; w < words.length; ++w)
                    if (row[1][i].startsWith(words[w])) {
                        foundWords[w] = true;
                        break;
                    }

            if (foundWords.every(w => w)) {
                const result = this.#makeResult(row);
                matchingCharacters.push(result);
            }
        });

        return matchingCharacters;
    }

    #makeResult(row) {
        const codepoint = parseInt("0x" + row[0], 16);

        return {
            codepoint: `U+${row[0]}`,
            hexhtml: `&#x${row[0]};`,
            dechtml: `&#${codepoint};`,
            character: String.fromCodePoint(codepoint),
            name: row[2]
        }
    }

    execute({OBJECT: {text: query}, WITH: {text: match}}) {
    }

    #generateList(display, results) {
        const cfg = {
            text: c => {
                return `<span class="codepoint" title="Copy code point">${c.codepoint}</span>`
                     + `&nbsp;<span class="htmlhex" title="Copy hexadecimal entity">${cmdAPI.escapeHtml(c.hexhtml)}</span>`
                     + `&nbsp;<span class="htmldec" title="Copy decimal entity">${cmdAPI.escapeHtml(c.dechtml)}</span>`
            },
            subtext: c => c.name,
            icon: c => $(`<div style="color: var(--shell-font-color); text-align: center;">${c.character}</div>`),
            iconSize: 24,
            action: (c, e) => {
                if (["codepoint", "htmlhex", "htmldec"].some(id => id === e.target.className))
                    cmdAPI.copyToCipboard(e.target.textContent);
                else
                    cmdAPI.copyToClipboard(c.character);
            }
        };

        display.objectList(results, cfg);
    }
}
