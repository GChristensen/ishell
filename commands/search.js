shellSettings.load(settings => {

    let maxSearchResults = settings.max_search_results() || 10;

    CmdUtils.makeSearchCommand({
        name: "google",
        uuid: "61A61D85-07B4-4375-AB42-D635190241EA",
        url: `https://customsearch.googleapis.com/customsearch/v1?key=${cmdAPI.settings.google_cse_api_key}`
           + `&cx=${cmdAPI.settings.google_cse_api_id}&q=%s`,
        _namespace: "Search",
        icon: "/res/icons/google.png",
        description: "Searches Google for your words.",
        arguments: [{role: "object", nountype: noun_arb_text, label: "query"}],
        previewDelay: 1000,
        help: "You can use the keyboard shortcut ctrl + alt + number to open one " +
        "of the Google results shown in the preview.",
        parser: {
            type       : "json",
            container  : "items",
            href       : "link",
            title      : "title",
            body       : "htmlSnippet",
            maxResults : maxSearchResults,
        },
        execute: function({object: {text}}) {
            if (text)
                CmdUtils.addTab(`http://www.google.com/search?q=${encodeURIComponent(text)}`);
        }
    });

    CmdUtils.makeSearchCommand({
        name: "bing",
        uuid: "44FF357D-C3C2-4CB3-91EB-B4E415DC9905",
        url: "http://www.bing.com/search?q=%s",
        defaultUrl: "http://www.bing.com/",
        _namespace: "Search",
        arguments: [{role: "object", nountype: noun_arb_text, label: "query"}],
        previewDelay: 1000,
        icon: "/res/icons/bing.png",
        parser: {
            container: ".b_algo",
            title: "h2 > a",
            body: ".b_caption",
            maxResults: maxSearchResults,
        },
    });

    CmdUtils.makeSearchCommand({
        name: "IMDb",
        uuid: "F34E6A8C-FBBD-4DB2-9999-1B653034D985",
        url: "http://www.imdb.com/find?q=%s",
        defaultUrl: "http://www.imdb.com",
        _namespace: "Search",
        arguments: [{role: "object", nountype: noun_arb_text, label: "query"}],
        previewDelay: 1000,
        icon: "/res/icons/imdb.png",
        parser: {
            container  : ".findResult",
            title      : ".result_text",
            thumbnail  : ".primary_photo",
            maxResults : maxSearchResults,
        },
    });

    CmdUtils.makeSearchCommand({
        names: ["YouTube"],
        uuid: "223E9F19-1DD8-4725-B09C-86EA5DE44DB0",
        url: ("http://www.youtube.com/results?search_type=search_videos" +
            "&search=Search&search_sort=relevance&search_query={QUERY}"),
        icon: "/res/icons/youtube.png",
        description: ("Searches YouTube for videos matching your words. Previews the top results."),
        _namespace: "Search",
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
                    pblock.innerHTML = CmdUtils.renderTemplate(
                        `  <p>
                           Found <b>\${numresults}</b> YouTube Videos matching <b>\${query}</b>
                          </p>
                          {for entry in results}
                          <div style="clear: both; font-size: small">
                           <kbd>\${(+entry_index < 35) ? (+entry_index + 1).toString(36) : "-"}</kbd>.
                           <a style="font-size: small; font-weight:bold"
                              accessKey="\${(+entry_index < 35) ? (+entry_index + 1).toString(36) : "-"}"
                              href="https://www.youtube.com/watch?v=\${entry.id.videoId}">
                           <img style="float:left; margin: 0 10px 5px 0; border: none"
                                src="\${entry.snippet.thumbnails.default.url}" />
                           \${entry.snippet.title}
                           </a>
                           <p>
                              \${entry.snippet.description}
                           </p>
                          </div>
                          {/for}
                        `, {
                            results: data.items,
                            query: summary,
                            numresults: data.pageInfo.totalResults,
                        });
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
        _namespace: "Search",
        previewDelay: 1000,
        author: {name: "Federico Parodi", email: "getimages@jimmy2k.it"},
        contributor: "satyr",
        homepage: "http://www.jimmy2k.it/getimagescommand",
        license: "MPL",
        icon: "/res/icons/google.png",
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
                    pblock.innerHTML = CmdUtils.renderTemplate(
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
                      \${range}
                      <input type="button" class="prev" value="&lt;" accesskey="&lt;"/>
                      <input type="button" class="next" value="&gt;" accesskey="&gt;"/>
                    </div>
                    <!--div class="info">${info}</div-->
                    <div class="thumbs">{for a in images}\${a.outerHTML}{/for}</div>
                    `, {
                            images,
                            info: info ? info.outerHTML : '',
                            range: images.length
                                ? `${data.start + 1} ~ ${data.start + images.length}`
                                : 'x',
                        })

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
                var articleSummary = parse.find("p:first").text();
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
        _namespace: "Search",
        previewDelay: 1000,
        homepage: "http://theunfocused.net/moz/ubiquity/verbs/",
        author: {name: "Blair McBride", email: "blair@theunfocused.net"},
        contributors: ["Viktor Pyatkovka"],
        license: "MPL",
        icon: "/res/icons/wikipedia.ico",
        description: "Searches Wikipedia for your words, in a given language.",
        preview: function wikipedia_preview(previewBlock, args) {
            var searchText = Utils.trim(args.object.text);
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
                        _("Wikipedia articles found matching <b>" + args.object.text + "</b>:", previewData);
                    previewData.retrievingArticleSummary =
                        _("Retreiving article summary...");
                    previewData.noArticlesFound = _("No articles found.");

                    previewBlock.innerHTML = CmdUtils.renderTemplate(
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
                            \${foundMessage}
                            {for article in results}
                            <dt class="title">
                            <span class="key">\${article.key}</span>
                            <a href="\${article.title|wikilink}" accesskey="\${article.key}"
                            >\${article.title}</a>
                            </dt>
                            <dd class="summary" wikiarticle="\${article.title}">
                            <i>\${retrievingArticleSummary}</i>
                            </dd>
                        {forelse}
                        <p class='error'>\${noArticlesFound}</p>
                        {/for}
                        </dl>`,
                        previewData);

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

    // CmdUtils.CreateCommand({
    //     name: "maps",
    //     uuid: "0898F48A-1550-4DA4-B86D-CA7D669E0332",
    //     _namespace: "Search",
    //     description: "Shows a location on the map.",
    //     icon: "/res/icons/google.png",
    //     previewDelay: 1000,
    //     requirePopup: "https://maps.googleapis.com/maps/api/js?sensor=false",
    //     argument: [{role: "object", nountype: noun_arb_text, label: "query"}],
    //     preview: async function mapsPreview(previewBlock, args) {
    //         var GM = CmdUtils.popupWindow.google.maps;
    //
    //         // http://jsfiddle.net/user2314737/u9no8te4/
    //         var text = args.object.text.trim();
    //         if (text=="") {
    //             previewBlock.innerHTML = "Show objects or routes on google maps.<p>syntax: <pre>\tmaps [place] [-l]\n\tmaps [start] to [finish] [-l]\n\n -l narrow search to your location</pre>";
    //             return;
    //         }
    //         cc = "";
    //         if (text.substr(-2)=="-l") {
    //             var geoIP = await CmdUtils.get("http://freegeoip.net/json/"); // search locally
    //             var cc = geoIP.country_code || "";
    //             cc = cc.toLowerCase();
    //             text = text.slice(0,-2);
    //         }
    //         from = text.split(' to ')[0];
    //         dest = text.split(' to ').slice(1).join();
    //         var A = await CmdUtils.get("https://nominatim.openstreetmap.org/search.php?q="+encodeURIComponent(from)+"&polygon_geojson=1&viewbox=&format=json&countrycodes="+cc);
    //         if (!A[0]) return;
    //         CmdUtils.deblog("A",A[0]);
    //         previewBlock.innerHTML = '<div id="map-canvas" style="width:540px;height:505px"></div>';
    //
    //         var pointA = new GM.LatLng(A[0].lat, A[0].lon);
    //         var myOptions = {
    //             zoom: 10,
    //             center: pointA
    //         };
    //         var map = new GM.Map(previewBlock.ownerDocument.getElementById('map-canvas'), myOptions);
    //         var markerA = new GM.Marker({
    //             position: pointA,
    //             title: from,
    //             label: "A",
    //             map: map
    //         });
    //
    //         map.data.addGeoJson(geoJson = {"type": "FeatureCollection", "features": [{ "type": "Feature", "geometry": A[0].geojson, "properties": {} }]});
    //         if (dest.trim()!='') {
    //             var B = await CmdUtils.get("https://nominatim.openstreetmap.org/search.php?q="+encodeURIComponent(dest)+"&polygon_geojson=1&viewbox=&format=json");
    //             if (!B[0]) {
    //                 map.fitBounds( new GM.LatLngBounds( new GM.LatLng(A[0].boundingbox[0],A[0].boundingbox[2]), new GM.LatLng(A[0].boundingbox[1],A[0].boundingbox[3]) ) );
    //                 map.setZoom(map.getZoom()-1);
    //                 return;
    //             }
    //             CmdUtils.deblog("B", B[0]);
    //             var pointB = new GM.LatLng(B[0].lat, B[0].lon);
    //             // Instantiate a directions service.
    //             directionsService = new GM.DirectionsService();
    //             directionsDisplay = new GM.DirectionsRenderer({
    //                 map: map
    //             });
    //             this.markerB = new GM.Marker({
    //                 position: pointB,
    //                 title: dest,
    //                 label: "B",
    //                 map: map
    //             });
    //
    //             // get route from A to B
    //             directionsService.route({
    //                 origin: pointA,
    //                 destination: pointB,
    //                 avoidTolls: true,
    //                 avoidHighways: false,
    //                 travelMode: GM.TravelMode.DRIVING
    //             }, function (response, status) {
    //                 if (status == GM.DirectionsStatus.OK) {
    //                     directionsDisplay.setDirections(response);
    //                 } else {
    //                     window.alert('Directions request failed due to ' + status);
    //                 }
    //             });
    //         }
    //     },
    //     execute: function({object: {text}}) {
    //         if (text.substr(-2)=="-l") text = text.slice(0,-2);
    //         CmdUtils.addTab("http://maps.google.com/maps?q="+encodeURIComponent(text));
    //     }
    // });

    CmdUtils.CreateCommand({
        name: "maps",
        uuid: "161A4B18-F577-40B9-99DB-B689690E657A",
        arguments: [{role: "object", nountype: noun_arb_text, label: "location"}],
        _namespace: "Search",
        description: "Shows a location on the map.",
        icon: "/res/icons/google.png",
        author: "rostok",
        previewDelay: 1000,
        preview: function(pblock, args) {
            if (!args.object?.text) {
                pblock.text("Show objects or routes on google maps.<p>syntax: <pre>\tmaps [place]\n\tmaps [start] to [finish]</pre>");
                return;
            }
            pblock.innerHTML = `
                <div class="mapouter">
                    <div class="gmap_canvas">
                        <iframe width="546" height="507" id="gmap_canvas" src="https://maps.google.com/maps?q=`
                        + encodeURIComponent(args.object.text) + `&t=&z=13&ie=UTF8&iwloc=&output=embed" 
                        frameborder="0" scrolling="no" marginheight="0" marginwidth="0"></iframe>
                    </div>
                <style>
                    .mapouter{overflow:hidden;text-align:right;height:507px;width:546px; margin-top: -3px; margin-left: -7px;}
                    .gmap_canvas {overflow:hidden;background:none!important;height:507px;width:546px;}
                </style>
                </div>`;
        },
        execute: function(args) {
            CmdUtils.addTab("https://maps.google.com/maps?q=" + encodeURIComponent(args.object.text));
        }
    });

    function dayToDate(day) {
        let date;
        switch (day) {
            case "today":
                date = new Date();
                date.setHours(0,0,0,0);
                break;
            case "yesterday":
                date = new Date();
                date.setHours(0,0,0,0);
                date.setDate(date.getDate() - 1);
                break;
            case "week":
                date = new Date();
                date.setHours(0,0,0,0);
                date.setDate(date.getDate() - 7);
                break;
            case "month":
                date = new Date();
                date.setHours(0,0,0,0);
                date.setDate(date.getDate() - 30);
                break;
            default:
                if (day)
                    date = new Date(day + "T00:00:00");
                else {
                    date = new Date();
                    date.setHours(0,0,0,0);
                    date.setDate(date.getDate() - 30);
                }
        }
        return date;
    }


    CmdUtils.CreateCommand({
        name: "history",
        uuid: "128DEB45-F187-4A1F-A74D-566EDAE8DD0F",
        arguments: [{role: "object",   nountype: noun_arb_text, label: "title or url"},
                    {role: "subject",  nountype: /[^\s]+/, label: "url"},
                    {role: "modifier", nountype: noun_type_history_date, label: "day"},
                    {role: "goal",     nountype: noun_type_history_date, label: "day"},
                    {role: "source",   nountype: noun_type_history_date, label: "day"},
                    {role: "cause",    nountype: noun_type_number, label: "amount"}],
        description: "Browsing history search.",
        help:  `<span class="syntax">Syntax</span>
            <ul class="syntax">
                <li><b>history</b> [<i>filter</i>] [<b>for</b> <i>domain</i>] [<b>of</b> <i>day</i>] [<b>from</b> <i>day</i>] [<b>to</b> <i>day</i>] [<b>by</b> <i>amount</i>]</li>
            </ul>
            <span class="arguments">Arguments</span><br>
            <ul class="syntax">
                <li>- <i>filter</i> - arbitrary text, filters history items by title or URL if specified.</li>
            </ul>
            <ul class="syntax">
                <li>- <i>domain</i> - additional filter by URL.</li>
            </ul>
            <ul class="syntax">
                <li>- <i>day</i> - {<b>today</b> | yesterday | week | month | YYYY-MM-DD | MM-DD | DD | D}, specifies date to search history for. </li>
            </ul>
            <ul class="syntax">
                <li>- <i>amount</i> - number, specifies the maximum amount of listed items.</li>
            </ul>
            <span class="arguments">Examples</span>
            <ul class="syntax">
                <li><b>history</b> <i>books</i> <b>from</b> <i>01</i> <b>to</b> <i>10</i></li>
                <li><b>history</b> <i>news</i> <b>for</b> <i>example.com</i> <b>of</b> <i>week</i> <b>by</b> <i>50</i></li>
            </ul>`,
        icon: "/res/icons/history.ico",
        previewDelay: 1000,
        _namespace: "Browser",
        preview: function(pblock, args, {Bin}) {
            let maxResults = args.cause && args.cause.data
                ? args.cause.data
                : shellSettings.max_history_items() || 20;

            let forDomain;

            if (args.subject && args.subject.text)
                forDomain = args.subject.text;

            let startDate = dayToDate(args.modifier.text);

            if (args.source && args.source.text)
                startDate = dayToDate(args.source.text);

            let endDate;
            if (startDate) {
                if (args.modifier && args.modifier.text === "yesterday") {
                    endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 1);
                }
                else
                    endDate = new Date();
            }

            if (args.goal && args.goal.text)
                endDate = dayToDate(args.goal.text);

            chrome.history.search({
                    text: args.object.text,
                    startTime: startDate,
                    endTime: endDate,
                    maxResults: forDomain? maxResults * 2: maxResults
                },
                (historyItems) => {

                    if (!historyItems || historyItems.length === 0) {
                        pblock.text("History is empty.");
                    }
                    else {
                        if (forDomain) {
                            let matcher = new RegExp(forDomain, "i");
                            historyItems = historyItems.filter(hi => !!matcher.exec(hi.url))
                        }

                        //historyItems = historyItems.slice(0, maxResults);

                        CmdUtils.previewList2(pblock, historyItems, {
                            text: ((h) => h.url && !h.title? h.url: h.title),
                            subtext: ((h) => h.url && !h.title? null: h.url),
                            action: (h) =>  chrome.tabs.create({"url": h.url, active: false})
                        });
                    }
               });

        },
        execute: function(args, {Bin}) {
        }
    });



    const LIBGEN_HOST = "http://libgen.is/";
    const LIBGEN_HOST2 = "http://libgen.io/";

    var libgenSearch = {
        // derived from https://github.com/toddpress/Looky_Booky
        getBooks_: () => {},

        getJSONResults: function(pblock, q, getBooks) {
            this.getBooks_ = getBooks;
            CmdUtils.previewAjax(pblock, {
                url: q,
                error: () => {pblock.text("Search error.")},
                success: this.logResults_.bind(this),
                dataType: "html"
            });
        },

        logResults_: function (tab) {
            var //tab = e.target.responseText,
                rHtml = $.parseHTML(tab);
            var key, table;
            for(key in rHtml) {
                if(rHtml[key].nodeName == "TABLE") {
                    if($(rHtml[key]).attr('class') == "c"){
                        table = $(rHtml[key])[0];
                    }
                }
            }
            var bookObjs = this.tableToJSON_(table);
            this.getBooks_(bookObjs);
        },

        tableToJSON_: function(table) {
            let self = this;
            let data = [];
            let $rows = $(table).children("tbody").children("tr").not(":first");

            for (i=0; i<$rows.length; i++){
                let $row = $($rows)[i];
                let $cols = $($row).children("td");
                entry = new Object();
                entry.mirrors = [];
                for (j=0;j<$cols.length; j++){
                    switch(j) {
                        case 1:
                            entry.authors = $cols[j].innerText;
                            break;
                        case 2:
                            let greens = $($cols[j]).find("font[color='green']");
                            greens.each(function () {
                                let green = $(this);
                                if (green.text().indexOf("[") < 0)
                                    green.remove();
                                else
                                    green.attr("style", "font-size: 90%");
                            });

                            let fonts = $($cols[j]).find("font");
                            fonts.each(function () {
                                let font = $(this);
                                font.attr("color", "#45BCFF");
                            });

                            $($cols[j]).find("a:not([id])").remove();
                            let links = $($cols[j]).find("a[id]");
                            links.each(function () {
                                let link = $(this);
                                let href = link.attr("href");
                                link.attr("style", "color: #45BCFF");
                                link.attr("href", self._libgen_host + link.attr("href"));
                            });

                            entry.title = $cols[j].innerHTML
                                .replace("<br>", " ")
                                .replace(/<a/ig, "<span class='libgen'")
                                .replace(/<\/a>/ig, "</span>");
                            entry.link = links.get(0).href;
                            break;
                        case 4:
                            entry.year = $cols[j].innerText;
                            break;
                        case 8:
                            entry.extension = $cols[j].innerText;
                            break;
                        case 9:
                            entry.mirrors = $($cols[j]).find("a");
                            break;
                    }
                }

                entry.details = "";

                if (entry.year)
                    entry.details += entry.year + ", ";

                if (entry.extension)
                    entry.details += entry.extension + ", ";

                if (entry.authors)
                    entry.details += entry.authors;

                data.push(entry);
            }
            return data;
        }
    };


    CmdUtils.CreateCommand({
        name: "libgen",
        uuid: "25DB48B1-0FB6-49FC-8F38-728A1BAF7265",
        arguments: [{role: "object",     nountype: noun_arb_text, label: "text"},
                    {role: "instrument", nountype: ["asc", "desc"], label: "sort mode"}, // with
                    {role: "modifier",   nountype: ["year", "title", "author"], label: "order"}, // of
                    {role: "cause",      nountype: ["25", "50", "100"], label: "amount"}, // by
                    {role: "time",       nountype: ["libgen.is", "libgen.io"], label: "server"}, // at
        ],
        description: "Search Library Genesis",
        help:  `<span class="syntax">Syntax</span>
            <ul class="syntax">
                <li><b>libgen</b> [<i>filter</i>] [<b>of</b> <i>order</i>] [<b>with</b> <i>sort mode</i>] [<b>at</b> <i>server</i>] [<b>by</b> <i>amount</i>]</li>
            </ul>
            <span class="arguments">Arguments</span><br>
            <ul class="syntax">
                <li>- <i>filter</i> - arbitrary text, filters books by title or authors.</li>
            </ul>
            <ul class="syntax">
                <li>- <i>order</i> - {<b>title</b> | <b>author</b> | <b>year</b> }, specifies the column to order by.</li>
            </ul>
            <ul class="syntax">
                <li>- <i>sort mode</i> - {<b>asc</b> | <b>desc</b>}, specifies sort mode.</li>
            </ul>
            <ul class="syntax">
                <li>- <i>server</i> - {<b>libgen.is</b> | <b>libgen.io</b>}.</li>
            </ul>
            <ul class="syntax">
                <li>- <i>amount</i> - {<b>25</b> | <b>50</b> | <b>100</b> }, specifies the maximum amount of listed items.</li>
            </ul>
            <span class="arguments">Examples</span>
            <ul class="syntax">
                <li><b>libgen</b> <i>philosophical investigations</i> <b>of</b> <i>year</i> <b>by</b> <i>50</i> <b>at</b> <i>.io</i></li>
            </ul>`,
        author: "g/christensen",
        icon: "/res/icons/libgen.ico",
        previewDelay: 1000,
        _namespace: "Search",
        _genQuery: function(args) {
            let sort_mode;
            if (args.instrument && args.instrument.text)
                sort_mode = args.instrument.text.toUpperCase();

            let order;
            if (args.modifier && args.modifier.text)
                order = args.modifier.text;

            let amount;
            if (args.cause && args.cause.text)
                amount = args.cause.text;

            let libgen_host = (args.time && args.time.text && args.time.text === "libgen.io")
                ? LIBGEN_HOST2
                : LIBGEN_HOST;

            let query = `${libgen_host}search.php?open=0&view=simple&column=def&req=${args.object.text}`;
            libgenSearch._libgen_host = libgen_host;

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
        },
        preview: function(pblock, args, {Bin}) {
            pblock.text("Searching...");
            let a = this._genQuery(args);

            libgenSearch.getJSONResults(pblock, a, books => {
                if (!books || !books.length) {
                    pblock.text("Not found.");
                }
                else {
                    CmdUtils.previewList2(pblock, books, {
                        text: (b) => b.title,
                        subtext: (b) => b.details,
                        action: (b) =>  chrome.tabs.create({"url": b.link, active: false})
                    });
                }
            });
        },
        execute: function(args, {Bin}) {
            chrome.tabs.create({"url": this._genQuery(args)});
        }
    });


    CmdUtils.CreateCommand({
        name: "scihub",
        uuid: "DC18FEB8-882E-4030-B1B9-F50721877779",
        arguments: [{role: "object", nountype: noun_arb_text, label: "title or doi"}],
        description: "Search articles on SCI-HUB",
        author: "g/christensen",
        icon: "/res/icons/scihub.ico",
        previewDelay: 1000,
        _article: null,
        _namespace: "Search",
        preview: function(pblock, args, {Bin}) {
            pblock.text("Searching...");

            if (args.object && args.object.text)
                CmdUtils.previewAjax(pblock, {
                    method: "POST",
                    url: "https://sci-hub.se",
                    data: {"sci-hub-plugin-check": "", "request": args.object.text},
                    error: e => { pblock.text("Search error.") },
                    success: data => {
                        if (data) {
                            Utils.parseHtml(data, doc => {
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

                                    if (citation.textContent?.trim() === ".") {
                                        citation.innerHTML = "&lt;press &apos;Enter&apos; to open the document&gt;";
                                    }

                                    pblock.text(`<a style="color: #45BCFF" 
                                                       href="${this._article}">${citation.innerHTML}</a>`);
                                }
                                else
                                    pblock.text("Not found.");
                            });
                        }
                        else
                            pblock.text("Error.");
                    },
                    dataType: "html"
                });
            else
                pblock.innerHTML = "";
        },
        execute: function(args, {Bin}) {
            if (this._article) {
                chrome.tabs.create({"url": this._article});
                this._article = null;
            }
        }
    });

});
