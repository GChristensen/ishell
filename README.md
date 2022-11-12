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

### Configuring the build environment

#### Environment setup

1. Install [Python](https://python.org) and make it available through PATH.
2. Install [Node.js](https://nodejs.org) and make it available through PATH.
3. Install [web-ext](https://github.com/mozilla/web-ext) globally.
4. Install [Git](https://git-scm.com/) and make it available through PATH.
5. Install [GNU Make](https://www.gnu.org/software/make/) and make it available through PATH.
6. On Windows, make sure that git shell (sh) is the first shell available on PATH.
7. To sign Firefox version of the add-on, register on [AMO](https://addons.mozilla.org) and get [API credentials](https://addons.mozilla.org/en-US/developers/addon/api/key/).
8. On Windows, create the HOME environment variable set to your home directory (could be anything).
9. Place your credentials in the file $HOME/.amo/creds in the following form:
 
   `--api-key=<your "JWT issuer" value> --api-secret=<your "secret" value>`
10. Create a new debug Firefox profile.

#### Building the add-on

You may need to build your own version of the add-on if you need extra permissions, 
or want to use custom commands in Firefox MV3 version of the add-on.
Because Mozilla [removed](https://bugzilla.mozilla.org/show_bug.cgi?id=1789751) a sole 
workaround that allows to evaluate code dynamically on MV3, it will no longer be possible to 
evaluate commands in the editor on the Firefox MV3 version of the add-on. Forget about instant
evaluation and effortless debugging. Please [thank](https://discourse.mozilla.org) Mozilla 
for this innovation.

To add an extra permission, you need to:
1. Clone the iShell GitHub repository and navigate to its directory in your command shell.
2. Edit the necessary manifest file ending with .mv2 or .mv3. Please do not edit `manifest.json`
   since it is generated by build tools from the files mentioned above.
3. Run `make set-version N.N` to set the add-on
   [version](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/version) for signing.
4. Execute `make sign` to sign the add-on on AMO. Currently, this make target produces MV2 version 
   of the add-on, so it may also be necessary to edit the makefile.

To add a custom command to MV3 iShell on Firefox you need to:

1. Clone the iShell GitHub repository and navigate to its directory in your command shell.
2. Place the JavaScript file with your command in the `addon/commands-user` directory. 
   There are additional requirements to the command syntax. 
   Please see `example.js` at `commands-user`. Do not forget to export command classes
   and noun-type functions.
3. Run `make commands` in your command shell to register the newly added command file in iShell. 
4. Run `web-ext run -p <path your debug Firefox profile> --keep-profile-changes` from
   your command shell to test and debug the command.
5. Run `make set-version N.N` to set the add-on 
   [version](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/version) for signing.
6. Run `make sign` to sign the add-on at AMO. The add-on XPI file will be saved at the `build` directory.
   
   NOTE: currently the `sign` make target produces MV2 version of the add-on. 

### Credits

* iShell borrows the command parser from the original 
  [Ubiquity](https://github.com/mozilla/ubiquity), more precisely, from its recent
  variation, maintained by [satyr](http://profile.hatena.ne.jp/murky-satyr/).
  Although satyr's repository is not with us anymore, a clone could be found
  [here](https://github.com/GChristensen/ubiquity).
* iShell borrows some code, commands, and innovative features from the 
  [UbiChr](https://github.com/rostok/ubichr) project. Actually, it is an 
  independently evolving fork of UbiChr, rewritten from scratch.