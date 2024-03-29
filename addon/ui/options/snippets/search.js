cmdAPI.createSearchCommand({
    name: "my-search-command",
    uuid: "%%UUID%%",
    url: "http://www.example.com/find?q=%s",
    arguments: [{role: "object", nountype: noun_arb_text, label: "query"}],
    description: "A short description of your command.",
    previewDelay: 1000,
    parser: {      // see iShell API Reference for more details
        type       : "html", // result type (also: "json", "xml")
        container  : ".css > .selector", // result item container
        title      : ".css > .selector", // result item title
        href       : ".css > .selector", // result item link
        //thumbnail  : ".css > .selector", // result item thumbnail
        //body       : ".css > .selector", // result item summary
        maxResults : 10,
        //display: "objectPreviewList"
    }
});
