export function merge(to, from) {
    for (const [k, v] of Object.entries(from)) {
        if (!to.hasOwnProperty(k))
            to[k] = v;
    }
    return to;
}

// injects legacy API into the global namespace
export async function injectLegacyModules(modules) {
    return loadLegacyModules(modules, true);
}

// imports modules for side effects
export async function loadLegacyModules(modules, inject = false) {
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