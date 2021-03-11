NS_MORE_COMMANDS = "More Commands";

// These commands are hidden by default and available only through an undocumented easter switch

{
    let tableTemplate =
        "<table border='0' cellpadding='2' cellspacing='2' style='width: 100%'>"
        + "  <tbody>"
        + "    <tr>"
        + "      <!--td style='padding-right: 10px; font-weight: bold;'>Nyaa</td-->"
        + "      <td id='table-si'>Nyaa: Loading...</td>"
        + "    </tr>"
        + "    <tr>"
        + "      <!--td style='padding-right: 10px; font-weight: bold;'>Cat</td-->"
        + "      <td id='table-cat'>NyaaPantsu: Loading...</td>"
        + "    </tr>"
        + "  </tbody>"
        + "</table>";

    function pushTorrent(list) {
         return function (e) {
             e.preventDefault();
             let link = e.target.parentNode;
             chrome.runtime.sendMessage("torrent-add@firefox", {type: "ADD_TORRENT", url: link.href,
                 folder: list === "JAV"? "erotic": "anime"});
         };
     }

    function get_releases(pblock, release, list, server) {
        if (!release)
            return;

        let self = this;
        let id_encoded = encodeURIComponent(release.trim());

        if (self._nyaaRequest) {
            self._nyaaRequest.abort();
        }

        let nyaURI = "https://" + server + ".nyaa.si/?f=0&c=0_0&q=" + id_encoded;
        self._nyaaRequest = new XMLHttpRequest();
        self._nyaaRequest.responseType = "document";
        self._nyaaRequest.open("GET", nyaURI, true);
        self._nyaaRequest.onloadend = function (e) {

            if (this.status === 200) {
                let doc = self._nyaaRequest.response;
                let td = pblock.querySelector("#table-si");
                let elt = doc.querySelector("tbody tr");

                if (elt) {
                    elt = doc.querySelector(".torrent-list");
                    let jelt = jQuery(elt);

                    jQuery(doc.querySelector(".torrent-list")).css("width", "100%");

                    jelt.find("thead, td:nth-child(1), td:nth-child(5), .comments").remove();

                    jelt.find("td:nth-child(4)").each((i, cell) => {
                        if (!/\d+/.test(cell.textContent) || cell.textContent == "0")
                            cell.parentElement.parentElement.removeChild(cell.parentElement);
                    });

                    let rows = jelt.find("tr");
                    if (rows.length == 0)
                        elt = null;
                    else {
                        rows.each((i, row) => {
                            let jrow = jQuery(row);
                            let title = jrow.find("td:nth-child(1) a").get(0);
                            title.textContent = title.textContent.substring(0, server === "www"? 100: 60);
                            title.style.color = "#80ccff";
                            title.href = title.href;

                            let dl_links = jrow.find("td:nth-child(2)").get(0);
                            if (dl_links) {
                                dl_links.style.whiteSpace = "nowrap";
                            }

                            let link_t = jrow.find("td:nth-child(2) i.fa-download").get(0);
                            if (link_t) {
                                link_t = link_t.parentNode;
                                link_t.href = link_t.href;
                                $(link_t).css("text-decoration", "none");
                                $(link_t).css("font-weight", "normal");
                                link_t.innerHTML = "<span class='u-link-download'></span>";
                                $(link_t).attr("data-tlink", "true");
                            }

                            let link_m = jrow.find("td:nth-child(2) i.fa-magnet").get(0);
                            if (link_m) {
                                link_m = link_m.parentNode;
                                $(link_m).css("text-decoration", "none");
                                $(link_m).css("font-weight", "normal");
                                link_m.innerHTML = "<span class='u-link-magnet'></span>";
                                link_m.onclick = pushTorrent;
                                $(link_m).attr("data-tlink", "true");
                            }

                            let size = jrow.find("td:nth-child(3)").get(0);
                            size.style.whiteSpace = "nowrap";
                            if (size.innerHTML == "Unknown")
                                size.innerHTML = "?";

                            let seeds = jrow.find("td:nth-child(4)").get(0);
                            seeds.style.color = "green";

                            let peers = jrow.find("td:nth-child(5)").get(0);
                            peers.style.color = "red";

                        });

                        let parent = rows.get(0).parentElement;
                        rows.sort(function (a, b) {
                            let an = parseInt(jQuery(a).find("td:nth-child(4)").get(0).textContent),
                                bn = parseInt(jQuery(b).find("td:nth-child(4)").get(0).textContent);

                            if (an > bn) {
                                return -1;
                            }
                            if (an < bn) {
                                return 1;
                            }
                            return 0;
                        });

                        rows.detach().appendTo(parent);
                    }
                }

                if (td) {
                    td.innerHTML = "Nyaa: " + (elt ? "<br>" + elt.outerHTML : "NO");
                    $(self._doc).find("#table-si a[data-tlink='true']").on("click", pushTorrent(list));
                }
            }

            self._nyaaRequest = null;

        };
        self._nyaaRequest.send();

        if (self._pantsuRequest) {
            self._pantsuRequest.abort();
        }

        let pantsuURI = "https://" + server + ".nyaa.net/search?c=_&s=0&limit=50&userID=0&q=" + id_encoded;
        self._pantsuRequest = new XMLHttpRequest();
        self._pantsuRequest.responseType = "document";
        self._pantsuRequest.open("GET", pantsuURI, true);
        self._pantsuRequest.onloadend = function (e) {

            if (this.status === 200) {
                let doc = self._pantsuRequest.response;
                let td = pblock.querySelector("#table-cat");
                let elt = doc.querySelector("tbody tr");

                if (elt) {
                    elt = doc.querySelector("#torrentListResults").parentElement;
                    let jelt = jQuery(elt);

                    jQuery(doc.querySelector(".results table")).css("width", "100%");

                    jelt.find("thead, td:nth-child(1), td:nth-child(8)").remove();
                    jelt.find("td:nth-child(4)").each((i, cell) => {
                        if (!/\d+/.test(cell.textContent) || cell.textContent == "0")
                            cell.parentElement.parentElement.removeChild(cell.parentElement);
                    });

                    let rows = jelt.find("tr");
                    if (rows.length == 0)
                        elt = null;
                    else {
                        rows.each((i, row) => {
                            let jrow = jQuery(row);

                            let title = jrow.find("td:nth-child(1) a").get(0);
                            title.textContent = title.textContent.substring(0, server === "www"? 100: 60);
                            title.style.color = "#ff8533";
                            title.href = title.href;

                            let link_td = jrow.find("td:nth-child(2)");
                            link_td.css("white-space", "nowrap");

                            let link_t = jrow.find("td:nth-child(2) .icon-floppy");
                            if (link_t) {
                                let a = link_t.get(0).parentNode;
                                a.href = a.href;
                                $(a).css("text-decoration", "none");
                                $(a).css("font-weight", "normal");
                                a.innerHTML = "<span class='u-link-download'></span>";
                                a.onclick = pushTorrent;
                                $(a).attr("data-tlink", "true");
                                if (server !== "www")
                                    a.remove();
                            }

                            let link_m = jrow.find("td:nth-child(2) .icon-magnet");
                            if (link_m) {
                                let a = link_m.get(0).parentNode;
                                $(a).css("text-decoration", "none");
                                $(a).css("font-weight", "normal");
                                a.innerHTML = "<span class='u-link-magnet'></span>";

                                let parent = a.parentNode;
                                parent.removeChild(a);
                                parent.appendChild(a);
                                $(a).attr("data-tlink", "true");
                            }

                            let dlinks = jrow.find("td:nth-child(2)").get(0);
                            dlinks.style.whiteSpace = "nowrapw";

                            jrow.find("td:nth-child(4)").css("color", "green");
                            jrow.find("td:nth-child(5)").css("color", "red");

                            let size = jrow.find("td:nth-child(3)").get(0);
                            size.style.whiteSpace = "nowrap";
                            if (size.innerHTML == "Unknown")
                                size.innerHTML = "?";

                        });

                        let parent = rows.get(0).parentElement;
                        rows.sort(function (a, b) {
                            let an = parseInt(jQuery(a).find("td:nth-child(4)").get(0).textContent),
                                bn = parseInt(jQuery(b).find("td:nth-child(4)").get(0).textContent);

                            if (an > bn) {
                                return -1;
                            }
                            if (an < bn) {
                                return 1;
                            }
                            return 0;
                        });

                        rows.detach().appendTo(parent);
                    }
                }

                if (td) {
                    td.innerHTML = "NyaaPantsu: " + (elt ? "<br>" + elt.outerHTML : "NO");
                    $(self._doc).find("#table-cat a[data-tlink='true']").on("click", pushTorrent(list));
                }

            }

            self._pantsuRequest = null;

        };
        self._pantsuRequest.send();
    }

    CmdUtils.CreateCommand(
        {
            names: ["nyaa"],
            uuid: "7834AFD7-1F08-443A-956D-17EFD542B34B",
            /*---------------------------------------------------------------------------*/
            _namespace: NS_MORE_COMMANDS,
            /*---------------------------------------------------------------------------*/
            _hidden: true,
            /*---------------------------------------------------------------------------*/
            arguments: [{role: "object", nountype: noun_arb_text, label: "torrent"}],
            /*---------------------------------------------------------------------------*/
            previewDelay: 1000,
            /*---------------------------------------------------------------------------*/
            description: "Search for anime releases.",
            /*---------------------------------------------------------------------------*/
            icon: "/commands/more/nyaa.png",
            /*---------------------------------------------------------------------------*/
            _failureMessage: "Error.",
            /*---------------------------------------------------------------------------*/
            _perform_check: get_releases,
            /*---------------------------------------------------------------------------*/
            init: function (doc) {
                this._doc = doc;
            },
            /*---------------------------------------------------------------------------*/
            preview: function (pblock, {object: {text}}) {
                pblock.innerHTML = tableTemplate;
                this._perform_check(pblock, text, "anime", "www");
            },
            /*---------------------------------------------------------------------------*/
            execute: function () {
            }
        });

    CmdUtils.CreateCommand(
        {
            names: ["sukebei"],
            uuid: "8C6B98D8-FDF6-40DB-891E-B6F44B00ADD1",
            /*---------------------------------------------------------------------------*/
            _namespace: NS_MORE_COMMANDS,
            /*---------------------------------------------------------------------------*/
            _hidden: true,
            /*---------------------------------------------------------------------------*/
            arguments: [{role: "object", nountype: noun_arb_text, label: "torrent"}],
            /*---------------------------------------------------------------------------*/
            previewDelay: 1000,
            /*---------------------------------------------------------------------------*/
            description: "Search for JAV releases.",
            /*---------------------------------------------------------------------------*/
            icon: "/commands/more/sukebei.png",
            /*---------------------------------------------------------------------------*/
            _failureMessage: "Error.",
            /*---------------------------------------------------------------------------*/
            _perform_check: get_releases,
            /*---------------------------------------------------------------------------*/
            init: function (doc) {
                this._doc = doc;
                CmdUtils.loadCSS(doc, "__nyaa__", "/commands/more/fontawesome.css");
            },
            /*---------------------------------------------------------------------------*/
            preview: function (pblock, {object: {text}}) {
                pblock.innerHTML = tableTemplate;
                this._perform_check(pblock, text, "JAV", "sukebei");
            },
            /*---------------------------------------------------------------------------*/
            execute: function ({object: {text}}) {
                CmdUtils.addTab("https://sukebei.nyaa.si/?f=0&c=0_0&q=" + encodeURIComponent(text));
            }
        });
}