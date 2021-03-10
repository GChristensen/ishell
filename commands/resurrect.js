// Try to resurrect a dead page using Internet archiving services
// The original idea is taken from here: https://gist.github.com/71580

// (C) 2011 g/christensen (gchristnsn@gmail.com)

{

    var resurrect_commandIcon = "/res/icons/resurrect.gif";

    var resurrect_archiveServices =
        {
            "wayback machine latest": ["web.archive.org", "http://web.archive.org/web/"]
            , "wayback machine list": ["web.archive.org", "http://web.archive.org/web/*/"]
            , "google cache": ["google.com", "http://www.google.com/search?q=cache:"]
            , "google cache text only": ["google.com", "http://www.google.com/search?strip=1&q=cache:"]
            , "coralcdn": ["coralcdn.org", function (loc) {
                return loc.split(/\/+/g)[loc.indexOf("://") > 0 ? 1 : 0] + ".nyud.net";
            }]
            , "webcite": ["webcitation.org", "http://webcitation.org/query.php?url="]
        };


    function get_target(input) {
        var params = {};

        if (input.object.text) // Typed-in target or selected URL
        {
            params.location = input.object.text;
        }
        else {
            /* var html = CmdUtils.getHtmlSelection();

             if (html) // Check for a HTML link in the selection
             {
                 var a = jQuery(html).find("a:first").get(0);
                 if (a)
                     params.location = a.href;
             }

             if (CmdUtils.getLocation()) // There is no link
             {
                 var text = CmdUtils.getSelection(); // Try plain text selection

                 if (text)
                 {
                     params.location = text;
                 }
                 else
                 {
                     var doc = CmdUtils.getDocument();
                     if (doc.title)
                     {
                         // Won't be accurate if 404ed, though
                         params.name = doc.title + " (" + doc.location.hostname + ")";
                     }
                     else
                     {
                         params.name = "this page";
                     }

                     params.location = doc.location.href;
                 }
             }*/

            params.location = CmdUtils.getLocation();
        }

        if (!params.name)
            params.name = params.location;

        return params;
    }

    CmdUtils.CreateCommand(
        {
            names: ["resurrect"],
            uuid: "39324f28-48b0-47f5-a22e-fabeb3305705",
            /*---------------------------------------------------------------------------*/
            arguments: [{role: "object", nountype: noun_arb_text, label: "URL"},
                {
                    role: "instrument", nountype: jQuery.map(resurrect_archiveServices,
                        function (v, k) {
                            return k
                        }),
                    label: "archiving service"
                }],
            /*---------------------------------------------------------------------------*/
            description: "Resurrect a dead page using Internet archiving services.",
            /*---------------------------------------------------------------------------*/
            help: `<span class="syntax">Syntax</span><ul class="syntax"><li><b>resurrect</b> [<i>URL</i>] [<b>with</b> <i>archiving service</i>]</li></ul>
                   <span class="arguments">Arguments</span><br>
                   <ul class="syntax"> 
                       <li>- <i>archiving service</i> - one of the following archiving services:
                       <ul class="syntax">
                            <li>- <i>wayback machine latest</i></li>
                            <li>- <i>wayback machine list</i></li>
                            <li>- <i>google cache</i></li>
                            <li>- <i>google cache text only</i></li>
                            <li>- <i>coralcdn</i></li>
                            <li>- <i>webcite</i></li>
                       </ul></li>
                   </ul>
                   <span class="arguments">Example</span>
                   <ul class="syntax"><li><b>resurrect</b> <i>http://en.beijing2008.cn</i> <b>with</b> <i>wayback machine list</i></li></ul>`,
            /*---------------------------------------------------------------------------*/
            icon: resurrect_commandIcon,
            /*---------------------------------------------------------------------------*/
            author: {name: "g/christensen"},
            /*---------------------------------------------------------------------------*/
            builtIn: true, _namespace: "Search",
            /*---------------------------------------------------------------------------*/
            license: "GPL",
            /*---------------------------------------------------------------------------*/
            preview: function (pblock, input) {
                var target = get_target(input);
                var instrument = input.instrument? input.instrument.summary: "";

                if (instrument === "")
                    instrument = (function () {
                        for (first in resurrect_archiveServices)
                            break;
                        return first;
                    })();

                var service = resurrect_archiveServices[instrument][0];

                pblock.innerHTML = _("Opens the most recent archived version of <b>"
                    + target.name + "</b> using the <a href=\"http://"
                    + service + "\">" + service + "</a>");
            },
            /*---------------------------------------------------------------------------*/
            execute: function (input) {
                var target = get_target(input);
                var instrument = input.instrument? input.instrument.summary: "";

                if (instrument == "")
                    instrument = (function () {
                        for (first in resurrect_archiveServices)
                            break;
                        return first;
                    })();

                var handler = resurrect_archiveServices[instrument][1];

                if (typeof handler === "string") {
                    Utils.openUrlInBrowser(handler + target.location);
                }
                else {
                    Utils.openUrlInBrowser(handler(target.location));
                }
            }
        });
}