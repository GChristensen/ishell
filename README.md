# iShell Extension

A linguistic interface for web browsers.

This is a development page. Please visit the main site at: https://gchristensen.github.io/ishell/

iShell is a WebExtensions revival of [Mozilla Ubiquity](https://wiki.mozilla.org/Labs/Ubiquity).
It aims to bring back the full functionality of Ubiquity to Firefox Quantum and provide a clean, 
unified modern object-oriented command authoring API.

### Modern class-based command syntax

Although iShell supports a portion of the command authoring API of the original Ubiquity, 
it offers a new modern object-oriented way to create commands. Let's create a command
named `show-text` with the following syntax:

**show-text** *message text* **in** *destination*

The snippet below shows the class-based command implementation in iShell: 

```javascript
/**
    Displays the given message as a notification or prints it to the browser console.
 
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

    preview({OBJECT: {text: msg}, IN: {text: dest}}, display) {
        const html = `Shows <i>${msg || ""}</i> in <b>${dest || "popup"}</b>`;
        display.set(html);
    }

    execute(args) {
        const destination = args[IN]?.text;
        const message = args[OBJECT]?.text;

        if (destination === "log")
            console.log(message);
        else
            cmdAPI.notify(message);
    }
}
```


iShell will interpret as a command any class with the `@command` annotation in a JavaDoc-style comment.
Plain JavaScript comments are ignored.

Most of the arguments to the CmdUtils.CreateCommand of the legacy Ubiquity is also specified as
annotations. The command help is generated from the rest of the comment text (it
may contain HTML or markdown if the `@markdown` annotation is used). Thus, the
body of the class may provide only fields and methods related to the command
purpose.

In its constructor, the command above defines a nameless `object` argument
containing arbitrary text, along with an argument named `in` which can
take two values: *popup* and *log*. These values will be available for
autocompletion. With the class-based syntax, you do not need to remember
obscure argument roles and just directly use the names of arguments when
defining them or accessing them in methods. 

Please do not use the command constructor for any
purposes other than argument definition and simple field initialization, since
iShell may create the command object multiple times for various reasons. There
are several other functions that are used to initialize commands (see
iShell API reference for
[cmdAPI.createCommand](https://gchristensen.github.io/ishell/addon/ui/options/API.html#create-command)
and explore command templates in the editor).

You may also have noticed that the class preview and execute methods
have the `args` argument always in the first position, and the `pblock` argument is
now called `display`. It still contains a reference to the same `div` element of
iShell preview area (so you can pass it to `cmdAPI.previewAjax`, for example),
but has a new set of methods: `set`, `text`, and `error` method which modify
innerHTML property of the element.

In more detail, the command authoring API is described in the extension
[tutorial](https://gchristensen.github.io/ishell/addon/ui/options/tutorial.html) and
[API reference](https://gchristensen.github.io/ishell/addon/ui/options/API.html).

### IMPORTANT: API keys are necessary for some built-in commands

Some built-in commands (for example, youtube, google, and images) require API keys of
the corresponding web services. Moreover, to use Google commands you need to
create a custom search engine with the options "Search the entire web" and
"Image search" enabled. If the help links in iShell interface provide not enough
guidance on how to set it up, some inspiration could be found in [this
post](https://stackoverflow.com/questions/45899493/configuring-google-custom-search-to-work-like-google-search)
at StackOverflow.

### Manifest v3 status

The addon is successfully ported to manifest v3 as it is
[implemented](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/)
in Firefox Nightly v102, although a helper application is required to evaluate
user-provided commands. To run with MV3 use `manifest.json.mv3`.

### Credits

* iShell borrows the command parser from the original 
  [Ubiquity](https://github.com/mozilla/ubiquity), more precisely, from its recent
  variation, maintained by [satyr](http://profile.hatena.ne.jp/murky-satyr/).
  Although satyr's repository is not with us anymore, a clone could be found
  [here](https://github.com/GChristensen/ubiquity).
* iShell borrows some code, commands, and innovative features from the 
  [UbiChr](https://github.com/rostok/ubichr) project. Actually, it is an 
  independently evolving fork of UbiChr, rewritten from scratch.