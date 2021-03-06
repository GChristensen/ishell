// These commands are hidden by default and available only through an undocumented easter switch

CmdUtils.makeSearchCommand({
    name: "kpop",
    uuid: "479E0CB6-981C-4485-AA7B-8296AB383EA7",
    url: "http://hulnews.top/?s=%s",
    defaultUrl: "http://hulnews.top",
    arguments: [{role: "object", nountype: noun_arb_text, label: "query"}],
    description: "Search for K-Pop releases.",
    icon: "/commands/more/kpop.png",
    _hidden: true,
    _namespace: NS_MORE_COMMANDS,
    previewDelay: 1000,
    parser: {
        type: "html",
        container  : "article[class*='post']",
        title      : ".title a",
        href       : ".title a",
        thumbnail  : ".featured-thumbnail img",
        body       : ".thetime",
        maxResults : 20,
        display: "previewList2"
    }
});
