import {fetchJSON, fetchText} from "../utils.js";
import {getActiveTab} from "../utils_browser.js";
import {repository} from "../storage.js";

$(initPage)

async function initPage(event) {
    const commandURL = decodeURIComponent(location.search.substring(1));

    let source, namespace;
    if (/^https?:\/\/gist.github.com\//.test(commandURL))
        [source, namespace] = await getSourceFromGist(commandURL);
    else
        [source, namespace] = await getSourceFromURL(commandURL);

    namespace = namespace || "Unnamed";

    $("#targetLink").text(commandURL);
    $("#targetLink").prop("href", commandURL);
    $("#editorCategoryInput").val(namespace);
    $("#sourceCode").html(`<pre id="commandSource"><code data-language="javascript">${source}</code></pre>`);

    $("#getOutButton").on("click", closeActiveTab)
    $("#installButton").on("click", async () => installCommand(namespace, source));

    Rainbow.color(event);
}

async function getSourceFromGist(commandURL) {
    const gistID = /^https?:\/\/gist.github.com\/[^/]+\/([^/]+)/.exec(commandURL)?.[1];

    if (!gistID)
        return [];

    const apiURL = `https://api.github.com/gists/${gistID}`;
    const gist = await fetchJSON(apiURL);

    if (!gist)
        return [];

    const fileName = Object.keys(gist.files)[0];
    const fileContent = gist.files[fileName].content;
    const name = fileName.replace(/\.[^.]*$/, "");

    return [fileContent, name];
}

async function getSourceFromURL(commandURL) {
    const source = await fetchText(commandURL);

    if (!source)
        return [];

    let name = commandURL.match(/[^/]+$/)?.[0];
    name = name?.replace(/\.[^.]*$/, "")

    return [source, name];
}

async function closeActiveTab() {
    return browser.tabs.remove((await getActiveTab())?.id);
}

async function installCommand(namespace, source) {
    const namespaces = await repository.fetchUserScriptNamespaces();

    let exists = !!namespaces?.some(n => n.toLocaleLowerCase() === namespace.toLocaleLowerCase());

    if (!exists || exists && confirm("Command category with this name already exists. Replace?")) {
        await repository.saveUserScript(namespace, source);

        browser.runtime.reload();
    }
}

