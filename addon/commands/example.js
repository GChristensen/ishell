/**
    An example of a dynamically loaded builtin command with object-oriented syntax.
    Files containing all such commands should be declared in dynamic.json manifest.
    Every builtin command should contain a "namespace" annotation, which defines its category
    at the iShell command listing.

    @command
    @namespace iShell
    @description A short description of your command.
    @uuid ACF698E8-B372-48AB-8F67-0DDD587B384E
*/
class ExampleCommand {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "text"};
    }

    preview({OBJECT}, display) {
        display.set("Your input is " + OBJECT?.text + ".");
    }

    execute({OBJECT}) {
        cmdAPI.notify("Your input is: " + OBJECT?.text);
    }
}