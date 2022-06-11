export function merge(to, from) {
    for (const [k, v] of Object.entries(from)) {
        if (!to.hasOwnProperty(k))
            to[k] = v;
    }
    return to;
}

// injects legacy API into the global namespace
export async function injectModules(modules) {
    return loadModules(modules, true);
}

// imports modules for side effects
export async function loadModules(modules, inject = false) {
    for (const module of modules) {
        const namespace = await import(module);
        if (inject)
            injectModule(namespace);
    }
}

export function injectModule(namespace) {
    for (const key of Object.keys(namespace))
        globalThis[key] = namespace[key];
}

// loads bundled scripts into specified window (or background if not specified)
export async function loadScripts(url, wnd= window) {
    wnd.loadedScripts = wnd.loadedScripts || [];
    url = url || [];
    if (!Array.isArray(url))
        url = [url];

    if (typeof wnd.jQuery === "undefined") {
        console.error("there's no jQuery at " + wnd + ".");
        return false;
    }

    if (url.length === 0)
        return;

    let urlToLoad = url.shift();
    let continueLoad = function(data, textStatus, jqXHR) {
        return loadScripts(url, wnd);
    };
    if (wnd.loadedScripts.indexOf(urlToLoad) === -1) {
        console.log("loading :::: ", chrome.runtime.getURL(urlToLoad));
        wnd.loadedScripts.push(urlToLoad);
        await new Promise(resolve => {
            wnd.jQuery.ajax({
                url: chrome.runtime.getURL(urlToLoad),
                dataType: 'script',
                success: async () => {
                    console.log("success")
                    await continueLoad();
                    resolve();
                },
                error: e => console.error(e),
                async: true
            });
        })
    }
    else {
        await continueLoad();
    }
}

async function executeScriptFileMV3 (tabId, options) {
    const target = {tabId};

    if (options.frameId)
        target.frameIds = [options.frameId];

    if (options.allFrames)
        target.allFrames = options.allFrames;

    return browser.scripting.executeScript({target, files: [options.file]});
}

export function executeScriptFile(...args) {
    if (_MANIFEST_V3)
        return executeScriptFileMV3(...args)
    else
        return browser.tabs.executeScript(...args);
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