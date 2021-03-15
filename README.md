# iShell Extension

A natural language interface for web browsers.

This is a development page. Please visit the main site at: https://gchristensen.github.io/ishell/

iShell is the further evolution of [UbiquityWE](https://github.com/GChristensen/ubiquitywe#readme) browser extension.
Its aim is to create a clean, unified modern object-oriented command authoring API. Because major architectural and API 
changes were necessary to accomplish this, it was spawned as a separate project.

### Modern object-oriented command syntax

Although iShell supports the command authoring API of the original Ubiquity (which is described in the extension [tutorial](https://gchristensen.github.io/ishell/res/tutorial.html)),
it offers a new modern object-oriented way to create commands. Let's consider a command named `show-text` with the following syntax:

**show-text** *message text* **in** *destination*

The snippet below shows the object-oriented command implementation in iShell: 

```js
/**
    Displays the given message at a popup or prints it to the browser log.
 
     @command
     @icon http://example.com/favicon.ico
     @uuid 5BDEFC27-CA9F-4F41-85E4-8B358154E2FC
     @description An object-oriented command with arguments.
 */
class ShowText {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "message"};
        args[IN] = {nountype: ["popup", "log"], label: "destination"};
    }

    preview({OBJECT, IN}, display) {
        let html = `Shows <i>${OBJECT?.text}</i> in <b>${IN?.text || "popup"}</b>`;
        display.set(html);
    }

    execute(args) {
        let destination = args[IN]?.text;
        let message = args[OBJECT]?.text;

        if (destination === "log")
            console.log(message);
        else
            cmdAPI.notify(message);
    }
}
```

iShell will interpret as a command any class placed in the command editor with the `@command` annotation. JavaDoc-style comments should be
used to annotate classes (plain JavaScript comments are ignored).

Most of the arguments to the `CmdUtils.CreateCommand` are also specified as annotations. The command help
is generated from the rest of the comment text (it may contain HTML). Thus, the body of the class may provide only fields and methods
related to the command purpose.

In its constructor the command above defines a nameless `object` argument containing arbitrary text, along with a prepositional argument `in` 
which can take two values: *popup* and *log*. 
These values will
be available to autocompletion. With the object-oriented syntax you do not need to remember obscure argument roles and just directly use the names
of arguments when defining them or accessing them in methods (although you may access arguments in the old way if you prefer).
Please do not use the command constructor for any purposes other than argument definition and simple field initialization,
since iShell may create the command object multiple times for 
various reasons. There are several other functions that are used to initialize commands 
(please, see iShell API reference for [cmdAPI.createCommand](https://gchristensen.github.io/ishell/res/API.html) and explore command templates in the editor).

You may also notice that object-oriented methods have the `args` argument always in the first position,
and `pblock` argument is now called `display`. It still contains a reference to the same `div` element
of iShell preview area (so you can pass it to `CmdUtils.previewAjax`, for example),
but has a new nice `set` method which sets element's innerHTML property for you.

In the case if you want to hack and rebuild iShell, you need to declare files
with builtin object-oriented commands at the commands/dynamic.json manifest, 
because the new syntax uses a custom preprocessor for command instantiation.

### Builtin command API keys

Some builtin commands (for example, youtube, google, images) are ceased to work in UbiquityWE. In iShell they require API keys
of the corresponding web services. Moreover, to use Google commands you need to create a custom search engine with the options
"Search the entire web" and "Image search" enabled. If the help links in iShell interface provide not enough guidance how
to set it up, you may find some inspiration in [this post](https://stackoverflow.com/questions/45899493/configuring-google-custom-search-to-work-like-google-search)
at StackOverflow.

#### Change Log

See [version history at AMO](https://addons.mozilla.org/en-US/firefox/addon/ishell/versions/).
