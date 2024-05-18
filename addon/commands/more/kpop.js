// These commands are hidden by default and available only through an undocumented easter switch

export const namespace = new CommandNamespace(CommandNamespace.MORE);

namespace.createSearchCommand({
    name: "kpop",
    uuid: "479E0CB6-981C-4485-AA7B-8296AB383EA7",
    url: "https://kpopexplorer.net/?s=%s",
    defaultUrl: "https://kpopexplorer.net",
    arguments: [{role: "object", nountype: noun_arb_text, label: "query"}],
    description: "Search for K-Pop releases.",
    icon: "/commands/more/kpop.png",
    _hidden: true,
    previewDelay: 1000,
    parser: {
        type: "html",
        container  : ".td-ss-main-content .td-cpt-post",
        title      : ".td-module-title a",
        href       : ".td-module-title a",
        thumbnail  : "img.entry-thumb",
        body       : ".td-excerpt",
        maxResults : 20,
        display: "previewList2"
    }
});
