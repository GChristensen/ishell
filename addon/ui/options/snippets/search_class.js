/**
    @search
    @command
    @delay 1000
    @icon http://example.com/favicon.ico
    <!-- fetch some JSON from StackOverflow -->
    @parser.url https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=activity&site=stackoverflow&q=%s
    <!-- the url annotation is used to execute the command when parser.url is specified -->
    @url https://stackoverflow.com/search?q=%s
    @parser json
    @container items
    @href link
    @display objectPreviewList
    @description A short description of your command.
    @uuid %%UUID%%
 */
class MySearchCommand {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "query"};
        args[AS] = {nountype: ["quoted"], label: "type"};
    }

    beforeSearch(args) {
        if (args.AS?.text === "quoted")
            args.OBJECT.text = `"${args.OBJECT.text}"`;
        return args;
    }

    parseTitle(item) {
        // automatically parsed items are HTML-escaped, and StackOverflow titles contain HTML,
        // so we are parsing them in a method to avoid escaping
        return item.title;
    }

    parseBody(item) {
        return item.tags.join(", ");
    }
}