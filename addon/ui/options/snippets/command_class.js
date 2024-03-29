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
    @delay 1000
    @icon http://example.com/favicon.ico
    @homepage http://example.com/my-command
    @description A short description of your command.
    @author Your Name <user@example.com>, Contributor <http://example.com>
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

    /*async*/ preview({OBJECT: {text: query}}, display, storage) {

    }

    /*async*/ execute({OBJECT: {text: query}}, storage) {

    }
}
