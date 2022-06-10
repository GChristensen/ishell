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