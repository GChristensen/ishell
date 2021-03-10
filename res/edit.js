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

    preview({object: {text}}, display) {
        display.set("Your input is " + text + ".");
    }
    
    execute({object: {text}}) {
        cmdAPI.notify("Your input is: " + text);
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
    <!-- example command help -->
    <span class="syntax">Syntax</span>
    <p class="syntax">
       <b>my-command</b> <i>input</i> <b>as</b> <i>display</i>
    </p>
    <span class="syntax">Arguments</span>
    <ul class="syntax">
        <li>- <i>input</i> - description of the input</li>
        <li>- <i>display</i> - description of the display argument</li>
    </ul>
    <span class="syntax">Examples</span>
    <ul class="syntax">
        <li><b>my-command</b> <i>show me</i> <b>as</b> <i>popup</i></li>
    </ul>
    
    @command
    @license GPL
    @author Your Name
    @delay 1000 (preview delay, ms)
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
    
    preview(args, display, storage) {
        
        // display the initial html markup of the requested page
        if (/^https?:\\/\\/.*/.test(args[OBJECT]?.text))  
            cmdAPI.previewAjax(display, {
                url: args[OBJECT]?.text,
                dataType: "html",
                success: function(data) {
                    if (data) {
                        let html = data.substring(0, 500); 
                        display.set("Request response: <br>" + cmdAPI.escapeHtml(html) + "...");
                    }
                    else
                        display.set("Response is empty.");
                },
                error: function() {
                    display.set("HTTP request error.");
                }
            });  
        else
            display.set("Invalid URL.");
    }
    
    execute(args, storage) {
        cmdAPI.notify("You loaded: " + args[OBJECT]?.text);
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

// evaluates and saves scripts from editor
function saveScripts(callback) {
    var customscripts = editor.getSession().getValue();

    if (scriptNamespace === SHELL_SETTINGS) {
        let settings;
        try {
            settings = JSON.parse(customscripts)
        }
        catch (e) {
            console.log(e);
            return;
        }

        if (settings)
            chrome.storage.local.set(settings);
        else
            chrome.storage.local.clear();
    }
    else {
        // save
        DBStorage.saveCustomScripts(scriptNamespace, customscripts, () => {
            // eval
            try {
                $("#info").html("Evaluated!");
                eval(customscripts);
                CmdManager.loadCustomScripts();
            } catch (e) {
                $("#info").html("<span style='background-color: red; color: white;'>&nbsp;" + e.message + "&nbsp;</span>");
            }

            if (callback && typeof callback === "function")
                callback();
        });
    }

    // download link
    var a = document.getElementById("download");
    var file = new Blob([customscripts], {type: "application/javascript"});
    a.href = URL.createObjectURL(file);
    a.download = scriptNamespace + (scriptNamespace === SHELL_SETTINGS? ".json": ".js");
}

function initEditor(settings) {
    let lastNamespace = settings.last_editor_namespace();

    scriptNamespace =  window.location.search
        ? decodeURI(window.location.search.substring(1))
        : (lastNamespace? lastNamespace: "default");

    editor = ace.edit("code");
    editor.getSession().setUseWorker(false);
    editor.setTheme("ace/theme/monokai");
    editor.getSession().setMode("ace/mode/javascript");
    editor.setPrintMarginColumn(120);

    $(window).on('resize', e => {
        editor.container.style.height = $(window).innerHeight() - $("#header").height() - $("#footer").height() - 16;
        editor.resize();
    });
    $(window).resize();

    function editNamespaceScripts(all_scripts, namespace) {
        let namespace_scripts = all_scripts[namespace];
        if (namespace_scripts)
            editor.setValue(namespace_scripts.scripts || "", -1);
        else
            editor.setValue("");

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

    $("#create-namespace").click(() => {
        if (scriptNamespace === SHELL_SETTINGS)
            return;

        let name = prompt("Create category: ");
        if (name) {
            DBStorage.fetchCustomScripts(all_scripts => {
                ADD_NAME: {
                    saveScripts();

                    for (let n in all_scripts) {
                        if (n.toLowerCase() == name.toLowerCase()) {
                            scriptNamespace = n;
                            $("#script-namespaces").val(n);
                            editNamespaceScripts(all_scripts, scriptNamespace)
                            break ADD_NAME;
                        }
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
            });
        }
    });

    $("#delete-namespace").click(() => {
        if (scriptNamespace !== "default" && scriptNamespace !== SHELL_SETTINGS)
            if (confirm("Do you really want to delete \"" + scriptNamespace + "\"?")) {
                DBStorage.deleteCustomScripts(scriptNamespace, () => {
                    $('option:selected', $("#script-namespaces")).remove();

                    scriptNamespace = $("#script-namespaces").val();
                    settings.last_editor_namespace(scriptNamespace);
                    DBStorage.fetchCustomScripts(scriptNamespace, scripts => {
                        editNamespaceScripts(scripts, scriptNamespace);
                    });
                });
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
    else
        DBStorage.fetchCustomScripts(all_scripts => {
            var sorted = Object.keys(all_scripts).sort(function (a, b) {
                if (a.toLocaleLowerCase() < b.toLocaleLowerCase())
                    return -1;
                if (a.toLocaleLowerCase() > b.toLocaleLowerCase())
                    return 1;
                return 0;
            });
            for (let n of sorted)
                if (n !== "default")
                    $("#script-namespaces").append($("<option></option>")
                        .attr("value", n)
                        .text(n));

            $("#script-namespaces").val(window.scriptNamespace);

            $("#script-namespaces").change(() => {
                saveScripts(() => {
                    scriptNamespace = $("#script-namespaces").val();

                    settings.last_editor_namespace(scriptNamespace);
                    DBStorage.fetchCustomScripts(scriptNamespace, scripts => {
                        editNamespaceScripts(scripts, scriptNamespace);
                    });
                });
            });

            editNamespaceScripts(all_scripts, scriptNamespace);
            //saveScripts();
        });

    editor.on("blur", saveScripts);
    editor.on("change", saveScripts);

    editor.focus();
}

$(() => shellSettings.load(settings => initEditor(settings)));