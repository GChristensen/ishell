import {helperApp} from "./helper_app.js";

async function executeScriptMV3(tabId, options) {
    const target = {tabId};

    if (options.frameId)
        target.frameIds = [options.frameId];

    if (options.allFrames)
        target.allFrames = options.allFrames;

    const scriptingOptions = {target};

    if (options.file)
        scriptingOptions.files = [options.file];

    if (options.func)
        scriptingOptions.func = options.func;

    return browser.scripting.executeScript(scriptingOptions);
}

async function executeScriptMV2(tabId, options) {
    if (options.func) {
        options.code = options.func.toString().trim();

        if (!options.code.startsWith("function") && !options.code.startsWith("("))
            options.code = "function " + options.code;

        options.code = `(${options.code})()`;
        delete options.func;
    }

    const results = await browser.tabs.executeScript(tabId, options);

    return results?.map(r => ({result: r}));
}

export function executeScript(tabId, options) {
    if (_MANIFEST_V3)
        return executeScriptMV3(tabId, options);
    else
        return executeScriptMV2(tabId, options);
}

export async function askCSRPermission() {
    if (_MANIFEST_V3)
        return browser.permissions.request({origins: ["<all_urls>"]});

    return true;
}

export async function hasCSRPermission(verbose = true) {
    if (_MANIFEST_V3) {
        const response = await browser.permissions.contains({origins: ["<all_urls>"]});

        if (!response && verbose)
            displayMessage("Please, enable optional add-on permissions at the Firefox add-on settings page (about:addons).");

        return response;
    }

    return true;
}

export function loadCSS(doc, id, file) {
    if (!doc.getElementById(id)) {
        let link = doc.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = file;
        link.media = 'all';
        doc.head.appendChild(link);
    }
}

export async function nativeEval(text, global = false, wnd = window) {
    const doc = wnd.document;
    const key = crypto.randomUUID();
    const pullURL = helperApp.url(`/pull_script/${key}`);

    if (!global)
        text = `{\n${text}\n}`;

    await helperApp.post("/push_script", {text, key});

    const scriptElement = doc.createElement("script");
    scriptElement.setAttribute("crossorigin", "anonymous");
    scriptElement.src = pullURL;

    let rejectOnError;
    const errorListener = error => {
        if (error.filename?.startsWith(pullURL)) {
            wnd.removeEventListener("error", errorListener);
            rejectOnError(error.error)
        }
    }
    wnd.addEventListener("error", errorListener);

    doc.head.appendChild(scriptElement);
    scriptElement.parentElement.removeChild(scriptElement);

    return {
        error: new Promise((resolve, reject) => {
            rejectOnError = reject;

            setTimeout(() => {
                wnd.removeEventListener("error", errorListener);
                resolve(true);
            }, 1000);
        })
    };
}