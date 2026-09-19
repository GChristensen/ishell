# iShell Extension

A linguistic interface for web browsers.

[iShell](https://gchristensen.github.io/ishell/) is a WebExtensions revival of [Mozilla Ubiquity](https://wiki.mozilla.org/Labs/Ubiquity).
It aims to bring back the full functionality of Ubiquity to Firefox Quantum and to provide a clean, 
unified modern object-oriented command authoring API.

### Why iShell

Most software asks you to find things on the screen. iShell lets you name them instead.

You open the command line, type a few words, and the browser does the work.
It sounds simple. The usability gain is large.

**Words beat pointing.** In *The Humane Interface*, Jef Raskin noted that using a mouse takes two steps.
First you hunt for a target. Then you guide the pointer onto it. By Fitts's law, the smaller and
farther the target, the longer this takes. Reaching for the mouse also breaks the rhythm of a touch typist.
Typing the name of a command skips the hunting and the pointing. You recall a word almost instantly,
and your hands already know the motions.

**You stop typing when the command is clear.** iShell matches verbs fuzzily and shows suggestions as you type.
A few letters are often enough. Commands you use often rise to the top of the list.

**You see the result before you commit.** Commands can show a preview while you type.
You check what is about to happen, then press Enter. Raskin warned that hidden state makes users err.
A visible preview leaves little room for a surprise.

**Commands read like language.** You write `translate hello to german` rather than click through a dialog.
Prepositions mark the arguments, so there are no flags to memorize. Commands can also act on
the text you have selected on the page.

**It is yours to extend.** A command is a small JavaScript class with a comment on top.
Write one in minutes, and the command line grows around the way you work.

The speed of this approach does not come naturally to anyone used to mainstream computer interaction.
You have to train yourself into the habit. Once you have, the mouse becomes the slower option.

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

Some built-in commands (for example, youtube) require API keys of the corresponding
web services. The help links in iShell settings page explain how to obtain them.
The google command does not provide results preview anymore because Google closed
its search API. Use the duck and images commands (powered by DuckDuckGo and Bing)
which do not require keys.

### Credits

* iShell borrows the command parser from the original 
  [Ubiquity](https://github.com/mozilla/ubiquity), more precisely, from its recent
  variation, maintained by [satyr](http://profile.hatena.ne.jp/murky-satyr/).
  Although satyr's repository is not with us anymore, a clone could be found
  [here](https://github.com/GChristensen/ubiquity).
* iShell borrows some code, commands, and innovative features from the 
  [UbiChr](https://github.com/rostok/ubichr) project. UbiChr has encouraged me to create iShell.