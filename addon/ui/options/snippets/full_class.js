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

    async preview({OBJECT}, display, storage) {
        if (!OBJECT?.text) {
            this.previewDefault(display);
            return;
        }

        // display the initial html markup of the requested page
        if (/^https?:\/\/.+/.test(OBJECT?.text))
            try {
                let response = await cmdAPI.previewFetch(display, OBJECT?.text);

                if (response.ok) {
                    let html = await response.text();

                    if (html) {
                        html = html.substring(0, 500);
                        display.set(`Request response: <br>${cmdAPI.escapeHtml(html)}...`);
                    }
                    else
                        display.text("<i>Response is empty.</i>");
                }
                else
                    display.error("HTTP request error.");
            }
            catch (e) {
                if (!cmdAPI.fetchAborted(e)) // skip preview change if previewFetch was aborted
                    display.error("Network error.");
            }
        else
            display.text("Invalid URL.");
    }

    execute(args, storage) {
        cmdAPI.notify("You loaded: " + OBJECT?.text);
    }
}