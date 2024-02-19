import {helperApp} from "../../ishell.js";
import {settings} from "../../settings.js";
import {repository} from "../../storage.js";
import {setupHelp} from "./utils.js";
import {fetchWithTimeout} from "../../utils.js";

$(initPage);

async function initPage() {
    setupHelp("#show-hide-help", "#options-help-div");

    $("#ishell-version").text(cmdAPI.VERSION);
    $("#manifest-version").text(_MANIFEST_V3? "MV3": "MV2");

    if (cmdAPI.DEBUG)
        $("#shell-debug-mode").show();

    configureDynamicSettings();

    $("#max-search-results").change(function () {
        settings.max_search_results(parseInt(this.value));
    }).val(settings.max_search_results() || 10);

    $("#max-suggestions").change(function() {
        settings.max_suggestions(parseInt(this.value))
    }).val(settings.max_suggestions() || 5);

    $("#export-settings").click(e => {
        e.preventDefault();
        exportSettings();
    });

    $("#import-settings").click(e => {
        e.preventDefault();
        $("#file-picker").click();
    });

    $("#file-picker").change((e) => {
        if (e.target.files.length > 0)
            importSettings(e.target.files[0]);
    });

    loadHelperAppLinks();
}

function configureDynamicSettings() {
    populateDynamicSettings();

    $(document).on("click", "#dynamic-settings .remove-item", async e => {
        let tr = e.target.parentNode;
        let key = $(tr).find("input[name='key']").val();

        if (confirm("Do you really want to delete \"" + key + "\"?")) {
            await settings.load();
            let dynamic_settings = settings.dynamic_settings();
            delete dynamic_settings[key];
            settings.dynamic_settings(dynamic_settings);
            tr.parentNode.removeChild(tr);
        }
    });

    $(document).on("blur", "#dynamic-settings input[name='value']", async e => {
        let tr = e.target.parentNode.parentNode;
        let key = $(tr).find("input[name='key']").val();
        let value = $(tr).find("input[name='value']").val();

        await settings.load();
        let dynamic_settings = settings.dynamic_settings();
        dynamic_settings[key] = value;
        settings.dynamic_settings(dynamic_settings);
    });

    browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
        switch(request.type) {
            case "ADDED_DYNAMIC_SETTING":
                $("#dynamic-settings").empty();
                await settings.load();
                populateDynamicSettings(settings);
                break;
        }
    });
}

function populateDynamicSettings() {
    const helpHints = {
       // lingvo_api_key: "API key used by the lingvo command",
        bing_translator_api_v3_key: "API key used by the translate command",
        youtube_search_api_key: "API key used by the youtube command",
        google_cse_api_key: "API key used by the google and images commands",
        google_cse_api_id: "Custom search configuration id used by the google and images commands",
        openai_api_key: "OpenAI API key used by the gpt command",
        gpt_default_model: "Default language model used by the gpt command"
    };

    const helpLinks = {
        //lingvo_api_key: "https://developers.lingvolive.com/en-us/Help",
        bing_translator_api_v3_key: "https://www.microsoft.com/en-us/translator/business/trial/",
        youtube_search_api_key: "https://developers.google.com/youtube/v3/getting-started",
        google_cse_api_key: "https://developers.google.com/custom-search/v1/introduction",
        google_cse_api_id: "https://support.google.com/programmable-search/answer/2649143",
        openai_api_key: "https://platform.openai.com/api-keys"
    };

    const builtinKeys = Object.keys(helpHints);
    const dynamicSettings = settings.dynamic_settings();

    let html = cmdAPI.reduceTemplate(Object.keys(dynamicSettings),
        item =>
            `<tr id="${item}">
                ${(builtinKeys.some(k => k === item))
                    ? '<td class="help-hint" title="' + helpHints[item] + '">&#8505;</td>'
                    : '<td class="remove-item" title="Remove item">&#xD7;</td>'
                 }
                <td class="item-key"><input type="text" name="key" title="Key" value="${Utils.escapeHtml(item)}" disabled/></td>
                <td class="item-value"><input type="text" name="value" title="Value" value="${Utils.escapeHtml(dynamicSettings[item] || "")}"
                                              ${builtinKeys.some(k => k === item) ? 'style="margin-right: -20px"' : ""}/>
                    ${builtinKeys.some(k => k === item) && helpLinks[item]
                        ? ('<span class="key-help" title="Get a personal API key">&nbsp;<a href="' + helpLinks[item] 
                             + '" target="_blank">?</a></span>')
                        : ""
                     }
                </td>
             </tr>`)

    $("#dynamic-settings").append(html);
}

async function exportSettings() {
    let exported = {};
    exported.addon = "iShell";
    exported.version = cmdAPI.VERSION;

    let settings = await browser.storage.local.get();

    Object.assign(exported, settings);

    delete exported.command_history;

    exported.command_storage = await repository.fetchCommandStorage();
    exported.custom_scripts = await repository.fetchUserScripts();

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
}

async function importSettings(file) {
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
                await repository.setCommandStorage(item.uuid, item.bin)
        }

        if (customScripts && Array.isArray(customScripts)) {
            let multipleObjects = [];
            try {
                multipleObjects = customScripts.map(record =>
                    repository.saveUserScript(record.namespace, record.script));
            }
            catch (e) {
                console.error(e);
            }
            Promise.all(multipleObjects).then(() => chrome.runtime.reload());
        }
        else
            chrome.runtime.reload();
    };
    reader.readAsText(file);
}

async function loadHelperAppLinks() {
    let latestHelperAppVersion;

    function setDownloadLinks(release) {
        const tar = release.assets.find(a => a.browser_download_url.endsWith(".tgz"));

        $("#helper-python").attr("href", tar.browser_download_url);
    }

    try {
        const apiURL = "https://api.github.com/repos/gchristensen/ishell/releases/latest";
        const response = await fetchWithTimeout(apiURL, {timeout: 30000});

        if (response.ok) {
            let release = JSON.parse(await response.text());

            latestHelperAppVersion = release.name.split(" ");
            latestHelperAppVersion = latestHelperAppVersion.at(-1);

            setDownloadLinks(release);
        }
        else
            throw new Error();
    }
    catch (e) {
        console.error(e);
        //latestHelperAppVersion.html(`<b>Latest version:</b> error`);
    }

    let installedHelperAppVersion;
    let update = false;

    if (await helperApp.probe()) {
        installedHelperAppVersion = helperApp.getVersion();
        if (latestHelperAppVersion && !await helperApp.hasVersion(latestHelperAppVersion))
            update = true;
    }

    if (installedHelperAppVersion)
        $("#helper-version").text(`v${installedHelperAppVersion}`);
    else
        $("#helper-version").html(`is not installed <a href="tutorial.html#backend" title="About the backend application"
                                                             target="_blank">&#x1F6C8;</a>`);

    if (update)
        $("#helper-update").show();
}
