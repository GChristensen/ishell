export const _namespace = {name: CMD_NS.UTILITY, annotated: true};

/**
    Allows to copy the character or its code representations to clipboard.

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
       const requestURL = this.#makeURL(query, partial);

        try {
            const response = await cmdAPI.previewFetch(display, requestURL);

            if (response.ok) {
                const html = await response.text();
                return this.#parseResults(html);
            }
        } catch (e) {
            if (!cmdAPI.fetchAborted(e))
                display.error("Network error.");
            throw e;
        }
    }

    #makeURL(query, partial) {
        const partialURL = partial? "&subs=1": "";
        const queryURL = encodeURIComponent(query);
        return `https://unicode-search.net/unicode-namesearch.pl?verbose=1${partialURL}&term=` + queryURL;
    }

    #parseResults(html) {
        const doc = $($.parseHTML(html));
        let table = doc.filter(".resulttable");
        let characters = [];

        if (table.length) {
            const rows = doc.find(".resev, .resod");
            characters = rows.map(function () {
                const row = $(this);
                return {
                    codepoint: row.find(".upoint").text(),
                    character: row.find(".character").text(),
                    htmlcode: row.find(".htmlcolcode").html().split("<br>").map(s => s.trim()),
                    name: row.find(".hname, .name, .namelong").html()
                             .replace(/<a[^>]+>/g, "").replace(/<\/a>/g, "")
                };
            }).get();
        }
        else {
            table = doc.filter(".oneresulttable");
            if (table.length) {
                characters = [{
                    codepoint: table.find(".oneupoint").text(),
                    character: table.find(".onecharacter").text(),
                    htmlcode: table.find(".htmlcode").map((_, e) => e.innerHTML).get(),
                    name: table.find(".rname .name").text()
                }];
            }
        }

        return characters;
    }

    execute({OBJECT: {text: query}, WITH: {text: match}}) {
        if (query) {
            const url = this.#makeURL(query, match === "partial");
            cmdAPI.addTab(url);
        }
    }

    #generateList(display, results) {
        let items = [];

        for (let char of results) {
            let text = "";

            text = `<div class='opl-image'>${char.character}</div>`;

            const points = `<span class="codepoint" title="Copy code point">${char.codepoint}</span>`
                         + `&nbsp;<span class="htmlhex" title="Copy hexadecimal entity">${char.htmlcode[0]}</span>`
                         + `&nbsp;<span class="htmldec" title="Copy decimal entity">${char.htmlcode[1]}</span>`

            text += `<div class='opl-lines'><div class='opl-text'>${points}</div>`
                  + `<div class='opl-subtext'>${char.name}</div></div>`;

            items.push(text);
        }

        const style = `${CmdUtils._previewList2CSS}
                     .opl-image {
                        width: 24px;
                        height: 24px;
                        min-width: 24px;
                        min-height: 24px;
                        color: #ddd;
                        text-align: center;
                     }`;

        cmdAPI.previewList(display, items, (i, e) => {
            if (["codepoint", "htmlhex", "htmldec"].some(id => id === e.target.className))
                cmdAPI.copyToClipboard(e.target.textContent);
            else
                cmdAPI.copyToClipboard(results[i].character);
        }, style);
    }
}
