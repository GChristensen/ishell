export const namespace = new AnnotatedCommandNamespace(CommandNamespace.SEARCH);

const LIBGEN_HOST = "https://libgen.li/";

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

        const response = await display.fetch(url, {_displayError: "Network error."});

        if (response.ok) {
            const doc = cmdAPI.parseHtml(await response.text());
            const table = $("table#tablelibgen", doc);
            const books = this._parseTable(table);

            if (!books.length)
                display.text("Not found.");
            else {
                display.objectList(books, {
                    text: (b) => this._titleHTML(b),
                    subtext: (b) => Utils.escapeHtml(b.details),
                    action: (b) => browser.tabs.create({"url": b.link, active: cmdAPI.arrowSelection})
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
        const sort_mode = WITH?.text?.toLowerCase();
        const order = OF?.text;
        const amount = BY?.text;

        // curtab=f restricts the results to files, the tab that lists the downloadable items
        let query = `${LIBGEN_HOST}index.php?curtab=f&req=${encodeURIComponent(OBJECT?.text || "")}`;

        if (order) {
            query += "&order=" + order;
            query += "&ordermode=" + (sort_mode || (order === "year" ? "desc" : "asc"));
        }

        if (amount)
            query += "&res=" + amount;

        return query;
    }

    _titleHTML(book) {
        let html = Utils.escapeHtml(book.title);

        if (book.isbn)
            html += ` <span style="font-size: 90%">${Utils.escapeHtml(book.isbn)}</span>`;

        if (book.series)
            html += ` <span style="font-size: 90%; opacity: 0.7">[${Utils.escapeHtml(book.series)}]</span>`;

        return html;
    }

    // text of a cell without the parts that are only meaningful on the site: the [...] toggle of long author
    // lists (its hidden remainder is kept), the line breaks are replaced with spaces
    _cellText(cell) {
        const clone = cell.clone();

        clone.find("input, label").remove();
        clone.find("br").replaceWith(" ");

        return clone.text().replace(/\s+/g, " ").trim();
    }

    // cuts the text after the last complete comma-separated item that fits the given length
    _shorten(text, length) {
        if (text.length <= length)
            return text;

        const cut = text.lastIndexOf(", ", length);

        return text.substring(0, cut > 0 ? cut : length).trim() + ", ...";
    }

    // Columns of the result table: 0 - series, title, ISBN and badges, 1 - authors, 2 - publisher, 3 - year,
    // 4 - language, 5 - pages, 6 - size, 7 - extension, 8 - mirrors.
    _parseTable(table) {
        const books = [];

        table.children("tbody").children("tr").each((_, tr) => {
            const cols = $(tr).children("td");

            if (cols.length < 9)
                return;

            const entry = {};
            const titleCell = $(cols[0]);

            // there may be several links to the edition (series issue, title, ISBN): the title is the one having text
            const titleLink = titleCell.find("a[href^='edition.php']")
                .filter((_, a) => !$(a).closest("b").length)
                .filter((_, a) => this._cellText($(a).clone().children("i").remove().end()))
                .first();
            const link = titleLink.attr("href") || $(cols[6]).find("a").attr("href");

            if (!link)
                return;

            entry.link = new URL(link, LIBGEN_HOST).href;
            entry.title = this._cellText(titleLink.clone().children("i").remove().end())
                || this._shorten(this._cellText(titleCell), 100);
            entry.series = this._cellText(titleCell.children("b").first());
            entry.isbn = this._cellText(titleCell.find("font[color='green']").first());

            const authors = this._shorten(this._cellText($(cols[1])).replace(/[;,\s]+$/, ""), 80);
            const publisher = this._cellText($(cols[2]));
            const year = this._cellText($(cols[3]));
            const language = this._cellText($(cols[4]));
            const size = this._cellText($(cols[6]));
            const extension = this._cellText($(cols[7]));

            entry.details = [authors, publisher, year, language, size, extension].filter(s => s).join(", ");

            books.push(entry);
        });

        return books;
    }
}


/**
 # Syntax
 Same as **libgen**.

 @-command
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
            display.text("Searching...");

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

        const html = await display.fetchText(requestURL, {_displayError: "Network error."});

        if (html)
            return this.#parseResults(html);
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
        return cmdAPI.localeCompare(attr)(a, b);
    }

    #sortStringsDesc(a, b, attr) {
        return cmdAPI.localeCompare(attr)(b, a);
    }

    #sortNumAsc(a, b, attr) {
        return parseInt(a[attr]) - parseInt(b[attr]);
    }

    #sortNumDesc(a, b, attr) {
        return parseInt(b[attr]) - parseInt(a[attr]);
    }

    #generateList(display, results) {
        display.objectList(results, {
            text: i => i.title,
            subtext: i => [i.author, i.year, i.file].join(", "),
            icon: i => i.cover,
            action: i => cmdAPI.addTab(i.link)
        });
    }
}

/**
 @hidden
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
        const response = await display.fetch("https://sci-hub.se", {
            method: "post",
            body: params,
            _displayError: "Network error."
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
