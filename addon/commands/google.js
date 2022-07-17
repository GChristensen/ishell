import {settings} from "../settings.js";

export const namespace = new CommandNamespace(CommandNamespace.SEARCH, true);

/**
    It is possible to use the <b>as</b> argument with the following values: <i>quoted</i>, <i>site</i>, <i>define</i>.

    @search
    @command
    @delay 1000
    @parser json
    @container items
    @title title
    @href link
    @body htmlSnippet
    @icon /ui/icons/google.png
    @description Searches Google for your words.
    @uuid 61A61D85-07B4-4375-AB42-D635190241EA
 */
export class Google {
    url = `https://customsearch.googleapis.com/customsearch/v1?key=${cmdAPI.settings.google_cse_api_key}`
        + `&cx=${cmdAPI.settings.google_cse_api_id}&q=%s`;

    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "query"};
        args[AS] = {nountype:  ["quoted", "define", "site"], label: "type"};
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
    @search
    @command
    @delay 1000
    @icon /ui/icons/google.png
    @url https://www.google.com/search?tbm=isch&q=%s
    @author Federico Parodi, satyr, g/christensen
    @description Browse pictures from Google Images.
    @uuid 3A1A73F1-C651-4AD5-B4B4-2FBAAB85CDD0
 */
export class Images {
    apiURL = `https://customsearch.googleapis.com/customsearch/v1?key=${cmdAPI.settings.google_cse_api_key}`
           + `&cx=${cmdAPI.settings.google_cse_api_id}&searchType=image`;

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

        const requestURL = this.apiURL + `&start=${params.start}&q=${encodeURIComponent(params.query)}`;
        const results = await display.fetchJSON(requestURL, {_displayError: "Network error."});

        if (results)
            this.#generateView(display, results, params);
        else
            display.error("HTTP request error.");
    }

    #generateView(display, results, params) {
        const range = results.items.length
            ? `${params.start + 1} ~ ${params.start + results.items.length}`
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

        display.imageList(navi, results.items.map(i => i.link), null, style);

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
                params.start += results.items.length
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
