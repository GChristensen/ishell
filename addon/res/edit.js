const SHELL_SETTINGS = "shell-settings";

scriptNamespace = "default";

// inserts stub (example command)
function insertExampleStub() {

    if (scriptNamespace === SHELL_SETTINGS)
        return;

    var stubs = {
        'insertsimplecommandstub':
            `cmdAPI.createCommand({
    name: "my-simple-command",
    uuid: "%%UUID%%",
    arguments: [{role: "object", nountype: noun_arb_text, label: "text"}],
    description: "A short description of your command.",
    preview: function(pblock, {object: {text}}) {
        pblock.innerHTML = "Your input is " + text + ".";
    },
    execute: function({object: {text}}) {
        cmdAPI.notify("Your input is: " + text);
    }
});`,

        'insertsimpleobjectcommandstub':
`/**
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
}`,

  'insertcommandstub':
`cmdAPI.createCommand({
    name: "my-command",
    uuid: "%%UUID%%",
    arguments: [{role: "object",     nountype: noun_arb_text, label: "text"},
              //{role: "subject",    nountype: noun_arb_text, label: "text"}, // for
              //{role: "goal",       nountype: noun_arb_text, label: "text"}, // to
              //{role: "source",     nountype: noun_arb_text, label: "text"}, // from
              //{role: "location",   nountype: noun_arb_text, label: "text"}, // near
              //{role: "time",       nountype: noun_arb_text, label: "text"}, // at
              //{role: "instrument", nountype: noun_arb_text, label: "text"}, // with
              //{role: "format",     nountype: noun_arb_text, label: "text"}, // in
              //{role: "modifier",   nountype: noun_arb_text, label: "text"}, // of
              //{role: "alias",      nountype: noun_arb_text, label: "text"}, // as
              //{role: "cause",      nountype: noun_arb_text, label: "text"}, // by
              //{role: "dependency", nountype: noun_arb_text, label: "text"}, // on
    ],
    description: "A short description of your command.",
    help: "This text is displayed at the command list page.",
    author: "Your Name",
    icon: "http://example.com/favicon.ico",
    previewDelay: 1000,
    //load: function(storage) {},
    //init: function(doc /* popup document */, storage) {},
    preview: function(pblock, args, storage) {
        if (!args.object?.text) {
            this.previewDefault(pblock);
            return;
        }
    
        // display the initial html markup of the requested page
        if (/^https?:\\/\\/.*/.test(args.object.text))  
            cmdAPI.previewAjax(pblock, {
                url: args.object.text,
                dataType: "html",
                success: function(data) {
                    if (data) {
                        let html = data.substring(0, 500); 
                        pblock.innerHTML = "Request response: <br>" + cmdAPI.escapeHtml(html) + "...";
                    }
                    else
                        pblock.innerHTML = "Response is empty.";
                },
                error: function() {
                    pblock.innerHTML = "HTTP request error.";
                }
            });  
        else
            pblock.innerHTML = "Invalid URL.";
            
    },
    execute: function(args, storage) {
        cmdAPI.notify("Your input is: " + args.object.text);
    }
});`,

        'insertobjectcommandstub':
`/**
    <!-- Example command help in Markdown -->
    
    # Syntax
    **my-command** _input_ **as** _display_

    # Arguments
    - _input_ - description of the _input_ argument
    - _display_ - description of the _display_ argument
        - this is a nested list
        
    # Examples
    **my-command** _show me_ **as** _popup_
    
    @command
    @markdown
    @license GPL
    @author Your Name
    @delay 1000
    @icon http://example.com/favicon.ico
    @homepage http://example.com/my-command
    @description A short description of your command.
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
    
    async preview({OBJECT}, display, storage) {
        if (!OBJECT?.text) {
            this.previewDefault(display);
            return;
        }
        
        // display the initial html markup of the requested page
        if (/^https?:\\/\\/.+/.test(OBJECT?.text))
            try {
                let response = await cmdAPI.previewFetch(display, OBJECT?.text);
                
                if (response.ok) {
                    let html = await response.text();
                    
                    if (html) {
                        html = html.substring(0, 500); 
                        display.set(\`Request response: <br>\${cmdAPI.escapeHtml(html)}...\`);
                    }
                    else
                        display.text("<i>Response is empty.</i>");
                }
                else 
                    display.error("HTTP request error.");
            }
            catch (e) {
                if (!cmdAPI.fetchAborted(e)) // skip preview change if previewFetch was aborted
                    display.error("Network error.");
            }
        else
            display.text("Invalid URL.");
    }
    
    execute(args, storage) {
        cmdAPI.notify("You loaded: " + OBJECT?.text);
    }
}`,

        'insertsearchstub': // simple search / preview command (e. g. using ajax)
`cmdAPI.makeSearchCommand({
    name: "my-search-command",
    uuid: "%%UUID%%",
    url: "http://www.example.com/find?q=%s",
    defaultUrl: "http://www.example.com",
    arguments: [{role: "object", nountype: noun_arb_text, label: "query"}],
    icon: "http://example.com/favicon.ico",
    previewDelay: 1000,
    parser: {      // see iShell API Reference for more details
        type       : "html", // result type (also: "json", "xml")
        container  : ".css > .selector", // result item container
        title      : ".css > .selector", // result item title
        href       : ".css > .selector", // result item link
      //thumbnail  : ".css > .selector", // result item thumbnail
      //body       : ".css > .selector", // result item summary
        maxResults : 10,
      //display: "objectPreviewList"
    }
});`,


        'insertcapturestub': // capture pages to Scrapyard
`cmdAPI.makeCaptureCommand({  // Capture the current tab to Scrapyard
    name: "my-capture-command",
    uuid: "%%UUID%%",
    type: "archive",  // also "bookmark"
    path: "My Shelf/My Folder",  // default path of the bookmark or archive
 // tags: "my,tags",  // default tags
 // todo: "TODO",  // also "WAITING", "POSTPONED", etc...
 // due: "YYYY-MM-DD",  // todo deadline
 // details: "bookmark details",  // arbitrary text
 // selector: ".article-body",  // capture only elements matching the selectors
 // filter: ".ads,video",  // remove elements matched by the filter selectors
 // style: "body {padding: 0;}"  // add custom CSS style
});`
    };

    let templateId = this.id;

    if (shellSettings.template_syntax() === "class") {
        if (this.id === "insertsimplecommandstub")
            templateId = "insertsimpleobjectcommandstub";
        else if (this.id === "insertcommandstub")
            templateId = "insertobjectcommandstub";
    }

    var stub = stubs[templateId];

    if (shellSettings.template_syntax() === "CmdUtils") {
        stub = stub.replace("cmdAPI.createCommand", "CmdUtils.CreateCommand");
        stub = stub.replace("cmdAPI.escapeHtml", "Utils.escapeHtml");
        stub = stub.replace(/cmdAPI/g, "CmdUtils");
    }

    //editor.replaceRange(stub, editor.getCursor());
    editor.session.insert(editor.getCursorPosition(), stub.replace("%%UUID%%", UUID.generate()));

    //editor.setValue( stub + editor.getValue() );
    //saveScripts();
    editor.focus();
    return false;
}

let preprocessor = new CommandPreprocessor(CommandPreprocessor.CONTEXT_CUSTOM);

// evaluates and saves scripts from editor
async function saveScript() {
    var customcode = editor.getSession().getValue();

    if (scriptNamespace === SHELL_SETTINGS) {
        let settings;
        try {
            settings = JSON.parse(customcode)
        }
        catch (e) {
            console.error(e)
            return;
        }

        if (settings)
            await browser.storage.local.set(settings);
        else
            await browser.storage.local.clear();
    }
    else {
        // save
        await DBStorage.saveCustomScript(scriptNamespace, customcode);

        // eval
        if (_MANIFEST_V3)
            await evalMV3(customcode);
        else
            await evalMV2(customcode);
    }
}

async function evalMV2(customcode) {
    try {
        const code = preprocessor.run(customcode);
        CmdUtils.eval(code);

        $("#info").html("Evaluated!");

        await CmdManager.loadCustomScripts(scriptNamespace);
    } catch (e) {
        displayError(e.message);
    }
}

async function evalMV3(customcode) {
    const code = preprocessor.run(customcode);
    const result = await CmdUtils.eval(code);

    result.error.then(() => {
        $("#info").html("Evaluated!");
        CmdManager.loadCustomScripts(scriptNamespace);
    })
    .catch(error => {
        displayError(error.message);
    });
}

function displayError(message) {
    $("#info").html("<span style='background-color: red; color: white;'>&nbsp;" + message + "&nbsp;</span>");
}

async function initEditor(settings) {
    await initializeIShellAPI();

    if (_MANIFEST_V3) {
        try {
            const helperApp = await browser.runtime.sendMessage({type: "CHECK_HELPER_APP_AVAILABLE"});
            if (!helperApp)
                $("#helper-app-warn").show();
        } catch (e) {
            console.error(e);
        }
    }

    let lastNamespace = settings.last_editor_namespace();

    scriptNamespace =  window.location.search
        ? decodeURI(window.location.search.substring(1))
        : (lastNamespace? lastNamespace: "default");

    editor = ace.edit("code");
    editor.getSession().setUseWorker(false);
    editor.setTheme("ace/theme/monokai");
    editor.getSession().setMode("ace/mode/javascript");
    editor.getSession().setUseSoftTabs(true);
    editor.getSession().setTabSize(4);
    editor.setPrintMarginColumn(120);

    editor.commands.addCommand({
        name: "Save",
        exec: saveScript,
        bindKey: {mac: "cmd-s", win: "ctrl-s"}
    });

    $(window).on('resize', e => {
        editor.container.style.height = $(window).innerHeight() - $("#header").height() - $("#footer").height() - 16;
        editor.resize();
    });
    $(window).resize();

    function editScript(script) {
        editor.setValue(script || "", -1);
        editor.getSession().setUndoManager(new ace.UndoManager())
    }

    $("#upload").click((e) => {
        $("#file-picker").click();
    });

    $("#file-picker").change((e) => {
        if (e.target.files.length > 0) {
            let reader = new FileReader();
            reader.onload = function(e) {
                editor.getSession().setValue(e.target.result);
            };
            reader.readAsText(e.target.files[0]);
        }
    });

    $("#download").click(async (e) => {
        // download link
        let file = new Blob([editor.getSession().getValue()], {type: "application/javascript"});
        let url = URL.createObjectURL(file);
        let filename = scriptNamespace + (scriptNamespace === SHELL_SETTINGS ? ".json" : ".js");

        let download = await browser.downloads.download({url: url, filename: filename, saveAs: true});

        let download_listener = delta => {
            if (delta.id === download && delta.state && delta.state.current === "complete") {
                browser.downloads.onChanged.removeListener(download_listener);
                URL.revokeObjectURL(url);
            }
        };
        browser.downloads.onChanged.addListener(download_listener);
    });

    $("#create-namespace").click(async () => {
        if (scriptNamespace === SHELL_SETTINGS)
            return;

        let name = prompt("Create category: ");
        if (name) {
            ADD_NAME: {
                await saveScript();

                let namespaces = await DBStorage.fetchCustomScriptNamespaces();

                for (let n of namespaces) {
                    if (n.toLowerCase() == name.toLowerCase()) {
                        scriptNamespace = n;
                        $("#script-namespaces").val(n);

                        let record = await DBStorage.fetchCustomScripts(scriptNamespace);
                        editScript(record?.script);

                        break ADD_NAME;
                    }
                }

                const builtin = CmdManager.commands.some(c => c._namespace === name && c._builtin);
                if (builtin) {
                    CmdUtils.notify("A builtin category with the same name already exists.");
                    break ADD_NAME;
                }

                scriptNamespace = name;
                editor.getSession().setValue("");
                editor.getSession().setUndoManager(new ace.UndoManager())
                $("#script-namespaces").append($("<option></option>")
                    .attr("value", name)
                    .text(name))
                    .val(name);
                settings.last_editor_namespace(scriptNamespace);
            }
        }
    });

    $("#delete-namespace").click(async () => {
        if (scriptNamespace !== "default" && scriptNamespace !== SHELL_SETTINGS)
            if (confirm("Do you really want to delete \"" + scriptNamespace + "\"?")) {
                await DBStorage.deleteCustomScript(scriptNamespace);
                $('option:selected', $("#script-namespaces")).remove();

                scriptNamespace = $("#script-namespaces").val();
                settings.last_editor_namespace(scriptNamespace);

                let record = await DBStorage.fetchCustomScripts(scriptNamespace);
                editScript(record?.script);
            }
    });

    $("#expand-editor").click(() => {
        if ($("#expand-editor img").prop("src").endsWith("/res/icons/collapse.png")) {
            $("#panel").css("width", "870px");
            $("body").css("margin", "auto");
            $("body").css("max-width", "900px");
            $("#toolbar").css("padding-right", "30px");
            $(".head, #nav-container, #head-br").show();
            $("#expand-editor img").prop("src", "/res/icons/expand.png");
        }
        else {
            $(".head, #nav-container, #head-br").hide();
            $("#panel").css("width", "100%");
            $("body").css("margin", "0");
            $("body").css("max-width", "100%");
            $("#toolbar").css("padding-right", "5px");
            $("#expand-editor img").prop("src", "/res/icons/collapse.png");
        }
        window.dispatchEvent(new Event('resize'));
        editor.focus();
    });

    $("#insertsimplecommandstub").click(insertExampleStub);
    $("#insertcommandstub").click(insertExampleStub);
    $("#insertsearchstub").click(insertExampleStub);
    $("#insertcapturestub").click(insertExampleStub);

    $("#syntax-types").val(settings.template_syntax() || "class");

    $("#syntax-types").change(() => {
        settings.template_syntax($("#syntax-types").val());
    });

    if (settings.scrapyard_presents()) {
        $("#capture-stub").show();
    }

    // load scrtips

    if (scriptNamespace === SHELL_SETTINGS)
        chrome.storage.local.get(undefined, function (result) {
            $("#script-namespaces").prop("disabled", "disabled");
            if (result) {
                editor.getSession().setValue(JSON.stringify(result, null, 2), -1);
            }
        });
    else {
        let namespaces = await DBStorage.fetchCustomScriptNamespaces();

        namespaces = namespaces.sort(function (a, b) {
            if (a.toLocaleLowerCase() < b.toLocaleLowerCase())
                return -1;
            if (a.toLocaleLowerCase() > b.toLocaleLowerCase())
                return 1;
            return 0;
        });

        for (let n of namespaces)
            if (n !== "default")
                $("#script-namespaces").append($("<option></option>")
                    .attr("value", n)
                    .text(n));

        $("#script-namespaces").val(scriptNamespace);

        $("#script-namespaces").change(async () => {
            await saveScript()
            scriptNamespace = $("#script-namespaces").val();
            settings.last_editor_namespace(scriptNamespace);

            let record = await DBStorage.fetchCustomScripts(scriptNamespace);
            editScript(record?.script);
        });

        let record = await DBStorage.fetchCustomScripts(scriptNamespace);
        editScript(record?.script);
    }

    editor.on("blur", saveScript);

    let timeout;
    editor.on("change", e => {
        clearTimeout(timeout);

        timeout = setTimeout(() => {
            saveScript();
        }, 2000);
    });

    editor.focus();
}

$(() => shellSettings.load(settings => initEditor(settings)));