# iShell Extension

A natural language interface for web browsers.

This is a development page. Please visit the main site at: https://gchristensen.github.io/ishell/

iShell is the further evolution of [UbiquityWE](https://github.com/GChristensen/ubiquitywe#readme) browser extension.
Its aim is to create a clean, unified modern object-oriented command authoring API. Because major architectural and API 
changes were necessary to accomplish this, it was spawned as a separate project.

### Modern object-oriented command authoring syntax

Although iShell supports the command authoring API of the original Ubiquity (which is described in the extension tutorial at its setting pages),
it offers a new modern object-oriented way to create commands. Let's consider a command named `show-text` with the following syntax:

**show-text** *message text* **in** *destination*

The snippet below shows the object-oriented command implementation in iShell: 

```js
/**
 Displays a given message at popup or prints it to the browser log.
 
 @icon http://example.com/favicon.ico
 @uuid 5BDEFC27-CA9F-4F41-85E4-8B358154E2FC
 @description An object-oriented command with arguments.
 */
class ShowText {
    constructor(args) {
        args[OBJECT] = {nountype: noun_arb_text, label: "message"};
        args[IN] = {nountype: ["popup", "log"], label: "destination"};
    }

    preview(args, display) {
        let html = `Shows <i>${args[OBJECT]?.text}</i> in <b>${args[IN]?.text || "popup"}</b>`;
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

iShell will interpret any class definition placed in the command editor as a command, unless its name starts with an underscore, or it contains `@noncommand`
annotation at its documentation comment. Non-command classes are useful for subclassing of the common functionality.

Most of the arguments to the `CmdUtils.CreateCommand` are now specified as annotations at the command documentation comment. The command help
is generated from the rest of the comment text (it may contain HTML). The body of the class may provide only fields and methods
related to the command purpose.

The command above defines a nameless object argument in its constructor, along with a prepositional argument **in** which can take two values: *popup* and *log*. 
These values will
be available to autocompletion. With the object-oriented syntax you do not need to remember obscure argument role names and just use the names
of arguments themselves when defining them or accessing in methods (although you may access them in the old way if you prefer).
Please do not use the command constructor for any purposes other than argument definition, since iShell may create the command object multiple times for 
various reasons. There are several other functions for command initialization (please, see iShell API reference).

You may also notice that object-oriented methods have the `args` argument always in the first position,
and `pblock` argument is now called `display`. It still contains a reference to the same `div` element
of iShell preview area (so you can pass it to `CmdUtils.previewAjax`, for example),
but has a new nice `set` method which sets element's innerHTML property for you.

Because command editor uses a custom preprocessor to instantiate commands, CmdUtils API (or its modern `cmdAPI` variant) is the only way to create 
built-in commands in the case if you want to hack and rebuild iShell.

### If you came from UbiquityWE

There are several small changes in the non-standard rarely used parts of the command authoring API and builtin command arguments:

* Added new `on` prepositional argument with the role *dependency*.
* `init` method of a command is now called `load`.
* `popup` method of a command is now called `init`.
* `previewList2` API function is now called `objectPreviewList`.   
* Bin interface is now passed directly as the last argument of every standard command method and is no more wrapped in an object. 
* Both **compose** and **email** commands use **at** argument to specify account.

### Builtin command API keys

Some commands (for example, youtube, google, images) are ceased to work in UbiquityWE. In iShell they require API keys
of the corresponding web services. Moreover, to use Google commands you need to create a custom search engine with the options
"Search the entire web" and "Image search" enabled. If the help links in iShell interface provide not enough guidance how
to set it up, you may find some inspiration in [this post](https://stackoverflow.com/questions/45899493/configuring-google-custom-search-to-work-like-google-search)
at StackOverflow.

#### Change Log

[Full changelog](changelog.md)
