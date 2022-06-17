export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve,  ms))
}

export function camelCaseToSnakeCase(str) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1_$2').toUpperCase();
}

export function snakeCaseToCamelCase(str) {
    return str.toLowerCase()
        .replace(/(_)([a-z])/g, (_match, _p1, p2) => p2.toUpperCase())
}

export function merge(to, from) {
    for (const [k, v] of Object.entries(from)) {
        if (!to.hasOwnProperty(k))
            to[k] = v;
    }
    return to;
}

export function delegate (object, method) {
    return function () {
        return method.apply(object, arguments);
    }
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

export async function fetchText(url, init) {
    const response = await fetch(url, init);
    if (response.ok)
        return response.text();
}

export async function fetchJSON(url, init) {
    const response = await fetch(url, init);
    if (response.ok)
        return response.json();
}

export async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 10000 } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);

    return response;
}