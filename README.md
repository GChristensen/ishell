# iShell Extension

A linguistic interface for web browsers.

This is a development page. Please visit the main site at: https://gchristensen.github.io/ishell/

iShell is a WebExtensions revival of [Mozilla Ubiquity](https://wiki.mozilla.org/Labs/Ubiquity).
It aims to bring back the full functionality of Ubiquity to Firefox Quantum and to provide a clean, 
unified modern object-oriented command authoring API.

### Object-oriented command syntax

Although iShell still supports the command authoring API of the original Ubiquity, 
it offers a new object-oriented way to create commands. Let's create a command
named `show-text` with the following syntax:

**show-text** *message text* **in** *destination*

The snippet below demonstrates the class-based command implementation in iShell: 

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
may contain HTML or markdown if the `@markdown` annotation is used).

In its constructor, the command above defines a nameless `object` argument
containing arbitrary text, along with a prepositional argument named `in` which can
take two values: *popup* and *log*. These values will be available for
autocompletion. With the class-based syntax, you do not need to remember
obscure argument roles of Ubiquity and just directly use the names of arguments when
defining them or accessing them in methods. 

The values of the arguments entered by the user are available through the
`args` argument of command event handlers. 
The `display` allows to interact with the command UI. It contains a reference
to the preview block element of the command window HTML markup and provides several helper 
methods.

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

### No more command editor in MV3

You may need to build your own version of the add-on if you need extra manifest permissions,
or want to use custom commands in Firefox MV3 version of the add-on.
Because Mozilla [removed](https://bugzilla.mozilla.org/show_bug.cgi?id=1789751) a sole
workaround that allows to evaluate code dynamically on MV3, it will no longer be possible to
evaluate commands in the built-in editor in the Firefox MV3 version of the add-on. Forget about instant
evaluation and effortless debugging. With MV3, it is necessary to build your own version of the add-on
to add custom commands. Please [thank](https://connect.mozilla.org/t5/ideas/add-an-about-config-switch-that-allows-users-to-customize-their/idi-p/32127) 
Mozilla for this innovation. The [Chrome version](https://chromewebstore.google.com/detail/ishell-extension/hdjdmgedflhjhbflaijohpnognlhacoc?pli=1) 
of the extension can still use the command code editor when built for MV3.

### Credits

* iShell borrows the command parser from the original 
  [Ubiquity](https://github.com/mozilla/ubiquity), more precisely, from its recent
  variation, maintained by [satyr](http://profile.hatena.ne.jp/murky-satyr/).
  Although satyr's repository is not with us anymore, a clone could be found
  [here](https://github.com/GChristensen/ubiquity).
* iShell borrows some code, commands, and innovative features from the 
  [UbiChr](https://github.com/rostok/ubichr) project. UbiChr has encouraged me to create iShell.