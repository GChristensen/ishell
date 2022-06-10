import {helperApp} from "./helper_app.js";
import {Utils} from "./api/utils.js";

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

async function executeScriptFileMV3 (tabId, options) {
    const target = {tabId};

    if (options.frameId)
        target.frameIds = [options.frameId];

    if (options.allFrames)
        target.allFrames = options.allFrames;

    return browser.scripting.executeScript({target, files: [options.file]});
}

export const executeScriptFile = _MANIFEST_V3? executeScriptFileMV3: browser.tabs.executeScript;

export async function nativeEval(text) {
    const key = crypto.randomUUID();
    const pullURL = helperApp.url(`/pull_script/${key}`);

    var rejecter;
    var errorListener = error => {
        if (error.filename?.startsWith(pullURL)) {
            window.removeEventListener("error", errorListener);
            rejecter(error.error)
        }
    }

    text = `{\n${text}\n}`;
    await helperApp.post("/push_script", {text, key});

    const script = jQuery("<script>")
        .attr({crossorigin: "anonymous"})
        .prop({src: pullURL});

    window.addEventListener("error", errorListener);

    document.head.appendChild(script[0]);
    script.remove();

    return {error: new Promise((resolve, reject) => {
            rejecter = reject;

            setTimeout(() => {
                window.removeEventListener("error", errorListener);
                resolve(true);
            }, 1000);
        })};
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