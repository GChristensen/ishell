// These commands are hidden by default and available only through an undocumented easter switch

export const _namespace = {name: CMD_NS.MORE, annotated: true};

const JAVLIB_SEARCH_URL = "https://www.javlibrary.com/en/vl_searchbyid.php?keyword=";

/**
 Try: <b>javlib</b> <i>star-699</i>

 @command javlibrary, idols
 @delay 1000
 @hidden
 @icon /commands/more/jav.png
 @description Search for movie information at <a href='https://www.javlibrary.com/en'>javlibrary</a>.
 @uuid 2464CA49-78EF-425E-8A49-ED5F5EA121D0
 */
export class Javlib {
    #cloudflare;

    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "movie code"};
    }

    async preview({OBJECT: {text: movie}}, display) {
        if (movie) {
            const url = JAVLIB_SEARCH_URL + encodeURIComponent(movie.trim())
            display.text("Requesting page...");
            this.#requestPage(display, url);
        }
    }

    execute({OBJECT: {text: movie}}) {
        Utils.openUrlInBrowser(JAVLIB_SEARCH_URL + encodeURI(movie.trim()));
    }

    async #requestPage(display, url) {
        const response = await cmdAPI.previewFetch(display, url, {_displayErrors: true})
        if (response.ok) {
            this.#cloudflare = false;
            this.#constructView(display, url, await response.text());
        }
        else if (response.status === 503)
            if (!this.#cloudflare)
                this.#solveCloudFlare(display, url);
            else
                this.#cloudflare = false;
    }

    #constructView(display, url, page) {
        page = $(page);
        let html = "";

        let img = page.find("#video_jacket_img").get(0);
        if (img && img.src) {
            let rect = display.getBoundingClientRect();
            
            html += `<img id='javlib-cover' width='${rect.width - 20}' 
                          src='${img.src.replace(/^.*?-extension:/, "http:")}'/>`;

            let info = page.find("#video_info");

            if (info) {
                let movie_id = info.find("#video_id .text").text();
                let release_date = info.find("#video_date .text").text();
                let video_length = info.find("#video_length .text").parent().text();
                let director = this.#fixHref(info.find("#video_director .director a")[0]);
                let maker = this.#fixHref(info.find("#video_maker .maker a")[0]);
                let label = this.#fixHref(info.find("#video_label .label a")[0]);

                html += `<div><a href='${url}'>${movie_id}</a> | ${release_date} 
                            | ${video_length}${director ? "| By " + director : ""} | ${maker}/${label}</div>`;

                html += `<div style='padding-top: 5px'>Genres: `;
                info.find("#video_genres .genre a").map((_, g) => html += this.#fixHref(g) + " ");
                html += `</div>`;

                html += `<div style='padding-top: 5px'>Cast: `;
                info.find("#video_cast .star a").map((_, s) => html += this.#fixHref(s) + " ");
                html += `</div>`;
            }

            display.set(html);

            if (display.scrollHeight === display.clientHeight)
                $(display).find("#javlib-cover").width(538);

            let altImg = img.getAttribute("onerror");
            if (altImg) {
                let altURLMatch = altImg.match(/['"](https?:)?(\/\/)?([^'"]+)['"]/);
                
                if (altURLMatch)
                    $(display)
                        .find("#javlib-cover")
                        .on("error", (e) => {e.target.src = "https://" + altURLMatch[3]});
            }
        }
        else if (page.find(".videos .video").length > 0) {
            page.find(".videos .video > a > .id")
                .map((_, id) => 
                    html += `<a href='${this.#fixHref(id.parentNode, true)}'>${id.textContent}</a> `);
            
            display.set(html);
            
            $(display).find("a").click((e) => {
                e.preventDefault();
                this.#requestPage(display, e.target.href);
            });
        }
        else
            display.text("Not found.");
    }

    #fixHref(a, return_url) {
        if (a) {
            let tail = a.href.split("/");
            tail = tail[tail.length - 1];
            a.href = "https://www.javlibrary.com/en/" + tail;

            return return_url ? a.href : a.outerHTML;
        }
        return "";
    }

    async #solveCloudFlare(display, url) {
        this.#cloudflare = true;

        display.text("Waiting for Cloudflare...");
        const newTab = await browser.tabs.create({active: false, url: "https://www.javlibrary.com/en/"});

        let listener = (id, changed, tab) => {
            if (id === newTab.id && changed.title && changed.title.includes("JAVLibrary")) {
                browser.tabs.onUpdated.removeListener(listener);

                this.#cloudflare = false;
                browser.tabs.remove(newTab.id);

                this.#requestPage(display, url);
            }
        };
        browser.tabs.onUpdated.addListener(listener, {urls: ["*://*.javlibrary.com/*"]});
    }
}