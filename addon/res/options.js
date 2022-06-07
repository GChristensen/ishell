
$(() => shellSettings.load(settings => onDocumentLoad(settings)));

async function onDocumentLoad(settings) {
    await initializeIShellAPI();

    $("#shell-version").text(CmdUtils.VERSION);

    if (CmdUtils.DEBUG)
        $("#shell-debug-mode").show();

    const helpHints = {
        lingvo_api_key: "API key used by lingvo command",
        bing_translator_api_v3_key: "API key used by translate command",
        youtube_search_api_key: "API key used by youtube command",
        google_cse_api_key: "API key used by google and images commands",
        google_cse_api_id: "Custom search configuration id used by google and images commands",
    };

    const helpLinks = {
        lingvo_api_key: "https://developers.lingvolive.com/en-us/Help",
        bing_translator_api_v3_key: "https://www.microsoft.com/en-us/translator/business/trial/",
        youtube_search_api_key: "https://developers.google.com/youtube/v3/getting-started",
        google_cse_api_key: "https://developers.google.com/custom-search/v1/introduction",
        google_cse_api_id: "https://support.google.com/programmable-search/answer/2649143",
    };

    const builtinKeys = Object.keys(helpLinks);

    function populateDynamicSettings(settings) {
        let html = "";

        for (let item of Object.entries(settings.dynamic_settings())) {
            html += `<tr id="${item[0]}">
                        ${(builtinKeys.some(k => k === item[0]))
                            ? '<td class="help-hint" title="' + helpHints[item[0]] + '">&#8505;</td>'
                            : '<td class="remove-item" title="Remove item">&#xD7;</td>'}
                        <td class="item-key"><input type="text" name="key" title="Key" value="${Utils.escapeHtml(item[0])}" disabled/></td>
                        <td class="item-value"><input type="text" name="value" title="Value" value="${Utils.escapeHtml(item[1])}"
                                                 ${builtinKeys.some(k => k === item[0]) ? 'style="margin-right: -20px"' : ""}/>
                        ${builtinKeys.some(k => k === item[0])
                            ? ('<span className="key-help" title="Get a personal API key">&nbsp;<a href="' + helpLinks[item[0]]
                                + '" target="_blank">?</a></span>')
                            : ""}
                        </td>
                    </tr>`

        }
        $("#dynamic-settings").append(html);
    }

    populateDynamicSettings(settings);

    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch(request.type) {
            case "ADDED_DYNAMIC_SETTING":
                $("#dynamic-settings").empty();
                shellSettings.load(settings => populateDynamicSettings(settings));
                break;
        }
    })

    $(document).on("click", "#dynamic-settings .remove-item", e => {
        let tr = e.target.parentNode;
        let key = $(tr).find("input[name='key']").val();
        if (confirm("Do you really want to delete \"" + key + "\"?")) {
            shellSettings.load(settings => {
                let dynamic_settings = settings.dynamic_settings();
                delete dynamic_settings[key];
                settings.dynamic_settings(dynamic_settings);
                tr.parentNode.removeChild(tr);
            });
        }
    });

    $(document).on("blur", "#dynamic-settings input[name='value']", e => {
        let tr = e.target.parentNode.parentNode;
        let key = $(tr).find("input[name='key']").val();
        let value = $(tr).find("input[name='value']").val();
        shellSettings.load(settings => {
            let dynamic_settings = settings.dynamic_settings();
            dynamic_settings[key] = value;
            settings.dynamic_settings(dynamic_settings);
        });
    });

    $("#max-search-results").change(function () {
        settings.max_search_results(parseInt(this.value));
    }).val(settings.max_search_results() || 10);

    $("#max-suggestions").change(function() {
        settings.max_suggestions(parseInt(this.value))
    }).val(settings.max_suggestions() || 5);


    // var $langSelect = $("#language-select");
    // for (let code in CmdUtils.nlParser.ParserRegistry) {
    //     let $opt = $("<option>", {val: code, text: CmdUtils.nlParser.ParserRegistry[code].name});
    //     $opt[0].selected = code === settings.parser_language();;
    //     $langSelect.append($opt);
    // }
    //
    // $langSelect.change(() => {
    //     let lang = $langSelect.find(":selected").val();
    //     settings.parser_language(lang);
    // });

    $("#export-settings").click(async (e) => {
        e.preventDefault();

        let exported = {};
        exported.addon = "iShell";
        exported.version = CmdUtils.VERSION;

        let settings = await browser.storage.local.get();

        Object.assign(exported, settings);

        delete exported.command_history;

        exported.command_storage = await DBStorage.fetchCommandStorage();
        exported.custom_scripts = await DBStorage.fetchCustomScripts();

        // download link
        let file = new Blob([JSON.stringify(exported, null, 2)], {type: "application/json"});
        let url = URL.createObjectURL(file);
        let filename = "ishell-settings.json"

        let download = await browser.downloads.download({url: url, filename: filename, saveAs: true});

        let download_listener = delta => {
            if (delta.id === download && delta.state && delta.state.current === "complete") {
                browser.downloads.onChanged.removeListener(download_listener);
                URL.revokeObjectURL(url);
            }
        };
        browser.downloads.onChanged.addListener(download_listener);
    });

    $("#import-settings").click((e) => {
        e.preventDefault();
        $("#file-picker").click();
    });

    $("#file-picker").change((e) => {
        if (e.target.files.length > 0) {
            let reader = new FileReader();
            reader.onload = async function(re) {
                let imported = JSON.parse(re.target.result);

                if (imported.addon !== "iShell") {
                    CmdUtils.notify("Export format is not supported.", "Error");
                    return;
                }

                // versioned operations here

                if (imported.addon)
                    delete imported.addon;

                if (imported.version)
                    delete imported.version;

                let customScripts = imported.custom_scripts;

                if (customScripts !== undefined)
                    delete imported.custom_scripts;

                let commandStorage = imported.command_storage;

                if (commandStorage !== undefined)
                    delete imported.command_storage;

                chrome.storage.local.set(imported);

                if (commandStorage && Array.isArray(commandStorage)) {
                    for (let item of commandStorage)
                        await DBStorage.setCommandStorage(item.uuid, item.bin)
                }

                if (customScripts && Array.isArray(customScripts)) {
                    let multipleObjects = [];
                    try {
                        multipleObjects = customScripts.map(record =>
                            DBStorage.saveCustomScript(record.namespace, record.script));
                    }
                    catch (e) {
                        console.error(e);
                    }
                    Promise.all(multipleObjects).then(() => chrome.runtime.reload());
                }
                else
                    chrome.runtime.reload();
            };
            reader.readAsText(e.target.files[0]);
        }
    });

    setupHelp("#show-hide-help", "#options-help-div");
}

function setupHelp(clickee, help) {
    var toggler = jQuery(clickee).click(function toggleHelp() {
        jQuery(help)[(this.off ^= 1) ? "slideUp" : "slideDown"]();
        [this.textContent, this.bin] = [this.bin, this.textContent];
    })[0];
    toggler.textContent = "Show help";
    toggler.bin = "Hide help";
    toggler.off = true;
}
