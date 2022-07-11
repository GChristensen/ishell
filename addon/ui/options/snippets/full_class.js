/**
    <!-- Example command help in Markdown -->

    # Syntax
    **my-command** _text_

    # Arguments
    - _text_ - description of the _text_ argument
        - this is a nested list

    # Examples
    **my-command** text

    @command
    @markdown
    @license GPL
    @author Your Name
    @delay 1000
    @icon http://example.com/favicon.ico
    @homepage http://example.com/my-command
    @description A short description of your command.
    @uuid %%UUID%%
 */
class MyCommand {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "text"}; // object
        //args[FOR]    = {nountype: noun_arb_text, label: "text"}; // subject
        //args[TO]     = {nountype: noun_arb_text, label: "text"}; // goal
        //args[FROM]   = {nountype: noun_arb_text, label: "text"}; // source
        //args[NEAR]   = {nountype: noun_arb_text, label: "text"}; // location
        //args[AT]     = {nountype: noun_arb_text, label: "text"}; // time
        //args[WITH]   = {nountype: noun_arb_text, label: "text"}; // instrument
        //args[IN]     = {nountype: noun_arb_text, label: "text"}; // format
        //args[OF]     = {nountype: noun_arb_text, label: "text"}; // modifier
        //args[AS]     = {nountype: noun_arb_text, label: "text"}; // alias
        //args[BY]     = {nountype: noun_arb_text, label: "text"}; // cause
        //args[ON]     = {nountype: noun_arb_text, label: "text"}; // dependency
    }

    //load(storage) {}
    //init(doc /* popup document */, storage) {}

    async preview({OBJECT: {text: query}}, display, storage) {
        if (query) {
            display.text("Querying Stack Overflow...");

            // Get some JSON from Stack Overflow
            const questions = await this.#fetchQuestions(display, query);

            if (questions) {
                // The use of display.objectList() may be a better solution
                const html = this.#generateList(questions.items);
                display.set(html);
            }
            else
                display.error("HTTP request error.");
        }
        else
            this.previewDefault(display);
    }

    execute({OBJECT: {text: query}}, storage) {
        if (query) {
            const queryURL = encodeURIComponent(query);
            cmdAPI.addTab(`https://stackoverflow.com/search?q=${queryURL}`);
        }
    }

    async #fetchQuestions(display, query) {
        const queryURL = encodeURIComponent(query);
        const stackOverflowAPI = "https://api.stackexchange.com/2.3/search";
        const requestURL = `${stackOverflowAPI}?page=10&site=stackoverflow&intitle=${queryURL}`;

        try {
            const response = await cmdAPI.previewFetch(display, requestURL);

            if (response.ok)
                return response.json();
        } catch (e) {
            if (!cmdAPI.fetchAborted(e))
                display.error("Network error.");
            throw e;
        }
    }

    #generateList(questions) {
        return `<ul> 
                ${R(questions, item => // R is a shorthand for cmdAPI.reduceTemplate()
                 `<li><a href="${item.link}">${item.title}</a>
                    <ul>
                      <li>${item.tags.join(", ")}</li>
                    </ul>
                  </li>`)}
                </ul>`;
    }
}