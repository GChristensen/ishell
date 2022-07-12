import {settings} from "../settings.js";

export const namespace = new CommandNamespace(CommandNamespace.SEARCH, true);

/**
    @search
    @command
    @delay 1000
    @container .lister-item
    @icon /ui/icons/imdb.png
    @url https://www.imdb.com/search/title/?title=%s
    @description Searches IMDB for movies.
    @uuid F34E6A8C-FBBD-4DB2-9999-1B653034D985
 */
export class Imdb {
    parseTitle(container) {
        const header = container.find(".lister-item-header");
        header.find(".lister-item-index").remove();
        return header;
    }

    parseThumbnail(container) {
        const thumb = container.find("img.loadlate").first().attr("loadlate");
        return $(`<img src="${thumb}"/>`);
    }

    parseBody(container) {
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
    }
}

/**
    @command
    @delay 1000
    @author Blair McBride
    @icon /ui/icons/wikipedia.ico
    @description Searches Wikipedia for your words, in a given language (by the <b>in</b> argument).
    @uuid 2622CD51-A5D8-4116-8907-06965CFAD53B
 */
export class Wikipedia {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "search term"}; // object
        args[IN]     = {nountype: noun_type_lang_wikipedia, label: "language"}; // format
    }

    ARTICLE_ERROR = _("Error retrieving summary");

    preview(args, previewBlock) {
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
            srlimit: settings.max_search_results(),
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
        const cmd = this;

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
                    .forEach(function genKey(o, i) {
                        o.key = i < 35? (i + 1).toString(36): "-"
                    });
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
                    cmd.fetchWikipediaArticle(this, article, langCode);
                });
            }
        });
    }

    execute(args) {
        var lang = args.format.data || "en";
        var searchUrl = "http://" + lang + ".wikipedia.org/wiki/Special:Search";
        var searchParams = {search: args.object.text};
        Utils.openUrlInBrowser(searchUrl + Utils.paramsToString(searchParams));
    }

    fetchWikipediaArticle(previewBlock, articleTitle, langCode) {
        var apiUrl = "http://" + langCode + ".wikipedia.org/w/api.php";
        var apiParams = {
            format: "json",
            action: "parse",
            page: articleTitle
        };

        const cmd = this;
        CmdUtils.previewAjax(previewBlock, {
            type: "GET",
            url: apiUrl,
            data: apiParams,
            dataType: "json",
            error: function() {
                previewBlock.innerHTML = "<p class='error'>" + cmd.ARTICLE_ERROR + "</p>";
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
}

/**
    @search
    @command
    @delay 1000
    @parser json
    @container items
    @title title
    @href link
    @display objectPreviewList
    @icon https://stackoverflow.com/favicon.ico
    @url https://api.stackexchange.com/2.3/search?order=desc&sort=activity&site=stackoverflow&intitle=%s
    @description Search for questions on <a href="https://stackoverflow.com">stackoverflow.com</a>.
    @uuid 84628A1F-EE72-4429-B16B-E1A4E9AEE50A
 */
export class Stackoverflow {
    parseBody(item) {
        return item.tags.join(", ")
    }
}