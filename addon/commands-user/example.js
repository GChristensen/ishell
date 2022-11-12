// Place JavaScript files with user commands in this directory.
// The syntax is the same as described in the extension tutorial
// with two additional requirements:
// 1. Export the namespace variable from a module as it is shown below.
// 2. Export classes and functions of the annotated commands and noun-types.
// Use the makefile to build the add-on with bundled user commands.

export const namespace = new AnnotatedCommandNamespace("My commands");

/**
    Please, do not forget to export command classes and noun type functions.

    @command
    @description Example of a bundled user command.
    @uuid F741F8DE-D553-482D-A95E-79BEAAD9DB6C
 */
export class Echo {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "text"};
    }

    async preview({OBJECT}, display) {
        display.text("Your input is: " + OBJECT?.text);
    }

    execute({OBJECT}) {
        cmdAPI.notify("Your input is: " + OBJECT?.text);
    }
}
