import {NAMESPACE_SEARCH} from "./_namespaces.js";

const LIBGEN_HOST = "http://libgen.is/";

/**
 # Syntax
  **libgen** [*filter*] [**of** *order*] [**with** *sort mode*] [**by** *amount*]
 
 # Arguments
 - *filter* - arbitrary text, filters books by title or authors.
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
    _namespace = NAMESPACE_SEARCH;
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
                    action: (b) => browser.tabs.create({"url": b.link, active: false})
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
        let self = this;
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

            if (entry.year)
                entry.details += entry.year + ", ";

            if (entry.extension)
                entry.details += entry.extension + ", ";

            if (entry.authors)
                entry.details += entry.authors;

            data.push(entry);
        });

        return data;
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
    _namespace = NAMESPACE_SEARCH;

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
