/**
    Command help text

    @command
    @description A short description of your command.
    @uuid %%UUID%%
 */
class MySimpleCommand {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "text"};
    }

    preview({OBJECT}, display) {
        display.text("Your input is " + OBJECT?.text + ".");
    }

    execute({OBJECT}) {
        cmdAPI.notify("Your input is: " + OBJECT?.text);
    }
}
