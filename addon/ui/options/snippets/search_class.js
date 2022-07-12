/**
 @search
 @command
 @delay 1000
 @url http://www.example.com/find?q=%s
 @container .css > .selector
 @title .css > .selector
 @href .css > .selector
 @thumbnail .css > .selector
 @results 10
 @description A short description of your command.
 @uuid: %%UUID%%
 */
class MySearchCommand {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "query"};
        args[AS] = {nountype: ["quoted"], label: "modifier"};
    }

    beforeSearch(args) {
        if (args.OBJECT && args.AS?.text === "quoted")
            args.OBJECT.text = `"${args.OBJECT.text}"`;
        return args;
    }

    parseBody(container) {
        const body = container.find(".css > .selector");
        const div = $("<div>").append(body);
        body.css("color", "green");
        return div;
    }
}
