export const namespace = new AnnotatedCommandNamespace(CommandNamespace.SEARCH);

/**
    It is possible to use the <b>as</b> argument with the following values: <i>quoted</i>, <i>site</i>.

    @search
    @command
    @delay 1000
    @parser html
    @parser.url https://html.duckduckgo.com/html/?q=%s
    @container .result
    @title a.result__a
    @href a.result__a
    @body .result__snippet
    @icon /ui/icons/duckduckgo.ico
    @description Searches DuckDuckGo for your words.
    @uuid 31A6DE21-0EDC-42C5-A77B-C547EA31E58C
 */
export class Duck {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "query"};
        args[AS] = {nountype: ["quoted", "site"], label: "type"};
    }

    beforeSearch(args) {
        const alias = args.alias?.text;

        if (alias === "quoted")
            args.object.text = `"${args.object.text}"`;
        else if (alias === "site")
            args.object.text = `${args.object.text} site:${cmdAPI.getLocation()}`;

        return args;
    }

    execute(args) {
        args = this.beforeSearch(args);
        const text = args.OBJECT?.text;
        if (text)
            cmdAPI.addTab(`https://duckduckgo.com/?q=${encodeURIComponent(text)}`);
    }
}
