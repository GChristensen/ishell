// These commands are hidden by default and available only through an undocumented easter switch

import {cmdManager} from "../../cmdmanager.js";

export const _namespace = cmdManager.ns.MORE;

CmdUtils.makeSearchCommand({
    name: "kpop",
    uuid: "479E0CB6-981C-4485-AA7B-8296AB383EA7",
    url: "http://hulkpop.com/?s=%s",
    defaultUrl: "http://hulkpop.com",
    arguments: [{role: "object", nountype: noun_arb_text, label: "query"}],
    description: "Search for K-Pop releases.",
    icon: "/commands/more/kpop.png",
    _hidden: true,
    previewDelay: 1000,
    parser: {
        type: "html",
        container  : "#content .post",
        title      : ".title a",
        href       : ".title a",
        thumbnail  : ".featured-thumbnail img",
        body       : ".post-date-ribbon",
        maxResults : 20,
        display: "previewList2"
    }
});
