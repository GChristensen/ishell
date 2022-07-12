import {settings} from "../settings.js";

export const _namespace = CMD_NS.SEARCH;

let maxSearchResults = settings.max_search_results() || 10;

CmdUtils.makeSearchCommand({
    name: "google",
    uuid: "61A61D85-07B4-4375-AB42-D635190241EA",
    url: `https://customsearch.googleapis.com/customsearch/v1?key=${cmdAPI.settings.google_cse_api_key}`
        + `&cx=${cmdAPI.settings.google_cse_api_id}&q=%s`,
    icon: "/ui/icons/google.png",
    description: "Searches Google for your words.",
    arguments: [{role: "object", nountype: noun_arb_text, label: "query"},
                {role: "alias",  nountype: ["quoted", "define", "site"], label: "type"}],
    previewDelay: 1000,
    help: `It is possible to use the <b>as</b> argument with the following values: <i>quoted</i>, <i>site</i>, <i>define</i>.`,
    parser: {
        type       : "json",
        container  : "items",
        href       : "link",
        title      : "title",
        body       : "htmlSnippet",
        maxResults : maxSearchResults,
    },
    beforeSearch(args) {
        const alias = args.alias?.text;

        if (alias === "quoted")
            args.object.text = `"${args.object.text}"`;
        else if (alias === "site")
            args.object.text = `${args.object.text} site:${cmdAPI.getLocation()}`;
        else if (alias === "define")
            args.object.text = `define:${args.object.text}`;

        return args;
    } ,
    execute(args) {
        args = this._argsHook(args);
        const text = args.object?.text;
        if (text)
            CmdUtils.addTab(`http://www.google.com/search?q=${encodeURIComponent(text)}`);
    }
});

// CmdUtils.makeSearchCommand({
//     name: "bing",
//     uuid: "44FF357D-C3C2-4CB3-91EB-B4E415DC9905",
//     url: "http://www.bing.com/search?q=%s",
//     defaultUrl: "http://www.bing.com/",
//     _hidden: true,
//     arguments: [{role: "object", nountype: noun_arb_text, label: "query"}],
//     previewDelay: 1000,
//     icon: "/ui/icons/bing.png",
//     parser: {
//         container: ".b_algo",
//         title: "h2 > a",
//         body: ".b_caption",
//         maxResults: maxSearchResults,
//     },
// });

CmdUtils.makeSearchCommand({
    name: "IMDb",
    uuid: "F34E6A8C-FBBD-4DB2-9999-1B653034D985",
    //url: "http://www.imdb.com/find?q=%s",
    url: "https://www.imdb.com/search/title/?title=%s",
    defaultUrl: "http://www.imdb.com",
    arguments: [{role: "object", nountype: noun_arb_text, label: "query"}],
    previewDelay: 1000,
    icon: "/ui/icons/imdb.png",
    parser: {
        container  : ".lister-item",
        title      : container => {
            const header = container.find(".lister-item-header");
            header.find(".lister-item-index").remove();
            return header;
        },
        thumbnail  : container => {
            const thumb = container.find("img.loadlate").first().attr("loadlate");
            return $(`<img src="${thumb}"/>`);
        },
        body       : container => {
            const synopsis = container.find(".ratings-bar").next();
            const rating = container.find("[name='ir'] strong");
            const runtime = container.find(".runtime");
            const genre = container.find(".genre");
            synopsis.prepend(" | ");
            synopsis.prepend(genre);
            synopsis.prepend(" | ");
            synopsis.prepend(runtime);
            synopsis.prepend(" | ");
            synopsis.prepend(rating);
            synopsis.prepend("Rating: ");
            return synopsis;
        },
        maxResults : maxSearchResults,
    },
});

CmdUtils.makeSearchCommand({
    names: ["YouTube"],
    uuid: "223E9F19-1DD8-4725-B09C-86EA5DE44DB0",
    url: ("http://www.youtube.com/results?search_type=search_videos" +
        "&search=Search&search_sort=relevance&search_query={QUERY}"),
    icon: "/ui/icons/youtube.png",
    description: ("Searches YouTube for videos matching your words. Previews the top results."),
    arguments: [{role: "object", nountype: noun_arb_text, label: "query"}],
    previewDelay: 1000,
    preview: function(pblock, {object: {text, summary}}) {
        if (!text) return void this.previewDefault(pblock);

        pblock.text("Searches YouTube for " + text + ".", {it: summary.bold()});
        CmdUtils.previewAjax(pblock, {
            url: "https://www.googleapis.com/youtube/v3/search",
            data: {
                part: "snippet", type: "video", q: text, maxResults: maxSearchResults,
                key: cmdAPI.settings.youtube_search_api_key || "AIzaSyD0NFadBBZ8qJmWMmNknyxeI0EmIalWVeI",
            },
            dataType: "json",
            success: function youtube_success(data) {
                pblock.innerHTML =
                    `<div class="search-result-list">
                       <p>
                         Found <b>${data.pageInfo.totalResults}</b> YouTube Videos matching <b>${summary}</b>
                       </p>
                       ${R(data.items, (entry, entry_index) => 
                         `<div style="clear: both; font-size: small" class="search-result-item">
                           <kbd>${(entry_index < 35) ? (entry_index + 1).toString(36) : "-"}</kbd>.
                           <a style="font-size: small; font-weight:bold"
                              accessKey="${(entry_index < 35) ? (entry_index + 1).toString(36) : "-"}"
                              href="https://www.youtube.com/watch?v=${entry.id.videoId}">
                             <img style="float:left; margin: 0 10px 5px 0; border: none"
                                  src="${entry.snippet.thumbnails.default.url}" />
                             ${entry.snippet.title}
                           </a>
                           <p>
                             ${entry.snippet.description}
                           </p>
                          </div>`)}
                       </div>
                    `;
            },
            error: function youtube_error({statusText}) {
                pblock.innerHTML =
                    "<p class=error>" + Utils.escapeHtml(statusText);
            },
        });
    },
});

CmdUtils.makeSearchCommand({
    name: "images",
    uuid: "3A1A73F1-C651-4AD5-B4B4-2FBAAB85CDD0",
    arguments: [{role: "object", nountype: noun_arb_text, label: "query"}],
    previewDelay: 1000,
    author: {name: "Federico Parodi", email: "getimages@jimmy2k.it"},
    contributor: "satyr",
    homepage: "http://www.jimmy2k.it/getimagescommand",
    license: "MPL",
    icon: "/ui/icons/google.png",
    description: "Browse pictures from Google Images.",
    url: "https://www.google.com/search?tbm=isch&q={QUERY}",
    preview: function gi_preview(pblock, {object: {text: q}}) {
        if (!q) return void this.previewDefault(pblock)

        pblock.innerHTML = "..."
        var data    = {q, start: 0, key: cmdAPI.settings.google_cse_api_key,
            cx: cmdAPI.settings.google_cse_api_id, searchType: "image"}
            , starts  = []
            , options = {
            data,
            url: "https://customsearch.googleapis.com/customsearch/v1",
            error: xhr => {
                pblock.text(`<em class=error>${xhr.status} ${xhr.statusText}</em>`);
            },
            success: (json, status, xhr) => {

                var images = [], info;

                json.items.forEach(item => {
                    let a = document.createElement("a");
                    a.setAttribute("href", item.link);
                    let img = document.createElement("img");
                    img.src = item.link;
                    a.appendChild(img);
                    images.push(a);
                });

                var i = 0
                for (let a of images) {
                    a.id = i;
                    if (i < 32)
                        a.accessKey = String.fromCharCode("a".charCodeAt() + i)
                    let img = a.children[0]
                    ++i
                }

                const range = images.length
                    ? `${data.start + 1} ~ ${data.start + images.length}`
                    : 'x';

                info = info ? info.outerHTML : '';

                pblock.innerHTML =
                    `<style>
                        .navi, .thumbs {text-align: center}
                        .prev, .next {position: absolute}
                        .navi {font-weight: bold}
                        .prev {left:  0}
                        .next {right: 0}
                        .thumbs a {
                          display: inline-block; vertical-align: top; position: relative;
                          margin: 0 1px 2px; padding: 0;
                        }
                        .thumbs a::after {
                          content: attr(accesskey);
                          position: absolute; top: 0; left: 0;
                          padding: 0 4px 2px 3px; border-bottom-right-radius: 6px;
                          opacity: 0.5; color: #fff; background-color: #000;
                          font:bold medium monospace;
                        }
                        img {
                            max-width: 150px;
                            max-height: 150px;
                        }
                     </style>
                     <div class="navi">
                       ${range}
                       <input type="button" class="prev" value="&lt;" accesskey="&lt;"/>
                       <input type="button" class="next" value="&gt;" accesskey="&gt;"/>
                     </div>
                     <!--div class="info">${info}</div-->
                     <div class="thumbs">${R(images.map(a => a.outerHTML),h => h)}</div>
                    `;

                if (!data.start)
                    pblock.querySelector(".prev").disabled = true

                pblock.querySelector(".navi").addEventListener("click", e => {
                    var b = e.target
                    if (b.type !== "button") return
                    e.preventDefault()
                    b.disabled = true
                    if (b.value === "<")
                        data.start = starts.pop() || 0
                    else {
                        starts.push(data.start)
                        data.start += images.length
                    }
                    CmdUtils.previewAjax(pblock, options)
                })

            },
        }
        CmdUtils.previewAjax(pblock, options)
    }
});

const ARTICLE_ERROR = _("Error retrieving summary");

function fetchWikipediaArticle(previewBlock, articleTitle, langCode) {
    var apiUrl = "http://" + langCode + ".wikipedia.org/w/api.php";
    var apiParams = {
        format: "json",
        action: "parse",
        page: articleTitle
    };

    CmdUtils.previewAjax(previewBlock, {
        type: "GET",
        url: apiUrl,
        data: apiParams,
        dataType: "json",
        error: function() {
            previewBlock.innerHTML = "<p class='error'>" + ARTICLE_ERROR + "</p>";
        },
        success: function(responseData) {
            //remove relative <img>s beforehand to suppress
            //the "No chrome package registered for ..." message
            var parse = jQuery(("<div>" + responseData.parse.text["*"])
                .replace(/<img src="\/[^>]+>/g, ""));
            //take only the text from summary because links won't work either way
            var articleSummary = parse.find("p").not(".mw-empty-elt").first().text();
            //remove citations [3], [citation needed], etc.
            articleSummary = articleSummary.replace(/\[.+?\]/g, "");
            //TODO: also remove audio links (.audiolink & .audiolinkinfo)
            //TODO: remove "may refer to" summaries
            var articleImageSrc = (parse.find(".infobox img").attr("src") ||
                parse.find(".thumbimage") .attr("src") || "");
            if (articleImageSrc && articleImageSrc.startsWith("//"))
                articleImageSrc = "https:" + articleImageSrc;
            previewBlock.innerHTML =
                (articleImageSrc &&
                    '<img src="'+ H(articleImageSrc) +'" class="thumbnail"/>') +
                H(articleSummary);
        }
    });
}

CmdUtils.CreateCommand({
    names: ["wikipedia"],
    uuid: "2622CD51-A5D8-4116-8907-06965CFAD53B",
    argument: [
        {role: "object", nountype: noun_arb_text, label: "search term"},
        {role: "format", nountype: noun_type_lang_wikipedia}],
    previewDelay: 1000,
    homepage: "http://theunfocused.net/moz/ubiquity/verbs/",
    author: {name: "Blair McBride", email: "blair@theunfocused.net"},
    contributors: ["Viktor Pyatkovka"],
    license: "MPL",
    icon: "/ui/icons/wikipedia.ico",
    description: "Searches Wikipedia for your words, in a given language.",
    preview: function wikipedia_preview(previewBlock, args) {
        var searchText = args.object?.text?.trim();
        var lang = args.format.html || "English";
        if (!searchText) {
            previewBlock.text(`Searches Wikipedia in ${lang}.`);
            return;
        }
        var previewData = {query: args.object.html};
        previewBlock.text("Searching Wikipedia for <b>" + args.object.text + "</b> ...");
        var apiParams = {
            format: "json",
            action: "query",
            list: "search",
            srlimit: maxSearchResults,
            srwhat: "text",
            srsearch: searchText
        };

        function onerror() {
            previewBlock.innerHTML =
                "<p class='error'>" + _("Error searching Wikipedia") + "</p>";
        }

        var langCode = "en";
        if (args.format && args.format.data)
            langCode = args.format.data;

        var apiUrl = "http://" + langCode + ".wikipedia.org/w/api.php";

        CmdUtils.previewAjax(previewBlock, {
            type: "GET",
            url: apiUrl,
            data: apiParams,
            dataType: "json",
            error: onerror,
            success: function wikipedia_success(searchResponse) {
                if (!("query" in searchResponse && "search" in searchResponse.query)) {
                    onerror();
                    return;
                }

                function generateWikipediaLink(title) {
                    return "http://" + langCode + ".wikipedia.org/wiki/" +
                        title.replace(/ /g, "_")
                }

                (previewData.results = searchResponse.query.search)
                    .forEach(function genKey(o, i) { o.key = i < 35 ? (i+1).toString(36) : "-"});
                previewData._MODIFIERS = {wikilink: generateWikipediaLink};
                previewData.foundMessage =
                    _("Wikipedia articles found matching <b>" + args.object.text + "</b>:");
                previewData.retrievingArticleSummary =
                    _("Retreiving article summary...");
                previewData.noArticlesFound = _("No articles found.");

                previewBlock.innerHTML =
                    `<style>
                        .wikipedia { margin: 0 }
                        .title { clear: left; margin-top: 0.4em }
                        .title a { font-weight: bold }
                        .key:after {content: ":"}
                        .summary { margin: 0.2em 0 0 1em; font-size: smaller }
                        .thumbnail {
                            float: left; max-width: 80px; max-height: 80px; background-color: white;
                            margin-right: 0.2em;
                        }
                    </style>
                    <dl class="wikipedia">
                        ${previewData.foundMessage}
                        ${previewData.results && previewData.results.length
                            ? R(previewData.results, article => 
                                `<dt class="title">
                                    <span class="key">${article.key}</span>
                                    <a href="${generateWikipediaLink(article.title)}" accesskey="${article.key}"
                                      >${article.title}</a>
                                 </dt>
                                 <dd class="summary" wikiarticle="${article.title}">
                                    <i>${previewData.retrievingArticleSummary}</i>
                                 </dd>`)
                            : `<p className='error'>${previewData.noArticlesFound}</p>`
                        }
                    </dl>`;

                jQuery("dd", previewBlock).each(function eachDD() {
                    var article = this.getAttribute("wikiarticle");
                    fetchWikipediaArticle(this, article, langCode);
                });
            }
        });
    },
    execute: function wikipedia_execute(args) {
        var lang = args.format.data || "en";
        var searchUrl = "http://" + lang + ".wikipedia.org/wiki/Special:Search";
        var searchParams = {search: args.object.text};
        Utils.openUrlInBrowser(searchUrl + Utils.paramsToString(searchParams));
    }
});

CmdUtils.CreateCommand({
    name: "maps",
    uuid: "161A4B18-F577-40B9-99DB-B689690E657A",
    arguments: [{role: "object", nountype: noun_arb_text, label: "location"}],
    description: "Shows a location on the map.",
    icon: "/ui/icons/google.png",
    author: "rostok",
    previewDelay: 1000,
    preview: function(pblock, args) {
        if (!args.object?.text) {
            pblock.text("Show objects or routes on google maps.<p>syntax: <pre>\tmaps [place]\n\tmaps [start] to [finish]</pre>");
            return;
        }
        const queryURL = encodeURIComponent(args.object.text);
        pblock.innerHTML = `
            <div class="mapouter">
                <div class="gmap_canvas">
                    <iframe width="546" height="507" id="gmap_canvas" src="https://maps.google.com/maps?q=${queryURL}`
                                                                        + `&t=&z=13&ie=UTF8&iwloc=&output=embed" 
                        frameborder="0" scrolling="no" marginheight="0" marginwidth="0"></iframe>
                </div>
            <style>
                .mapouter {overflow: hidden; text-align: right; height: 507px; width: 546px; margin-top: -3px; margin-left: -7px;}
                .gmap_canvas {overflow: hidden; background: none !important; height: 507px; width:546px;}
            </style>
            </div>`;
    },
    execute: function(args) {
        CmdUtils.addTab("https://maps.google.com/maps?q=" + encodeURIComponent(args.object.text));
    }
});

cmdAPI.makeSearchCommand({
    name: "stackoverflow",
    uuid: "84628A1F-EE72-4429-B16B-E1A4E9AEE50A",
    url: "https://api.stackexchange.com/2.3/search?order=desc&sort=activity&site=stackoverflow&intitle=%s",
    defaultUrl: "https://stackoverflow.com",
    arguments: [{role: "object", nountype: noun_arb_text, label: "query"}],
    icon: "https://stackoverflow.com/favicon.ico",
    description: `Search for answers on <a href="https://stackoverflow.com">stackoverflow.com</a>`,
    previewDelay: 1000,
    parser: {
        type       : "json",
        container  : "items",
        title      : "title",
        href       : "link",
        body       : item => {
        return item.tags.join(", ")
    },
    display: "objectPreviewList"
}
});