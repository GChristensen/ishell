import {helperApp} from "./helper_app.js";

export async function getActiveTab() {
    const tabs = await browser.tabs.query({lastFocusedWindow: true, active: true});
    return tabs && tabs.length? tabs[0]: null;
}

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

    if (options.args)
        scriptingOptions.args = options.args;

    return browser.scripting.executeScript(scriptingOptions);
}

async function executeScriptMV2(tabId, options) {
    if (options.func) {
        let args = [];

        if (options.args) {
            args = JSON.stringify(options.args);
            delete options.args;
        }

        let functionCode = options.func.toString().trim();

        if (!functionCode.startsWith("function") && !functionCode.startsWith("("))
            functionCode = "function " + functionCode;

        options.code = `(${functionCode}).apply(null, ${args})`;
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
        const link = doc.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = file;
        link.media = 'all';
        doc.head.appendChild(link);
    }
}

export async function loadScript(doc, id, file) {
    if (!doc.getElementById(id)) {
        let resolver;

        const script = doc.createElement('script');
        script.id = id;
        script.type = 'text/javascript';
        script.src = file;
        script.onload = () => resolver(true);

        const result = new Promise(resolve => resolver = resolve);
        doc.head.appendChild(script);

        return result;
    }
}

export function jsEval(text, global = false, wnd = window) {
    if (!global)
        text = `{${text}\n}`;

    return wnd.eval(text);
}

export async function nativeEval(text, global = false, wnd = window) {
    if (!global)
        text = `{${text}\n}`;

    const doc = wnd.document;
    const key = crypto.randomUUID();
    let pullURL = helperApp.url(`/pull_script/${key}`);

    if (_BACKGROUND_PAGE)
        await helperApp.post("/push_script", {text, key});
    else
        pullURL = `/pull_script/${encodeURIComponent(text)}`;

    const scriptElement = doc.createElement("script");
    scriptElement.setAttribute("crossorigin", "anonymous");
    scriptElement.src = pullURL;

    let rejectOnError;
    const errorListener = error => {
        if (error.filename?.includes("/pull_script")) {
            wnd.removeEventListener("error", errorListener);
            rejectOnError(error.error)
        }
    }
    wnd.addEventListener("error", errorListener);

    const errorContainer = {
        error: new Promise((resolve, reject) => {
            rejectOnError = reject;

            setTimeout(() => {
                wnd.removeEventListener("error", errorListener);
                resolve(null);
            }, 1000);
        })
    };

    let resolveOnLoad;
    const result = new Promise(resolve => resolveOnLoad = resolve);
    scriptElement.onload = () => resolveOnLoad(errorContainer);

    doc.head.appendChild(scriptElement);
    scriptElement.parentElement.removeChild(scriptElement);

    return result;
}