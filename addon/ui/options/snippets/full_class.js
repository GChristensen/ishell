/**
 <!-- Example command help in Markdown -->

 # Syntax
 **my-command** _input_ **as** _display_

 # Arguments
 - _input_ - description of the _input_ argument
 - _display_ - description of the _display_ argument
 - this is a nested list

 # Examples
 **my-command** _show me_ **as** _popup_

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
        display.text("Querying Stack Overflow...");

        if (query) {
            const queryURL = encodeURIComponent(query);
            const stackOverflowAPI = "https://api.stackexchange.com/2.3/search";
            const requestURL = `${stackOverflowAPI}?page=10&site=stackoverflow&intitle=${queryURL}`;

            // Get some JSON from Stack Overflow
            const response = await cmdAPI.previewFetch(display, requestURL, {_displayError: true});

            if (response.ok) {
                const questions = await response.json();
                const html = this.#generateList(questions.items);
                display.set(html);
            }
        }
        else
            this.previewDefault(display);
    }

    // Generate and display a list of questions, although the use of cmdAPI.objectPreviewList()
    // may be a better solution
    #generateList(questions) {
        return `<ul> 
                ${R(questions, item => // R is a shorthand for cmdAPI.reduceTemplate()
                 `<li><a href="${item.link}">${item.title}</a>
                    <ul>
                      <li>${item.tags.join(",")}</li>
                    </ul>
                  </li>`)}
                </ul>`;
    }

    execute({OBJECT: {text: query}}, storage) {
        if (query) {
            const queryURL = encodeURIComponent(query);
            cmdAPI.addTab(`https://stackoverflow.com/search?q=${queryURL}`);
        }
    }
}