import {settings} from "../settings.js";

export const namespace = new AnnotatedCommandNamespace(CommandNamespace.SEARCH);

/**
    @search
    @markdown
    @command
    @delay 1000
    @url https://www.google.com/search?q=%s
    @icon /ui/icons/google.png
    @description The search API used by this command was closed by Google. Please use the duck command instead.
    @uuid 61A61D85-07B4-4375-AB42-D635190241EA
 */
export class Google {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "query"};
        args[AS] = {nountype:  ["quoted", "define", "site"], label: "type"};
    }

    preview(args, display) {
        display.set(`The Google search API is no longer available, so results cannot be shown here.
                     <p>Use the <b>duck</b> command to search DuckDuckGo instead:</p>
                     <pre>\tduck [query]</pre>`);
    }

    beforeSearch(args) {
        const alias = args.alias?.text;

        if (alias === "quoted")
            args.object.text = `"${args.object.text}"`;
        else if (alias === "site")
            args.object.text = `${args.object.text} site:${cmdAPI.getLocation()}`;
        else if (alias === "define")
            args.object.text = `define:${args.object.text}`;

        return args;
    }

    execute(args) {
        args = this.beforeSearch(args);
        const text = args.OBJECT?.text;
        if (text)
            cmdAPI.addTab(`http://www.google.com/search?q=${encodeURIComponent(text)}`);
    }
}

/**
    @command
    @delay 1000
    @author rostok
    @icon /ui/icons/google.png
    @description Shows a location on the map.
    @uuid 161A4B18-F577-40B9-99DB-B689690E657A
 */
export class Maps {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "location"};
    }

    preview({OBJECT: {text: location}}, display) {
        if (location) {
            const queryURL = encodeURIComponent(location);
            const mapURL = `https://maps.google.com/maps?t=&z=13&ie=UTF8&iwloc=&output=embed&q=${queryURL}`;
            const html = `
                <div class="mapouter">
                    <div class="gmap_canvas">
                        <iframe width="546" height="507" id="gmap_canvas" src="${mapURL}"></iframe>
                    </div>
                    <style>
                        .mapouter {overflow: hidden; text-align: right; height: 507px; width: 546px; margin-top: -3px; margin-left: -7px;}
                        .gmap_canvas {overflow: hidden; background: none !important; height: 507px; width:546px;}
                        .gmap_canvas iframe {overflow: hidden; border: none; margin: 0;}
                    </style>
                </div>`;

            display.set(html);
        }
        else
            display.text("Search for objects or routes on Google Maps."
                       + "<p>syntax: <pre>\tmaps [place]\n\tmaps [start] to [finish]</pre></p>");
    }

    execute({OBJECT: {text: location}}) {
        if (location)
            cmdAPI.addTab("https://maps.google.com/maps?q=" + encodeURIComponent(location));
    }
}

/**
    Browse pictures from Bing Images. Click a thumbnail to open the full-size image in a background tab.

    @search
    @command
    @delay 1000
    @icon /ui/icons/bing.png
    @url https://www.bing.com/images/search?q=%s
    @author Federico Parodi, satyr, g/christensen
    @description Browse pictures from Bing Images.
    @uuid 3A1A73F1-C651-4AD5-B4B4-2FBAAB85CDD0
 */
export class Images {
    PAGE_SIZE = 20;
    apiURL = `https://www.bing.com/images/async?mmasync=1&count=${this.PAGE_SIZE}`;

    async preview({OBJECT: {text: query}}, display) {
        if (query) {
            const params = {query, start: 0, starts: []};
            this.#previewImages(display, params);
        }
        else
            this.previewDefault(display);
    }

    async #previewImages(display, params) {
        display.text("Loading results...");

        const requestURL = this.apiURL + `&first=${params.start}&q=${encodeURIComponent(params.query)}`;
        const html = await display.fetchText(requestURL, {_displayError: "Network error."});

        if (html)
            this.#generateView(display, this.#parseImages(html), params);
        else
            display.error("HTTP request error.");
    }

    // every image tile carries a JSON description in the "m" attribute: murl - the image, turl - its thumbnail
    #parseImages(html) {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const images = [];

        for (const tile of doc.querySelectorAll("a.iusc[m]")) {
            try {
                const {murl, turl} = JSON.parse(tile.getAttribute("m"));

                if (murl && turl)
                    images.push({image: murl, thumbnail: turl});
            }
            catch (e) {
                console.error(e);
            }
        }

        return images;
    }

    #generateView(display, images, params) {
        const range = images.length
            ? `${params.start + 1} ~ ${params.start + images.length}`
            : 'x';

        const style =
            `.navi {text-align: center}
            .navi {margin-bottom: 5px}
            .prev, .next {position: absolute}
            .navi {font-weight: bold}
            .prev {left:  0}
            .next {right: 0}
            `;

        const navi =
            `<div class="navi">
               ${range}
               <input type="button" class="prev" value="&lt;" accesskey="&lt;"/>
               <input type="button" class="next" value="&gt;" accesskey="&gt;"/>
             </div>
            `;

        display.imageList(navi, images.map(i => i.thumbnail),
            i => browser.tabs.create({url: images[i].image, active: false}), style);

        if (!params.start)
            display.querySelector(".prev").disabled = true

        display.querySelector(".navi").addEventListener("click", e => {
            var b = e.target
            if (b.type !== "button") return
            e.preventDefault()
            b.disabled = true
            if (b.value === "<")
                params.start = params.starts.pop() || 0
            else {
                params.starts.push(params.start)
                params.start += this.PAGE_SIZE
            }
            this.#previewImages(display, params);
        })
    }
}

/**
    @search
    @command
    @delay 1000
    @icon /ui/icons/youtube.png
    @url http://www.youtube.com/results?search_type=search_videos&search=Search&search_sort=relevance&search_query=%s
    @description Searches YouTube for videos matching your words. Previews the top results.
    @uuid 223E9F19-1DD8-4725-B09C-86EA5DE44DB0
 */
export class Youtube {
    apiURL = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video`
           + `&maxResults=${settings.max_search_results()}&key=${cmdAPI.settings.youtube_search_api_key}`;

    async preview({OBJECT: {text: query}}, display) {
        if (query) {
            display.text("Loading results...");

            const requestURL = this.apiURL + `&q=${encodeURIComponent(query)}`;
            const results = await display.fetchJSON(requestURL, {_displayError: "Network error."});

            if (results)
                this.#generateView(display, results, query);
            else
                display.error("HTTP request error.");
        }
        else
            this.previewDefault(display);
    }

    #generateView(display, results, query) {
        const html =
            `<div class="search-result-list">
               <p>
                 Found <b>${results.pageInfo.totalResults}</b> YouTube Videos matching <b>${query}</b>
               </p>
               ${R(results.items, (entry, entry_index) =>
                `<div style="clear: both; font-size: small" class="search-result-item">
                           <kbd>${(entry_index < 35) ? (entry_index + 1).toString(36) : "-"}</kbd>.
                           <a style="font-size: small; font-weight:bold"
                              accessKey="${(entry_index < 35) ? (entry_index + 1).toString(36) : "-"}"
                              href="https://www.youtube.com/watch?v=${entry.id.videoId}">
                             <img style="float:left; margin: 0 10px 5px 0; border: none" 
                                  src="${entry.snippet.thumbnails.default.url}" />
                             ${entry.snippet.title}
                           </a>
                           <p>${entry.snippet.description}</p>
                 </div>`)}
             </div>`;

        display.set(html);
    }
}
