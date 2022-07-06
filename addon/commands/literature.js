export const _namespace = {name: CMD_NS.SEARCH, annotated: true};

const LIBGEN_HOST = "http://libgen.is/";

/**
 # Syntax
  **libgen** [*query*] [**of** *order*] [**with** *sort mode*] [**by** *amount*]
 
 # Arguments
 - *query* - arbitrary text, queries books by title or author.
 - *order* - {**title** | **author** | **year** }, specifies the column to order by.
 - *sort mode* - {**asc** | **desc**}, specifies sort mode.
 - *amount* - {**25** | **50** | **100** }, specifies the maximum amount of listed items.
 
 # Example
 **libgen** *philosophical investigations* **of** *year* **by** *50*
 
 @command
 @markdown
 @delay 1000
 @icon /ui/icons/libgen.ico
 @description Search Library Genesis.
 @uuid 25DB48B1-0FB6-49FC-8F38-728A1BAF7265
 */
export class Libgen {
    #libgenHost;

    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "title or author"}; // object
        //args[FOR]    = {nountype: noun_arb_text, label: "text"}; // subject
        //args[TO]     = {nountype: noun_arb_text, label: "text"}; // goal
        //args[FROM]   = {nountype: noun_arb_text, label: "text"}; // source
        //args[NEAR]   = {nountype: noun_arb_text, label: "text"}; // location
        //args[AT]     = {nountype: noun_arb_text, label: "text"}; // time
        args[WITH]   = {nountype: ["asc", "desc"], label: "sort mode"}; // instrument
        //args[IN]     = {nountype: noun_arb_text, label: "text"}; // format
        args[OF]     = {nountype: ["year", "title", "author"], label: "order"}; // modifier
        //args[AS]     = {nountype: noun_arb_text, label: "text"}; // alias
        args[BY]     = {nountype: ["25", "50", "100"], label: "amount"}; // cause
        //args[ON]     = {nountype: noun_arb_text, label: "text"}; // dependency
    }

    async preview(args, display, storage) {
        display.text("Searching...");
        let url = this._makeQueryURL(args);

        const response = await cmdAPI.previewFetch(display, url, {_displayError: true});

        if (response.ok) {
            const doc = cmdAPI.parseHtml(await response.text());
            const table = $("table.c", doc);
            const books = this._parseTable(table);

            if (!books.length)
                display.text("Not found.");
            else {
                cmdAPI.objectPreviewList(display, books, {
                    text: (b) => b.title,
                    subtext: (b) => b.details,
                    action: (b) => browser.tabs.create({"url": b.link, active: cmdAPI.activateTab})
                });
            }
        }
        else
            display.text("Error.");
    }

    execute(args) {
        cmdAPI.addTab(this._makeQueryURL(args));
    }

    _makeQueryURL({OBJECT, WITH, OF, BY}) {
        const sort_mode = WITH?.text?.toUpperCase();
        const order = OF?.text;
        const amount = BY?.text;

        this.#libgenHost = LIBGEN_HOST;

        let query = `${this.#libgenHost}search.php?open=0&view=simple&column=def&req=${OBJECT?.text}`;

        if (order) {
            query += "&sort=" + order;

            if (sort_mode)
                query += "&sortmode=" + sort_mode;
            else {
                if (order === "year")
                    query += "&sortmode=DESC";
            }
        }

        if (amount)
            query += "&res=" + amount;

        return query;
    }

    _parseTable(table) {
        let data = [];
        let rows = table.children("tbody").children("tr").not(":first");

        rows.each((_, tr) => {
            let cols = $(tr).children("td");

            let entry = {};
            entry.mirrors = [];

            cols.each((i, td) => {
                switch(i) {
                    case 1:
                        entry.authors = td.innerText;
                        break;
                    case 2:
                        let greens = $(td).find("font[color='green']");
                        greens.each((_, elem) => {
                            let green = $(elem);
                            if (green.text().indexOf("[") < 0)
                                green.remove();
                            else
                                green.attr("style", "font-size: 90%");
                        });

                        let fonts = $(td).find("font");
                        fonts.each((_, elem) => {
                            let font = $(elem);
                            font.attr("color", "#45BCFF");
                        });

                        $(td).find("a:not([id])").remove();
                        let links = $(td).find("a[id]");
                        links.each((_, elem) => {
                            let link = $(elem);
                            let href = link.attr("href");
                            link.attr("style", "color: #45BCFF");
                            link.attr("href", this.#libgenHost + link.attr("href"));
                        });

                        entry.title = td.innerHTML
                            .replace("<br>", " ")
                            .replace(/<a/ig, "<span class='libgen'")
                            .replace(/<\/a>/ig, "</span>");
                        entry.link = links.get(0).href;
                        break;
                    case 4:
                        entry.year = td.innerText;
                        break;
                    case 8:
                        entry.extension = td.innerText;
                        break;
                    case 9:
                        entry.mirrors = $(td).find("a");
                        break;
                }
            });

            entry.details = "";

            if (entry.authors)
                entry.details += entry.authors + ", ";

            if (entry.year)
                entry.details += entry.year + ", ";

            if (entry.extension)
                entry.details += entry.extension;

            data.push(entry);
        });

        return data;
    }
}


/**
 # Syntax
 Same as **libgen**.

 @command
 @markdown
 @delay 1000
 @icon https://zlibrary.org/favicon.ico
 @description Search books on <a href="https://zlibrary.org">zlibrary.org</a>.
 @uuid A07F394B-7D54-468E-A264-19581EB28A5C
 */
export class Zlibrary {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "query"}; // object
        //args[FOR]    = {nountype: noun_arb_text, label: "text"}; // subject
        //args[TO]     = {nountype: noun_arb_text, label: "text"}; // goal
        //args[FROM]   = {nountype: noun_arb_text, label: "text"}; // source
        //args[NEAR]   = {nountype: noun_arb_text, label: "text"}; // location
        //args[AT]     = {nountype: noun_arb_text, label: "text"}; // time
        args[WITH]   = {nountype: ["asc", "desc"], label: "sort mode"}; // instrument
        //args[IN]     = {nountype: noun_arb_text, label: "text"}; // format
        args[OF]     = {nountype: ["year", "title", "author"], label: "order"}; // modifier
        //args[AS]     = {nountype: noun_arb_text, label: "text"}; // alias
        //args[BY]     = {nountype: noun_arb_text, label: "text"}; // cause
        //args[ON]     = {nountype: noun_arb_text, label: "text"}; // dependency
    }

    #ZLIBRARY_URL = "https://zlibrary.org";

    async preview({OBJECT: {text: query}, OF: {text: sortBy}, WITH: {text: order}}, display, storage) {
        if (query) {
            display.text("Querying zlibrary...");

            let results = await this.#fetchBooks(display, query);

            if (results) {
                results = this.#sortResults(results, sortBy, order);
                this.#generateList(display, results);
            }
            else
                display.error("HTTP request error.");
        }
        else
            this.previewDefault(display);
    }

    execute({OBJECT: {text: query}}, storage) {
        if (query) {
            const queryURL = encodeURIComponent(query);
            cmdAPI.addTab(`${this.#ZLIBRARY_URL}/s/${queryURL}`);
        }
    }

    async #fetchBooks(display, query) {
        const queryURL = encodeURIComponent(query);
        const requestURL = `${this.#ZLIBRARY_URL}/s/${queryURL}`;

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

    #parseResults(html) {
        const doc = $($.parseHTML(html));
        const bookRows = doc.find(".bookRow");
        const cmd = this;
        const books = bookRows.map(function() {
            const bookRow = $(this);
            return {
                title: bookRow.find("h3[itemprop='name'] a").text(),
                author: bookRow.find("a[itemprop='author']").text(),
                link: cmd.#ZLIBRARY_URL + bookRow.find("h3[itemprop='name'] a").attr("href"),
                cover: bookRow.find("img.cover").attr("data-src"),
                year: bookRow.find(".property_year .property_value").text(),
                file: bookRow.find(".property__file .property_value").text(),
            };
        }).get();

        return books;
    }

    #sortResults(results, sortBy, order) {
        let sorted = results;
        let sorter, attr;

        if (sortBy === "title") {
            sorter = order === "desc"? this.#sortStringsDesc: this.#sortStringsAsc;
            attr = "title";
        }
        else if (sortBy === "author") {
            sorter = order === "desc"? this.#sortStringsDesc: this.#sortStringsAsc;
            attr = "author";
        }
        else if (sortBy === "year") {
            sorter = order === "desc"? this.#sortNumDesc: this.#sortNumAsc;
            attr = "year";
        }

        if (sorter)
            sorted = results.sort((a, b) => sorter(a, b, attr));

        return sorted;
    }

    #sortStringsAsc(a, b, attr) {
        return a[attr].localeCompare(b[attr], undefined, {sensitivity: 'base'});
    }

    #sortStringsDesc(a, b, attr) {
        return b[attr].localeCompare(a[attr], undefined, {sensitivity: 'base'});
    }

    #sortNumAsc(a, b, attr) {
        return parseInt(a[attr]) - parseInt(b[attr]);
    }

    #sortNumDesc(a, b, attr) {
        return parseInt(b[attr]) - parseInt(a[attr]);
    }

    #generateList(display, results) {
        cmdAPI.objectPreviewList(display, results, {
            text: i => i.title,
            subtext: i => [i.author, i.year, i.file].join(", "),
            thumb: i => i.cover,
            action: i => cmdAPI.addTab(i.link)
        });
    }
}


/**
 @command
 @markdown
 @delay 1000
 @icon /ui/icons/scihub.ico
 @description Search for articles on SCI-HUB.
 @uuid DC18FEB8-882E-4030-B1B9-F50721877779
 */
export class Scihub {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "body"};
    }

    async preview({OBJECT}, display) {
        display.text("Searching...");

        const params = new URLSearchParams({"sci-hub-plugin-check": "", "request": OBJECT?.text});
        const response = await cmdAPI.previewFetch(display,"https://sci-hub.se", {
            method: "post",
            body: params,
            _displayError: true
        });

        if (response.ok) {
            const doc = cmdAPI.parseHtml(await response.text());
            let article = doc.querySelector("#article #pdf");

            if (article) {
                this._article = article.src;

                if (!this._article.startsWith("http")) {
                    if (this._article.startsWith("//"))
                        this._article = "https:" + this._article;
                    else if (this._article.startsWith("/"))
                        this._article = "https://sci-hub.se" + this._article;
                }

                let citation = doc.querySelector("#citation");

                if (citation.textContent?.trim() === ".")
                    citation.innerHTML = "&lt;press &apos;Enter&apos; to open the document&gt;";

                display.text(`<a style="color: #45BCFF" href="${this._article}">${citation.innerHTML}</a>`);
            }
            else
                display.text("Not found.");
        }
        else
            display.text("Error.");
    }

    execute() {
        if (this._article) {
            cmdAPI.addTab(this._article);
            this._article = null;
        }
    }
}
