import {cmdManager, helperApp} from "../../ishell.js";
import {settings} from "../../settings.js";
import {repository} from "../../storage.js";
import {CommandPreprocessor} from "../../api/preprocessor.js";

const SHELL_SETTINGS = "shell-settings";
const CHANGE_DELAY = 2000;

const preprocessor = new CommandPreprocessor(CommandPreprocessor.CONTEXT_CUSTOM);

let scriptNamespace = "default";
let editor;

$(initPage);

async function initPage() {
    await settings.load();

    await initEditor();
}

async function initEditor() {
    if (_MANIFEST_V3) {
        if (!await helperApp.probe())
            CmdUtils.notify("Please, install the helper applications to execute custom commands");
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

    $("#upload").click((e) => {
        $("#file-picker").click();
    });

    $("#file-picker").change((e) => {
        if (e.target.files.length > 0)
            uploadFile(e.target.files[0])
    });

    $("#download").click(downloadFile);

    $("#create-namespace").click(createNamespace);
    $("#delete-namespace").click(deleteNamespace);

    $("#expand-editor").click(expandEditor);

    $("#simple").click(insertSnippet);
    $("#full").click(insertSnippet);
    $("#search").click(insertSnippet);
    $("#capture").click(insertSnippet);

    $("#syntax-types").val(settings.template_syntax() || "class");

    $("#syntax-types").change(() => {
        settings.template_syntax($("#syntax-types").val());
    });

    if (settings.scrapyard_presents())
        $("#capture-stub").show();

    await loadScripts();

    editor.on("blur", saveScript);

    let timeout;
    editor.on("change", e => {
        clearTimeout(timeout);
        timeout = setTimeout(saveScript, CHANGE_DELAY);
    });

    editor.focus();
}

function setEditorContent(text) {
    editor.setValue(text || "", -1);
    editor.getSession().setUndoManager(new ace.UndoManager())
}

function uploadFile(file) {
    let reader = new FileReader();
    reader.onload = function(e) {
        editor.getSession().setValue(e.target.result);
    };
    reader.readAsText(file);
}

async function downloadFile() {
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
}

async function createNamespace() {
    if (scriptNamespace === SHELL_SETTINGS)
        return;

    let name = prompt("Create category: ");
    if (name) {
        ADD_NAME: {
            await saveScript();

            let namespaces = await repository.fetchUserScriptNamespaces();

            for (let n of namespaces) {
                if (n.toLowerCase() === name.toLowerCase()) {
                    scriptNamespace = n;
                    $("#script-namespaces").val(n);

                    let record = await repository.fetchUserScripts(scriptNamespace);
                    setEditorContent(record?.script);

                    break ADD_NAME;
                }
            }

            const builtin = cmdManager.commands.some(c => c._namespace === name && c._builtin);
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
}

async function deleteNamespace() {
    if (scriptNamespace !== "default" && scriptNamespace !== SHELL_SETTINGS) {
        if (confirm("Do you really want to delete \"" + scriptNamespace + "\"?")) {
            const deletedNamespace = scriptNamespace;
            $('option:selected', $("#script-namespaces")).remove();

            scriptNamespace = $("#script-namespaces").val();
            settings.last_editor_namespace(scriptNamespace);

            let record = await repository.fetchUserScripts(scriptNamespace);
            setEditorContent(record?.script);

            await repository.deleteUserScript(deletedNamespace);
        }
    }
}

function expandEditor() {
    if ($("#expand-editor img").prop("src").endsWith("/ui/icons/collapse.png")) {
        $("#panel").css("width", "870px");
        $("body").css("margin", "auto");
        $("body").css("max-width", "900px");
        $("#toolbar").css("padding-right", "30px");
        $(".head, #nav-container, #head-br").show();
        $("#expand-editor img").prop("src", "/ui/icons/expand.png");
    }
    else {
        $(".head, #nav-container, #head-br").hide();
        $("#panel").css("width", "100%");
        $("body").css("margin", "0");
        $("body").css("max-width", "100%");
        $("#toolbar").css("padding-right", "5px");
        $("#expand-editor img").prop("src", "/ui/icons/collapse.png");
    }
    window.dispatchEvent(new Event('resize'));
    editor.focus();
}

async function loadScripts() {
    if (scriptNamespace === SHELL_SETTINGS)
        chrome.storage.local.get(undefined, function (result) {
            $("#script-namespaces").prop("disabled", "disabled");
            if (result) {
                editor.getSession().setValue(JSON.stringify(result, null, 2), -1);
            }
        });
    else {
        let namespaces = await repository.fetchUserScriptNamespaces();

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

            let record = await repository.fetchUserScripts(scriptNamespace);
            setEditorContent(record?.script);
        });

        let record = await repository.fetchUserScripts(scriptNamespace);
        setEditorContent(record?.script);
    }
}

async function insertSnippet() {
    if (scriptNamespace === SHELL_SETTINGS)
        return;

    let templateId = this.id;

    if (settings.template_syntax() === "class") {
        if (this.id === "simple")
            templateId = "simple_class";
        else if (this.id === "full")
            templateId = "full_class";
    }

    let snippet = await (await fetch(browser.runtime.getURL(`/ui/options/snippets/${templateId}.js`))).text();

    if (settings.template_syntax() === "CmdUtils") {
        snippet = snippet.replace("cmdAPI.createCommand", "CmdUtils.CreateCommand");
        snippet = snippet.replace("cmdAPI.escapeHtml", "Utils.escapeHtml");
        snippet = snippet.replace(/cmdAPI/g, "CmdUtils");
    }

    //editor.replaceRange(stub, editor.getCursor());
    editor.session.insert(editor.getCursorPosition(), snippet.replace("%%UUID%%", crypto.randomUUID().toUpperCase()));

    //editor.setValue( snippet + editor.getValue() );
    //saveScripts();
    editor.focus();
    return false;
}

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
        await repository.saveUserScript(scriptNamespace, customcode);

        // eval
        if (_MANIFEST_V3)
            await evalMV3(customcode);
        else
            await evalMV2(customcode);
    }
}

async function evalMV2(customcode) {
    try {
        const code = preprocessor.transform(customcode);
        cmdAPI.evaluate(code);

        $("#info").html("Evaluated!");

        await cmdManager.loadUserScripts(scriptNamespace);
    } catch (e) {
        displayError(e.message);
    }
}

async function evalMV3(customcode) {
    const code = preprocessor.transform(customcode);
    const result = await cmdAPI.evaluate(code);

    result.error
        .then(() => {
            $("#info").html("Evaluated!");
            cmdManager.loadUserScripts(scriptNamespace);
        })
        .catch(error => {
            displayError(error.message);
        });
}

function displayError(message) {
    $("#info").html("<span style='background-color: red; color: white;'>&nbsp;" + message + "&nbsp;</span>");
}


