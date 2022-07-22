export const namespace = new CommandNamespace(CommandNamespace.UTILITY, true);

const noun_type_archive = {
    "wayback machine latest": ["web.archive.org", "http://web.archive.org/web/"]
    , "wayback machine list": ["web.archive.org", "http://web.archive.org/web/*/"]
    , "google cache": ["google.com", "http://www.google.com/search?q=cache:"]
    , "google cache text only": ["google.com", "http://www.google.com/search?strip=1&q=cache:"]
};

/**
 # Syntax
 - **resurrect** [*URL*] [**with** *archiving service*]

 # Arguments
 - *archiving service* - one of the following archiving services:
     - *wayback machine latest*
     - *wayback machine list*
     - *google cache*
     - *google cache text only*

 # Example
 - **resurrect** *http://en.beijing2008.cn* **with** *wayback machine list*
 
 @command
 @markdown
 @author g/christensen
 @icon /ui/icons/resurrect.gif
 @description Resurrect a dead page using Internet archiving services.
 @uuid 39324f28-48b0-47f5-a22e-fabeb3305705
 */
export class Resurrect {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "url"}; // object
        args[WITH]   = {nountype: noun_type_archive, label: "archiving service"}; // instrument
    }

    preview({OBJECT, WITH: {data: service}}, display) {
        const [_, summary] = this.#getURL(OBJECT);
        service = service || noun_type_archive[Object.keys(noun_type_archive)[0]];

        display.text(`Opens the most recent archived version of <b>${summary}</b> 
                      using the <a href="https://${service[0]}">${service[0]}</a>`);
    }

    execute({OBJECT, WITH: {data: service}}) {
        const [url] = this.#getURL(OBJECT);
        service = service || noun_type_archive[Object.keys(noun_type_archive)[0]];

        cmdAPI.addTab(service[1] + url);
    }

    #getURL(OBJECT) {
        if (OBJECT.text?.startsWith("http"))
            return [OBJECT.text, OBJECT.summary];
        else if (OBJECT.html) {
            const html = $.parseHTML(OBJECT.html);
            const link = $("a", $("<div>").append(html)).attr("href");
            const url = new URL(link, cmdAPI.activeTab?.url).toString();
            return [url, this.#makeSummary(url)];
        }
        else if (cmdAPI.activeTab)
            return [cmdAPI.activeTab.url, this.#makeSummary(cmdAPI.activeTab.url)];

        return ["", ""];
    }

    #makeSummary(text) {
        const maxLength = 35;
        return (text.length > maxLength
            ? text.slice(0, maxLength - 1) + "\u2026"
            : text);
    }
}
