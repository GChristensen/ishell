// These commands are hidden by default and available only through an undocumented easter switch

import {NS_MORE_COMMANDS} from "./common.js";

{
    const tableTemplate =
        `<table class="nyaa-torrents" border="0" cellpadding="2" cellspacing="2" style="width: 100%">
          <tbody>
            <tr>
              <td class="nyaa-results result-si">nyaa.si: Loading...</td>
            </tr>
            <!--tr>
              <td class="nyaa-results result-net">nyaa.net: Loading...</td>
            </tr-->
          </tbody>
        </table>`;

    const pushTorrent = category => {
         return e => {
             e.preventDefault();
             let link = e.target.parentNode;
             chrome.runtime.sendMessage("torrent-add@firefox", {
                 type: "ADD_TORRENT",
                 url: link.href,
                 folder: category
             });
         };
     };

    const formatResults = (doc, domain, origin, torrentList, columnsToRemove, dlIcon, magnetIcon) => {
        let torrentListTable = $(torrentList, doc);
        torrentListTable.css("width", "100%");

        torrentListTable.find(columnsToRemove).remove();

        torrentListTable.find("td:nth-child(4)").each((i, cell) => {
            if (!/\d+/.test(cell.textContent) || cell.textContent === "0")
                $(cell).parent().remove();
        });

        let rows = torrentListTable.find("tr");

        if (rows.length === 0)
            return null;
        else {
            rows.each((i, row) => {
                row = $(row);
                let title = row.find("td:nth-child(1) a");
                title.text(title.text().substring(0, domain === "www"? 100: 30));
                title.css("color", "var(--nyaa-link-color");
                title.prop("href", `${origin}${title.prop("href")}`);
                $(title).addClass("nyaa-torrent");

                let downloadLinks = row.find("td:nth-child(2)");
                if (downloadLinks.length)
                    downloadLinks.css("white-space", "nowrap");

                let torrentLink = row.find(dlIcon);
                if (torrentLink.length) {
                    torrentLink = torrentLink.parent();
                    if (!torrentLink.prop("href"))
                        torrentLink.remove();
                    else {
                        if (!torrentLink.prop("href").startsWith("http"))
                            torrentLink.prop("href", `${origin}${torrentLink.prop("href")}`);
                        torrentLink.css("text-decoration", "none");
                        torrentLink.css("font-weight", "normal");
                        torrentLink.css("color", "var(--nyaa-icon-color");
                        torrentLink.html("<span class='u-link-download'></span>");
                        torrentLink.attr("data-tlink", "true");
                    }
                }

                let magnetLink = row.find(magnetIcon);
                if (magnetLink.length) {
                    magnetLink = magnetLink.parent();
                    magnetLink.css("text-decoration", "none");
                    magnetLink.css("font-weight", "normal");
                    magnetLink.css("color", "var(--nyaa-icon-color");
                    magnetLink.html("<span class='u-link-magnet'></span>");
                    magnetLink.attr("data-tlink", "true");
                }

                let torrentSize = row.find("td:nth-child(3)");
                torrentSize.css("white-space", "nowrap");
                if (torrentSize.html() === "Unknown")
                    torrentSize.html("?");

                let seeds = row.find("td:nth-child(4)");
                seeds.css("color", "green");

                let peers = row.find("td:nth-child(5)");
                peers.css("color", "red");
            });

            return rows;
        }
    };

    const fetchTorrents = async function (pblock, query, category, domain, server) {
        if (!query)
            return;

        let result = "ok";

        let abortFetch = () => {
            if (this[`${server}-abort-controller`]) {
                this[`${server}-abort-controller`].abort();
                this[`${server}-abort-controller`] = null;
            }
        };

        abortFetch();

        this[`${server}-abort-controller`] = new AbortController();
        const timeout = setTimeout(abortFetch, 20000);

        const origin = `https://${domain}.${server}`;

        const search =
            server === "nyaa.si"
                ? "?f=0&c=0_0&q="
                : "search?c=_&q=";

        const url = `${origin}/${search}${encodeURIComponent(query.trim())}`

        const resultCell = $(`.result-${server.split(".").pop()}`, pblock);

        try {
            const response = await fetch(url, {signal: this[`${server}-abort-controller`].signal});

            if (response.ok) {
                const doc = cmdAPI.parseHtml(await response.text());
                this[`${server}-abort-controller`] = null;
                clearTimeout(timeout);

                let rows;
                if (server === "nyaa.si")
                    rows = formatResults(doc, domain, origin, ".torrent-list",
                          "thead, td:nth-child(1), td:nth-child(5), .comments",
                                   "td:nth-child(2) i.fa-download",
                               "td:nth-child(2) i.fa-magnet");
                else
                    rows = formatResults(doc, domain, origin, ".results table",
                        "thead, td:nth-child(1), td:nth-child(8)",
                                 "td:nth-child(2) .icon-floppy",
                             "td:nth-child(2) .icon-magnet");

                if (rows) {
                    rows.sort(function (a, b) {
                        let aseeds = parseInt($(a).find("td:nth-child(4)").text()),
                            bseeds = parseInt($(b).find("td:nth-child(4)").text());

                        return bseeds - aseeds;
                    });

                    let table = rows.parent();
                    rows.detach().appendTo(table);

                    const resultingHtml = "<br>" + rows.parent().parent().parent().html();

                    resultCell.html(`${server}: ${resultingHtml}`);

                    const clickHandler = pushTorrent(category);
                    resultCell.find("a[data-tlink='true']", ).on("click", clickHandler);
                }
                else
                    resultCell.html(`${server}: NO`);
            }
            else {
                resultCell.html(`${server}: HTTP error ${response.status}`);
                resultCell.addClass("nyaa-error");
                result = "http-error";
            }
        }
        catch (e) {

            if (cmdAPI.fetchAborted(e)) {
                resultCell.html(`${server}: timeout`);
                result = "timeout";
            }
            else {
                resultCell.html(`${server}: network error`);
                result = "network-error";
            }

            resultCell.addClass("nyaa-error");
            console.error(e)
        }

        return result;
    }

    const getReleases = async function(pblock, query, category, domain, progress) {
        if (!query)
            return;

        if (pblock.id === "shell-command-preview") {
            pblock.innerHTML = tableTemplate;
            CmdUtils.loadCSS(this._popupDoc, "__nyaa__", "/commands/more/nyaa.css");
        }

        const fetchNyaaSi = () => fetchTorrents.call(this, pblock, query, category, domain, "nyaa.si", progress);
        //const fetchNyaaNet = () => fetchTorrents.call(this, pblock, query, category, domain, "nyaa.net", progress);

        const nyaaSi = fetchNyaaSi();
        //const nyaaNet = fetchNyaaNet();

        await Promise.all([nyaaSi/*, nyaaNet*/])

        if ((await nyaaSi) === "http-error") {
            await new Promise(resolve => setTimeout(resolve,  1500));
            await fetchNyaaSi();
        }

        const tables = $(".nyaa-results table", pblock);
        const errors = $(".nyaa-torrents .nyaa-error", pblock);

        if (!tables.length && !errors.length) {
            const resultTable = $(".nyaa-torrents", pblock);
            if (pblock.text)
                pblock.text("None");
            else
                resultTable.parent().html("None");
        }

        if (progress)
            progress($(pblock));
    }

    CmdUtils.CreateCommand(
        {
            names: ["nyaa"],
            uuid: "7834AFD7-1F08-443A-956D-17EFD542B34B",
            _namespace: NS_MORE_COMMANDS,
            _hidden: true,
            arguments: [{role: "object", nountype: noun_arb_text, label: "torrent"}],
            previewDelay: 1000,
            description: "Search for anime releases.",
            icon: "/commands/more/nyaa.png",
            init: function (doc) {
                this._popupDoc = doc;
            },
            preview: function (pblock, {object: {text}}) {
                getReleases.call(this, pblock, text, "anime", "www");
            },
            execute: function ({object: {text}}) {
                CmdUtils.addTab("https://www.nyaa.si/?f=0&c=0_0&q=" + encodeURIComponent(text));
            }
        });

    CmdUtils.CreateCommand(
        {
            names: ["sukebei"],
            uuid: "8C6B98D8-FDF6-40DB-891E-B6F44B00ADD1",
            _namespace: NS_MORE_COMMANDS,
            _hidden: true,
            arguments: [{role: "object", nountype: noun_arb_text, label: "torrent"}],
            previewDelay: 1000,
            description: "Search for JAV releases.",
            icon: "/commands/more/sukebei.png",
            init: function (doc) {
                this._popupDoc = doc;
            },
            preview: function (pblock, {object: {text}}) {
                getReleases.call(this, pblock, text, "erotic", "sukebei");
            },
            execute: function ({object: {text}}) {
                CmdUtils.addTab("https://sukebei.nyaa.si/?f=0&c=0_0&q=" + encodeURIComponent(text));
            }
        });
}