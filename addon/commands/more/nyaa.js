// These commands are hidden by default and available only through an undocumented easter switch

import {loadCSS} from "../../utils_browser.js";

export const _namespace = {name: CMD_NS.MORE, annotated: true};

const RESULT_TABLE =
    `<table class="nyaa-torrents" border="0" cellpadding="2" cellspacing="2" style="width: 100%">
      <tbody>
        <tr>
          <td class="nyaa-results result-si">nyaa.si: Loading...</td>
        </tr>
      </tbody>
    </table>`;

class NyaaBase {
    preview({OBJECT: {text}}, display) {
        this.getReleases(display, text, this.__category, this.__domain);
    }

    execute({OBJECT: {text}}) {
        cmdAPI.addTab(`https://${this.__domain}.nyaa.si/?q=${encodeURIComponent(text)}`);
    }

    async getReleases(pblock, query, category, domain, progress) {
        if (!query)
            return;

        if (pblock.id === "shell-command-preview") {
            pblock.innerHTML = RESULT_TABLE;
            loadCSS(pblock.ownerDocument, "__nyaa__", "/commands/more/nyaa.css");
        }

        const fetchNyaaSi = () => this.#fetchReleases(pblock, query, category, domain, "nyaa.si", progress);

        const nyaaSi = fetchNyaaSi();

        await Promise.all([nyaaSi]); // nyaa.net also was here

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

    async #fetchReleases(pblock, query, category, domain, server) {
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

        const search = "?q=";
        const url = `${origin}/${search}${encodeURIComponent(query.trim())}`;

        const resultCell = $(`.result-${server.split(".").pop()}`, pblock);

        try {
            const response = await fetch(url, {signal: this[`${server}-abort-controller`].signal});

            if (response.ok) {
                const doc = cmdAPI.parseHtml(await response.text());
                this[`${server}-abort-controller`] = null;
                clearTimeout(timeout);

                let rows = this.#buildResultTable(doc, domain, origin, ".torrent-list",
                        "thead, td:nth-child(1), td:nth-child(5), .comments",
                        "td:nth-child(2) i.fa-download",
                        "td:nth-child(2) i.fa-magnet");

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

                    const clickHandler = this.#handleAddTorrentTo(category);
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

    #buildResultTable(doc, domain, origin, torrentList, columnsToRemove, dlIcon, magnetIcon) {
        const torrentListTable = $(torrentList, doc);
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
    }

    #handleAddTorrentTo(category) {
        return e => {
            e.preventDefault();
            let link = e.target.parentNode;
            browser.runtime.sendMessage("torrent-add@gchristensen.github.io", {
                type: "ADD_TORRENT",
                url: link.href,
                folder: category
            });
        };
    }
}

/**
 @command
 @delay 1000
 @hidden
 @icon /commands/more/sukebei.png
 @description Search for JAV releases.
 @uuid 8C6B98D8-FDF6-40DB-891E-B6F44B00ADD1
 */
export class Sukebei extends NyaaBase {
    constructor(args) {
        super();
        args[OBJECT] = {nountype: noun_arb_text, label: "release"};
        this.__domain = "sukebei";
        this.__category = "erotic";
    }
}

/**
 @command
 @delay 1000
 @hidden
 @icon /commands/more/nyaa.png
 @description Search for anime releases.
 @uuid 7834AFD7-1F08-443A-956D-17EFD542B34B
 */
export class Nyaa extends NyaaBase {
    constructor(args) {
        super();
        args[OBJECT] = {nountype: noun_arb_text, label: "release"};
        this.__domain = "www";
        this.__category = "anime";
    }
}