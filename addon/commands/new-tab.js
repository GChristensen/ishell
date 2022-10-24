import {sleep} from "../utils.js";
import {settings} from "../settings.js";

export const namespace = new CommandNamespace(CommandNamespace.BROWSER, true);

/**
    # Syntax
    **new-tab** [*url*] [**in** *container*] [**for** {**all** | *pattern*}] [**as** *type*] [**from** *source*]

    # Arguments
    - *url* - an URL to open, optional. If omitted, links are extracted from the active page or selection.
    - *container* - Firefox identity container.
    - *pattern* - a pattern to filter links by. All links are opened if the special keyword **all** is specified.
    - *type* - a pattern type. Can be:
        - *string* - plain string (default).
        - *regex* - regular expression.
    - *source* - the part of a link to apply the pattern to. The both sources are used if omitted. Can be:
        - *url* - apply the pattern to the URL of a link.
        - *text* - apply the pattern to the text of a link.

    # Examples
    - **new-tab** **in** *work*
    - **new-tab** **for** **all** **in** *work*
    - **new-tab** **for** _/thread.php\\?id=\d+$_ **as** *regex*

    @command
    @markdown
    @delay 1000
    @icon /ui/icons/tab_create.png
    @description Opens multiple links extracted from the active page or selection.
    @author g/christensen
    @uuid 12A03E90-FA3B-49C7-BB4F-3301C616915E
*/
export class NewTab {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "URL"}; // object
        args[FOR]    = {nountype: /[^ ]+/, label: "pattern"}; // subject
        //args[TO]     = {nountype: noun_arb_text, label: "text"}; // goal
        args[FROM]   = {nountype: ["url", "text"], label: "source"}; // source
        //args[NEAR]   = {nountype: noun_arb_text, label: "text"}; // location
        //args[AT]     = {nountype: noun_arb_text, label: "text"}; // time
        //args[WITH]   = {nountype: noun_arb_text, label: "text"}; // instrument
        args[IN]     = {nountype: noun_type_container, label: "container"}; // format
        //args[OF]     = {nountype: noun_arb_text, label: "text"}; // modifier
        args[AS]     = {nountype: ["string", "regex"], label: "kind"}; // alias
        //args[BY]     = {nountype: noun_arb_text, label: "text"}; // cause
        //args[ON]     = {nountype: noun_arb_text, label: "text"}; // dependency
    }

    //load(storage) {}
    //init(doc /* popup document */, storage) {}

    async preview(args, display, storage) {
        const links = await this.#extractLinks(args);

        if (links.length)
            display.objectList(`Open in new tabs (${links.length}):`, links, {
                text: l => l.text || l.url,
                subtext: l => l.text? l.url: undefined,
                action: l => cmdAPI.addTab(l.url)
            });
        else {
            let description = "Create a new tab";

            if (args.IN?.text)
                description += ` in the <b>${args.IN.text}</b> identity container`;

            description += ".";

            display.text(description);
        }
    }

    async execute(args, storage) {
        const cookieStoreId = args.IN?.data?.cookieStoreId;
        const links = await this.#extractLinks(args);
        const urls = links.map(link => link.url);

        if (urls.length)
            for (const url of urls)
                try {
                    const tabOptions = {url};

                    if (cookieStoreId)
                        tabOptions.cookieStoreId = cookieStoreId;

                    tabOptions.active = false;

                    await browser.tabs.create(tabOptions);
                }
                catch (e) {
                    console.error(e);
                }
        else {
            const tabOptions = {};

            if (cookieStoreId)
                tabOptions.cookieStoreId = cookieStoreId;

            await browser.tabs.create(tabOptions);
        }
    }

    async #extractLinks(args) {
        let result = [];

        const html = args.OBJECT?.html || cmdAPI.getHtmlSelection();

        if (html) {
            if (html.startsWith("http"))
                result = [{url: html.match(/[^ ]+/)?.[1]}];
            else {
                const pageURL = cmdAPI.getLocation();
                const correctedHTML = cmdAPI.absUrl(html, pageURL);
                const links = $("<div/>").append($.parseHTML(correctedHTML)).find("a");

                result = links.toArray().map(l => ({url: l.href, text: l.textContent}));
                result = this.#filterLinks(result, args);
            }
        }
        else if (args.FOR?.text && cmdAPI.activeTab) {
            result = await cmdAPI.executeScript(cmdAPI.activeTab.id, {func: extractPageLinks, jQuery: true});
            result = result?.[0]?.result;
            result = this.#filterLinks(result, args);
        }

        return result;
    }

    #filterLinks(links, args) {
        let result = [];

        if (args.FOR?.text) {
            if (args.FOR.text === "all")
                result = links;
            else if (args.FROM?.text === "text")
                result = this.#filterBy("text", links, args);
            else if (args.FROM?.text === "url")
                result = this.#filterBy("url", links, args);
            else
                result = [
                    ...this.#filterBy("text", links, args),
                    ...this.#filterBy("url", links, args)
                ];
        }
        else
            result = links;

        result = result.filter((l, i, a) => this.#indexByURL(a, l.url) === i); // distinct

        return result;
    }

    #filterBy(prop, links, args) {
        const regex = args.AS?.text === "regex";
        const pattern = regex? new RegExp(args.FOR.text, "i"): args.FOR.text.toLowerCase();
        let result = [];

        if (regex)
            result = links.filter(l => !!pattern.exec(l[prop]));
        else
            result = links.filter(l => l[prop].toLowerCase().includes(pattern));

        return result;
    }

    #indexByURL(links, url) {
        for (let i = 0; i < links.length; ++i) {
            if (links[i].url === url)
                return i;
        }
    }
}

function extractPageLinks() {
    const links = $("a");

    return links.toArray().map(l => ({url: l.href, text: l.textContent}));
}
